# CitizenHazardReport

> God node · 19 connections · [C:\WeatherGPT-068\backend\models\schemas.py](file:///C:/WeatherGPT-068/backend/models/schemas.py#L93)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as CitizenHazardReport
    participant P1 as WeatherGPT — FastAPI ASGI Application. Central orchestration layer serving REST
    participant P2 as WeatherResponse
    participant P3 as System health and operational telemetry.
    participant P4 as Retrieves live NWP atmospheric physics metrics and 3-hour nowcast slider.
    participant P5 as Processes conversational query with intent extraction and spatial caching.
    participant P6 as Retrieves active NDMA CAP alerts and Damini lightning vectors.
    participant P7 as Compares current conditions against 40-year ERA5 historical normal.
    participant P8 as Simulates 2G button-phone missed call and triggers automated IVR callback.
    participant P9 as Generates 160-character compressed GSM 03.38 payload for total data blackouts.
    participant P10 as Preemptive underpass waterlogging prediction and high-elevation bypass.
    participant P11 as Monitors open-air grain yard cloudburst risk.
    participant P12 as Mausam Rakshak 1-tap crowdsourced ground-truth reporting with anti-fake verifica
    participant P13 as Retrieves active verified ground-truth pins for map rendering.
    participant P14 as Returns spatial deduplication cache metrics and cost savings.
    participant P15 as WMO WIS 2.0 real-time alert streaming connection.
    participant P16 as WeatherService
    participant P17 as ._parse_open_meteo_response()
    participant P18 as ._get_fallback_weather()
    participant P19 as Live Meteorological Ingestion Service. Fetches high-resolution GFS/ECMWF numeric
    participant P20 as ChatQuery
    participant P21 as MissedCallRequest
    participant P22 as IVROutboundResponse
    participant P23 as ChatResponse
    participant P24 as AntiFakeValidationResult
    participant P25 as FloodDetourRoute
    participant P26 as MandiRainShieldReport
    participant P27 as MausamRakshakService
    participant P28 as Mausam Rakshak Citizen Ground-Truth Service. Validates 1-tap crowdsourced hazard
    participant P29 as test_mausam_rakshak_anti_fake_verification()
    P0->>+ P1: uses
    P1-->>- P0: return
    P1->>+ P2: uses
    P2-->>- P1: return
    P2->>+ P1: uses
    P1-->>- P2: return
    P2->>+ P3: uses
    P3-->>- P2: return
    P2->>+ P4: uses
    P4-->>- P2: return
    P2->>+ P5: uses
    P5-->>- P2: return
    P2->>+ P6: uses
    P6-->>- P2: return
    P2->>+ P7: uses
    P7-->>- P2: return
    P2->>+ P8: uses
    P8-->>- P2: return
    P2->>+ P9: uses
    P9-->>- P2: return
    P2->>+ P10: uses
    P10-->>- P2: return
    P2->>+ P11: uses
    P11-->>- P2: return
    P2->>+ P12: uses
    P12-->>- P2: return
    P2->>+ P13: uses
    P13-->>- P2: return
    P2->>+ P14: uses
    P14-->>- P2: return
    P2->>+ P15: uses
    P15-->>- P2: return
    P2->>+ P16: uses
    P16-->>- P2: return
    P2->>+ P17: calls
    P17-->>- P2: return
    P2->>+ P18: calls
    P18-->>- P2: return
    P2->>+ P19: uses
    P19-->>- P2: return
    P1->>+ P20: uses
    P20-->>- P1: return
    P1->>+ P21: uses
    P21-->>- P1: return
    P1->>+ P22: uses
    P22-->>- P1: return
    P1->>+ P23: uses
    P23-->>- P1: return
    P1->>+ P0: uses
    P0-->>- P1: return
    P1->>+ P24: uses
    P24-->>- P1: return
    P1->>+ P25: uses
    P25-->>- P1: return
    P1->>+ P26: uses
    P26-->>- P1: return
    P0->>+ P3: uses
    P3-->>- P0: return
    P0->>+ P4: uses
    P4-->>- P0: return
    P0->>+ P5: uses
    P5-->>- P0: return
    P0->>+ P6: uses
    P6-->>- P0: return
    P0->>+ P7: uses
    P7-->>- P0: return
    P0->>+ P8: uses
    P8-->>- P0: return
    P0->>+ P9: uses
    P9-->>- P0: return
    P0->>+ P10: uses
    P10-->>- P0: return
    P0->>+ P11: uses
    P11-->>- P0: return
    P0->>+ P12: uses
    P12-->>- P0: return
    P0->>+ P13: uses
    P13-->>- P0: return
    P0->>+ P14: uses
    P14-->>- P0: return
    P0->>+ P15: uses
    P15-->>- P0: return
    P0->>+ P27: uses
    P27-->>- P0: return
    P0->>+ P28: uses
    P28-->>- P0: return
    P0->>+ P29: calls
    P29-->>- P0: return
```

## Connections by Relation

### calls
- [[test_mausam_rakshak_anti_fake_verification()]] `INFERRED`

### contains
- [[schemas.py]] `EXTRACTED`

### inherits
- [[BaseModel]] `EXTRACTED`

### uses
- [[WeatherGPT — FastAPI ASGI Application. Central orchestration layer serving REST]] `INFERRED`
- [[System health and operational telemetry.]] `INFERRED`
- [[Retrieves live NWP atmospheric physics metrics and 3-hour nowcast slider.]] `INFERRED`
- [[Processes conversational query with intent extraction and spatial caching.]] `INFERRED`
- [[Retrieves active NDMA CAP alerts and Damini lightning vectors.]] `INFERRED`
- [[Compares current conditions against 40-year ERA5 historical normal.]] `INFERRED`
- [[Simulates 2G button-phone missed call and triggers automated IVR callback.]] `INFERRED`
- [[Generates 160-character compressed GSM 03.38 payload for total data blackouts.]] `INFERRED`
- [[Preemptive underpass waterlogging prediction and high-elevation bypass.]] `INFERRED`
- [[Monitors open-air grain yard cloudburst risk.]] `INFERRED`
- [[Mausam Rakshak 1-tap crowdsourced ground-truth reporting with anti-fake verifica]] `INFERRED`
- [[Retrieves active verified ground-truth pins for map rendering.]] `INFERRED`
- [[Returns spatial deduplication cache metrics and cost savings.]] `INFERRED`
- [[WMO WIS 2.0 real-time alert streaming connection.]] `INFERRED`
- [[MausamRakshakService]] `INFERRED`
- [[Mausam Rakshak Citizen Ground-Truth Service. Validates 1-tap crowdsourced hazard]] `INFERRED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*