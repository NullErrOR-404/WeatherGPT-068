# Product Requirements Document (PRD) — WeatherGPT
**Project Title**: WeatherGPT: Conversational AI for Weather Forecasting, Alerts, and Climate Intelligence  
**Problem Statement ID**: PS26068 (Smart India Hackathon 2026 / Ministry of Earth Sciences - IMD)  
**Version**: 1.1.0 (Production Blueprint with Mausam Rakshak)  
**Target Delivery**: Multi-Channel (Universal Mobile PWA, 2G Button-Phone IVR Telephony Gateway, Emergency Cell-Broadcast SMS)

---

## 1. Executive Summary & Vision: Grounded in 'Mission Mausam' (2024–2026)

In late 2024, the Union Cabinet approved India's landmark **₹2,000 Crore "Mission Mausam"** (spearheaded by the Ministry of Earth Sciences, IMD, NCMRWF, and IITM) to make India "Weather Ready and Climate Smart". Mission Mausam is deploying 60+ next-generation Doppler Weather Radars (X/C/S-band), 10 wind profilers, 25 radiometers, the advanced **INSAT-3DS meteorological satellite** (launched Feb 2024), and nationwide **Panchayat Mausam Seva** covering all 2.5 lakh+ Gram Panchayats.

However, a critical gap remains: **The Last-Mile Decision Gap**. Billions of rupees of cutting-edge radar and AI-NWP data remain trapped in institutional portals, complex GIS viewers, and cryptic scientific bulletins that a rural smallholder farmer, coastal fisherman, or city commuter cannot decipher in high-stress moments.

**WeatherGPT** is engineered as the official conversational and decision-intelligence last-mile bridge for **Mission Mausam**, built on the latest 2025/2026 technology standards:
1. **Zero-Jargon High Abstraction**: Translates raw meteorology (hPa, J/kg, CAPE, mm/hr, m/s) into everyday human action ("Hold pump tonight—save ₹400 diesel", "Turn boat back before 11:30 AM", "Lightning storm 8km away—take shelter").
2. **All Government Portals in One Upgraded App**: Unifies and radically upgrades IMD Mausam, Meghdoot (Agro), Damini (Lightning), Sachet (NDMA CAP), SAMUDRA (INCOIS Marine), and Bhuvan (ISRO GIS).
3. **Panchayat-Level Spatial Intelligence**: Maps 5km Geohash-6 clusters directly to India's 2.5 lakh+ Gram Panchayats under the **Panchayat Mausam Seva** framework.
4. **WMO WIS 2.0 Global Compliance**: Fully native to the World Meteorological Organization's mandated **WIS 2.0 standard** (MQTT pub/sub message brokers + GeoJSON WNM schemas).
5. **Latest Indic AI Stack (Digital India Bhashini)**: Powered by **IndicTrans2** (22 languages), **IndicConformer ASR**, and **Indic-TTS** for natural conversational fluency across rustic rural accents.
6. **Live Weather Anchor on Open**: Automatically narrates a 30-second localized voice bulletin in the user's native tongue on launch, with a 1-tap voice mic for follow-ups.
7. **Multi-Channel Delivery**: High-performance React Native (New Architecture + Meta Hermes AOT) Mobile APK, 100% offline via cached beacons, and a 2G Button-Phone IVR Telephony Gateway (`1800-MET-TALK`) for 350+ million non-smartphone citizens.

---

## 2. Government Feature Parity & Radical Upgrades Matrix

| Existing Govt Platform | Official Features | Current Flaws & Jargon Barriers | WeatherGPT Upgraded Zero-Jargon Equivalent | WeatherGPT Add-on Moat (Our Exclusive Innovations) |
| :--- | :--- | :--- | :--- | :--- |
| **IMD Mausam** | 7-day city forecasts, radar mosaics, sunrise/sunset, static nowcast bulletins. | Buried in technical PDF tables; jargon like *"partly cloudy sky with possibility of development of thunder lightning"*; no direct advice. | **Zero-Jargon 3-Hour Life Action Horizon**: 3 plain questions answered: *"Can I dry clothes?"*, *"Can I travel safely?"*, *"Do I need rain gear?"* with visual icons and color badges. | **5km Geohash-6 Spatial Cache**: 98% LLM cost cut + $<5\text{ms}$ latency. |
| **Meghdoot (IMD + ICAR + IITM)** | District agro-meteorological advisories issued twice weekly (Tuesdays & Fridays). | Static district-level PDFs; released only twice a week; lacks farm-specific micro-climate; confusing chemical dosage text. | **Real-Time 4-in-1 Kisan Field Matrix**: Hourly ICAR pesticide wash-off & drift window, **Diesel-Saver Irrigation Cutoff** (*"Hold irrigation; 18mm rain coming—saves ₹400"*), **Sowing Window Horizon**, and **Harvest Drying Moisture Index**. | **2G Missed-Call & Vernacular IVR (`1800-MET-TALK`)**: 100% accessible to button-phone farmers in Hindi, Marathi, Telugu, Tamil, etc. |
| **Damini (IITM / MoES)** | Lightning strike warning within 20km and 40km radius. | Static circular overlays; false-alarm panic; no storm direction or velocity; no "All-Clear" countdown timer. | **Suraksha Predictive Strike Vector**: Calculates storm cell travel velocity and direction (*"Storm moving SE at 22 km/h; lightning arrives in your village in 14 mins"*). Audio siren + 30-min All-Clear countdown. | **Zero-Text Audio & Visual Siren**: Siren + graphic guide on safe vs fatal shelters (e.g. brick home vs under tree/tractor). |
| **Sachet (NDMA / C-DOT - CAP)** | Multi-hazard Common Alerting Protocol (CAP) for cyclones, floods, tsunamis. | One-way bulk SMS blasts sent to whole telecom circles; high spam fatigue; often English-only or bureaucratic Hindi. | **Hyperlocal Neighborhood Shield**: Geo-fenced within 5km radius with direct survival instructions translated into 12 Indic vernaculars. | **160-Char Compressed GSM 03.38 SMS**: Emergency payload surviving 100% cellular data blackouts. |
| **SAMUDRA / INCOIS** | Ocean State Forecasts (OSF) & Potential Fishing Zones (PFZ). | Complex ocean color chlorophyll maps ($mg/m^3$) and SST thermal gradients unusable on wet phone screens at sea. | **Matsya Rakshak (Safe Voyage & Turnback Deadline)**: Fuses INCOIS fish shoal locations with wave crest safety. Computes exact **Turnback Deadline** before squalls hit, customized to a 6-knot artisanal boat. | **Coastal Dialect Voice Beacons**: Plain voice alerts in Tamil, Malayalam, Telugu, Odia, Bengali, Marathi. |
| **Bhuvan (ISRO)** | Disaster geo-portal, waterbody maps, satellite flood layer. | Complex GIS layers; desktop-centric; requires high-speed broadband; zero real-time vehicle rerouting. | **Hydro-Topographic Underpass Detour Navigator**: Early warning of city underpasses/low-lying rural dips flooding 20–30 mins before critical depth, with elevated bypass route. | **APMC Mandi Open-Air Grain Shield**: 4-hour preemptive radar + tarpaulin urgency score ($0\text{--}100$) saving open-air grain heaps. |
| **Ground Stations (IMD AWS/ARG)** | Automated Weather Stations & Rain Gauges across India. | Coverage gaps in rural valleys, shadow zones behind hills, and coastal blind spots. | **Mausam Rakshak Ground Truth Consensus**: 1-tap citizen ground hazard reports (hail, waterlogging, squalls) verified via satellite cloud-top physics ($T_{\text{top}} \le -40^\circ\text{C}$) and Sybil consensus. | **Reputation Score & Token-Free Ground Truth**: Protects against fake panic while closing radar blind spots. |
| **Smartphone MEMS Sensors** | Built-in device barometric pressure sensor (`Sensor.TYPE_PRESSURE`) completely ignored by government portals. | Unused hardware capability; sudden microburst pressure jumps go undetected until rain hits. | **Micro-Barometer Storm Front Detector**: Uses smartphone barometer with Hypsometric MSLP altitude reduction to monitor 15-minute pressure tendencies ($dP/dt$). Detects thunderstorm "pressure jumps" ($+1.5\text{ to } +3.5\text{ hPa}$) **20–30 mins before Doppler radar sees rain droplets**. | **Crowdsourced Device Mesh Consensus**: Cross-references nearby phones in the 5km Geohash cluster to eliminate indoor AC/elevator noise artifacts. |
| **Ambient Light Sensors (`Sensor.TYPE_LIGHT`)** | Photodiode present on 100% of smartphones for auto-brightness. | Zero meteorological use in existing government platforms. | **Midday Darkening Cloudburst & Hail Detector**: Detects precipitous daytime lux plunge ($>40,000\text{ lux} \rightarrow <300\text{ lux}$ in 4 min). Fused with Barometer jump, confirms deep convective supercell core overhead with **$>98\%$ confidence**. | **Zero-Hardware Hail Strike Warning**: Alerts farmers and porters 5–10 mins before damaging hail/cloudburst hits. |
| **Offline Disaster Telephony** | 100% dependent on operational cell towers and electrical grid. | Total communication blackout during severe cyclones and floods; survivors cannot send SOS or receive alerts. | **"Jeevan Setu" Offline P2P BLE Crisis Mesh**: Decentralized ad-hoc multi-hop mesh over Bluetooth Low Energy (BLE 5.0) & Wi-Fi Direct. Relays 64-byte emergency beacons and SOS survivor coordinates phone-to-phone across cut-off villages without cell towers. | **Zero-Tower Post-Disaster Lifeline**: Automatically uploads queued village SOS packets when NDRF rescue boats or satellite nodes come within 200m of any node. |

---

## 3. Target User Personas & Pain Points

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
