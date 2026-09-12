# Database & Data Schema Specification — WeatherGPT
**Scope**: In-Memory TTLCache, Pydantic v2 Models, Offline LocalStorage Schemas, & GeoJSON Alert Structures  
**Version**: 1.1.0 (With Mausam Rakshak Ground-Truth Schemas)

---

## 1. Overview & Data Storage Strategy

WeatherGPT is designed with an **Ultra-Low-Latency In-Memory & Edge Caching Strategy**:
1. **Application Memory (FastAPI TTLCache)**: High-speed in-memory store for 5 km x 5 km Geohash spatial cache entries, live NWP responses, and active CAP alert polygons.
2. **Client-Side Edge Store (LocalStorage / IndexedDB)**: Stores the 72-hour forecast pack, offline agromet rules, user preferences, and pending offline citizen reports directly on the mobile phone.
3. **Pydantic v2 Models**: Strict typed schemas ensuring zero runtime serialization errors and zero hallucination boundaries.

---

## 2. Core Pydantic Models (`schemas.py`)

### 2.1 Weather & Nowcast Models

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

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
```

### 2.2 Agro-Meteorological & Safety Rule Results

```python
class AgroAdvisory(BaseModel):
    crop: str
    operation: str  # e.g., "pesticide_spray", "irrigation", "harvest_drying"
    is_safe: bool
    status_badge: str  # "SAFE" (Green), "CAUTION" (Yellow), "REJECT" (Red)
    headline: str
    detailed_explanation: str
    next_safe_window: Optional[str]
    wash_off_risk: str  # "LOW", "MODERATE", "HIGH"
    drift_hazard: str   # "SAFE", "HIGH"
    fungal_blight_risk: bool
    soil_saturation_pct: float
```

### 2.3 Disaster & CAP Alert Models

```python
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
    vector_movement: Optional[str] = None  # e.g., "Moving Southeast at 25 km/h"
    all_clear_countdown_mins: Optional[int] = None
```

### 2.4 "Mausam Rakshak" Citizen Ground-Truth Models

```python
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
    consensus_count: int  # Number of independent reports in 2km/15min
    satellite_cloud_temp_c: float
    cape_index: float
    physics_check_passed: bool
    reputation_score: int
    badge_awarded: bool
    downwind_warning_triggered: bool
```

### 2.5 Safety Suite Models (Telephony, Flood Detour & Mandi Shield)

```python
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
```

---

## 3. Spatial Deduplication Cache Key Structure

```
Cache Key Schema:
GEOHASH_6 : INTENT : ENTITY : TIME_BUCKET_15M

Example 1 (Wardha Cotton Spraying):
"te7u0x:AGROMET_SPRAY:COTTON:20260912_1645"

Example 2 (Puri Cyclone Warning):
"tg5c8v:DISASTER_SITREP:CYCLONE:20260912_1700"
```
- **TTL**: 900 seconds (15 minutes).
- **Eviction**: Least Recently Used (LRU) policy with a maximum capacity of 50,000 spatial cells.

---

## 4. Emergency SMS Compressed Schema (160-Character Payload)

For transmission over GSM 03.38 signaling channels during total data blackouts:

```
FORMAT:
[WTH-ALERT]:<LOC>|<SEV>|<HAZARD>|<EXP_TIME>|<INSTRUCTION>|<SHELTER_NO>

EXAMPLE:
[WTH-ALERT]:WRDHA|RED|THUNDER-HAIL|17:30|SEEK PUCCA SHELTER-AVOID TREES|1077-NDRF
```
- Exactly 78 characters (well within the 160-character single-SMS standard).

---

## 5. Client Offline Storage Schema (`localStorage`)

```json
{
  "weathergpt_offline_pack": {
    "timestamp": 1726140000000,
    "location": { "lat": 20.7453, "lon": 78.6022, "name": "Wardha, MH" },
    "current": { "temp": 26.8, "humidity": 91, "feels_like": 32.4, "rain": 0.2 },
    "forecast_72h": [
      { "day": "Thursday", "max_temp": 32, "min_temp": 24, "rain_prob": 20, "spray_window": "07:00-13:00" },
      { "day": "Friday", "max_temp": 31, "min_temp": 23, "rain_prob": 15, "spray_window": "08:00-16:00" }
    ],
    "emergency_contacts": {
      "police": "112",
      "disaster_helpline": "1077",
      "kisan_call_center": "1800-180-1551"
    }
  }
}
```
