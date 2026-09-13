import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.aapda_mitra_service import aapda_mitra_service
from backend.services.prithvi_mesh_service import prithvi_mesh_service
from backend.models.schemas import AapdaMitraBridgeRequest, HeadcountTallyRequest

client = TestClient(app)


def test_aapda_mitra_marathi_community_dispatch():
    """
    Verifies Aapda Mitra Community Bridge for Marathi village:
    - High-decibel acoustic siren pattern
    - Vernacular loudspeaker PA announcement script
    - 2G button-phone SMS clamped strictly to <= 160 GSM chars
    - Action checklist & vulnerable household prioritization
    """
    req = AapdaMitraBridgeRequest(
        volunteer_id="AAPDA-MH-042",
        village_panchayat="रोहा (Roha)",
        latitude=18.4352,
        longitude=73.1189,
        language="mr",
        hazard_type="CYCLONE",
        severity="CRITICAL_RED",
        registered_button_phone_count=65
    )
    dispatch = aapda_mitra_service.create_community_dispatch(req)

    assert "AAPDA-" in dispatch.dispatch_id
    assert dispatch.village_panchayat == "रोहा (Roha)"
    assert dispatch.siren_frequency_hz == 950
    assert "Warble" in dispatch.siren_pattern
    assert "रोहा" in dispatch.loudspeaker_announcement_script
    assert "शाळेत आश्रय" in dispatch.loudspeaker_announcement_script
    assert len(dispatch.button_phone_sms_broadcast) <= 160
    assert len(dispatch.action_checklist) == 4
    assert any("लाऊडस्पीकर" in item for item in dispatch.action_checklist)
    assert len(dispatch.vulnerable_household_priorities) >= 3


def test_aapda_mitra_telugu_and_tamil_dispatch():
    """
    Verifies multi-vernacular community dispatch for coastal southern states (Andhra/Tamil Nadu).
    """
    # Telugu dispatch
    req_te = AapdaMitraBridgeRequest(
        volunteer_id="AAPDA-AP-108",
        village_panchayat="మచిలీపట్నం (Machilipatnam)",
        latitude=16.1875,
        longitude=81.1389,
        language="te",
        hazard_type="CYCLONE",
        severity="CRITICAL_RED"
    )
    dispatch_te = aapda_mitra_service.create_community_dispatch(req_te)
    assert "హెచ్చరిక" in dispatch_te.loudspeaker_announcement_script
    assert len(dispatch_te.button_phone_sms_broadcast) <= 160

    # Tamil dispatch
    req_ta = AapdaMitraBridgeRequest(
        volunteer_id="AAPDA-TN-055",
        village_panchayat="நாகப்பட்டினம் (Nagapattinam)",
        latitude=10.7672,
        longitude=79.8449,
        language="ta",
        hazard_type="TSUNAMI",
        severity="CRITICAL_RED"
    )
    dispatch_ta = aapda_mitra_service.create_community_dispatch(req_ta)
    assert "எச்சரிக்கை" in dispatch_ta.loudspeaker_announcement_script
    assert len(dispatch_ta.button_phone_sms_broadcast) <= 160


def test_headcount_tally_and_prithvi_sos_beacon_generation():
    """
    Verifies muster point headcount tracking:
    - When missing persons > 0, an outbound 64-byte PRITHVI-Mesh SOS beacon is packed
    - The generated SOS beacon frame hex decodes cleanly with integrity_verified=True
    """
    # Scenario A: All accounted for, no SOS
    req_safe = HeadcountTallyRequest(
        volunteer_id="VOL-01",
        village_panchayat="Roha",
        shelter_name="ZP High School Ward 3",
        evacuated_citizens=120,
        missing_unaccounted=0,
        urgent_medical_cases=0,
        latitude=18.4352,
        longitude=73.1189
    )
    rep_safe = aapda_mitra_service.record_headcount_tally(req_safe)
    assert rep_safe.safe_percentage == 100.0
    assert rep_safe.sos_beacon_required is False
    assert rep_safe.prithvi_mesh_sos_frame_hex is None

    # Scenario B: 4 missing and 2 medical emergencies -> Outbound PRITHVI-Mesh SOS frame generated!
    req_sos = HeadcountTallyRequest(
        volunteer_id="VOL-01",
        village_panchayat="Roha",
        shelter_name="ZP High School Ward 3",
        evacuated_citizens=116,
        missing_unaccounted=4,
        urgent_medical_cases=2,
        latitude=18.4352,
        longitude=73.1189
    )
    rep_sos = aapda_mitra_service.record_headcount_tally(req_sos)
    assert rep_sos.sos_beacon_required is True
    assert rep_sos.prithvi_mesh_sos_frame_hex is not None
    assert len(rep_sos.prithvi_mesh_sos_frame_hex) == 128  # 64 bytes = 128 hex chars

    # Verify that the generated SOS frame can be unpacked by PRITHVI-Mesh service
    raw_frame = bytes.fromhex(rep_sos.prithvi_mesh_sos_frame_hex)
    unpacked, verified = prithvi_mesh_service.unpack_mesh_frame(raw_frame)
    assert verified is True
    assert unpacked.hazard_code == 6  # EVACUATION/SOS
    assert "MISS:4" in unpacked.payload_text
    assert "MED:2" in unpacked.payload_text


def test_api_aapda_mitra_endpoints():
    """
    Verifies FastAPI endpoints:
    - POST /api/aapda-mitra/bridge-alert
    - POST /api/aapda-mitra/headcount-tally
    """
    # 1. Bridge alert endpoint
    bridge_payload = {
        "volunteer_id": "VOL-TEST",
        "village_panchayat": "Wardha",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "hi",
        "hazard_type": "CLOUDBURST",
        "severity": "CRITICAL_RED",
        "registered_button_phone_count": 50
    }
    res_b = client.post("/api/aapda-mitra/bridge-alert", json=bridge_payload)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["village_panchayat"] == "Wardha"
    assert "लाउडस्पीकर" in data_b["loudspeaker_announcement_script"] or "सावधान" in data_b["loudspeaker_announcement_script"]
    assert len(data_b["button_phone_sms_broadcast"]) <= 160

    # 2. Headcount tally endpoint
    tally_payload = {
        "volunteer_id": "VOL-TEST",
        "village_panchayat": "Wardha",
        "shelter_name": "Community Center Ward 1",
        "evacuated_citizens": 80,
        "missing_unaccounted": 3,
        "urgent_medical_cases": 1,
        "latitude": 20.7453,
        "longitude": 78.6022
    }
    res_t = client.post("/api/aapda-mitra/headcount-tally", json=tally_payload)
    assert res_t.status_code == 200
    data_t = res_t.json()
    assert data_t["sos_beacon_required"] is True
    assert data_t["prithvi_mesh_sos_frame_hex"] is not None
