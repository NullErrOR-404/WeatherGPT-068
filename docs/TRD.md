# Technical Requirements Document (TRD) — WeatherGPT
**Project**: WeatherGPT (Conversational AI for Weather, Alerts & Climate Intelligence)  
**System Architecture**: Asynchronous ASGI (FastAPI) + Offline PWA + 2G IVR Telephony Gateway  
**Version**: 1.1.0 (With Mausam Rakshak Ground-Truth Engine)

---

## 1. System Architecture Overview

WeatherGPT is designed around a **tri-tier decoupled architecture**:
1. **Edge Client Tier (PWA & IVR)**: Ultra-lightweight Vanilla JS PWA (Cache-First Service Worker) + Telecom Voice Gateway + 1-Tap Mausam Rakshak Reporting Sheet.
2. **Core Ingestion & Intelligence Tier (FastAPI)**: Asynchronous micro-services handling spatial deduplication, live NWP ingestion, deterministic safety formulas, ground-truth satellite validation, and hybrid generative NLU.
3. **External Systems Tier**: Real-time GFS/ECMWF atmospheric grids (Open-Meteo & IMD), 40-year ERA5 climate reanalysis, NDMA CAP XML alerts, and WMO WIS 2.0 MQTT event streams.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT PRESENTATION TIER                        │
│                                                                             │
│   [ Progressive Web App (PWA) ]              [ 2G Button-Phone Telephony ]  │
│   • 60 FPS Vanilla DOM Engine                 • Telecom Voice Stream        │
│   • Web Speech Recognition & Audio            • Missed-Call Webhook         │
│   • LocalStorage 72-hr Cache                  • 160-char SMS / USSD Payload │
│   • Leaflet Micro-GIS Drawer                  • Audio IVR Callback          │
│   • Mausam Rakshak 1-Tap Reporting Sheet                                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSocket / Webhooks
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI APPLICATION TIER                          │
│                                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────────┐ │
│  │ 5km Spatial Cache Engine│  │ Scientific Rules Matrix │  │ WIS 2.0/MQTT │ │
│  │ • Geohash Level 6 RAM   │  │ • Wash-off probability  │  │ Hub          │ │
│  │ • 98% LLM cost reduction│  │ • Wind drift thresholds │  │ • WebSocket  │ │
│  │ • 5ms cache-hit latency │  │ • WBGT heat stress index│  │   alert push │ │
│  └────────────┬────────────┘  └────────────┬────────────┘  └───────┬──────┘ │
│               │                            │                       │        │
│               ├────────────────────────────┼───────────────────────┘        │
│               ▼                            ▼                                │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ Ground-Truth Validation │  │ Grounded Conversational AI Engine        │  │
│  │ Engine (Mausam Rakshak) │  │ • Intent & Entity Extraction (NLU)       │  │
│  │ • K>=3 Spatial Cluster  │  │ • Cloud LLM Adapter (Gemini / OpenAI)    │  │
│  │ • Satellite T_top Check │  │ • Deterministic Indic Template Fallback  │  │
│  │ • Reputation Scorer     │  │   (100% Offline Operational Resilience)  │  │
│  └─────────────────────────┘  └──────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Asynchronous HTTP Client (httpx)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTHORITATIVE DATA TIER                            │
│  • NOAA GFS 0.25° & ECMWF High-Resolution NWP Grids (via Open-Meteo)        │
│  • Copernicus ERA5 40-Year Daily Climate Reanalysis Archive                 │
│  • NDMA Sachet Common Alerting Protocol (CAP) XML Alert Feeds               │
│  • Digital Elevation Models (DEM) & Municipal Drain Inundation Vectors      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1 Spatial Deduplication & Semantic Cache (`spatial_cache_service.py`)
- **Algorithm**: Geohash Level 6 mapping ($\approx 1.2\text{ km} \times 0.6\text{ km}$ precision cells grouped into $5\text{ km} \times 5\text{ km}$ clusters).
- **Composite Cache Key**:
  $$\text{Key} = \text{hash}(\text{Geohash}_6 \parallel \text{Intent} \parallel \text{Entity} \parallel \text{TimeBucket}_{15\text{m}})$$
- **Cache Store**: In-memory LRU TTLCache with configurable 15-minute TTL.
- **Latency Benchmark**: Sub-5ms response on cache hits.

### 2.2 Live Meteorological Ingestion Service (`weather_service.py`)
- **Primary Source**: Open-Meteo / IMD GFS 0.25° NWP model.
- **Query Parameters**:
  - `temperature_2m`, `relative_humidity_2m`, `apparent_temperature`
  - `precipitation`, `precipitation_probability`, `rain`
  - `weather_code` (WMO synoptic standard 0–99)
  - `wind_speed_10m`, `wind_gusts_10m`, `wind_direction_10m`
  - `surface_pressure`, `dew_point_2m`, `vapour_pressure_deficit`
  - `soil_moisture_0_to_1cm`
- **Resilience**: In-memory 10-minute caching to eliminate upstream API rate limits.

### 2.3 Scientific Agro-Met & Disaster Rules Engine (`rules_engine.py`)
Deterministic mathematical functions:
1. **Chemical Spray Wash-off Probability**:
   $$\text{SprayVerdict} = \begin{cases} \text{REJECT}, & \text{if } \max_{t \in [0, 6\text{h}]} P(\text{Rain}_t) > 40\% \lor \sum_{t=0}^{6} \text{Rain}_t \ge 2.5\text{ mm} \\ \text{APPROVE}, & \text{otherwise} \end{cases}$$
2. **Wind Spray Drift Hazard**:
   $$\text{DriftHazard} = \begin{cases} \text{HIGH}, & \text{if } \text{WindSpeed}_{10\text{m}} > 15\text{ km/h} \lor \text{Gusts} > 25\text{ km/h} \\ \text{SAFE}, & \text{otherwise} \end{cases}$$
3. **Fungal Blight Outbreak Risk**:
   $$\text{FungalRisk} = \text{True} \iff (\text{VPD} < 0.4\text{ kPa}) \land (\text{Humidity} > 85\%) \land (20^\circ\text{C} \le \text{Temp} \le 28^\circ\text{C})$$
4. **Wet-Bulb Globe Temperature (WBGT) Simplified Equation**:
   $$\text{WBGT} \approx 0.767 \cdot T_w + 0.222 \cdot T_a$$
   - $\text{WBGT} > 31^\circ\text{C}$: Extreme Heat Stress $\rightarrow$ Mandatory 15-min rest per 45 min labor.
5. **Marine Safety Threshold**:
   $$\text{SeaCondition} = \begin{cases} \text{RED (Stay Ashore)}, & \text{if } \text{WaveHeight} > 2.0\text{m} \lor \text{WindSpeed} > 45\text{ km/h} \\ \text{GREEN (Safe)}, & \text{otherwise} \end{cases}$$

### 2.4 "Mausam Rakshak" Ground-Truth Service (`mausam_rakshak_service.py`)
- Receives 1-tap citizen reports via `POST /api/rakshak/report`.
- **Validation Pipeline**:
  1. *Spatial Consensus*: Clusters incoming reports within $\Delta d \le 2\text{ km}$ and $\Delta t \le 15\text{ mins}$. Requires $K \ge 3$ distinct submitters.
  2. *Physics Verification*: Queries satellite thermal infrared cloud-top temperature $T_{\text{top}}$ and $\text{CAPE}$. For hail/squalls, rejects if $T_{\text{top}} > -40^\circ\text{C}$.
  3. *Reputation Adjustment*: Verified reports award $+5$ points; fraudulent submissions penalize $-25$ points.
  4. *Downwind Alert Broadcast*: On verification, computes downwind vector and broadcasts early audio warning to neighboring communities.

### 2.5 Hybrid Conversational AI Engine (`ai_chat_service.py`)
- **Intent Extraction**: Lightweight regular expression & embedding parser extracts `domain` (farming, disaster, commuter, marine), `action` (spray, harvest, commute, sail), and `location`.
- **Cloud LLM Pipeline**: When `GEMINI_API_KEY` or `OPENAI_API_KEY` is present, formats a strict zero-hallucination system prompt containing pre-verified numerical metrics.
- **Offline Deterministic Fallback**: Built-in template generator in Hindi, Marathi, Telugu, Tamil, and English that generates accurate advisory text with zero external dependencies.

### 2.6 Button-Phone Telephony Bridge (`telecom_bridge.py`)
- Webhook endpoint for inbound missed calls (`/api/telecom/missed-call`).
- Determines caller language and regional circle.
- Prepares IVR speech script and handles DTMF tone options (`1 = Forecast`, `2 = Voice Question`).
- Generates 160-character compressed SMS payload.

### 2.7 Preemptive Flood Detour Navigator (`flood_routing_service.py`)
- Evaluates rainfall rate vs. underpass catchment drainage.
- Predicts inundation when precipitation intensity $> 35\text{ mm/h}$ sustained for 30 minutes.
- Returns high-elevation bypass coordinates.

### 2.8 APMC Mandi Grain Shield (`mandi_shield_service.py`)
- Monitors open-air yard coordinates.
- Triggers 4-hour countdown alert when convective squalls approach.

---

## 3. API Route Specifications

| Route | Method | Purpose | Input / Query | Output |
| :--- | :--- | :--- | :--- | :--- |
| `/api/weather/current` | `GET` | Current weather & metrics | `lat`, `lon` | `WeatherResponse` |
| `/api/weather/nowcast` | `GET` | 3-hour nowcast slider | `lat`, `lon` | `NowcastTimeline` |
| `/api/chat` | `POST` | Conversational query | `ChatQuery` JSON | `ChatResponse` |
| `/api/rakshak/report` | `POST` | Citizen ground-truth report | `CitizenHazardReport` | `AntiFakeValidationResult` |
| `/api/rakshak/verified`| `GET` | Active verified ground pins | `lat`, `lon`, `radius_km` | `List[VerifiedPin]` |
| `/api/alerts/active` | `GET` | Active CAP & lightning alerts | `lat`, `lon` | `AlertList` |
| `/api/climate/compare`| `GET`| 40-yr ERA5 normal comparison | `lat`, `lon` | `ClimateComparison` |
| `/api/telecom/missed-call` | `POST` | Button-phone missed call webhook | `phone`, `lat`, `lon` | `IVROutboundTask` |
| `/api/telecom/sms-payload` | `GET` | 160-character USSD/SMS payload | `lat`, `lon` | `SMSPayload` |
| `/api/flood/detour` | `GET` | Inundated road bypass routes | `lat`, `lon` | `DetourRoute` |
| `/api/mandi/status` | `GET` | Mandi yard rain risk status | `mandi_id` | `MandiRiskReport` |
| `/ws/alerts` | `WebSocket` | WMO WIS 2.0 live alert push | Client connection | Streamed alert frames |

---

## 4. Production Deployment Configuration

- **Containerization**: Python 3.11-slim multi-stage Docker build.
- **ASGI Server**: Uvicorn with asynchronous event loop.
- **Healthcheck**: `GET /api/health` returning memory, cache hit rate, active WebSocket count, and Mausam Rakshak verified report stats.
