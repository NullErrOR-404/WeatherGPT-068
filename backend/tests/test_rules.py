import pytest
from backend.services.rules_engine import rules_engine
from backend.models.schemas import CurrentWeatherMetrics

def get_dummy_current(temp=28.0, rh=50, wind=8.0, precip=0.0):
    return CurrentWeatherMetrics(
        time="2026-09-12T12:00:00Z",
        temperature_2m=temp,
        relative_humidity_2m=rh,
        apparent_temperature=temp + 1.0,
        precipitation=precip,
        weather_code=0,
        wind_speed_10m=wind,
        wind_gusts_10m=wind + 3.0,
        surface_pressure=1010.0,
        dew_point_2m=16.0,
        vapour_pressure_deficit=1.2,
        soil_moisture_0_to_1cm=0.22
    )

def test_agro_spray_safe():
    current = get_dummy_current(temp=27.0, rh=55, wind=9.0, precip=0.0)
    advisory = rules_engine.evaluate_agro_spray(current, rain_prob_next_6h=10.0, crop="cotton")
    assert advisory.is_safe is True
    assert advisory.status_badge == "SAFE"
    assert advisory.wash_off_risk == "LOW"

def test_agro_spray_unsafe_wash_off():
    current = get_dummy_current(temp=25.0, rh=85, wind=12.0, precip=3.5)
    advisory = rules_engine.evaluate_agro_spray(current, rain_prob_next_6h=65.0, crop="cotton")
    assert advisory.is_safe is False
    assert advisory.status_badge == "REJECT"
    assert advisory.wash_off_risk == "HIGH"

def test_wbgt_heat_stress_calculation():
    res = rules_engine.calculate_wbgt_heat_stress(temp_c=42.0, humidity_pct=60.0)
    assert res["wbgt_c"] > 30.0
    assert res["risk_level"] in ["HIGH_ALERT", "EXTREME_DANGER"]

def test_marine_safety_thresholds():
    calm = rules_engine.evaluate_marine_safety(wave_height_m=0.8, wind_speed_kmh=12.0)
    assert calm["sea_status"] == "GREEN"

    rough = rules_engine.evaluate_marine_safety(wave_height_m=3.0, wind_speed_kmh=48.0)
    assert rough["sea_status"] == "RED"
