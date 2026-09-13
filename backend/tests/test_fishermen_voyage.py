import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.fishermen_voyage_service import (
    fishermen_voyage_service,
    FishermenVoyageService,
)
from backend.models.schemas import MarineVoyageRequest

client = TestClient(app)


def test_haversine_and_bearing_geometry():
    """
    Verifies great-circle distance and compass bearing geometry.
    """
    # Distance between Nagapattinam harbor and a point 20km east
    d_km = FishermenVoyageService.haversine_distance_km(10.7672, 79.8449, 10.7672, 80.0282)
    assert 19.0 <= d_km <= 21.0

    # Bearing due East should be ~ 90 degrees
    bearing = FishermenVoyageService.calculate_bearing_deg(10.7672, 79.8449, 10.7672, 80.0282)
    assert 88 <= bearing <= 92


def test_imbl_sovereign_border_siren_in_palk_strait():
    """
    Verifies that approaching the 3nm International Maritime Boundary Line (IMBL)
    in the Palk Strait triggers the sovereign border siren and Tamil warning.
    """
    # Boat positioned very close to the IMBL (9.66°N, 79.84°E)
    req_border = MarineVoyageRequest(
        boat_name="Kadalkanni-07",
        current_latitude=9.6600,
        current_longitude=79.8400,
        harbor_name="Rameswaram Fishing Jetty",
        harbor_latitude=9.2876,
        harbor_longitude=79.3129,
        cruising_speed_knots=6.0,
        language="ta"
    )
    advisory = fishermen_voyage_service.generate_voyage_advisory(req_border)

    assert advisory.distance_to_imbl_nm <= 3.0  # Within 3nm buffer
    assert advisory.imbl_border_siren_active is True
    assert advisory.safety_badge == "BORDER_BREACH_WARNING"
    assert "சர்வதேச கடல் எல்லை" in advisory.coastal_voice_bulletin  # International border warning in Tamil
    assert "Maritime Zones of India Act 1976" in advisory.statutory_disclaimer


def test_safe_voyage_and_turnback_deadline_calculation():
    """
    Verifies artisanal craft voyage planning:
    - Boat safe inside Indian coastal waters
    - Exact 6-knot turnback deadline calculation
    - INCOIS PFZ fish shoal bearing and distance
    """
    req_safe = MarineVoyageRequest(
        boat_name="Meenavan-01",
        current_latitude=10.7800,
        current_longitude=79.9200,
        harbor_name="Nagapattinam Fishing Harbour",
        harbor_latitude=10.7672,
        harbor_longitude=79.8449,
        cruising_speed_knots=6.0,
        language="ta"
    )
    advisory = fishermen_voyage_service.generate_voyage_advisory(req_safe)

    assert advisory.imbl_border_siren_active is False
    assert advisory.distance_to_imbl_nm > 5.0
    assert advisory.safety_badge in ["SAFE_VOYAGE", "CAUTION_ROUGH_SEAS"]
    assert advisory.time_remaining_to_turnback_mins > 0
    assert "IST" in advisory.turnback_deadline_ist

    # PFZ check
    pfz = advisory.nearest_pfz_shoal
    assert pfz["pfz_id"] == "PFZ-TN-01"
    assert "Mackerel" in pfz["fish_species"]
    assert 0 <= pfz["bearing_degrees"] <= 360


def test_multi_vernacular_coastal_dialects():
    """
    Verifies coastal voice bulletins for Malayalam and Telugu fishing communities.
    """
    # Kerala coast in Malayalam
    req_kl = MarineVoyageRequest(
        boat_name="Sagar-Rani",
        current_latitude=9.9500,
        current_longitude=76.1500,
        harbor_name="Kochi Fishing Harbour",
        harbor_latitude=9.9312,
        harbor_longitude=76.2673,
        language="ml"
    )
    advisory_kl = fishermen_voyage_service.generate_voyage_advisory(req_kl)
    assert "നമസ്കാരം" in advisory_kl.coastal_voice_bulletin

    # Andhra coast in Telugu
    req_ap = MarineVoyageRequest(
        boat_name="Matsya-Mitra",
        current_latitude=17.7000,
        current_longitude=83.3800,
        harbor_name="Visakhapatnam Fishing Harbour",
        harbor_latitude=17.6868,
        harbor_longitude=83.2185,
        language="te"
    )
    advisory_ap = fishermen_voyage_service.generate_voyage_advisory(req_ap)
    assert "నమస్కారం" in advisory_ap.coastal_voice_bulletin


def test_api_marine_endpoints():
    """
    Verifies FastAPI marine endpoints:
    - POST /api/marine/voyage-advisory
    - GET /api/marine/pfz-shoals
    """
    # 1. Voyage advisory endpoint
    payload = {
        "boat_name": "Sea-King",
        "current_latitude": 10.8000,
        "current_longitude": 79.9000,
        "harbor_name": "Nagapattinam",
        "harbor_latitude": 10.7672,
        "harbor_longitude": 79.8449,
        "cruising_speed_knots": 6.0,
        "language": "en"
    }
    res_adv = client.post("/api/marine/voyage-advisory", json=payload)
    assert res_adv.status_code == 200
    data = res_adv.json()
    assert data["boat_name"] == "Sea-King"
    assert "turnback_deadline_ist" in data
    assert "nearest_pfz_shoal" in data

    # 2. PFZ shoals endpoint
    res_pfz = client.get("/api/marine/pfz-shoals")
    assert res_pfz.status_code == 200
    shoals = res_pfz.json()
    assert len(shoals) >= 4
    assert shoals[0]["fish_species"] != ""
