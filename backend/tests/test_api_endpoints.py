import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert data["service"] == "WeatherGPT-068"

def test_api_weather_current():
    res = client.get("/api/weather/current?lat=20.7453&lon=78.6022")
    assert res.status_code == 200
    data = res.json()
    assert "current" in data
    assert "nowcast_3h" in data
    assert data["latitude"] == 20.7453

def test_api_chat_interaction():
    payload = {
        "message": "Is it safe to spray my cotton crop today?",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "en"
    }
    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "reply_text" in data
    assert data["detected_intent"] == "AGROMET_SPRAY"

def test_api_alerts_active():
    res = client.get("/api/alerts/active?lat=20.7453&lon=78.6022")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_api_climate_compare():
    res = client.get("/api/climate/compare?lat=20.7453&lon=78.6022")
    assert res.status_code == 200
    data = res.json()
    assert "normal_30year_baseline_mm" in data
    assert "recent_10day_rainfall_mm" in data

def test_api_telecom_missed_call():
    payload = {
        "phone_number": "+919876543210",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "hi"
    }
    res = client.post("/api/telecom/missed-call", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OUTBOUND_DIALED"

def test_api_telecom_sms_payload():
    res = client.get("/api/telecom/sms-payload?lat=20.7453&lon=78.6022")
    assert res.status_code == 200
    data = res.json()
    assert data["fits_single_sms"] is True

def test_api_flood_detour():
    res = client.get("/api/flood/detour?lat=20.7453&lon=78.6022")
    assert res.status_code == 200
    data = res.json()
    assert "recommended_detour" in data

def test_api_mandi_status():
    res = client.get("/api/mandi/status?mandi_id=mandi_01")
    assert res.status_code == 200
    data = res.json()
    assert "tarpaulin_advisory" in data

def test_api_rakshak_report_and_pins():
    report_payload = {
        "hazard_type": "HAIL",
        "severity": "PEA_SIZE",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "user_id": "test_citizen_user",
        "timestamp": "2026-09-12T12:00:00Z"
    }
    res = client.post("/api/rakshak/report", json=report_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["VERIFIED", "PENDING_CONSENSUS"]

    # Check verified pins endpoint
    pins_res = client.get("/api/rakshak/verified?lat=20.7453&lon=78.6022")
    assert pins_res.status_code == 200
    assert isinstance(pins_res.json(), list)
