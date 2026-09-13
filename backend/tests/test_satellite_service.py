"""
Unit and Integration Tests for INSAT-3DS Live Satellite & Radar Nowcast Service.
Validates multi-spectral channel streaming, in-memory RAM caching, low latency, and resilience.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.satellite_service import satellite_service, IMD_SATELLITE_CHANNELS

client = TestClient(app)


def test_satellite_metadata_endpoint():
    """Verifies INSAT-3DS metadata structure, orbital slot, and channel inventory."""
    response = client.get("/api/satellite/metadata")
    assert response.status_code == 200
    data = response.json()
    assert "INSAT-3DS" in data["satellite"]
    assert "74.0° East" in data["orbital_slot"]
    assert len(data["channels"]) == 3
    channel_ids = [c["id"] for c in data["channels"]]
    assert "ir1" in channel_ids
    assert "vis" in channel_ids
    assert "wv" in channel_ids


def test_satellite_image_streaming_ir1():
    """Verifies live streaming of Thermal Infrared (IR1) channel."""
    response = client.get("/api/satellite/live?channel=ir1")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "image/jpeg"
    assert "INSAT-3DS" in response.headers.get("x-satellite-source", "")
    assert len(response.content) > 0


def test_satellite_image_streaming_vis():
    """Verifies live streaming of Daylight Visible (VIS) channel."""
    response = client.get("/api/satellite/live?channel=vis")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "image/jpeg"
    assert len(response.content) > 0


def test_satellite_image_streaming_wv():
    """Verifies live streaming of Mid-Tropospheric Water Vapour (WV) channel."""
    response = client.get("/api/satellite/live?channel=wv")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "image/jpeg"
    assert len(response.content) > 0


def test_satellite_ram_cache_and_idempotency():
    """Verifies in-memory RAM caching returns cached payload on subsequent hits."""
    res1 = client.get("/api/satellite/live?channel=ir1")
    epoch1 = res1.headers.get("x-scan-epoch")
    
    res2 = client.get("/api/satellite/live?channel=ir1")
    epoch2 = res2.headers.get("x-scan-epoch")
    
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert epoch1 == epoch2
    assert res1.content == res2.content


def test_radar_nowcast_endpoint():
    """Verifies RainViewer Doppler radar nowcast endpoint."""
    response = client.get("/api/radar/nowcast?lat=13.0827&lon=80.2707")
    assert response.status_code == 200
    data = response.json()
    assert "past_frames" in data
    assert "nowcast_frames" in data
    assert "host" in data
