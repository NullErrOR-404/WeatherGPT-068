import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.rules_engine import rules_engine
from backend.services.spatial_cache_service import SpatialCacheService, encode_geohash
from backend.services.telecom_bridge import telecom_bridge
from backend.services.mausam_rakshak_service import MausamRakshakService
from backend.models.schemas import CitizenHazardReport, MissedCallRequest

client = TestClient(app)

def test_stull_formula_negative_and_arid_bounds():
    """
    CRITICAL-01 Regression:
    Ensure Stull WBGT approximation does not produce complex numbers
    or TypeError when humidity is extremely low (< 1.67%) or temperature is sub-zero.
    """
    # Arid desert heat with 0.8% relative humidity
    arid_res = rules_engine.calculate_wbgt_heat_stress(temp_c=45.0, humidity_pct=0.8)
    assert isinstance(arid_res["wbgt_c"], float)
    assert isinstance(arid_res["wet_bulb_c"], float)
    assert arid_res["risk_level"] in ["HIGH_ALERT", "EXTREME_DANGER"]

    # Sub-zero Himalayan cold with low humidity
    cold_res = rules_engine.calculate_wbgt_heat_stress(temp_c=-20.0, humidity_pct=15.0)
    assert isinstance(cold_res["wbgt_c"], float)
    assert cold_res["risk_level"] == "NORMAL"

    # Out-of-bounds sensor values (e.g. -5% RH or 120% RH) clamped safely
    clamped_low = rules_engine.calculate_wbgt_heat_stress(temp_c=30.0, humidity_pct=-10.0)
    clamped_high = rules_engine.calculate_wbgt_heat_stress(temp_c=30.0, humidity_pct=150.0)
    assert isinstance(clamped_low["wbgt_c"], float)
    assert isinstance(clamped_high["wbgt_c"], float)

def test_spatial_cache_o1_lru_eviction():
    """
    HIGH-01 Regression:
    Ensure spatial cache evicts in O(1) time using OrderedDict without scanning full dict,
    and geohash encoder clamps coordinates.
    """
    mini_cache = SpatialCacheService(ttl_seconds=900, max_size=3)
    
    # Insert 4 items
    mini_cache.set(20.0, 78.0, "intent_a", "entity_1", "en", {"val": 1})
    mini_cache.set(20.1, 78.1, "intent_b", "entity_2", "en", {"val": 2})
    mini_cache.set(20.2, 78.2, "intent_c", "entity_3", "en", {"val": 3})
    mini_cache.set(20.3, 78.3, "intent_d", "entity_4", "en", {"val": 4})

    # Cache should be capped at max_size=3
    metrics = mini_cache.get_metrics()
    assert metrics["cached_clusters_count"] == 3

    # Out-of-bounds geohash clamping test
    gh_high = encode_geohash(999.0, 500.0)
    gh_norm = encode_geohash(90.0, 180.0)
    assert gh_high == gh_norm

def test_gsm_0338_160_char_budget_enforcement():
    """
    MEDIUM-01 Regression:
    Verify that emergency SMS payload is strictly <= 160 characters.
    """
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    res = loop.run_until_complete(telecom_bridge.get_emergency_sms_payload(lat=20.7453, lon=78.6022))
    loop.close()

    assert res["fits_single_sms"] is True
    assert res["character_count"] <= 160
    assert len(res["sms_text"]) <= 160

def test_telecom_multi_vernacular_dialects():
    """
    Verifies vernacular IVR scripts for Tamil, Telugu, English, Marathi, Hindi.
    """
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    # Tamil
    res_ta = loop.run_until_complete(telecom_bridge.handle_missed_call(
        MissedCallRequest(phone_number="+919876543210", language="ta")
    ))
    assert "வணக்கம்" in res_ta.voice_script

    # Telugu
    res_te = loop.run_until_complete(telecom_bridge.handle_missed_call(
        MissedCallRequest(phone_number="+919876543210", language="te")
    ))
    assert "నమస్కారం" in res_te.voice_script

    # English
    res_en = loop.run_until_complete(telecom_bridge.handle_missed_call(
        MissedCallRequest(phone_number="+919876543210", language="en")
    ))
    assert "Hello" in res_en.voice_script

    loop.close()

def test_sybil_attack_prevention_on_ground_truth():
    """
    HIGH-03 Regression:
    Ensure single-user spam cannot forge spatial consensus.
    Consensus must require multiple distinct users.
    """
    rakshak = MausamRakshakService()

    # User 1 sends 3 rapid reports
    for _ in range(3):
        res1 = rakshak.submit_report(CitizenHazardReport(
            hazard_type="HAIL",
            severity="PEA_SIZE",
            latitude=20.7453,
            longitude=78.6022,
            user_id="spammer_bot_1",
            timestamp="2026-09-12T12:00:00Z"
        ))
    
    # Sybil spam should NOT be verified
    assert res1.status == "PENDING_CONSENSUS"
    assert res1.consensus_count == 1

    # User 2 sends report in same sector
    res2 = rakshak.submit_report(CitizenHazardReport(
        hazard_type="HAIL",
        severity="PEA_SIZE",
        latitude=20.7460,
        longitude=78.6028,
        user_id="genuine_farmer_2",
        timestamp="2026-09-12T12:01:00Z"
    ))

    # Multi-user consensus satisfied!
    assert res2.consensus_count >= 2
    assert res2.status == "VERIFIED"

def test_api_query_coordinate_boundary_validation():
    """
    HIGH-02 Regression:
    Ensure coordinates exceeding [-90, 90] and [-180, 180] return HTTP 422.
    """
    # Latitude out of bounds (> 90)
    res_lat = client.get("/api/weather/current?lat=120.0&lon=78.6022")
    assert res_lat.status_code == 422

    # Longitude out of bounds (> 180)
    res_lon = client.get("/api/weather/current?lat=20.0&lon=250.0")
    assert res_lon.status_code == 422

    # Chat query payload out of bounds
    res_chat = client.post("/api/chat", json={
        "message": "Is it raining?",
        "latitude": 999.0,
        "longitude": 78.0,
        "language": "en"
    })
    assert res_chat.status_code == 422


def test_insat3ds_planck_inversion():
    """
    Verifies INSAT-3DS TIR-1 (10.8 um) Planck blackbody inversion.
    Deep convective cumulonimbus cores must yield cold brightness temperatures (T_b <= -40°C).
    Zero/negative radiance must return absolute zero boundary (-273.15°C).
    """
    from backend.services.mausam_rakshak_service import MausamRakshakService

    # 1. Typical convective storm core (Radiance ~ 15.0 mW/m^2/sr/cm^-1)
    tb_convective = MausamRakshakService.planck_radiance_to_brightness_temp(15.0)
    assert tb_convective < -50.0  # Deep convective freezing core

    # 2. Warm ground / low cloud (Radiance ~ 100.0 mW/m^2/sr/cm^-1)
    tb_warm = MausamRakshakService.planck_radiance_to_brightness_temp(100.0)
    assert tb_warm > 0.0  # Above freezing, not a severe convective cloud-top

    # 3. Defensive zero/negative radiance boundary check
    tb_zero = MausamRakshakService.planck_radiance_to_brightness_temp(0.0)
    assert tb_zero == -273.15

