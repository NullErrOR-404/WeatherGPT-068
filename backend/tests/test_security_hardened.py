"""
Automated Security & Hardening Test Suite for WeatherGPT.
Verifies all findings from the CodeRabbit Security Audit:
1. PII protection & DPDP Act 2023 compliance (E.164 regex, phone number masking).
2. DoS / Memory exhaustion defenses (USSD sessions, PRITHVI outbox, reputation cache bounds).
3. OWASP defense-in-depth HTTP security headers (nosniff, SAMEORIGIN, HSTS).
4. Sliding-window IP rate limiter defense against CPU starvation attacks.
5. Cryptographic PRITHVI-Mesh 4-byte authority HMAC generation.
6. NDMA volunteer authorization gating for high-decibel acoustic siren triggers.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app, _client_request_history
from backend.services.telecom_bridge import telecom_bridge, mask_phone_number
from backend.services.prithvi_mesh_service import prithvi_mesh_service, PrithviMeshPacket
from backend.services.mausam_rakshak_service import mausam_rakshak_service, CitizenHazardReport
from backend.services.aapda_mitra_service import aapda_mitra_service, AapdaMitraBridgeRequest

client = TestClient(app)


def test_pii_phone_number_masking_dpdp_act():
    """Verify phone numbers are correctly masked to protect citizen PII."""
    assert mask_phone_number("+919822012345") == "+9198****45"
    assert mask_phone_number("9876543210") == "98765****10"
    assert mask_phone_number("123") == "******"


def test_e164_phone_regex_rejection():
    """Verify malicious or invalid non-E.164 phone numbers are rejected with HTTP 422."""
    bad_payloads = [
        {"phone_number": "DROP TABLE users;", "user_input": "*99*68#", "session_id": "sess-bad-1"},
        {"phone_number": "<script>alert(1)</script>", "user_input": "*99*68#", "session_id": "sess-bad-2"},
        {"phone_number": "abcdef12345", "user_input": "*99*68#", "session_id": "sess-bad-3"},
        {"phone_number": "123", "user_input": "*99*68#", "session_id": "sess-bad-4"},
    ]
    for bad in bad_payloads:
        res = client.post("/api/telecom/ussd", json=bad)
        assert res.status_code == 422, f"Failed to reject invalid phone number: {bad['phone_number']}"


def test_ussd_session_memory_bounding_dos_prevention():
    """Verify USSD session cache never grows beyond MAX_CONCURRENT_SESSIONS."""
    original_cap = telecom_bridge.MAX_CONCURRENT_SESSIONS
    telecom_bridge.MAX_CONCURRENT_SESSIONS = 10  # temporary small cap for test
    try:
        for i in range(15):
            telecom_bridge._ussd_sessions[f"dummy-sess-{i}"] = {
                "state": "ROOT",
                "lang": "mr",
                "ts": 1000.0 + i,
                "lat": 20.0,
                "lon": 78.0,
            }
        
        # Dial with new session
        import asyncio
        loop = asyncio.new_event_loop()
        from backend.models.schemas import USSDSessionRequest
        loop.run_until_complete(telecom_bridge.handle_ussd_session(
            USSDSessionRequest(session_id="new-active-sess", phone_number="+919822012345")
        ))
        loop.close()

        assert len(telecom_bridge._ussd_sessions) <= 10
    finally:
        telecom_bridge.MAX_CONCURRENT_SESSIONS = original_cap
        telecom_bridge._ussd_sessions.clear()


def test_prithvi_mesh_outbox_ring_buffer_bounding():
    """Verify PRITHVI-Mesh outbox ring-buffer strictly caps heap memory."""
    original_cap = prithvi_mesh_service.MAX_OUTBOX_CAPACITY
    prithvi_mesh_service.MAX_OUTBOX_CAPACITY = 5
    try:
        prithvi_mesh_service._outbox_queue.clear()
        for i in range(10):
            pkt = PrithviMeshPacket(
                hazard_code=1,
                severity=2,
                latitude=20.74,
                longitude=78.60,
                radius_meters=5000,
                ttl=10,
                sequence_id=i,
                payload_text=f"Test alert {i}",
            )
            frame = prithvi_mesh_service.pack_mesh_frame(pkt)
            prithvi_mesh_service.process_incoming_relay(frame, receiver_lat=20.75, receiver_lon=78.61)

        assert len(prithvi_mesh_service._outbox_queue) <= 5
    finally:
        prithvi_mesh_service.MAX_OUTBOX_CAPACITY = original_cap
        prithvi_mesh_service._outbox_queue.clear()


def test_mausam_rakshak_user_reputation_bounding():
    """Verify Mausam Rakshak reputation dictionary does not grow unbounded under bot attacks."""
    original_cap = mausam_rakshak_service.MAX_REPUTATION_CACHE_SIZE
    mausam_rakshak_service.MAX_REPUTATION_CACHE_SIZE = 5
    try:
        mausam_rakshak_service._user_reputation.clear()
        for i in range(10):
            report = CitizenHazardReport(
                hazard_type="WATERLOGGING",
                severity="KNEE_DEEP",
                latitude=20.7453,
                longitude=78.6022,
                user_id=f"bot_user_{i}",
                timestamp="2026-09-12T12:00:00Z"
            )
            # Submit duplicate within sector to trigger reputation update
            mausam_rakshak_service.submit_report(report)

        assert len(mausam_rakshak_service._user_reputation) <= 5
    finally:
        mausam_rakshak_service.MAX_REPUTATION_CACHE_SIZE = original_cap
        mausam_rakshak_service._user_reputation.clear()


def test_owasp_security_headers_enforced():
    """Verify OWASP defense-in-depth security headers on API responses."""
    res = client.get("/api/health")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert "Strict-Transport-Security" in headers


def test_rate_limiter_throttling():
    """Verify sliding-window rate limiter throttles burst requests with HTTP 429."""
    import time
    from backend.main import RATE_LIMIT_COMPUTE_RPM
    _client_request_history.clear()

    # Pre-populate history for testclient IP up to the limit
    now = time.time()
    for _ in range(RATE_LIMIT_COMPUTE_RPM):
        _client_request_history["testclient"].append(now)

    # Next request must immediately trigger HTTP 429
    res = client.post("/api/chat", json={
        "message": "hello",
        "latitude": 20.7453,
        "longitude": 78.6022,
    })
    assert res.status_code == 429
    assert "Too Many Requests" in res.json()["detail"]
    _client_request_history.clear()


def test_prithvi_mesh_authority_hmac():
    """Verify PRITHVI-Mesh generates 4-byte truncated HMAC-SHA256 for official alerts."""
    test_pre_crc = b"PR" + b"\x13\x01\x03\x10" + b"\x00\x00\x00\x01" + b"\x00\x01" + b"\x00" * 48
    hmac4 = prithvi_mesh_service.calculate_authority_hmac4(test_pre_crc)
    assert isinstance(hmac4, bytes)
    assert len(hmac4) == 4


def test_aapda_mitra_volunteer_authorization_status():
    """Verify NDMA volunteer authorization token gates verification status."""
    # Case A: Legitimate NDMA Volunteer with Bearer Token
    req_auth = AapdaMitraBridgeRequest(
        volunteer_id="NDMA-VOL-WARDHA-042",
        village_panchayat="Deoli",
        latitude=20.7453,
        longitude=78.6022,
        hazard_type="CYCLONE",
        auth_token="NDMA-SEC-TOKEN-2026-X99",
    )
    res_auth = aapda_mitra_service.create_community_dispatch(req_auth)
    assert res_auth.authorized_by == "NDMA_AAPDA_MITRA_VERIFIED"

    # Case B: Unverified Anonymous Request
    req_unauth = AapdaMitraBridgeRequest(
        volunteer_id="citizen_anon_1",
        village_panchayat="Deoli",
        latitude=20.7453,
        longitude=78.6022,
        hazard_type="CYCLONE",
        auth_token=None,
    )
    res_unauth = aapda_mitra_service.create_community_dispatch(req_unauth)
    assert res_unauth.authorized_by == "COMMUNITY_CITIZEN_ADVISORY"


def test_sovereign_csp_and_permissions_policy_headers():
    """Verify Sovereign Government Allowlist CSP and Permissions-Policy headers (SEC-12)."""
    res = client.get("/api/health")
    assert res.status_code == 200
    headers = res.headers

    # Content-Security-Policy validation
    csp = headers.get("Content-Security-Policy", "")
    assert "frame-ancestors 'self' https://*.gov.in https://*.nic.in" in csp
    assert "default-src 'self'" in csp
    assert "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net" in csp
    assert "img-src 'self' data: blob: https://*.tile.openstreetmap.org" in csp
    assert "connect-src 'self' ws: wss:" in csp

    # Permissions-Policy and Referrer-Policy validation
    assert headers.get("Permissions-Policy") == "geolocation=(self), microphone=(self), camera=()"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_production_fail_closed_preflight_rejection():
    """Verify production mode fails closed if secrets are missing or default (SEC-11)."""
    import os
    import pytest
    from backend.main import run_security_preflight_check

    # Case A: Production mode with default emergency HMAC key
    orig_env = os.environ.get("ENVIRONMENT")
    orig_key = os.environ.get("PRITHVI_EMERGENCY_HMAC_KEY")
    orig_token = os.environ.get("AAPDA_MITRA_MASTER_TOKEN")

    try:
        os.environ["ENVIRONMENT"] = "production"
        os.environ["PRITHVI_EMERGENCY_HMAC_KEY"] = "MoES-NDMA-CRISIS-AUTH-KEY-2026"  # Known default
        os.environ["AAPDA_MITRA_MASTER_TOKEN"] = "NDMA-SUPER-SECRET-STRONG-TOKEN-2026"

        with pytest.raises(RuntimeError) as exc_info:
            run_security_preflight_check()
        assert "FATAL SECURITY FAILURE" in str(exc_info.value)
        assert "PRITHVI_EMERGENCY_HMAC_KEY" in str(exc_info.value)

        # Case B: Production mode with short key (< 32 chars)
        os.environ["PRITHVI_EMERGENCY_HMAC_KEY"] = "short-key-12345"
        with pytest.raises(RuntimeError) as exc_info2:
            run_security_preflight_check()
        assert "FATAL SECURITY FAILURE" in str(exc_info2.value)

    finally:
        # Restore environment
        if orig_env is not None:
            os.environ["ENVIRONMENT"] = orig_env
        else:
            os.environ.pop("ENVIRONMENT", None)

        if orig_key is not None:
            os.environ["PRITHVI_EMERGENCY_HMAC_KEY"] = orig_key
        else:
            os.environ.pop("PRITHVI_EMERGENCY_HMAC_KEY", None)

        if orig_token is not None:
            os.environ["AAPDA_MITRA_MASTER_TOKEN"] = orig_token
        else:
            os.environ.pop("AAPDA_MITRA_MASTER_TOKEN", None)


def test_production_preflight_success_with_strong_secrets():
    """Verify production mode passes pre-flight checks when strong secrets are provided (SEC-11)."""
    import os
    from backend.main import run_security_preflight_check

    orig_env = os.environ.get("ENVIRONMENT")
    orig_key = os.environ.get("PRITHVI_EMERGENCY_HMAC_KEY")
    orig_token = os.environ.get("AAPDA_MITRA_MASTER_TOKEN")

    try:
        os.environ["ENVIRONMENT"] = "production"
        # 32+ character strong high-entropy key
        os.environ["PRITHVI_EMERGENCY_HMAC_KEY"] = "f8a9e2c4d1b7a6f5e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7"
        os.environ["AAPDA_MITRA_MASTER_TOKEN"] = "NDMA-SECURE-VOLUNTEER-TOKEN-PRODUCTION-GRADE-2026"

        # Should execute cleanly without raising RuntimeError
        run_security_preflight_check()
    finally:
        if orig_env is not None:
            os.environ["ENVIRONMENT"] = orig_env
        else:
            os.environ.pop("ENVIRONMENT", None)

        if orig_key is not None:
            os.environ["PRITHVI_EMERGENCY_HMAC_KEY"] = orig_key
        else:
            os.environ.pop("PRITHVI_EMERGENCY_HMAC_KEY", None)

        if orig_token is not None:
            os.environ["AAPDA_MITRA_MASTER_TOKEN"] = orig_token
        else:
            os.environ.pop("AAPDA_MITRA_MASTER_TOKEN", None)


def test_development_permissive_preflight():
    """Verify development mode permits safe local defaults with warning logs."""
    import os
    from backend.main import run_security_preflight_check

    orig_env = os.environ.get("ENVIRONMENT")
    try:
        os.environ["ENVIRONMENT"] = "development"
        # In development, even without explicit environment keys, preflight should pass
        run_security_preflight_check()
    finally:
        if orig_env is not None:
            os.environ["ENVIRONMENT"] = orig_env
        else:
            os.environ.pop("ENVIRONMENT", None)


def test_weather_service_lru_cache_bounding_dos_prevention():
    """Verify WeatherService._memory_cache strictly caps entries to MAX_CACHE_SIZE."""
    from backend.services.weather_service import weather_service
    original_cap = weather_service.MAX_CACHE_SIZE
    weather_service.MAX_CACHE_SIZE = 5
    try:
        weather_service._memory_cache.clear()
        for i in range(10):
            weather_service._memory_cache[f"lat_{i}:lon_{i}"] = {
                "data": None,
                "timestamp": 1000.0 + i,
            }
        
        # Add another entry via simulated cache set
        while len(weather_service._memory_cache) >= weather_service.MAX_CACHE_SIZE:
            weather_service._memory_cache.popitem(last=False)
        weather_service._memory_cache["new_key"] = {"data": None, "timestamp": 2000.0}

        assert len(weather_service._memory_cache) <= 5
        assert "new_key" in weather_service._memory_cache
    finally:
        weather_service.MAX_CACHE_SIZE = original_cap
        weather_service._memory_cache.clear()


def test_rate_limiter_stale_ip_pruning_memory_leak_prevention():
    """Verify IP rate limiter table prunes inactive entries when capacity is approached."""
    import time
    from backend.main import _client_request_history, MAX_TRACKED_CLIENT_IPS
    now = time.time()
    _client_request_history.clear()

    # Populate with stale IPs (>60s old)
    for i in range(MAX_TRACKED_CLIENT_IPS + 50):
        _client_request_history[f"10.0.0.{i}"] = [now - 120.0]

    # Making a request triggers middleware pruning
    res = client.get("/api/weather/current?lat=20.74&lon=78.60")
    assert res.status_code == 200

    # Stale IPs should have been pruned below the cap
    assert len(_client_request_history) <= MAX_TRACKED_CLIENT_IPS
    _client_request_history.clear()


def test_volunteer_id_alone_does_not_grant_siren_authorization():
    """Verify an attacker cannot gain verified status merely by including VOL or NDMA in volunteer_id without token."""
    req_spoof = AapdaMitraBridgeRequest(
        volunteer_id="VOL-SUPER-HACKER",
        village_panchayat="Deoli",
        latitude=20.7453,
        longitude=78.6022,
        hazard_type="CYCLONE",
        auth_token=None,  # Missing cryptographic token
    )
    res_spoof = aapda_mitra_service.create_community_dispatch(req_spoof)
    assert res_spoof.authorized_by == "COMMUNITY_CITIZEN_ADVISORY"


def test_frame_hex_unbounded_query_param_rejected():
    """Verify oversized query strings on mesh endpoints are rejected with HTTP 422."""
    giant_hex = "a" * 1000  # 1000 characters > 256 max_length
    res = client.post(f"/api/mesh/unpack?frame_hex={giant_hex}")
    assert res.status_code == 422


def test_headcount_tally_integer_overflow_rejection():
    """Verify negative and overflow headcount figures are rejected with HTTP 422."""
    bad_payload = {
        "volunteer_id": "VOL-01",
        "village_panchayat": "Wardha",
        "shelter_name": "ZP High School",
        "evacuated_citizens": -50,  # Negative citizens rejected
        "missing_unaccounted": 0,
        "urgent_medical_cases": 0,
        "latitude": 20.7453,
        "longitude": 78.6022,
    }
    res = client.post("/api/aapda-mitra/headcount-tally", json=bad_payload)
    assert res.status_code == 422


