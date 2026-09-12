import pytest
from backend.services.mandi_shield_service import mandi_shield_service
from backend.services.flood_routing_service import flood_routing_service
from backend.services.telecom_bridge import telecom_bridge
from backend.services.mausam_rakshak_service import mausam_rakshak_service
from backend.models.schemas import MissedCallRequest, CitizenHazardReport

@pytest.mark.asyncio
async def test_mandi_shield_risk():
    report = await mandi_shield_service.check_mandi_risk("mandi_01")
    assert report is not None
    assert report.risk_level in ["LOW", "MODERATE", "CRITICAL"]
    assert report.tarpaulin_advisory != ""

@pytest.mark.asyncio
async def test_flood_routing_detour():
    route = await flood_routing_service.get_detour_advisory(lat=20.7453, lon=78.6022)
    assert route is not None
    assert route.risk_level in ["CLEAR", "CAUTION", "IMPASSABLE"]
    assert route.recommended_detour != ""

@pytest.mark.asyncio
async def test_telecom_bridge_missed_call():
    req = MissedCallRequest(
        phone_number="+919876543210",
        latitude=20.7453,
        longitude=78.6022,
        language="hi"
    )
    res = await telecom_bridge.handle_missed_call(req)
    assert res.status == "OUTBOUND_DIALED"
    assert "नमस्ते" in res.voice_script or "वेदर-जीपीटी" in res.voice_script
    assert "1" in res.dtmf_options

@pytest.mark.asyncio
async def test_emergency_sms_payload():
    sms = await telecom_bridge.get_emergency_sms_payload(lat=20.7453, lon=78.6022)
    assert sms["fits_single_sms"] is True
    assert sms["character_count"] <= 160
    assert "[WTH-ALERT]" in sms["sms_text"]

def test_mausam_rakshak_anti_fake_verification():
    report = CitizenHazardReport(
        hazard_type="HAIL",
        severity="GOLF_BALL",
        latitude=20.7453,
        longitude=78.6022,
        user_id="farmer_citizen_99",
        timestamp="2026-09-12T12:00:00Z"
    )
    res = mausam_rakshak_service.submit_report(report)
    assert res.report_id is not None
    assert res.physics_check_passed is True
    assert res.satellite_cloud_temp_c <= -40.0
