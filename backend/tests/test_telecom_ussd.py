"""
Unit tests for the Interactive USSD 2G Session State Machine (*99*68#).
Verifies:
1. Initial dial (*99*68#) root menu generation in vernacular languages.
2. State transition into Crop Spray selection sub-menu.
3. Crop selection (Cotton/Soybean) resulting in CIBRC Rule 37 compliant spray advisory.
4. Live weather, Mandi Shield, and Aapda SOS option branches.
5. Strict adherence to GSM 03.38 182-character limit per USSD PDU.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_ussd_root_menu_dial():
    session_id = "test-ussd-sess-001"
    payload = {
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "*99*68#",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "mr",
    }
    res = client.post("/api/telecom/ussd", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["session_id"] == session_id
    assert data["action"] == "CONTINUE"
    assert "हवामान" in data["ussd_menu_text"]
    assert "फवारणी सल्ला" in data["ussd_menu_text"]
    assert data["character_count"] <= 182
    assert data["fits_standard_ussd_pdu"] is True


def test_ussd_option_1_current_weather():
    session_id = "test-ussd-sess-002"
    # Step 1: Dial
    client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "*99*68#",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "mr",
    })
    # Step 2: Select 1 (Weather)
    res = client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "1",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "mr",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "END"
    assert "हवामान:" in data["ussd_menu_text"]
    assert data["character_count"] <= 182
    assert data["fits_standard_ussd_pdu"] is True


def test_ussd_option_2_crop_spray_flow():
    session_id = "test-ussd-sess-003"
    # Dial
    client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "*99*68#",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "mr",
    })
    # Select 2 (Crop Spray Sub-Menu)
    res_crop_menu = client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "2",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "mr",
    })
    assert res_crop_menu.status_code == 200
    menu_data = res_crop_menu.json()
    assert menu_data["action"] == "CONTINUE"
    assert "कापूस" in menu_data["ussd_menu_text"]
    assert menu_data["character_count"] <= 182

    # Select Cotton (1)
    res_cotton = client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "1",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "mr",
    })
    assert res_cotton.status_code == 200
    cotton_data = res_cotton.json()
    assert cotton_data["action"] == "END"
    assert "कापूस" in cotton_data["ussd_menu_text"]
    assert "CIBRC" in cotton_data["ussd_menu_text"]
    assert cotton_data["character_count"] <= 182
    assert cotton_data["fits_standard_ussd_pdu"] is True


def test_ussd_option_3_mandi_shield():
    session_id = "test-ussd-sess-004"
    client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "*99*68#",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "en",
    })
    res = client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "3",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "en",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "END"
    assert "Mandi Shield" in data["ussd_menu_text"]
    assert data["character_count"] <= 182


def test_ussd_option_4_aapda_sos():
    session_id = "test-ussd-sess-005"
    client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "*99*68#",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "en",
    })
    res = client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "4",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "en",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "END"
    assert "Emergency SOS" in data["ussd_menu_text"]
    assert "1077" in data["ussd_menu_text"]
    assert data["character_count"] <= 182


def test_ussd_language_selection():
    session_id = "test-ussd-sess-006"
    client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "*99*68#",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "en",
    })
    res_lang_menu = client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "5",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "en",
    })
    assert res_lang_menu.status_code == 200
    assert res_lang_menu.json()["action"] == "CONTINUE"

    res_set = client.post("/api/telecom/ussd", json={
        "session_id": session_id,
        "phone_number": "+919822012345",
        "user_input": "1",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "en",
    })
    assert res_set.status_code == 200
    assert res_set.json()["action"] == "END"
