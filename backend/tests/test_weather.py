import pytest
from backend.services.weather_service import weather_service

@pytest.mark.asyncio
async def test_get_forecast_live():
    # Wardha, Maharashtra
    res = await weather_service.get_forecast(lat=20.7453, lon=78.6022)
    assert res is not None
    assert res.current.temperature_2m > -20 and res.current.temperature_2m < 60
    assert res.current.relative_humidity_2m >= 0 and res.current.relative_humidity_2m <= 100
    assert len(res.nowcast_3h) == 3
    assert res.action_badge_status in ["SAFE", "CAUTION", "UNSAFE"]
    assert res.location_name != ""

@pytest.mark.asyncio
async def test_weather_memory_cache():
    # Two identical calls should return cached instance quickly
    res1 = await weather_service.get_forecast(lat=25.5941, lon=85.1376)
    res2 = await weather_service.get_forecast(lat=25.5941, lon=85.1376)
    assert res1.current.time == res2.current.time
    assert res1.location_name == res2.location_name
