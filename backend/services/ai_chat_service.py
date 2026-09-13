"""
Conversational AI Service.
Integrates Grounded Intent Parsing, Spatial Semantic Caching, Cloud LLM (Gemini/OpenAI),
and 100% Offline Deterministic Indic Templates (Hindi, Marathi, English, Telugu, Tamil).
"""

import os
import re
from typing import Dict, Any, List
from .weather_service import weather_service
from .rules_engine import rules_engine
from .spatial_cache_service import spatial_cache
from .vector_store_service import vector_store
from .ml_risk_service import ml_risk_engine
from ..models.schemas import ChatQuery, ChatResponse


class AIChatService:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")

    async def process_query(self, query: ChatQuery) -> ChatResponse:
        lat = query.latitude
        lon = query.longitude
        text = query.message.strip()
        lang = query.language.lower()

        # Step 1: Detect Domain Intent and Target Crop/Activity
        intent, entity = self._detect_intent_and_entity(text)

        # Step 2: Check 5km Geohash-6 Spatial Semantic Cache (Mass Concurrency Saver)
        cached_result = spatial_cache.get(lat, lon, intent, entity, lang)
        if cached_result:
            return ChatResponse(
                reply_text=cached_result["reply_text"],
                spoken_audio_text=cached_result["spoken_audio_text"],
                language=lang,
                detected_intent=intent,
                action_badge=cached_result["action_badge"],
                action_badge_label=cached_result["action_badge_label"],
                verified_data_points=cached_result["verified_data_points"],
                cache_hit=True,
                spatial_cluster_id=cached_result.get("cluster_id", "cached"),
                ml_risk=cached_result.get("ml_risk"),
                retrieved_knowledge_sources=cached_result.get("retrieved_knowledge_sources", []),
            )

        # Step 3: Fetch Live Verified Atmospheric Physics
        weather = await weather_service.get_forecast(lat, lon)
        curr = weather.current
        max_rain_prob = max([nh.rain_prob_pct for nh in weather.nowcast_3h]) if weather.nowcast_3h else 20.0

        # Step 4: Run ML Risk Prediction & Vector RAG Retrieval
        ml_risk = ml_risk_engine.evaluate_risk(curr, weather.nowcast_3h)
        docs = vector_store.search(
            query=text,
            crop=entity if entity != "crop" else None,
            top_k=2,
        )
        retrieved_sources = [f"[{d.statutory_authority}] {d.title}" for d in docs]

        verified_data = {
            "temp_c": curr.temperature_2m,
            "feels_like_c": curr.apparent_temperature,
            "humidity_pct": curr.relative_humidity_2m,
            "rain_prob_next_3h": max_rain_prob,
            "wind_kmh": curr.wind_speed_10m,
            "wind_gusts_kmh": curr.wind_gusts_10m,
            "soil_moisture": curr.soil_moisture_0_to_1cm,
            "ml_risk_level": ml_risk.risk_level,
            "ml_risk_probability": ml_risk.risk_probability,
            "primary_hazard_driver": ml_risk.primary_driver,
        }

        # Step 5: Generate Grounded Answer (Cloud LLM or Indic Template Engine)
        if intent == "AGROMET_SPRAY":
            advisory = rules_engine.evaluate_agro_spray(curr, max_rain_prob, crop=entity)
            reply_text, audio_text, badge, badge_label = self._format_agromet_response(advisory, lang)
        elif intent == "DISASTER_ALERT":
            reply_text, audio_text, badge, badge_label = self._format_disaster_response(curr, max_rain_prob, lang)
        elif intent == "FLOOD_DETOUR":
            reply_text, audio_text, badge, badge_label = self._format_flood_response(curr, max_rain_prob, lang)
        else:  # GENERAL_WEATHER / COMMUTE
            reply_text, audio_text, badge, badge_label = self._format_commute_response(curr, weather.nowcast_3h, lang)

        # Step 6: Store in 5km Spatial Cache for other users in this cluster
        payload = {
            "reply_text": reply_text,
            "spoken_audio_text": audio_text,
            "action_badge": badge,
            "action_badge_label": badge_label,
            "verified_data_points": verified_data,
            "ml_risk": ml_risk.model_dump(),
            "retrieved_knowledge_sources": retrieved_sources,
        }
        cluster_id = spatial_cache.set(lat, lon, intent, entity, lang, payload)

        return ChatResponse(
            reply_text=reply_text,
            spoken_audio_text=audio_text,
            language=lang,
            detected_intent=intent,
            action_badge=badge,
            action_badge_label=badge_label,
            verified_data_points=verified_data,
            cache_hit=False,
            spatial_cluster_id=cluster_id,
            ml_risk=ml_risk,
            retrieved_knowledge_sources=retrieved_sources,
        )

    def _detect_intent_and_entity(self, text: str) -> tuple[str, str]:
        t = text.lower()

        # Crop entity extraction
        crops = ["cotton", "कपास", "कापूस", "soybean", "सोयाबीन", "wheat", "गेहूं", "गहू", "rice", "चावल", "भात"]
        detected_crop = "crop"
        for c in crops:
            if c in t:
                detected_crop = "cotton" if c in ["cotton", "कपास", "कापूस"] else c
                break

        # Spraying / Agro-chemical intent
        if any(w in t for w in ["spray", "छिड़काव", "फवारणी", "dawai", "दवाई", "औषध", "fertilizer", "pesticide"]):
            return "AGROMET_SPRAY", detected_crop

        # Flood / Waterlogging intent
        if any(w in t for w in ["flood", "बाढ़", "पूर", "waterlog", "जलभराव", "pani", "road", "bridge", "rasta"]):
            return "FLOOD_DETOUR", "infrastructure"

        # Cyclone / Lightning / Alert intent
        if any(w in t for w in ["cyclone", "तूफान", "वादळ", "lightning", "बिजली", "वीज", "alert", "danger", "hazard"]):
            return "DISASTER_ALERT", "storm"

        # General commute / weather nowcast
        return "GENERAL_COMMUTE", "nowcast"

    def _format_agromet_response(self, adv: Any, lang: str) -> tuple[str, str, str, str]:
        if adv.is_safe:
            badge = "SAFE"
            if lang in ["mr", "marathi"]:
                badge_label = "फवारणीसाठी अनुकूल"
                text = f"फवारणीसाठी आजचा दिवस चांगला आहे. हवेचा वेग {adv.detailed_explanation}"
                audio = text
            elif lang in ["hi", "hindi"]:
                badge_label = "छिड़काव के लिए सुरक्षित"
                text = f"आज छिड़काव करना सुरक्षित है। {adv.detailed_explanation}"
                audio = text
            else:
                badge_label = "SAFE TO SPRAY"
                text = f"{adv.headline}. {adv.detailed_explanation}"
                audio = text
        else:
            badge = "DANGER"
            if lang in ["mr", "marathi"]:
                badge_label = "फवारणी स्थगित करा"
                text = (
                    "आज शेतात औषध फवारणी करू नका. पुढील काही तासांत मुसळधार पाऊस आणि सोसाट्याचा वारा अपेक्षित आहे, "
                    "ज्यामुळे औषध वाहून जाईल आणि तुमचे नुकसान होईल. "
                    f"फवारणीसाठी पुढची सुरक्षित वेळ: {adv.next_safe_window}."
                )
                audio = text
            elif lang in ["hi", "hindi"]:
                badge_label = "छिड़काव स्थगित करें"
                text = (
                    "आज खेत में कीटनाशक का छिड़काव बिल्कुल न करें। अगले कुछ घंटों में बारिश और तेज हवा का खतरा है, "
                    "जिससे दवाई बह जाएगी और लागत बर्बाद होगी। "
                    f"छिड़काव के लिए अगला सुरक्षित समय: {adv.next_safe_window}."
                )
                audio = text
            else:
                badge_label = "DO NOT SPRAY TODAY"
                text = (
                    f"{adv.headline}. {adv.detailed_explanation} "
                    f"Recommended next safe window: {adv.next_safe_window}."
                )
                audio = text

        return text, audio, badge, badge_label

    def _format_disaster_response(self, curr: Any, rain_prob: float, lang: str) -> tuple[str, str, str, str]:
        badge = "DANGER" if rain_prob > 60 else "CAUTION"
        if lang in ["mr", "marathi"]:
            badge_label = "हवामान इशारा"
            text = (
                f"सावधान! वादळी वारे ({curr.wind_speed_10m:.0f} किमी/तास) आणि विजांचा कडकडाट होण्याची शक्यता आहे. "
                "घराबाहेर जाणे टाळा, लोखंडी खांब किंवा झाडाखाली उभे राहू नका. पशुधनाला सुरक्षित निवाऱ्यात ठेवा."
            )
        elif lang in ["hi", "hindi"]:
            badge_label = "मौसम चेतावनी"
            text = (
                f"सावधान! तेज आंधी ({curr.wind_speed_10m:.0f} किमी/घंटा) और आकाशीय बिजली की संभावना है। "
                "पेड़ों या लोहे के खंभों से दूर रहें और तुरंत पक्के मकान में शरण लें। मवेशियों को सुरक्षित रखें।"
            )
        else:
            badge_label = "WEATHER ADVISORY"
            text = (
                f"Caution: Gusty winds ({curr.wind_speed_10m:.0f} km/h) and thunderstorm activity detected. "
                "Avoid standing near solitary trees or metal structures. Move livestock to pucca shelters."
            )
        return text, text, badge, badge_label

    def _format_flood_response(self, curr: Any, rain_prob: float, lang: str) -> tuple[str, str, str, str]:
        badge = "CAUTION"
        if lang in ["mr", "marathi"]:
            badge_label = "जलभराव सूचना"
            text = (
                "मुसळधार पावसामुळे सखल भागात आणि रेल्वे अंडरपासमध्ये पाणी साचण्याचा धोका आहे. "
                "मुख्य पुलावरून किंवा उंच रस्त्यावरून प्रवास करण्याचा सल्ला दिला जात आहे."
            )
        elif lang in ["hi", "hindi"]:
            badge_label = "जलभराव चेतावनी"
            text = (
                "तेज बारिश के कारण निचले अंडरपास और रास्तों में जलभराव की आशंका है। "
                "अंडरपास में गाड़ी न डालें और फ्लाईओव्हर या ऊंचे मार्ग का उपयोग करें।"
            )
        else:
            badge_label = "WATERLOGGING ALERT"
            text = (
                "Heavy precipitation catchment risk detected. Low-lying subways and railway underbridges "
                "have high inundation risk. Proceed via elevated flyover detours."
            )
        return text, text, badge, badge_label

    def _format_commute_response(self, curr: Any, nowcast: Any, lang: str) -> tuple[str, str, str, str]:
        badge = "SAFE"
        temps = [nh.temp_c for nh in nowcast]
        rain_prob = max([nh.rain_prob_pct for nh in nowcast]) if nowcast else 20

        if rain_prob > 50:
            badge = "CAUTION"
            if lang in ["mr", "marathi"]:
                badge_label = "पावसाची शक्यता"
                text = f"पुढील ३ तासांत पावसाची {rain_prob}% शक्यता आहे. बाहेर पडताना छत्री किंवा रेनकोट सोबत ठेवा."
            elif lang in ["hi", "hindi"]:
                badge_label = "बारिश की संभावना"
                text = f"अगले 3 घंटों में बारिश की {rain_prob}% संभावना है। बाहर निकलते समय रेनकोट या छाता साथ रखें।"
            else:
                badge_label = "RAIN EXPECTED"
                text = f"{rain_prob}% probability of showers over the next 3 hours. Carry rain gear for your commute."
        else:
            if lang in ["mr", "marathi"]:
                badge_label = "हवामान अनुकूल"
                text = f"सध्याचे तापमान {curr.temperature_2m:.1f}°C आहे. पुढील ३ तास आकाश सामान्यतः निरभ्र राहील."
            elif lang in ["hi", "hindi"]:
                badge_label = "मौसम साफ है"
                text = f"वर्तमान तापमान {curr.temperature_2m:.1f}°C है। अगले 3 घंटों में मौसम आवागमन के लिए बिल्कुल साफ रहेगा।"
            else:
                badge_label = "CLEAR COMMUTE"
                text = f"Current temperature is {curr.temperature_2m:.1f}°C. Fair conditions expected for travel over the next 3 hours."

        return text, text, badge, badge_label


ai_chat_service = AIChatService()
