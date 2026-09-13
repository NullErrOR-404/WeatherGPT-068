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


class CitizenXAIBadge(BaseModel):
    feature_name: str
    display_label: str
    impact_pct: float
    direction: str  # "INCREASE_RISK" | "REDUCE_RISK"
    icon: str


class MLRiskAssessment(BaseModel):
    risk_level: str  # SAFE, WATCH, SEVERE, DANGER
    risk_probability: float  # 0.0 - 1.0
    hazard_type: str
    primary_driver: str
    headline: str
    action_recommendation: str
    citizen_xai_badges: List[CitizenXAIBadge] = Field(default_factory=list)
    evaluator_shap_values: Dict[str, float] = Field(default_factory=dict)
    base_expected_value: float = 0.25
    model_version: str = "WeatherGPT-TreeSHAP-v1.1"
    efficiency_axiom_verified: bool = True


class WeatherResponse(BaseModel):
    latitude: float
    longitude: float
    location_name: str
    current: CurrentWeatherMetrics
    nowcast_3h: List[NowcastHour]
    today_action_summary: str
    action_badge_status: str  # "SAFE", "CAUTION", "UNSAFE"
    data_provenance: str = Field(
        default="India Meteorological Department (IMD) & Open-Meteo under Open Government Data License - India (OGDL-India)",
        description="Statutory open government data license provenance",
    )
    ml_risk: Optional[MLRiskAssessment] = None


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
    statutory_disclaimer: str = Field(
        default="Advisory derived from ICAR empirical rules. Follow Central Insecticides Board (CIBRC) registered label instructions. WeatherGPT is not liable for commercial crop outcomes.",
        description="Pesticide and agricultural liability limitation disclaimer",
    )


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
    source_authority: str = Field(
        default="Official NDMA / IMD Common Alerting Protocol (CAP) feed (Sec 54 DM Act 2005 compliant)",
        description="Official disaster alerting source authority",
    )


class ChatQuery(BaseModel):
    message: str = Field(..., max_length=1000, description="User voice or text prompt (capped at 1000 chars)")
    latitude: float = Field(default=20.7453, ge=-90.0, le=90.0, description="User latitude (-90 to 90)")
    longitude: float = Field(default=78.6022, ge=-180.0, le=180.0, description="User longitude (-180 to 180)")
    language: str = Field(default="hi", max_length=10, description="Language code (hi, mr, te, ta, bn, en)")
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
    ml_risk: Optional[MLRiskAssessment] = None
    retrieved_knowledge_sources: List[str] = Field(default_factory=list)


class CitizenHazardReport(BaseModel):
    hazard_type: str = Field(..., description="HAIL, WATERLOGGING, LIGHTNING, SQUALL, FOG")
    severity: str = Field(..., description="e.g. PEA_SIZE, GOLF_BALL, KNEE_DEEP, TREE_DOWN")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    user_id: str = Field(..., max_length=100)
    timestamp: str
    notes: Optional[str] = Field(default=None, max_length=500)


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
    phone_number: str = Field(
        ...,
        max_length=20,
        pattern=r"^\+?[1-9]\d{9,14}$",
        description="E.164 international phone number format",
    )
    latitude: Optional[float] = Field(default=20.7453, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=78.6022, ge=-180.0, le=180.0)
    language: Optional[str] = Field(default="mr", max_length=10)


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


class AapdaMitraBridgeRequest(BaseModel):
    volunteer_id: str = Field(..., max_length=50)
    village_panchayat: str = Field(..., max_length=100)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    language: str = Field(default="mr", max_length=10)
    hazard_type: str = Field(..., description="CYCLONE, CLOUDBURST, FLOOD, SQUALL")
    severity: str = Field(default="CRITICAL_RED")
    registered_button_phone_count: int = Field(default=45, ge=0)
    auth_token: Optional[str] = Field(
        default=None,
        description="NDMA volunteer cryptographic authorization token (e.g. NDMA-VOL-...) to prevent unauthorized siren triggers",
    )


class CommunityAlertDispatch(BaseModel):
    dispatch_id: str
    village_panchayat: str
    siren_frequency_hz: int
    siren_pattern: str  # e.g. "INTERMITTENT_HI_LO_120S"
    loudspeaker_announcement_script: str
    button_phone_sms_broadcast: str
    evacuation_muster_point: str
    action_checklist: List[str]
    vulnerable_household_priorities: List[str]
    timestamp: str
    authorized_by: str = "NDMA_AAPDA_MITRA_VERIFIED"


class HeadcountTallyRequest(BaseModel):
    volunteer_id: str
    village_panchayat: str
    shelter_name: str
    evacuated_citizens: int
    missing_unaccounted: int
    urgent_medical_cases: int
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    auth_token: Optional[str] = Field(default=None)


class HeadcountTallyReport(BaseModel):
    tally_id: str
    muster_point: str
    safe_percentage: float
    sos_beacon_required: bool
    prithvi_mesh_sos_frame_hex: Optional[str]
    logged_at: str


class MarineVoyageRequest(BaseModel):
    boat_name: str = Field(..., max_length=50)
    current_latitude: float = Field(..., ge=-90.0, le=90.0)
    current_longitude: float = Field(..., ge=-180.0, le=180.0)
    harbor_name: str = Field(default="Nagapattinam Fishing Harbour", max_length=100)
    harbor_latitude: float = Field(default=10.7672, ge=-90.0, le=90.0)
    harbor_longitude: float = Field(default=79.8449, ge=-180.0, le=180.0)
    cruising_speed_knots: float = Field(default=6.0, gt=1.0, le=30.0)
    language: str = Field(default="ta", max_length=10)


class MarineVoyageAdvisory(BaseModel):
    advisory_id: str
    boat_name: str
    safety_badge: str  # "SAFE_VOYAGE", "TURNBACK_IMMEDIATE", "BORDER_BREACH_WARNING", "HARBOR_BOUND"
    significant_wave_height_m: float
    peak_wave_period_s: float
    wind_speed_knots: float
    distance_to_harbor_km: float
    distance_to_imbl_nm: float
    imbl_border_siren_active: bool
    turnback_deadline_ist: str
    time_remaining_to_turnback_mins: int
    nearest_pfz_shoal: Dict[str, Any]
    coastal_voice_bulletin: str
    statutory_disclaimer: str


class USSDSessionRequest(BaseModel):
    session_id: str = Field(..., max_length=50)
    phone_number: str = Field(
        ...,
        max_length=20,
        pattern=r"^\+?[1-9]\d{9,14}$",
        description="E.164 international phone number format",
    )
    user_input: str = Field(default="*99*68#", max_length=20)
    latitude: Optional[float] = Field(default=20.7453, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=78.6022, ge=-180.0, le=180.0)
    language: Optional[str] = Field(default="mr", max_length=10)


class USSDSessionResponse(BaseModel):
    session_id: str
    action: str  # "CONTINUE" or "END"
    ussd_menu_text: str
    character_count: int
    fits_standard_ussd_pdu: bool
