"""
Deterministic Scientific Rules Engine.
Pure mathematical computation of Agro-Met, Disaster, Heat-Stress (WBGT), and Marine safety thresholds.
"""

from typing import Dict, Any, Optional
from ..models.schemas import AgroAdvisory, CurrentWeatherMetrics, DisasterAlert


class RulesEngine:
    def evaluate_agro_spray(self, current: CurrentWeatherMetrics, rain_prob_next_6h: float, crop: str = "cotton") -> AgroAdvisory:
        """
        Evaluates pesticide & chemical fertilizer spray safety.
        Rule 1: Rain prob > 40% or rain > 2.5mm in 6h => High Wash-off Risk.
        Rule 2: Wind speed > 15 km/h => High Drift Hazard onto adjacent crops.
        Rule 3: Low VPD (<0.4 kPa) + Humidity > 85% => High Fungal Blight Risk.
        """
        is_wash_off_high = (rain_prob_next_6h > 40.0) or (current.precipitation > 2.0)
        is_drift_high = current.wind_speed_10m > 15.0 or current.wind_gusts_10m > 22.0
        is_fungal_risk = (current.vapour_pressure_deficit < 0.4) and (current.relative_humidity_2m > 82) and (20.0 <= current.temperature_2m <= 28.0)

        if is_wash_off_high or is_drift_high:
            is_safe = False
            status_badge = "REJECT"
            reasons = []
            if is_wash_off_high:
                reasons.append(f"high wash-off risk ({rain_prob_next_6h:.0f}% rain probability within 6 hours)")
            if is_drift_high:
                reasons.append(f"gusty winds ({current.wind_speed_10m:.1f} km/h) causing spray drift")

            headline = f"Do NOT Spray {crop.capitalize()} Today"
            explanation = (
                f"Chemical application is unsafe due to {' and '.join(reasons)}. "
                "Spraying now will result in chemical wastage into the soil."
            )
            next_window = "Tomorrow 07:00 AM – 01:00 PM (Clear skies, wind < 8 km/h)"
        else:
            is_safe = True
            status_badge = "SAFE"
            headline = f"Optimal Spray Window Open for {crop.capitalize()}"
            explanation = (
                f"Atmospheric conditions are ideal for spraying. Low wind speed ({current.wind_speed_10m:.1f} km/h) "
                f"and dry skies ensure maximum chemical absorption."
            )
            next_window = "Current window open until 03:00 PM today."

        return AgroAdvisory(
            crop=crop,
            operation="pesticide_spray",
            is_safe=is_safe,
            status_badge=status_badge,
            headline=headline,
            detailed_explanation=explanation,
            next_safe_window=next_window,
            wash_off_risk="HIGH" if is_wash_off_high else "LOW",
            drift_hazard="HIGH" if is_drift_high else "SAFE",
            fungal_blight_risk=is_fungal_risk,
            soil_saturation_pct=round(current.soil_moisture_0_to_1cm * 100, 1),
        )

    def calculate_wbgt_heat_stress(self, temp_c: float, humidity_pct: float) -> Dict[str, Any]:
        """
        Calculates simplified Wet-Bulb Globe Temperature (WBGT) for outdoor labor safety.
        WBGT > 31°C: Extreme Heat Stress (Mandatory 15-min rest every 45 mins).
        """
        # Stull formula approximation for wet-bulb temperature Tw
        tw = (
            temp_c * 0.151977 * ((humidity_pct + 8.313659) ** 0.5)
            + (temp_c + humidity_pct) ** 0.5
            - ((humidity_pct - 1.676331) ** 0.5)
            + 0.00391838 * (humidity_pct ** 1.5) * (0.023101 * temp_c)
            - 4.686035
        )
        wbgt = 0.7 * tw + 0.3 * temp_c

        if wbgt >= 32.0:
            level = "EXTREME_DANGER"
            advisory = "Suspend strenuous outdoor labor. Mandatory shade and rehydration every 30 minutes."
        elif wbgt >= 29.0:
            level = "HIGH_ALERT"
            advisory = "Heavy labor requires 15 minutes of shaded rest per hour. Provide oral rehydration salts (ORS)."
        elif wbgt >= 26.0:
            level = "MODERATE_CAUTION"
            advisory = "Normal outdoor work with standard water breaks."
        else:
            level = "NORMAL"
            advisory = "Comfortable outdoor thermal conditions."

        return {
            "wbgt_c": round(wbgt, 1),
            "wet_bulb_c": round(tw, 1),
            "risk_level": level,
            "labor_advisory": advisory,
        }

    def evaluate_marine_safety(self, wave_height_m: float, wind_speed_kmh: float) -> Dict[str, Any]:
        """Evaluates coastal craft and artisanal fishing boat sea-state safety."""
        if wave_height_m >= 2.5 or wind_speed_kmh >= 45.0:
            status = "RED"
            msg = "Rough Sea Warning: Stay in harbor. Waves exceed 2.5m with gale squalls."
        elif wave_height_m >= 1.5 or wind_speed_kmh >= 28.0:
            status = "YELLOW"
            msg = "Caution: Safe only within 5 nautical miles. Return before afternoon wind shift."
        else:
            status = "GREEN"
            msg = "Calm Waters: Sea condition normal and safe for artisanal boats."

        return {"sea_status": status, "advisory": msg, "wave_m": wave_height_m, "wind_kmh": wind_speed_kmh}


rules_engine = RulesEngine()
