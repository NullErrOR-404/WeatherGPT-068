import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.prithvi_mesh_service import (
    prithvi_mesh_service,
    PrithviMeshPacket,
    PrithviMeshService,
)

client = TestClient(app)


def test_prithvi_mesh_64_byte_frame_pack_unpack():
    """
    Verifies PRITHVI-Mesh 64-byte binary frame packing, CRC-16 checksum,
    and lossless decoding.
    """
    packet = PrithviMeshPacket(
        hazard_code=1,  # CYCLONE
        severity=3,    # CRITICAL_RED
        latitude=20.7453,
        longitude=78.6022,
        radius_meters=10000,
        ttl=16,
        sequence_id=4092,
        origin_timestamp=1726156800,
        payload_text="CYCLONE LANDFALL 18:00 SHELTER PUCCA"
    )

    # Pack into binary frame
    frame = prithvi_mesh_service.pack_mesh_frame(packet)
    assert len(frame) == 64  # Strictly 64 bytes!
    assert frame[:2] == b"PR"  # PRITHVI magic header

    # Unpack frame
    decoded, valid = prithvi_mesh_service.unpack_mesh_frame(frame)
    assert valid is True
    assert decoded is not None
    assert decoded.hazard_code == 1
    assert decoded.severity == 3
    assert abs(decoded.latitude - 20.7453) < 0.001
    assert abs(decoded.longitude - 78.6022) < 0.001
    assert decoded.radius_meters == 10000
    assert decoded.sequence_id == 4092
    assert "CYCLONE LANDFALL" in decoded.payload_text


def test_prithvi_mesh_corrupted_frame_rejection():
    """
    Verifies that CRC-16 CCITT detects and rejects any bit tampering.
    """
    packet = PrithviMeshPacket(
        hazard_code=2,  # CLOUDBURST
        severity=3,
        latitude=13.0827,
        longitude=80.2707,
        radius_meters=5000,
        ttl=8,
        sequence_id=1234,
        payload_text="CLOUDBURST ALERT FLASH FLOOD"
    )
    frame = bytearray(prithvi_mesh_service.pack_mesh_frame(packet))

    # Tamper with 1 byte in the payload text (byte index 25)
    frame[25] ^= 0xFF

    # Unpacking tampered frame must fail integrity check
    decoded, valid = prithvi_mesh_service.unpack_mesh_frame(bytes(frame))
    assert valid is False
    assert decoded is None


def test_prithvi_mesh_epidemic_gossip_relay_lifecycle():
    """
    Verifies:
    1. First relay passes and decrements TTL
    2. Duplicate relay is dropped (anti-entropy loop prevention)
    3. TTL=1 expires and drops
    4. Out-of-bounds nodes drop the packet
    """
    service = PrithviMeshService()
    packet = PrithviMeshPacket(
        hazard_code=1,
        severity=3,
        latitude=19.0760,
        longitude=72.8777,
        radius_meters=5000,
        ttl=16,
        sequence_id=999,
        origin_timestamp=1726157000,
        payload_text="HIGH SURGE WARNING LEAVE COAST"
    )
    frame = service.pack_mesh_frame(packet)

    # 1. First reception within 5km radius (e.g. 19.080, 72.880)
    rep1 = service.process_incoming_relay(frame, receiver_lat=19.080, receiver_lon=72.880)
    assert rep1.status == "RELAYED"
    assert rep1.hops_remaining == 15
    assert rep1.integrity_verified is True
    assert rep1.data_mule_queued is True

    # 2. Immediate duplicate arrival must be dropped
    rep2 = service.process_incoming_relay(frame, receiver_lat=19.081, receiver_lon=72.881)
    assert rep2.status == "DROPPED_DUPLICATE"
    assert rep2.data_mule_queued is False

    # 3. Packet with TTL=1 must expire and drop
    packet_expired = PrithviMeshPacket(
        hazard_code=1,
        severity=2,
        latitude=19.0760,
        longitude=72.8777,
        radius_meters=5000,
        ttl=1,
        sequence_id=1000,
        origin_timestamp=1726157010,
        payload_text="EXPIRED HOPS PACKET"
    )
    frame_expired = service.pack_mesh_frame(packet_expired)
    rep_exp = service.process_incoming_relay(frame_expired, receiver_lat=19.080, receiver_lon=72.880)
    assert rep_exp.status == "DROPPED_TTL_EXPIRED"

    # 4. Out-of-bounds receiver (e.g. receiver in Delhi 1000km away from Mumbai)
    packet_far = PrithviMeshPacket(
        hazard_code=1,
        severity=3,
        latitude=19.0760,
        longitude=72.8777,
        radius_meters=5000,  # 5km radius (max relay ~ 10km)
        ttl=10,
        sequence_id=1001,
        origin_timestamp=1726157020,
        payload_text="LOCAL TSUNAMI ADVISORY"
    )
    frame_far = service.pack_mesh_frame(packet_far)
    rep_far = service.process_incoming_relay(frame_far, receiver_lat=28.6139, receiver_lon=77.2090)
    assert rep_far.status == "DROPPED_OUT_OF_BOUNDS"


def test_offline_72h_sync_pack_generator():
    """
    Verifies offline 72-hour forecast pack generator:
    - 72 hourly slots
    - Cryptographic SHA-256 provenance hash
    - Full offline advisories
    """
    bundle = prithvi_mesh_service.generate_offline_72h_pack("te7u1d", base_temp_c=28.5)
    assert bundle.geohash == "te7u1d"
    assert bundle.valid_hours == 72
    assert len(bundle.hourly_slots) == 72
    assert len(bundle.sha256_provenance_hash) == 64
    assert "PRITHVI Scheme" in bundle.source_authority
    assert "agro_spray_guidance" in bundle.offline_livelihood_advisories


def test_api_mesh_and_sync_endpoints():
    """
    Verifies FastAPI endpoints:
    - POST /api/mesh/pack
    - POST /api/mesh/unpack
    - POST /api/mesh/relay
    - GET /api/sync/offline-pack
    """
    # 1. Pack endpoint
    pack_payload = {
        "hazard_code": 1,
        "severity": 3,
        "latitude": 20.7453,
        "longitude": 78.6022,
        "radius_meters": 8000,
        "ttl": 16,
        "sequence_id": 555,
        "payload_text": "SEVERE SQUALL IMMINENT TAKE SHELTER"
    }
    res_pack = client.post("/api/mesh/pack", json=pack_payload)
    assert res_pack.status_code == 200
    hex_data = res_pack.json()["frame_hex"]
    assert len(hex_data) == 128  # 64 bytes = 128 hex chars

    # 2. Unpack endpoint
    res_unpack = client.post(f"/api/mesh/unpack?frame_hex={hex_data}")
    assert res_unpack.status_code == 200
    unpack_data = res_unpack.json()
    assert unpack_data["integrity_verified"] is True
    assert unpack_data["packet"]["sequence_id"] == 555

    # 3. Relay endpoint
    res_relay = client.post(f"/api/mesh/relay?frame_hex={hex_data}&receiver_lat=20.750&receiver_lon=78.605")
    assert res_relay.status_code == 200
    relay_data = res_relay.json()
    assert relay_data["status"] == "RELAYED"
    assert relay_data["hops_remaining"] == 15

    # 4. Offline sync endpoint
    res_sync = client.get("/api/sync/offline-pack?geohash=te7u1d")
    assert res_sync.status_code == 200
    sync_data = res_sync.json()
    assert len(sync_data["hourly_slots"]) == 72
    assert sync_data["valid_hours"] == 72
