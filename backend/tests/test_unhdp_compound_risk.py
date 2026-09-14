"""
Unit and Integration Tests for Mausam-Chakra Cross-Agency Compound Disaster Risk Engine (CDRI).
Validates multi-hazard interaction multiplier, estuarine backwater locks, and canonical API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.unhdp_service import unhdp_service
from backend.models.schemas import UNHDPCompoundRiskResponse

client = TestClient(app)


def test_compound_risk_chennai_estuarine_backwater():
    """
    Verifies that co-occurrence of CWC Adyar river flood stage + INCOIS Marina swell
    triggers the non-linear estuarine backwater interaction penalty (> 1.35x).
    """
    # Chennai coastal estuarine zone
    risk = unhdp_service.calculate_compound_risk(lat=13.04, lon=80.25, radius_km=25.0)

    assert isinstance(risk, UNHDPCompoundRiskResponse)
    assert risk.cdri_score >= 50.0  # Compound threat should elevate score
    assert risk.severity in ["ALERT", "WARNING"]
    assert risk.compound_type == "ESTUARINE_BACKWATER_SURGE"
    assert risk.interaction_multiplier >= 1.35
    assert len(risk.co_occurring_factors) >= 2

    # Check that both CWC and INCOIS are present in the co-occurring factors
    agencies = {f.agency for f in risk.co_occurring_factors}
    assert "CWC" in agencies
    assert "INCOIS" in agencies

    # Directive should have urgent plain-language guidance
    assert "evacuation" in risk.citizen_directive.lower() or "elevated ground" in risk.citizen_directive.lower() or "caution" in risk.citizen_directive.lower()


def test_compound_risk_bengaluru_nominal_stable():
    """
    Verifies that inland locations with no river flood or marine surge
    yield nominal stable risk scores without artificial compounding.
    """
    # HAL Airport station coordinates in Bengaluru
    risk = unhdp_service.calculate_compound_risk(lat=12.95, lon=77.66, radius_km=25.0)

    assert isinstance(risk, UNHDPCompoundRiskResponse)
    assert risk.cdri_score < 30.0
    assert risk.severity == "SAFE"
    assert risk.interaction_multiplier == 1.0
    assert risk.compound_type in ["NOMINAL_STABLE", "ISOLATED_HAZARD"]


def test_compound_risk_mathematical_bounds_and_invariants():
    """
    Verifies that CDRI score is strictly bounded [0, 100] and interaction multiplier in [1.0, 1.75].
    """
    test_points = [
        (13.0827, 80.2707),  # Chennai Central
        (12.9500, 77.6680),  # Bengaluru HAL
        (19.0760, 72.8777),  # Mumbai
        (22.5726, 88.3639),  # Kolkata
        (0.0, 0.0),          # Null island
    ]

    for lat, lon in test_points:
        risk = unhdp_service.calculate_compound_risk(lat=lat, lon=lon, radius_km=25.0)
        assert 0.0 <= risk.cdri_score <= 100.0
        assert 1.0 <= risk.interaction_multiplier <= 1.75
        assert risk.severity in ["SAFE", "WATCH", "ALERT", "WARNING"]
        assert len(risk.headline) > 0
        assert len(risk.citizen_directive) > 0


def test_api_unhdp_compound_risk_endpoint():
    """
    Verifies HTTP GET /api/unhdp/compound-risk returns 200 and compliant Pydantic schema.
    """
    response = client.get("/api/unhdp/compound-risk?lat=13.04&lon=80.25&radius_km=25.0")
    assert response.status_code == 200
    data = response.json()

    assert "cdri_score" in data
    assert "severity" in data
    assert "compound_type" in data
    assert "interaction_multiplier" in data
    assert "co_occurring_factors" in data
    assert data["center_latitude"] == 13.04
    assert data["center_longitude"] == 80.25

    # Test cache repeatability
    response_cached = client.get("/api/unhdp/compound-risk?lat=13.04&lon=80.25&radius_km=25.0")
    assert response_cached.status_code == 200
    assert response_cached.json()["cdri_score"] == data["cdri_score"]


def test_api_unhdp_compound_risk_query_validation():
    """
    Verifies that out-of-bounds latitude, longitude, or radius_km are rejected with 422.
    """
    bad_lat = client.get("/api/unhdp/compound-risk?lat=999.0&lon=80.0")
    assert bad_lat.status_code == 422

    bad_radius = client.get("/api/unhdp/compound-risk?lat=13.0&lon=80.0&radius_km=500.0")
    assert bad_radius.status_code == 422
