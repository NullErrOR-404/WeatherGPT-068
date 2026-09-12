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
        lang = req.language.lower() if req.language else "hi"
        if lang in ["mr", "marathi"]:
            voice_script = (
                f"नमस्कार शेतकरी बंधू. वेदर-जीपीटी वर आपले स्वागत आहे. "
                f"आजचे तापमान {curr.temperature_2m:.0f} अंश सेल्सिअस आहे. "
                f"पुढील ३ तासांत पाऊस पडण्याची शक्यता {max_rain:.0f} टक्के आहे. "
                "फवारणी सल्ला ऐकण्यासाठी १ दाबा. थेट प्रश्न विचारण्यासाठी २ दाबा."
            )
            dtmf_options = {"1": "फवारणी सल्ला", "2": "प्रश्न विचारा", "9": "कॉल समाप्त करा"}
        elif lang in ["en", "english"]:
            voice_script = (
                f"Hello farmer friend, welcome to WeatherGPT voice hotline. "
                f"Current temperature is {curr.temperature_2m:.0f} degrees Celsius. "
                f"Chance of rain over next 3 hours is {max_rain:.0f} percent. "
                "Press 1 for crop spray advice. Press 2 to speak a question."
            )
            dtmf_options = {"1": "Spray Advisory", "2": "Voice Query", "9": "Hang Up"}
        elif lang in ["te", "telugu"]:
            voice_script = (
                f"నమస్కారం రైతు సోదరులారా. వెదర్-జీపీటీ కి స్వాగతం. "
                f"ప్రస్తుత ఉష్ణోగ్రత {curr.temperature_2m:.0f} డిగ్రీల సెల్సియస్. "
                f"రాబోయే 3 గంటల్లో వర్షం సంభావ్యత {max_rain:.0f} శాతం. "
                "స్ప్రే సలహా కోసం 1 నొక్కండి."
            )
            dtmf_options = {"1": "స్ప్రే సలహా", "9": "ముగించు"}
        elif lang in ["ta", "tamil"]:
            voice_script = (
                f"வணக்கம் விவசாய தோழரே. வெதர்-ஜிபிடி உங்களை வரவேற்கிறது. "
                f"தற்போதைய வெப்பநிலை {curr.temperature_2m:.0f} டிகிரி செல்சியஸ். "
                f"அடுத்த 3 மணி நேரத்தில் மழை வாய்ப்பு {max_rain:.0f} சதவீதம். "
                "தெளிப்பு ஆலோசனைக்கு 1-ஐ அழுத்தவும்."
            )
            dtmf_options = {"1": "தெளிப்பு ஆலோசனை", "9": "முடிக்க"}
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
        Guaranteed to fit in a single unfragmented GSM 03.38 message.
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

        # Strict hard clamp at 160 characters to prevent multipart SMS fee & out-of-order delivery
        if len(payload) > 160:
            payload = payload[:157] + "..."

        return {
            "sms_text": payload,
            "character_count": len(payload),
            "max_allowed": 160,
            "fits_single_sms": len(payload) <= 160,
            "transport": "GSM 03.38 Signaling Channel / Cell Broadcast (CBS)",
        }


telecom_bridge = TelecomBridgeService()
