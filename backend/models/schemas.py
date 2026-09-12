"""
Pydantic v2 data models for WeatherGPT.
Single source of truth for all API contracts and data serialization.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CurrentWeatherMetrics(BaseModel):
    time: str = Field(..., description="ISO-8601 timestamp")
    temperature_2m: float = Field(..., description="Air temperature in Celsius")
    relative_humidity_2m: int = Field(..., description="Relative humidity percentage")
    apparent_temperature: float = Field(..., description="Feels-like temperature in Celsius")
    precipitation: float = Field(..., description="Precipitation in last hour in mm")
    weather_code: int = Field(..., description="WMO synoptic weather code 0-99")
    wind_speed_10m: float = Field(..., description="Sustained wind speed in km/h")
    wind_gusts_10m: float = Field(..., description="Peak wind gusts in km/h")
    surface_pressure: float = Field(..., description="Barometric pressure in hPa")
    dew_point_2m: float = Field(..., description="Dew point in Celsius")
    vapour_pressure_deficit: float = Field(..., description="VPD in kPa")
    soil_moisture_0_to_1cm: float = Field(..., description="Topsoil volumetric moisture m³/m³")


class NowcastHour(BaseModel):
    time: str
    hour_label: str
    temp_c: float
    rain_prob_pct: int
    precip_mm: float
    weather_code: int
    icon: str


class WeatherResponse(BaseModel):
    latitude: float
    longitude: float
    location_name: str
    current: CurrentWeatherMetrics
    nowcast_3h: List[NowcastHour]
    today_action_summary: str
    action_badge_status: str  # "SAFE", "CAUTION", "UNSAFE"


class AgroAdvisory(BaseModel):
    crop: str
    operation: str  # e.g., "pesticide_spray", "irrigation", "harvest_drying"
    is_safe: bool
    status_badge: str  # "SAFE", "CAUTION", "REJECT"
    headline: str
    detailed_explanation: str
    next_safe_window: Optional[str] = None
    wash_off_risk: str  # "LOW", "MODERATE", "HIGH"
    drift_hazard: str  # "SAFE", "HIGH"
    fungal_blight_risk: bool
    soil_saturation_pct: float


class DisasterAlert(BaseModel):
    alert_id: str
    headline: str
    severity: str  # "RED", "ORANGE", "YELLOW", "GREEN"
    hazard_type: str  # "CYCLONE", "LIGHTNING", "FLOOD", "HEATWAVE", "SQUALL"
    affected_area: str
    effective_from: str
    effective_to: str
    instruction: str
    distance_km: Optional[float] = None
    vector_movement: Optional[str] = None  # e.g. "Moving Southeast at 25 km/h"
    all_clear_countdown_mins: Optional[int] = None


class ChatQuery(BaseModel):
    message: str = Field(..., description="User voice or text prompt")
    latitude: float = Field(default=20.7453, description="User latitude")
    longitude: float = Field(default=78.6022, description="User longitude")
    language: str = Field(default="hi", description="Language code (hi, mr, te, ta, bn, en)")
    user_persona: Optional[str] = Field(default="auto", description="kisan, citizen, disaster, marine, or auto")


class ChatResponse(BaseModel):
    reply_text: str
    spoken_audio_text: str
    language: str
    detected_intent: str
    action_badge: str  # "SAFE", "CAUTION", "DANGER"
    action_badge_label: str
    verified_data_points: Dict[str, Any]
    cache_hit: bool
    spatial_cluster_id: str


class CitizenHazardReport(BaseModel):
    hazard_type: str = Field(..., description="HAIL, WATERLOGGING, LIGHTNING, SQUALL, FOG")
    severity: str = Field(..., description="e.g. PEA_SIZE, GOLF_BALL, KNEE_DEEP, TREE_DOWN")
    latitude: float
    longitude: float
    user_id: str
    timestamp: str
    notes: Optional[str] = None


class AntiFakeValidationResult(BaseModel):
    report_id: str
    status: str  # "VERIFIED", "PENDING_CONSENSUS", "REJECTED_SATELLITE_MISMATCH"
    consensus_count: int
    satellite_cloud_temp_c: float
    cape_index: float
    physics_check_passed: bool
    reputation_score: int
    badge_awarded: bool
    downwind_warning_triggered: bool


class MissedCallRequest(BaseModel):
    phone_number: str
    latitude: Optional[float] = 20.7453
    longitude: Optional[float] = 78.6022
    language: Optional[str] = "mr"


class IVROutboundResponse(BaseModel):
    call_id: str
    status: str
    voice_script: str
    dtmf_options: Dict[str, str]


class FloodDetourRoute(BaseModel):
    hotspot_name: str
    water_depth_est_meters: float
    risk_level: str  # "IMPASSABLE", "CAUTION", "CLEAR"
    impassable_in_mins: int
    recommended_detour: str
    elevation_gain_meters: float
    time_delta_mins: int


class MandiRainShieldReport(BaseModel):
    mandi_name: str
    risk_level: str  # "CRITICAL", "MODERATE", "LOW"
    hours_to_squall: float
    expected_rain_mm: float
    tarpaulin_advisory: str
