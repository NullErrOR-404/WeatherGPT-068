"""
APMC Mandi Grain Shield Service.
Monitors open-air grain storage yards and triggers 4-hour advance warnings
to prevent harvested grain from rain-soaking, fungus, and premature sprouting.
"""

from typing import Dict, Any
from .weather_service import weather_service
from ..models.schemas import MandiRainShieldReport


class MandiShieldService:
    def __init__(self):
        self.mandis = {
            "mandi_01": {"name": "APMC Wardha Central Market Yard", "lat": 20.7453, "lon": 78.6022},
            "mandi_02": {"name": "Nagpur Grain Mandi Yard Kalamna", "lat": 21.1458, "lon": 79.0882},
        }

    async def check_mandi_risk(self, mandi_id: str = "mandi_01") -> MandiRainShieldReport:
        mandi_info = self.mandis.get(mandi_id, self.mandis["mandi_01"])
        weather = await weather_service.get_forecast(mandi_info["lat"], mandi_info["lon"])
        curr = weather.current
        max_rain_prob = max([nh.rain_prob_pct for nh in weather.nowcast_3h]) if weather.nowcast_3h else 25.0

        if max_rain_prob >= 60.0 or curr.precipitation > 1.0:
            level = "CRITICAL"
            hours_to_rain = 1.5
            rain_mm = 14.5
            advisory = (
                "IMMEDIATE ACTION: Convective cloudburst arriving in ~1.5 hours. "
                "Deploy waterproof tarpaulins over all open grain heaps (Soybean & Cotton). "
                "Halt fresh unloading in open auction bays."
            )
        elif max_rain_prob >= 35.0:
            level = "MODERATE"
            hours_to_rain = 3.5
            rain_mm = 4.0
            advisory = (
                "PRECAUTIONARY WATCH: Scattered squall line within 3.5 hours. "
                "Inspect tarpaulins and prepare warehouse drainage channels."
            )
        else:
            level = "LOW"
            hours_to_rain = 12.0
            rain_mm = 0.0
            advisory = "Dry open-yard conditions. Safe for open-air grain drying and auction operations."

        return MandiRainShieldReport(
            mandi_name=mandi_info["name"],
            risk_level=level,
            hours_to_squall=hours_to_rain,
            expected_rain_mm=rain_mm,
            tarpaulin_advisory=advisory,
        )


mandi_shield_service = MandiShieldService()
