import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.sensor_fusion_service import (
    sensor_fusion_engine,
    SensorFusionEngine,
    Insat3dsSpectralRadiance,
    PhoneSensorTelemetry,
)
from backend.services.mausam_rakshak_service import MausamRakshakService
from backend.models.schemas import CitizenHazardReport

client = TestClient(app)


def test_insat3ds_multi_spectral_radiative_transfer():
    """
    Verifies multi-spectral Planck inversion and split-window BTD physics.
    Tests differentiation between thin cirrus and penetrative overshooting tops.
    """
    # 1. Thin Cirrus Cloud: Cold TIR-1, but high split-window BTD (BTD_split >= 2.5 K)
    # Radiance TIR-1 ~ 31.30 mW (T ~ -40°C), TIR-2 ~ 37.01 mW (T ~ -44°C), WV ~ 0.5 mW
    cirrus_rad = Insat3dsSpectralRadiance(
        tir1_radiance=31.30,
        tir2_radiance=37.01,
        wv_radiance=0.5
    )
    cirrus_analysis = sensor_fusion_engine.analyze_insat3ds_cloud_physics(cirrus_rad)
    assert cirrus_analysis.cloud_classification == "THIN_NON_PRECIPITATING_CIRRUS"
    assert cirrus_analysis.severe_convective_risk is False
    assert cirrus_analysis.btd_split_window_k >= 2.5

    # 2. Penetrative Overshooting Convective Cloudburst Top:
    # Deep convective core where water vapor channel is warmer or equal to TIR-1 (BTD_WV_IR >= -1.0 K)
    # Radiance TIR-1 ~ 18.29 mW (T ~ -60°C), TIR-2 ~ 24.82 mW (T ~ -60.2°C), WV ~ 1.96 mW (T ~ -56.5°C)
    overshoot_rad = Insat3dsSpectralRadiance(
        tir1_radiance=18.29,
        tir2_radiance=24.82,
        wv_radiance=1.96
    )
    overshoot_analysis = sensor_fusion_engine.analyze_insat3ds_cloud_physics(overshoot_rad)
    assert overshoot_analysis.cloud_classification == "PENETRATIVE_OVERSHOOTING_CONVECTIVE_TOP"
    assert overshoot_analysis.overshooting_top_detected is True
    assert overshoot_analysis.severe_convective_risk is True
    assert overshoot_analysis.btd_wv_ir_k >= -1.0

    # 3. Clear Sky / Ground: Warm TIR-1 (> 10°C)
    clear_rad = Insat3dsSpectralRadiance(
        tir1_radiance=120.0,
        tir2_radiance=115.0,
        wv_radiance=15.0
    )
    clear_analysis = sensor_fusion_engine.analyze_insat3ds_cloud_physics(clear_rad)
    assert clear_analysis.cloud_classification == "CLEAR_SKY_OR_WARM_SURFACE"
    assert clear_analysis.severe_convective_risk is False


def test_hypsometric_mslp_reduction():
    """
    Verifies WMO standard hypsometric MSLP reduction across various altitudes.
    """
    # Sea level station: P_msl must equal P_station
    p_sea = SensorFusionEngine.reduce_to_mslp(station_pressure_hpa=1013.25, altitude_m=0.0, ambient_temp_c=15.0)
    assert p_sea == 1013.25

    # High altitude station (e.g. Bengaluru / Deccan Plateau ~ 920m)
    # Station pressure ~ 915 hPa should reduce to ~ 1013-1018 hPa MSLP
    p_deccan = SensorFusionEngine.reduce_to_mslp(station_pressure_hpa=915.0, altitude_m=920.0, ambient_temp_c=25.0)
    assert 1010.0 <= p_deccan <= 1025.0


def test_phone_sensor_elevator_motion_rejection():
    """
    Verifies that vertical user motion (elevator ascent/descent)
    is identified and rejected as a false alarm.
    """
    telemetry_elevator = PhoneSensorTelemetry(
        station_pressure_hpa=1005.0,
        altitude_m=50.0,
        ambient_temp_c=26.0,
        pressure_samples_window=[1007.5, 1005.0],  # -2.5 hPa drop in elevator
        accel_z_rms_g=1.45,  # Accelerometer indicates vertical elevator acceleration!
        gps_vertical_speed_mps=1.8,  # Moving vertically at 1.8 m/s
        ambient_lux=800.0,
        is_daytime=True
    )
    verdict = sensor_fusion_engine.evaluate_phone_sensor_telemetry(telemetry_elevator)
    assert verdict.noise_artifact_detected is True
    assert verdict.artifact_type == "USER_VERTICAL_MOTION_ELEVATOR_OR_STAIRS"
    assert verdict.atmospheric_gust_front_confirmed is False
    assert verdict.cloudburst_imminent_alarm is False


def test_phone_sensor_pocket_rejection():
    """
    Verifies that putting the phone into a dark pocket without atmospheric pressure change
    is identified as a pocket artifact and suppressed.
    """
    telemetry_pocket = PhoneSensorTelemetry(
        station_pressure_hpa=1010.0,
        altitude_m=100.0,
        ambient_temp_c=28.0,
        pressure_samples_window=[1010.0, 1010.1],  # Flat pressure
        accel_z_rms_g=1.02,
        gps_vertical_speed_mps=0.0,
        ambient_lux=2.0,  # Pitch black pocket during daytime
        is_daytime=True
    )
    verdict = sensor_fusion_engine.evaluate_phone_sensor_telemetry(telemetry_pocket)
    assert verdict.noise_artifact_detected is True
    assert verdict.artifact_type == "POCKET_OR_BAG_ENCLOSURE"
    assert verdict.cloudburst_imminent_alarm is False


def test_phone_sensor_genuine_cloudburst_detection():
    """
    Verifies genuine mesoscale cold-pool gust front + optical extinction ('Night at Noon'):
    - Stationary inertial frame (accel_z ~ 1.0g, gps v_z = 0 m/s)
    - Rapid hydrostatic pressure jump (+2.4 hPa in 10 min)
    - Midday optical extinction (daytime lux drops to 120 lux)
    """
    telemetry_storm = PhoneSensorTelemetry(
        station_pressure_hpa=1012.4,
        altitude_m=100.0,
        ambient_temp_c=24.0,
        pressure_samples_window=[1010.0, 1012.4],  # +2.4 hPa cold-pool density current jump
        accel_z_rms_g=1.01,  # Stationary phone on farm table or tractor dash
        gps_vertical_speed_mps=0.0,
        ambient_lux=120.0,  # Plunge from 40,000 to 120 lux under thick cumulonimbus
        is_daytime=True
    )
    verdict = sensor_fusion_engine.evaluate_phone_sensor_telemetry(telemetry_storm)
    assert verdict.noise_artifact_detected is False
    assert verdict.atmospheric_gust_front_confirmed is True
    assert verdict.optical_extinction_confirmed is True
    assert verdict.cloudburst_imminent_alarm is True
    assert verdict.confidence_score >= 0.95


def test_k_index_thermodynamic_sounding():
    """
    Verifies calculation of the thermodynamic K-index.
    """
    # High risk sounding: T850=26, T500=-10, Td850=20, T700=8, Td700=6
    # K = (26 - (-10)) + 20 - (8 - 6) = 36 + 20 - 2 = 54
    k_res = sensor_fusion_engine.calculate_k_index(t850=26.0, t700=8.0, t500=-10.0, td850=20.0, td700=6.0)
    assert k_res["k_index"] == 54.0
    assert k_res["severe_potential"] is True


def test_mausam_rakshak_satellite_multi_spectral_verification():
    """
    Tests Mausam Rakshak ground-truth verification using multi-spectral satellite physics.
    A report under thin cirrus is rejected, while an overshooting convective storm report is verified.
    """
    rakshak = MausamRakshakService()

    # User 1 & 2 submit reports in the same cell
    r1 = CitizenHazardReport(
        hazard_type="HAIL",
        severity="GOLF_BALL",
        latitude=20.7453,
        longitude=78.6022,
        user_id="farmer_01",
        timestamp="2026-09-12T14:00:00Z"
    )
    r2 = CitizenHazardReport(
        hazard_type="HAIL",
        severity="GOLF_BALL",
        latitude=20.7460,
        longitude=78.6030,
        user_id="farmer_02",
        timestamp="2026-09-12T14:02:00Z"
    )

    # Submit r1 with thin cirrus radiance (false alarm scenario)
    cirrus_rad = Insat3dsSpectralRadiance(tir1_radiance=31.30, tir2_radiance=37.01, wv_radiance=0.5)
    res_cirrus = rakshak.submit_report(r1, spectral_radiance=cirrus_rad)
    assert res_cirrus.physics_check_passed is False
    assert res_cirrus.status == "PENDING_CONSENSUS"

    # Now submit with genuine convective overshooting top radiance
    convective_rad = Insat3dsSpectralRadiance(tir1_radiance=18.29, tir2_radiance=24.82, wv_radiance=1.96)
    res_convective = rakshak.submit_report(r2, spectral_radiance=convective_rad)
    assert res_convective.physics_check_passed is True
    assert res_convective.consensus_count >= 2
    assert res_convective.status == "VERIFIED"


def test_api_sensor_fusion_endpoints():
    """
    Tests FastAPI endpoints:
    - POST /api/sensor/fusion
    - POST /api/physics/insat3ds
    - GET /api/physics/k-index
    """
    # 1. Sensor fusion endpoint
    fusion_payload = {
        "station_pressure_hpa": 1012.0,
        "altitude_m": 50.0,
        "ambient_temp_c": 25.0,
        "pressure_samples_window": [1010.0, 1012.0],
        "accel_z_rms_g": 1.0,
        "gps_vertical_speed_mps": 0.0,
        "ambient_lux": 150.0,
        "is_daytime": True
    }
    res_fusion = client.post("/api/sensor/fusion", json=fusion_payload)
    assert res_fusion.status_code == 200
    data_f = res_fusion.json()
    assert data_f["atmospheric_gust_front_confirmed"] is True
    assert data_f["cloudburst_imminent_alarm"] is True

    # 2. INSAT-3DS physics endpoint
    physics_payload = {
        "tir1_radiance": 18.29,
        "tir2_radiance": 24.82,
        "wv_radiance": 1.96
    }
    res_phys = client.post("/api/physics/insat3ds", json=physics_payload)
    assert res_phys.status_code == 200
    data_p = res_phys.json()
    assert data_p["overshooting_top_detected"] is True

    # 3. K-index endpoint
    res_k = client.get("/api/physics/k-index?t850=25.0&t700=9.0&t500=-11.0&td850=19.0&td700=5.0")
    assert res_k.status_code == 200
    data_k = res_k.json()
    assert data_k["k_index"] >= 35.0
    assert data_k["severe_potential"] is True
