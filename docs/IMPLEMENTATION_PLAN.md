# Implementation Plan — WeatherGPT (Step-by-Step Engineering Blueprint)
**Target Project**: WeatherGPT (SIH 2026 PS26068)  
**Execution Environment**: Python 3.11+, FastAPI, Vanilla HTML5/CSS3/ES6+, Docker  
**Version**: 1.1.0 (With Mausam Rakshak Ground-Truth Engine)

---

## 1. Implementation Phases & Milestones

The build process is divided into 5 ordered, non-breaking phases:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       5-PHASE ENGINEERING TIMELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: FOUNDATION & DATA INGESTION ENGINE                                 │
│ • Project skeleton, dependencies (`requirements.txt`)                       │
│ • Pydantic v2 schemas (`backend/models/schemas.py`)                         │
│ • Live GFS/ECMWF NWP data ingestion service (`weather_service.py`)          │
│ • 40-year ERA5 historical climate trend analysis (`climate_service.py`)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: SCIENTIFIC RULES & HIGH-CONCURRENCY SPATIAL CACHE                  │
│ • Deterministic Agro-Met formulas: wash-off, wind drift, VPD fungal risk    │
│ • Disaster & labor formulas: WBGT heat stress, livestock lightning rules    │
│ • 5 km x 5 km Geohash-6 spatial deduplication cache (5ms response time)    │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: CONVERSATIONAL NLU & MULTILINGUAL BRIDGE                           │
│ • Intent & entity extractor across Farmer, Disaster, Commuter, and Marine   │
│ • Cloud LLM connector (Gemini / OpenAI) with strict factual grounding      │
│ • Offline deterministic Indic template generator (Hindi, Marathi, English) │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: RURAL & URBAN SAFETY SUITE + MAUSAM RAKSHAK                        │
│ • Button-phone IVR missed-call webhook & audio script generator             │
│ • Preemptive hydro-topographic flood detour navigator                       │
│ • APMC Mandi open grain storage cloudburst monitor                          │
│ • Mausam Rakshak 1-tap hazard reporting & satellite anti-fake check         │
│ • WMO WIS 2.0 MQTT / WebSocket alert broadcaster                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: PRODUCTION PWA & DOCKER DEPLOYMENT                                 │
│ • Mobile-first PWA frontend with Zone 1 Shield, Zone 2 Horizon, Zone 3 Chat │
│ • Web Speech API Indic speech recognition & synthesis                       │
│ • Slide-up Micro-GIS drawer with Leaflet radar reflectivity & hazard zones  │
│ • Mausam Rakshak 1-tap reporting sheet & verified pins on map               │
│ • Service Worker 100% offline survivability pack & 160-char SMS modal       │
│ • Multi-stage `Dockerfile` and `docker-compose.yml` validation              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. File-by-File Implementation Checklist

### 2.1 Backend Architecture
- [ ] `backend/requirements.txt`: Python package specifications.
- [ ] `backend/models/schemas.py`: Pydantic v2 schemas including Mausam Rakshak models.
- [ ] `backend/services/spatial_cache_service.py`: 5km Geohash 6 deduplication & LRU cache.
- [ ] `backend/services/weather_service.py`: Open-Meteo & IMD GFS/WRF live atmospheric model ingestion.
- [ ] `backend/services/rules_engine.py`: Agro-met, disaster, labor & livestock formulas.
- [ ] `backend/services/ai_chat_service.py`: Grounded NLU + Cloud LLM + Deterministic Indic fallback.
- [ ] `backend/services/climate_service.py`: 40-year ERA5 historical climate reanalysis.
- [ ] `backend/services/wis2_service.py`: WMO WIS 2.0 MQTT topic publisher & WebSocket push hub.
- [ ] `backend/services/telecom_bridge.py`: 2G button-phone IVR missed-call & SMS engine.
- [ ] `backend/services/flood_routing_service.py`: Preemptive waterlogging & elevation bypass routing.
- [ ] `backend/services/mandi_shield_service.py`: APMC Mandi rain risk monitor.
- [ ] `backend/services/mausam_rakshak_service.py`: Ground-truth consensus & satellite anti-fake engine.
- [ ] `backend/main.py`: FastAPI server assembly with CORS, WebSockets, and static frontend mounting.

### 2.2 Frontend Architecture
- [ ] `frontend/index.html`: Responsive mobile PWA shell with Leaflet.js support.
- [ ] `frontend/app.css`: High-performance glassmorphic stylesheet (60 FPS on 2GB RAM budget phones).
- [ ] `frontend/app.js`: Web Speech API, offline storage, WebSocket alerts, Mausam Rakshak reporting sheet, and drawer animations.
- [ ] `frontend/service-worker.js`: Cache-first offline storage strategy.
- [ ] `frontend/manifest.json`: Web App Manifest for native Android installation.

### 2.3 Containerization & Testing
- [ ] `Dockerfile`: Multi-stage Python 3.11-slim container.
- [ ] `docker-compose.yml`: Single-command deployment orchestration.
- [ ] `.env.example`: Configuration template for optional API keys.
- [ ] `README.md`: Master architectural and user guide.
- [ ] `backend/tests/`: Automated unit test suites (`pytest`).

---

## 3. Testing & Verification Gates

```bash
# Automated Test Suite
pytest backend/tests/test_weather.py -v
pytest backend/tests/test_rules.py -v
pytest backend/tests/test_chat.py -v
pytest backend/tests/test_spatial_cache.py -v
pytest backend/tests/test_safety_suite.py -v
pytest backend/tests/test_rakshak.py -v

# 1-Command Docker Deployment Validation
docker compose up --build -d
curl http://localhost:8000/api/health
```
