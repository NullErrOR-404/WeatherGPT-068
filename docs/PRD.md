# Product Requirements Document (PRD) — WeatherGPT
**Project Title**: WeatherGPT: Conversational AI for Weather Forecasting, Alerts, and Climate Intelligence  
**Problem Statement ID**: PS26068 (Smart India Hackathon 2026 / Ministry of Earth Sciences - IMD)  
**Version**: 1.1.0 (Production Blueprint with Mausam Rakshak)  
**Target Delivery**: Multi-Channel (Universal Mobile PWA, 2G Button-Phone IVR Telephony Gateway, Emergency Cell-Broadcast SMS)

---

## 1. Executive Summary & Vision

Weather information in India is generated in high volumes by world-class scientific infrastructure (39 Doppler Weather Radars, INSAT-3D/3DR satellites, supercomputer-driven GFS/WRF numerical weather models). However, this data remains trapped in scientific silos, legacy web portals (IMD Mausam), static bi-weekly PDFs (Meghdoot), alarmist single-purpose apps (Damini), and one-way emergency SMS blasts (NDMA Sachet).

**WeatherGPT** is an intelligent, multi-channel conversational platform that acts as the "Last-Mile Translation Layer" for Indian meteorology. It converts complex atmospheric physics and disaster alert feeds into **clear, actionable, multilingual decision intelligence** accessible via:
1. **Universal Mobile PWA**: Runs smoothly at 60 FPS on any smartphone (including ₹6,000 budget Android phones with 2GB RAM).
2. **2G Button-Phone IVR Telecom Gateway**: Automated missed-call callbacks and two-way voice conversations over standard cellular voice lines for 350+ million feature-phone users.
3. **Emergency Crisis Blackout Protocols**: Cell Broadcast Service (CBS) emergency alerting and 100% offline 72-hour pre-caching.
4. **Mausam Rakshak (Human Sensor Network)**: 1-tap crowdsourced ground-truth hazard reporting (hail, waterlogging, squall) with satellite anti-fake cross-validation.

---

## 2. Target User Personas & Pain Points

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TARGET USER MATRIX                                             │
├──────────────────────┬───────────────────────────────┬───────────────────────────────────────────┤
│ Persona              │ Real-World Context            │ Primary Need & Action Window              │
├──────────────────────┼───────────────────────────────┼───────────────────────────────────────────┤
│ 1. Smallholder Farmer│ • ₹1,000 button phone or      │ • Wash-off risk for pesticide application │
│    (Kisan - 60% user)│   budget 2GB Android          │ • Irrigation necessity vs rainfall prob   │
│                      │ • Vernacular voice preference │ • Sowing soil moisture & harvest drying   │
├──────────────────────┼───────────────────────────────┼───────────────────────────────────────────┤
│ 2. Coastal Fisherman │ • Small fiber/motorized boat  │ • Wave height & swell surge limits        │
│    & Inland Fish Farm│ • 5-12 nautical miles offshore│ • Wind shear & squall warnings            │
│                      │ • High vulnerability to capsizing • Safe return countdown to harbor       │
├──────────────────────┼───────────────────────────────┼───────────────────────────────────────────┤
│ 3. Disaster Officer  │ • District Magistrate, Tehsildar│ • Automated Situation Reports (SitRep)   │
│    (DDMA / SDRF)     │ • Overwhelmed by raw bulletins│ • Low-lying village evacuation priorities │
│                      │ • Need rapid coordination     │ • Resource deployment checklists          │
├──────────────────────┼───────────────────────────────┼───────────────────────────────────────────┤
│ 4. Urban Commuter &  │ • Delivery riders (Zomato/etc)│ • Hyperlocal 3-hour nowcast               │
│    Outdoor Laborer   │ • Daily two-wheeler transit   │ • Preemptive underpass flood bypasses     │
│                      │ • Heatwave vulnerability      │ • Wet-Bulb labor rest advisories          │
├──────────────────────┼───────────────────────────────┼───────────────────────────────────────────┤
│ 5. APMC Mandi Trader │ • Manages open-air grain heaps│ • 4-hour advance cloudburst warnings to   │
│    & Secretary       │ • Unseasonal rain causes rot  │   pull tarpaulins and secure grain sheds  │
├──────────────────────┼───────────────────────────────┼───────────────────────────────────────────┤
│ 6. Mausam Rakshak    │ • Local school teachers,      │ • 1-tap ground-truth reporting of hail,   │
│    Citizen Observers │   panchayat youth, commuters  │   floods, tree falls to close radar blind │
│                      │ • On-the-ground eyewitnesses  │   spots and protect neighbor villages     │
└──────────────────────┴───────────────────────────────┴───────────────────────────────────────────┘
```

---

## 3. Core Functional Requirements

### FR-1: Unified Single-Screen Interface (Replacing 4 Government Apps)
- **Zone 1 (Active Safety Shield)**: Dynamic indicator reflecting live lightning (Damini) and disaster alert polygons (NDMA CAP). Displays vector movement direction and safe all-clear countdown.
- **Zone 2 (Action Horizon Card)**: Hyperlocal 3-hour nowcast slider (rain timing down to the hour) + today's primary operational window.
- **Zone 3 (Conversational Core)**: Center-stage voice-first chat with Bhashini Indic speech integration and contextual quick chips.

### FR-2: Zero-Hallucination Grounded Architecture
- Generative AI **never invents atmospheric numbers**.
- Queries live high-resolution GFS/WRF model grids (via Open-Meteo & IMD open endpoints) and historical 40-year ERA5 reanalysis archives.
- All numbers pass through deterministic scientific formulas before reaching the conversational formatter.

### FR-3: Agro-Met Decision Support Engine
- **Pesticide Wash-off Warning**: Flags rain probability $> 40\%$ or precipitation $> 2.5\text{ mm}$ within 6 hours of spray.
- **Spray Drift Warning**: Flags wind speed $> 15\text{ km/h}$ to prevent chemical drift.
- **Fungal Blight Risk**: Identifies humidity $> 80\%$ and temperature 22–28°C lasting 48 hours.
- **Soil Saturation / Irrigation**: Evaluates $0\text{-}1\text{cm}$ topsoil moisture to advise whether irrigation is required.

### FR-4: Button-Phone IVR Telephony Gateway
- Farmer gives a missed call to a toll-free number $\rightarrow$ server calls back in 10 seconds.
- Spoken voice greeting in regional language (Hindi, Marathi, Telugu, Tamil).
- Two-way voice query processing via telecom audio streaming.
- 160-character compressed USSD / SMS advisory for text-only phones.

### FR-5: Preemptive Flood Detour Navigator
- Pairs live radar rainfall rate ($> 35\text{ mm/h}$) with local Digital Elevation Models (DEM).
- Flags underpasses and low-lying culverts as impassable 20–30 minutes *before* water accumulates.
- Calculates high-ground elevation detour routes.

### FR-6: APMC Mandi Open-Air Grain Shield
- Monitors registered APMC grain yards.
- Pushes 4-hour advance cloudburst warnings to prevent post-harvest grain sprouting and rot.

### FR-7: "Mausam Rakshak" Citizen Ground-Truth Network
- 1-tap mobile reporting of 5 ground hazards: 🧊 Hail, 🌊 Waterlogging, ⚡ Lightning, 🌪️ Squall/Tree fall, 🌫️ Dense Fog.
- **3-Tier Anti-Fake Validation**:
  1. *Spatial-Temporal Consensus*: $\ge 3$ independent reports within a 2 km radius in 15 minutes.
  2. *Satellite Physics Validation*: Cloud top temperature $T_{\text{top}} \le -40^\circ\text{C}$ & convective instability.
  3. *Reputation Score (0-100)*: Badges trustworthy users and shadow-bans fraudulent submissions.
- Verified reports immediately push warnings to downwind villages and emergency responders.

### FR-8: 5 km x 5 km Spatial Deduplication & Semantic Cache
- Maps requests into Geohash Level 6 spatial cells.
- Serves 50,000 concurrent queries in 5 milliseconds with 98% reduction in cloud LLM API costs.

### FR-9: 100% Offline Survivability Mode
- Service Worker caches the 72-hour forecast, agro-rules, and emergency shelter directory.
- Operates without internet connectivity during telecom tower collapse.

---

## 4. Non-Functional Requirements (NFRs)

1. **Latency**:
   - Cached queries: $< 10\text{ ms}$.
   - Live NWP API queries: $< 250\text{ ms}$.
   - Full Speech-to-Speech loop: $< 1.5\text{ seconds}$.
2. **Device Compatibility**:
   - 100% functional on 2GB RAM budget phones (Android 8.0+ / Android Go).
   - Total client bundle size $< 5\text{ MB}$.
   - Frame rate: Constant 60 FPS on low-end hardware.
3. **Availability & Resilience**:
   - 99.99% operational uptime using hybrid cloud LLM + offline deterministic Indic template fallback.
   - Zero-dependency deployment via Docker & Docker Compose.
4. **Security & Data Privacy**:
   - Non-root container execution.
   - User GPS coordinates stored exclusively in client memory/local storage; never retained on server logs.

---

## 5. Success Metrics & Evaluation Alignment

| Metric | Target | SIH 2026 Evaluation Impact |
| :--- | :--- | :--- |
| **Grounded Accuracy** | 100% adherence to official NWP/CAP data | Highest marks in "Accuracy and relevance" |
| **Response Latency** | $< 10\text{ ms}$ (cached) / $< 250\text{ ms}$ (fresh) | Highest marks in "Response latency" |
| **Language Coverage** | 5 major scheduled Indian languages | Highest marks in "Multilingual capability" |
| **Device Accessibility**| Budget phones + 2G button phones | Highest marks in "User interface & accessibility" |
| **Scalability & Cost** | 98% LLM cost reduction via Geohash 6 | Highest marks in "Scalability & innovation" |
| **Real-Time Warning**  | WMO WIS 2.0 & NDMA CAP integration | Highest marks in "Real-time meteorological integration" |
| **Ground-Truth Network**| 3-tier anti-fake verified reporting | Breakthrough innovation for radar blind zones |
