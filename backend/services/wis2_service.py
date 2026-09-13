"""
WMO WIS 2.0 & MQTT Alert Streaming Hub.
Implements WMO Information System 2.0 topic structure and manages live WebSocket client broadcast.
Topic Pattern: wis2/in-imd/data/core/weather/prediction/warning/...
"""

import json
from typing import Set, Dict, Any
from fastapi import WebSocket


class WIS2Service:
    MAX_CONNECTIONS = 1000  # Strict DoS connection ceiling

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> bool:
        if len(self.active_connections) >= self.MAX_CONNECTIONS:
            await websocket.close(code=1013, reason="Maximum subscriber capacity reached")
            return False
        await websocket.accept()
        self.active_connections.add(websocket)
        return True

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast_alert(self, alert_data: Dict[str, Any]):
        """Broadcasts a WMO WIS 2.0 compliant alert frame to all connected clients."""
        wis2_frame = {
            "topic": "wis2/in-imd/data/core/weather/prediction/warning/severe-thunderstorm",
            "specversion": "wmo-wis2-2.0",
            "pubtime": "2026-09-12T11:45:00Z",
            "data": alert_data,
        }
        dead_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(wis2_frame))
            except Exception:
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)

    def get_active_client_count(self) -> int:
        return len(self.active_connections)


wis2_service = WIS2Service()
