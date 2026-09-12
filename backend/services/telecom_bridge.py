"""
2G Button-Phone Telephony Bridge Service.
Handles inbound missed-call webhooks, outbound vernacular IVR callbacks,
and compressed 160-character USSD/SMS emergency advisories for farmers with basic phones.
"""

import uuid
from typing import Dict, Any
from .weather_service import weather_service
from .rules_engine import rules_engine
from ..models.schemas import MissedCallRequest, IVROutboundResponse


class TelecomBridgeService:
    async def handle_missed_call(self, req: MissedCallRequest) -> IVROutboundResponse:
        call_id = f"CALL-{uuid.uuid4().hex[:8].upper()}"
        weather = await weather_service.get_forecast(req.latitude, req.longitude)
        curr = weather.current
        max_rain = max([nh.rain_prob_pct for nh in weather.nowcast_3h]) if weather.nowcast_3h else 30.0

        # Generate vernacular IVR script
        lang = req.language.lower()
        if lang in ["mr", "marathi"]:
            voice_script = (
                f"नमस्कार शेतकरी बंधू. वेदर-जीपीटी वर आपले स्वागत आहे. "
                f"आजचे तापमान {curr.temperature_2m:.0f} अंश सेल्सिअस आहे. "
                f"पुढील ३ तासांत पाऊस पडण्याची शक्यता {max_rain:.0f} टक्के आहे. "
                "फवारणी सल्ला ऐकण्यासाठी १ दाबा. थेट प्रश्न विचारण्यासाठी २ दाबा."
            )
            dtmf_options = {"1": "फवारणी सल्ला", "2": "प्रश्न विचारा", "9": "कॉल समाप्त करा"}
        else:
            voice_script = (
                f"नमस्ते किसान भाई। वेदर-जीपीटी में आपका स्वागत है। "
                f"वर्तमान तापमान {curr.temperature_2m:.0f} डिग्री सेल्सियस है। "
                f"अगले 3 घंटों में बारिश की संभावना {max_rain:.0f} प्रतिशत है। "
                "छिड़काव सलाह के लिए 1 दबाएं। प्रश्न पूछने के लिए 2 दबाएं।"
            )
            dtmf_options = {"1": "छिड़काव सलाह", "2": "प्रश्न पूछें", "9": "कॉल समाप्त करें"}

        return IVROutboundResponse(
            call_id=call_id,
            status="OUTBOUND_DIALED",
            voice_script=voice_script,
            dtmf_options=dtmf_options,
        )

    async def get_emergency_sms_payload(self, lat: float = 20.7453, lon: float = 78.6022) -> Dict[str, Any]:
        """
        Generates ultra-dense 160-character USSD/SMS payload for transmission during total data blackouts.
        """
        weather = await weather_service.get_forecast(lat, lon)
        curr = weather.current
        max_rain = max([nh.rain_prob_pct for nh in weather.nowcast_3h]) if weather.nowcast_3h else 20.0

        loc = "WRDHA" if abs(lat - 20.74) < 1.0 else "LOC"
        sev = "RED" if max_rain > 70 else ("AMB" if max_rain > 40 else "GRN")
        hazard = "THUNDER-RAIN" if max_rain > 50 else "CLEAR"
        action = "NO SPRAY-SHELTER" if max_rain > 50 else "SAFE WINDOW OPEN"

        # GSM 03.38 dense format
        payload = f"[WTH-ALERT]:{loc}|{sev}|{hazard}|{curr.temperature_2m:.0f}C|RAIN-{max_rain:.0f}%|{action}|SOS-1077"

        return {
            "sms_text": payload,
            "character_count": len(payload),
            "max_allowed": 160,
            "fits_single_sms": len(payload) <= 160,
            "transport": "GSM 03.38 Signaling Channel / Cell Broadcast (CBS)",
        }


telecom_bridge = TelecomBridgeService()
