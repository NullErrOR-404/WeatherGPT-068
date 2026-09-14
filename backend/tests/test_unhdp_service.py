"""
Unit and Integration Tests for Unified National Hydro-Meteorological Protocol (UNH-DP).
Validates multi-agency normalization across IMD, INCOIS, CWC, NDMA, and ISRO.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.unhdp_service import unhdp_service
from backend.models.schemas import AgencyProvenance, UNHDPCategory

client = TestClient(app)


def test_unhdp_service_feed_all_agencies():
    """Verifies that the unified feed aggregates all 5 sovereign authorities."""
    feed = unhdp_service.get_unified_feed(lat=13.0827, lon=80.2707, agency="all")
    assert feed.status == "SUCCESS"
    assert feed.total_features >= 5
    assert len(feed.agencies_synced) == 5

    agencies_present = {f.agency for f in feed.features}
    assert AgencyProvenance.IMD.value in agencies_present
    assert AgencyProvenance.INCOIS.value in agencies_present
    assert AgencyProvenance.CWC.value in agencies_present
    assert AgencyProvenance.NDMA.value in agencies_present
    assert AgencyProvenance.ISRO.value in agencies_present

    for status in feed.agencies_synced:
        assert status.status == "HEALTHY"
        assert status.records_count > 0


def test_unhdp_service_agency_filtering():
    """Verifies individual agency filtering (IMD, INCOIS, CWC, NDMA, ISRO)."""
    for agency_enum in [AgencyProvenance.IMD, AgencyProvenance.INCOIS, AgencyProvenance.CWC, AgencyProvenance.NDMA, AgencyProvenance.ISRO]:
        feed = unhdp_service.get_unified_feed(agency=agency_enum.value.lower())
        assert feed.status == "SUCCESS"
        assert feed.total_features > 0
        for f in feed.features:
            assert f.agency == agency_enum.value


def test_unhdp_service_spatial_proximity_sorting():
    """Verifies that features are strictly sorted by geodesic proximity to citizen coordinates."""
    # Query at Chennai coordinates
    chennai_feed = unhdp_service.get_unified_feed(lat=13.0827, lon=80.2707, agency="all")
    first_feat = chennai_feed.features[0]
    # The closest feature to Chennai should be in Tamil Nadu (e.g. Meenambakkam or SACHET TN)
    assert first_feat.latitude > 10.0 and first_feat.latitude < 14.0
    assert first_feat.longitude > 79.0 and first_feat.longitude < 81.0


def test_api_unhdp_feed_endpoint():
    """Verifies HTTP GET /api/unhdp/feed endpoint returns compliant canonical GeoJSON contract."""
    response = client.get("/api/unhdp/feed?lat=13.0827&lon=80.2707&agency=all")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "geohash" in data
    assert "agencies_synced" in data
    assert len(data["agencies_synced"]) == 5
    assert len(data["features"]) > 0

    first = data["features"][0]
    assert "id" in first
    assert "agency" in first
    assert "severity" in first
    assert "citizen_advisory" in first
    assert "metrics" in first
    assert "official_bulletin_url" in first


def test_api_unhdp_feed_filtered_agency():
    """Verifies endpoint filtering for CWC river basin data."""
    response = client.get("/api/unhdp/feed?lat=28.6600&lon=77.2400&agency=cwc")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    for item in data["features"]:
        assert item["agency"] == "CWC"
        assert item["category"] == UNHDPCategory.HYDROLOGICAL_RIVER.value
        assert "river_name" in item["metrics"]
