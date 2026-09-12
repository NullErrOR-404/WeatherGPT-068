# Graph Report - C:\WeatherGPT-068  (2026-09-12)

## Corpus Check
- 19 files · ~48,779 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 174 nodes · 444 edges · 8 communities detected
- Extraction: 47% EXTRACTED · 53% INFERRED · 0% AMBIGUOUS · INFERRED: 235 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `WeatherResponse` - 20 edges
2. `ChatQuery` - 20 edges
3. `MissedCallRequest` - 20 edges
4. `IVROutboundResponse` - 20 edges
5. `ChatResponse` - 19 edges
6. `CitizenHazardReport` - 19 edges
7. `AntiFakeValidationResult` - 19 edges
8. `FloodDetourRoute` - 19 edges
9. `MandiRainShieldReport` - 19 edges
10. `CurrentWeatherMetrics` - 12 edges

## Surprising Connections (you probably didn't know these)
- `FloodDetourRoute` --uses--> `Preemptive Flood Detour Navigator. Pairs live radar precipitation intensity with`  [INFERRED]
  C:\WeatherGPT-068\backend\models\schemas.py → C:\WeatherGPT-068\backend\services\flood_routing_service.py
- `MandiRainShieldReport` --uses--> `APMC Mandi Grain Shield Service. Monitors open-air grain storage yards and trigg`  [INFERRED]
  C:\WeatherGPT-068\backend\models\schemas.py → C:\WeatherGPT-068\backend\services\mandi_shield_service.py
- `CurrentWeatherMetrics` --uses--> `WeatherService`  [INFERRED]
  C:\WeatherGPT-068\backend\models\schemas.py → C:\WeatherGPT-068\backend\services\weather_service.py
- `NowcastHour` --uses--> `Live Meteorological Ingestion Service. Fetches high-resolution GFS/ECMWF numeric`  [INFERRED]
  C:\WeatherGPT-068\backend\models\schemas.py → C:\WeatherGPT-068\backend\services\weather_service.py
- `WeatherResponse` --uses--> `WeatherService`  [INFERRED]
  C:\WeatherGPT-068\backend\models\schemas.py → C:\WeatherGPT-068\backend\services\weather_service.py

## Communities

### Community 0 - "Community 0"

Cohesion: 0.09
Nodes (16): get_active_alerts(), get_cache_statistics(), get_current_weather(), get_verified_ground_pins(), health_check(), submit_citizen_report(), websocket_alerts_endpoint(), MausamRakshakService (+8 more)

### Community 1 - "Community 1"

Cohesion: 0.36
Nodes (28): Conversational AI Service. Integrates Grounded Intent Parsing, Spatial Semantic, BaseModel, WeatherGPT — FastAPI ASGI Application. Central orchestration layer serving REST, Compares current conditions against 40-year ERA5 historical normal., Simulates 2G button-phone missed call and triggers automated IVR callback., Generates 160-character compressed GSM 03.38 payload for total data blackouts., Preemptive underpass waterlogging prediction and high-elevation bypass., Monitors open-air grain yard cloudburst risk. (+20 more)

### Community 2 - "Community 2"

Cohesion: 0.15
Nodes (17): Preemptive Flood Detour Navigator. Pairs live radar precipitation intensity with, APMC Mandi Grain Shield Service. Monitors open-air grain storage yards and trigg, Deterministic Scientific Rules Engine. Pure mathematical computation of Agro-Met, Evaluates pesticide & chemical fertilizer spray safety.         Rule 1: Rain pro, Calculates simplified Wet-Bulb Globe Temperature (WBGT) for outdoor labor safety, Evaluates coastal craft and artisanal fishing boat sea-state safety., RulesEngine, AgroAdvisory (+9 more)

### Community 3 - "Community 3"

Cohesion: 0.1
Nodes (15): FloodRoutingService, get_compressed_sms(), get_flood_detour(), get_mandi_status(), MandiShieldService, NowcastHour, Generates ultra-dense 160-character USSD/SMS payload for transmission during tot, test_emergency_sms_payload() (+7 more)

### Community 4 - "Community 4"

Cohesion: 0.1
Nodes (19): appendChatMessage(), data, els, fetchWeatherData(), handleSendQuery(), hazardType, isDaylight, langMap (+11 more)

### Community 5 - "Community 5"

Cohesion: 0.15
Nodes (12): ClimateService, Climate History & Reanalysis Service. Queries 40-year historical ERA5 reanalysis, Compares current 10-day rainfall against 30-year historical ERA5 normal., get_climate_trend(), test_api_alerts_active(), test_api_climate_compare(), test_api_flood_detour(), test_api_health() (+4 more)

### Community 6 - "Community 6"

Cohesion: 0.23
Nodes (4): AIChatService, chat_interaction(), test_chat_spray_query_intent(), test_spatial_cache_deduplication()

### Community 7 - "Community 7"

Cohesion: 0.67
Nodes (2): ASSETS_TO_CACHE, CACHE_NAME

## Knowledge Gaps
- **22 isolated node(s):** `Pydantic v2 data models for WeatherGPT. Single source of truth for all API contr`, `Climate History & Reanalysis Service. Queries 40-year historical ERA5 reanalysis`, `Compares current 10-day rainfall against 30-year historical ERA5 normal.`, `Spatial Deduplication and Semantic Cache Service. Implements 5km x 5km Geohash-6`, `Encodes latitude/longitude into a geohash string.` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.