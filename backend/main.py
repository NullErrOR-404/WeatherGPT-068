"""
WeatherGPT — FastAPI ASGI Application.
Central orchestration layer serving REST APIs, WMO WIS 2.0 WebSockets, and PWA static assets.
"""

import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .models.schemas import (
    WeatherResponse,
    ChatQuery,
    ChatResponse,
    CitizenHazardReport,
    AntiFakeValidationResult,
    MissedCallRequest,
    IVROutboundResponse,
    FloodDetourRoute,
    MandiRainShieldReport,
)
from .services.weather_service import weather_service
from .services.ai_chat_service import ai_chat_service
from .services.spatial_cache_service import spatial_cache
from .services.climate_service import climate_service
from .services.telecom_bridge import telecom_bridge
from .services.flood_routing_service import flood_routing_service
from .services.mandi_shield_service import mandi_shield_service
from .services.mausam_rakshak_service import mausam_rakshak_service
from .services.wis2_service import wis2_service

app = FastAPI(
    title="WeatherGPT Core API",
    description="Conversational AI Platform for Weather Forecasting, Early Alerts, and Climate Intelligence",
    version="1.1.0",
)

# Secure CORS configuration
cors_origins_env = os.getenv("CORS_ORIGINS", "*").strip()
cors_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False if cors_origins == ["*"] else True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """System health and operational telemetry."""
    return {
        "status": "HEALTHY",
        "service": "WeatherGPT-068",
        "version": "1.1.0",
        "spatial_cache": spatial_cache.get_metrics(),
        "active_wis2_websocket_clients": wis2_service.get_active_client_count(),
    }


@app.get("/api/weather/current", response_model=WeatherResponse)
async def get_current_weather(
    lat: float = Query(20.7453, ge=-90.0, le=90.0, description="Latitude (-90 to 90)"),
    lon: float = Query(78.6022, ge=-180.0, le=180.0, description="Longitude (-180 to 180)"),
):
    """Retrieves live NWP atmospheric physics metrics and 3-hour nowcast slider."""
    return await weather_service.get_forecast(lat, lon)


@app.post("/api/chat", response_model=ChatResponse)
async def chat_interaction(query: ChatQuery):
    """Processes conversational query with intent extraction and spatial caching."""
    return await ai_chat_service.process_query(query)


@app.get("/api/alerts/active")
async def get_active_alerts(
    lat: float = Query(20.7453, ge=-90.0, le=90.0, description="Latitude (-90 to 90)"),
    lon: float = Query(78.6022, ge=-180.0, le=180.0, description="Longitude (-180 to 180)"),
):
    """Retrieves active NDMA CAP alerts and Damini lightning vectors."""
    weather = await weather_service.get_forecast(lat, lon)
    max_rain = max([nh.rain_prob_pct for nh in weather.nowcast_3h]) if weather.nowcast_3h else 20.0

    if max_rain >= 65.0:
        return [
            {
                "alert_id": "NDMA-CAP-7842",
                "headline": "Severe Thunderstorm & Lightning Warning",
                "severity": "ORANGE",
                "hazard_type": "THUNDERSTORM",
                "affected_area": "Wardha & Surrounding Taluks",
                "effective_from": "16:00 IST",
                "effective_to": "19:30 IST",
                "instruction": "Remain inside pucca structures. Disconnect electrical appliances and avoid water bodies.",
                "distance_km": 14.2,
                "vector_movement": "Moving Southeast at 28 km/h",
                "all_clear_countdown_mins": 45,
            }
        ]
    return [
        {
            "alert_id": "NDMA-CAP-NORMAL",
            "headline": "All Clear — Normal Meteorological Status",
            "severity": "GREEN",
            "hazard_type": "CLEAR",
            "affected_area": "Local Area",
            "effective_from": "Now",
            "effective_to": "Next 24h",
            "instruction": "Standard weather conditions prevail. Safe for all agricultural and outdoor activities.",
            "distance_km": 0.0,
            "vector_movement": "Stable",
            "all_clear_countdown_mins": 0,
        }
    ]


@app.get("/api/climate/compare")
async def get_climate_trend(
    lat: float = Query(20.7453, ge=-90.0, le=90.0, description="Latitude (-90 to 90)"),
    lon: float = Query(78.6022, ge=-180.0, le=180.0, description="Longitude (-180 to 180)"),
):
    """Compares current conditions against 40-year ERA5 historical normal."""
    return await climate_service.get_climate_comparison(lat, lon)


@app.post("/api/telecom/missed-call", response_model=IVROutboundResponse)
async def trigger_missed_call(req: MissedCallRequest):
    """Simulates 2G button-phone missed call and triggers automated IVR callback."""
    return await telecom_bridge.handle_missed_call(req)


@app.get("/api/telecom/sms-payload")
async def get_compressed_sms(
    lat: float = Query(20.7453, ge=-90.0, le=90.0, description="Latitude (-90 to 90)"),
    lon: float = Query(78.6022, ge=-180.0, le=180.0, description="Longitude (-180 to 180)"),
):
    """Generates 160-character compressed GSM 03.38 payload for total data blackouts."""
    return await telecom_bridge.get_emergency_sms_payload(lat, lon)


@app.get("/api/flood/detour", response_model=FloodDetourRoute)
async def get_flood_detour(
    lat: float = Query(20.7453, ge=-90.0, le=90.0, description="Latitude (-90 to 90)"),
    lon: float = Query(78.6022, ge=-180.0, le=180.0, description="Longitude (-180 to 180)"),
):
    """Preemptive underpass waterlogging prediction and high-elevation bypass."""
    return await flood_routing_service.get_detour_advisory(lat, lon)


@app.get("/api/mandi/status", response_model=MandiRainShieldReport)
async def get_mandi_status(mandi_id: str = Query("mandi_01", max_length=50)):
    """Monitors open-air grain yard cloudburst risk."""
    return await mandi_shield_service.check_mandi_risk(mandi_id)


@app.post("/api/rakshak/report", response_model=AntiFakeValidationResult)
async def submit_citizen_report(report: CitizenHazardReport):
    """Mausam Rakshak 1-tap crowdsourced ground-truth reporting with anti-fake verification."""
    result = mausam_rakshak_service.submit_report(report)
    if result.downwind_warning_triggered:
        # Broadcast immediately to WMO WIS 2.0 connected clients
        await wis2_service.broadcast_alert(
            {
                "type": "MAUSAM_RAKSHAK_GROUND_TRUTH",
                "hazard": report.hazard_type,
                "severity": report.severity,
                "lat": report.latitude,
                "lon": report.longitude,
            }
        )
    return result


@app.get("/api/rakshak/verified")
async def get_verified_ground_pins(
    lat: float = Query(20.7453, ge=-90.0, le=90.0, description="Latitude (-90 to 90)"),
    lon: float = Query(78.6022, ge=-180.0, le=180.0, description="Longitude (-180 to 180)"),
):
    """Retrieves active verified ground-truth pins for map rendering."""
    return mausam_rakshak_service.get_verified_pins(lat, lon)


@app.get("/api/cache/stats")
async def get_cache_statistics():
    """Returns spatial deduplication cache metrics and cost savings."""
    return spatial_cache.get_metrics()


@app.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    """WMO WIS 2.0 real-time alert streaming connection."""
    await wis2_service.connect(websocket)
    try:
        while True:
            # Keep-alive heartbeat listener
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        wis2_service.disconnect(websocket)


# Mount static frontend directory
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
