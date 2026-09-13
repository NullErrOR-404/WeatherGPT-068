# UI/UX Design Specification — WeatherGPT
**Target Platforms**: Mobile Web (PWA), Desktop Responsive, Feature Phone IVR Audio Script  
**Design Philosophy**: "Glanceable, Action-First, Vernacular-First"  
**Version**: 1.1.0 (With Mausam Rakshak Ground-Truth Interface)

---

## 1. Core UX Principles

1. **Zero Cognitive Load**: The user should never have to search for what action to take. The app immediately presents the **Today's Action Window** in plain language.
2. **Outdoor Daylight Readability**: High-contrast typography and anti-glare color palettes designed for farmers standing in direct sunlight in rural fields.
3. **One-Thumb Operation**: Key interactive elements (the prominent microphone button, emergency alerts, Mausam Rakshak 1-tap report button, and quick chips) are anchored within the ergonomic bottom thumb-zone of mobile screens.
4. **Sub-Second 60 FPS Performance on Budget Phones**: Zero heavy client-side JavaScript libraries (no heavy React/Angular/Tailwind bloat); built in pure, hyper-optimized Vanilla CSS and DOM for flawless performance on 2GB RAM Android phones.

---

## 2. Design System Tokens & Color Palette

### 2.1 Color Palette
WeatherGPT uses a curated dark-mode glassmorphic theme with distinct hazard warning levels:

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `--bg-base` | `#0b1329` | Deep night sky canvas background |
| `--surface-card` | `rgba(20, 32, 60, 0.75)` | Frosted glassmorphic card background |
| `--border-subtle`| `rgba(255, 255, 255, 0.12)` | Clean translucent borders |
| `--text-primary` | `#f1f5f9` | Ultra-crisp primary text (100% white-slate) |
| `--text-secondary`| `#94a3b8` | Muted secondary labels and timestamps |
| `--accent-teal` | `#06b6d4` | Bhashini active voice glow & buttons |
| `--alert-green` | `#10b981` | Safe operational window (All clear) |
| `--alert-yellow`| `#f59e0b` | Caution watch / advisory |
| `--alert-amber` | `#f97316` | Moderate risk / Damini lightning nearby |
| `--alert-red`   | `#ef4444` | Severe danger / NDMA Red Alert / Evacuate |
| `--rakshak-gold`| `#fbbf24` | Mausam Rakshak verified ground badge & pins |

### 2.2 Typography
- **Primary Font**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, sans-serif.
- **Indic Script Support**: Native system font fallbacks ensuring clear rendering for Devanagari (Hindi, Marathi), Telugu, Tamil, and Bengali scripts.
- **Scale**:
  - `Display / Temp`: `2.75rem` (44px) bold.
  - `Heading 1`: `1.5rem` (24px) semi-bold.
  - `Body / Advisory`: `1.05rem` (17px) regular (optimized for readability).
  - `Captions / Meta`: `0.85rem` (13.5px).

---

## 3. The All-in-One 'Live AI Channel' Architecture

Instead of fragmented tabs or complex meteorological dashboards, WeatherGPT operates as a **unified, all-in-one personalized meteorological broadcast channel**. The AI automatically senses the user's geospatial location and context (coastal maritime, rural farm belt, or urban transit corridor) to surface the exact upgraded government intelligence needed without cognitive friction.

```
┌──────────────────────────────────────────────────────────┐
│  📍 Wardha, Maharashtra  •  12 Sep, 4:15 PM  •  🇮🇳 Hindi   │
├──────────────────────────────────────────────────────────┤
│  🎙️ LIVE WEATHER ANCHOR (Auto-Narrated on App Launch)    │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ▶ [❚❚] 0:14 / 0:30  |||||!||||!||||!|||||  1.0x    │  │
│  │ "नमस्ते! आज दोपहर 2 बजे तक धूप रहेगी। 1 बजे तक      │  │
│  │ कीटनाशक का काम निपटा लें। शाम को आंधी-बारिश है।"   │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  ZONE 1: AMBIENT CONTEXTUAL HERO (Auto-Tuned)            │
│  • If Coastal: Matsya Shoal Compass & Safe Voyage Window │
│  • If Farmer: 4-in-1 Kisan Field Action Matrix           │
│  • If Storm within 25km: Damini Lightning Siren Takeover │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⚡ SURAKSHA SIREN: Lightning 14 km NW (Moving SE)    │  │
│  │ Arriving in: 18 Mins • All-Clear in: 48 Mins       │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  ZONE 2: ZERO-JARGON ACTION HORIZON                      │
│  (Replaces IMD Mausam & Meghdoot)                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🌤️ 31°C  •  Feels 35°C  •  Humidity 74%           │  │
│  │ ────────────────────────────────────────────────── │  │
│  │ 3-Hr Nowcast: ☀️ 4 PM  →  🌦️ 5 PM  →  ⛈️ 6 PM    │  │
│  │ ────────────────────────────────────────────────── │  │
│  │ 🌾 Today's Action: Rain expected at 5:15 PM.       │  │
│  │    Optimal pesticide spray window is closed.       │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  ZONE 3: THE CONVERSATIONAL CORE                         │
│                                                          │
│  User: "क्या आज कपास पर दवाई डालनी चाहिए?"              │
│                                                          │
│  WeatherGPT:                                             │
│  🔴 [छिड़काव स्थगित करें / DO NOT SPRAY TODAY]            │
│  "आज शाम 4:30 बजे भारी बारिश (18 मिमी) की संभावना है।    │
│   दवाई बह जाएगी। कल सुबह 7 बजे मौसम साफ रहेगा।"         │
│                                                          │
│  [Chips: "When to spray?" | "Report Hazard 🛡️" | "Map"] │
├──────────────────────────────────────────────────────────┤
│  [🎙️ TAP & SPEAK]      [Type in your language...]    [➤] │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Modal & Drawer Mechanics

### 4.1 "Mausam Rakshak" 1-Tap Hazard Reporting Sheet
- **Trigger**: Tapping the golden badge button *"Report Weather / मौसम रिपोर्ट 🛡️"*.
- **Visuals**: Large touch-friendly grid with 5 hazard buttons:
  - `[ 🧊 Hail / ओले ]`
  - `[ 🌊 Waterlogged / जलभराव ]`
  - `[ ⚡ Lightning / बिजली ]`
  - `[ 🌪️ Squall / आंधी ]`
  - `[ 🌫️ Dense Fog / कोहरा ]`
- **Feedback**:
  - Submitting takes 1 tap (reads current GPS automatically).
  - Shows real-time validation status: *"Satellite verified cloud top (-52°C) • Consensus: 3 reports • You earned +5 Mausam Rakshak Points!"*

### 4.2 Slide-Up Micro-GIS Drawer
- **Trigger**: Tapping *"Explore Map / नक्शा देखें"*.
- **Contents**:
  - Interactive Leaflet map centered on the user's location.
  - Live Doppler radar precipitation reflectivity tiles.
  - Color-coded NDMA alert warning polygons (Red, Orange, Yellow).
  - Golden pins for **Mausam Rakshak Verified Ground Reports**.
  - Emergency relief shelters and hospital pins.
  - Preemptive flood detour route overlays.

### 4.3 Button-Phone IVR Telephony Simulator Modal
- **Trigger**: Tapping *"Feature Phone IVR (2G)"* in the header.
- **Interactive Elements**:
  - Input for mobile number $\rightarrow$ "Give Missed Call" button.
  - Visual incoming call screen: *"Incoming Call from WeatherGPT (1800-XXX-XXXX)"*.
  - Audio playback of the Bhashini vernacular IVR greeting and DTMF options.

### 4.4 Preemptive Flood Detour Route Viewer
- **Trigger**: Displayed automatically when an underpass in the user's travel corridor is at risk of flooding.
- **Contents**:
  - Alert banner: *"⚠️ Minto Bridge Ruby Subway: Impassable in 20 mins (Expected depth: 1.2m)"*.
  - High-ground bypass comparison (+4 mins, +3.5m elevation, 100% dry).

### 4.5 Mandi Grain Shield Dashboard
- **Trigger**: Quick chip *"Mandi Storage Alert"*.
- **Contents**:
  - Active APMC Mandi yard selection.
  - Open-air grain risk countdown clock: *"2 hours 15 mins until convective squall"*.
  - 1-tap WhatsApp broadcast advisory generator for Mandi secretaries.

---

## 5. Voice Interaction & Acoustic Feedback

- **Idle State**: Microphone button displays a soft teal pulse.
- **Listening State**: Expands with an animated audio waveform indicator.
- **Speaking State**: Audio equalizer animation indicates WeatherGPT is speaking the answer.
- **Haptic Feedback**: Short vibration pulse upon start and stop of speech recognition.
