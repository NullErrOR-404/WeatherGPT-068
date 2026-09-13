"""
Aapda Mitra Community Bridge Service.

Bridges the Digital Divide during severe meteorological disasters:
When cellular networks collapse, NDMA-trained Aapda Mitra volunteers and Sarpanches
carrying WeatherGPT smartphones running PRITHVI-Mesh receive emergency packets
and bridge life-safety alerts to 2G button-phone users and households without phones.

Core Capabilities:
1. Acoustic Siren & Village Public Address (PA) Scripting:
   - Triggers hardware siren frequencies (850-1200 Hz) to pierce rain and wind roar.
   - Generates vernacular loudspeaker scripts for Panchayat/Temple/Mosque public address systems.
2. Button-Phone Village Dispatch:
   - Formulates 160-character unfragmented GSM 03.38 emergency SMS for local broadcast.
3. Muster Point Headcount & Outbound PRITHVI-Mesh SOS Relay:
   - Tracks evacuated citizens and missing persons.
   - Encodes compact 64-byte PRITHVI-Mesh SOS beacon packets to guide approaching NDRF teams.
"""

import os
import time
import uuid
import secrets
from typing import Dict, Any, List, Optional, Tuple
from ..models.schemas import (
    AapdaMitraBridgeRequest,
    CommunityAlertDispatch,
    HeadcountTallyRequest,
    HeadcountTallyReport,
)
from .prithvi_mesh_service import prithvi_mesh_service, PrithviMeshPacket


class AapdaMitraService:
    DEFAULT_INSECURE_TOKENS = {
        "NDMA-DEFAULT-TOKEN",
        "change-me",
        "default",
        "secret",
    }

    @classmethod
    def validate_production_secrets(cls) -> Tuple[bool, str]:
        """
        Enforces strict fail-closed validation for NDMA Aapda Mitra authorization tokens in production.
        """
        env = os.getenv("ENVIRONMENT", "development").lower()
        token = os.getenv("AAPDA_MITRA_MASTER_TOKEN", "")
        if env in ["production", "prod"]:
            if not token:
                return False, "AAPDA_MITRA_MASTER_TOKEN is required in production mode."
            if token in cls.DEFAULT_INSECURE_TOKENS or "default" in token.lower():
                return False, "AAPDA_MITRA_MASTER_TOKEN must not use default or placeholder values in production."
            if len(token) < 24:
                return False, f"AAPDA_MITRA_MASTER_TOKEN must be at least 24 characters (current length: {len(token)})."
        return True, "Valid"

    def create_community_dispatch(self, req: AapdaMitraBridgeRequest) -> CommunityAlertDispatch:
        dispatch_id = f"AAPDA-{uuid.uuid4().hex[:6].upper()}"
        now_ist = time.strftime("%H:%M IST")

        # Authorization Gate: Verify NDMA Volunteer credentials
        # volunteer_id alone must NEVER grant verified status without a valid cryptographic token
        env = os.getenv("ENVIRONMENT", "development").lower()
        is_prod = env in ["production", "prod"]
        master_token = os.getenv("AAPDA_MITRA_MASTER_TOKEN", "")

        is_authorized = False
        if req.auth_token:
            clean_token = req.auth_token.strip()
            if is_prod and master_token:
                is_authorized = secrets.compare_digest(clean_token, master_token)
            else:
                # In development/staging, accept standard NDMA format tokens with adequate entropy
                is_authorized = bool(clean_token.startswith("NDMA-") and len(clean_token) >= 16)

        auth_status = "NDMA_AAPDA_MITRA_VERIFIED" if is_authorized else "COMMUNITY_CITIZEN_ADVISORY"

        # Localized Loudspeaker Announcement Scripts
        lang = req.language.lower()
        village = req.village_panchayat
        hazard = req.hazard_type.upper()

        if lang in ["mr", "marathi"]:
            announcement = (
                f"सावधान! ग्रामपंचायत {village} मधील सर्व नागरिकांना सूचित करण्यात येते की, "
                f"आपत्कालीन हवामान विभागानुसार पुढील १ तासात भीषण {hazard} धडकणार आहे. "
                "कच्च्या घरातील नागरिकांनी त्वरित जिल्हा परिषद पक्क्या शाळेत आश्रय घ्यावा. "
                "जनावरांना गोठ्यातून मोकळे करा. मदतीसाठी आपत्ती मित्रांशी संपर्क साधा."
            )
            sms_text = f"[आपत्कालीन]: {village} मध्ये भीषण {hazard}! त्वरित ZP पक्क्या शाळेत जा. जनावरे मोकळी करा. SOS-1077"
            shelter = f"{village} जिल्हा परिषद पक्के चक्रीवादळ निवारा केंद्र (वॉर्ड क्र. ३)"
            checklist = [
                "ग्रामपंचायत/मंदिराचा लाऊडस्पीकर त्वरित सुरू करा.",
                "गावातील मुख्य वीज ट्रान्सफॉर्मर बंद करा (शॉर्ट सर्किट टाळा).",
                "नदीकाठच्या आणि कच्च्या घरातील नागरिकांना पक्क्या शाळेत हलवा.",
                "जनावरांचे दोर मोकळे करा (पूर आल्यास जनावरे पोहू शकतील).",
            ]
        elif lang in ["te", "telugu"]:
            announcement = (
                f"హెచ్చరిక! గ్రామ పంచాయతీ {village} ప్రజలందరికీ అత్యవసర సమాచారం: "
                f"రాబోయే 1 గంటలో తీవ్రమైన {hazard} రానుంది. "
                "మట్టి ఇళ్లలో ఉన్నవారు వెంటనే ప్రభుత్వ పక్కా స్కూల్ కి తరలివెళ్లండి. "
                "పశువుల తాళ్లు విప్పండి. ఆపద మిత్రుల సహాయం తీసుకోండి."
            )
            sms_text = f"[అత్యవసరం]: {village} లో తీవ్ర {hazard}! వెంటనే ప్రభుత్వ స్కూల్ కి వెళ్లండి. SOS-1077"
            shelter = f"{village} ప్రభుత్వ తుఫాను పునరావాస కేంద్రం (వార్డ్ నం. 2)"
            checklist = [
                "గ్రామ పంచాయతీ లౌడ్ స్పీకర్ లో అత్యవసర ప్రకటన చేయండి.",
                "గ్రామ విద్యుత్ సరఫరా వెంటనే నిలిపివేయండి.",
                "లోతట్టు ప్రాంతాల ప్రజలను పునరావాస కేంద్రానికి తరలించండి.",
                "పశువుల తాళ్లు విప్పండి.",
            ]
        elif lang in ["ta", "tamil"]:
            announcement = (
                f"எச்சரிக்கை! கிராம பஞ்சாயத்து {village} மக்கள் கவனத்திற்கு: "
                f"அடுத்த 1 மணி நேரத்தில் தீவிர {hazard} தாக்கும் அபாயம் உள்ளது. "
                "அனைவரும் உடனடியாக அரசு உயர்நிலைப் பள்ளி பாதுகாப்பு மையத்திற்கு செல்லவும். "
                "கால்நடைகளை அவிழ்த்து விடுங்கள்."
            )
            sms_text = f"[அவசரம்]: {village} தீவிர {hazard}! அரசு பாதுகாப்பு பள்ளிக்கு செல்லவும். SOS-1077"
            shelter = f"{village} அரசு புயல் நிவாரண மையம் (வார்டு 4)"
            checklist = [
                "கிராம ஒலிபெருக்கி மூலம் எச்சரிக்கை செய்தி வெளியிடவும்.",
                "மின் இணைப்பை உடனடியாக துண்டிக்கவும்.",
                "தாழ்வான பகுதி மக்களை நிவாரண முகாமிற்கு மாற்றவும்.",
                "கால்நடைகளை அவிழ்த்து விடவும்.",
            ]
        else:  # Hindi default
            announcement = (
                f"सावधान! ग्राम पंचायत {village} के सभी निवासियों को सूचित किया जाता है: "
                f"मौसम विभाग की चेतावनी अनुसार अगले १ घंटे में भयंकर {hazard} आने वाला है। "
                "कच्चे घरों और निचले इलाकों के लोग तुरंत जिला परिषद पक्के स्कूल में पहुंचे। "
                "मवेशियों को खूंटे से खोल दें। किसी भी मदद के लिए आपदा मित्र से संपर्क करें।"
            )
            sms_text = f"[आपदा अलर्ट]: {village} में भयंकर {hazard}! तुरंत पक्के स्कूल में पहुंचे। मवेशी खोलें। SOS-1077"
            shelter = f"{village} जिला परिषद पक्का आपदा राहत केंद्र (वार्ड क्र. २)"
            checklist = [
                "ग्राम पंचायत/मंदिर का लाउडस्पीकर तुरंत शुरू करें।",
                "गांव का मुख्य बिजली ट्रांसफॉर्मर तुरंत बंद करें।",
                "कच्चे घरों और बुजुर्गों को पक्के राहत केंद्र में शिफ्ट करें।",
                "पशुओं के रस्से खोल दें ताकि वे डूबने से बच सकें।",
            ]

        # Clamp SMS to strict 160 GSM chars
        if len(sms_text) > 160:
            sms_text = sms_text[:157] + "..."

        priorities = [
            "गर्भवती महिलाएं और नवजात शिशु (वार्ड १-२)",
            "बिस्तर पर पड़े बुजुर्ग और दिव्यांग नागरिक",
            "नदी के तट पर स्थित झोपड़ियां और कच्चे घर",
        ]

        return CommunityAlertDispatch(
            dispatch_id=dispatch_id,
            village_panchayat=village,
            siren_frequency_hz=950,
            siren_pattern="INTERMITTENT_HI_LO_120S (850Hz-1200Hz Warble)",
            loudspeaker_announcement_script=announcement,
            button_phone_sms_broadcast=sms_text,
            evacuation_muster_point=shelter,
            action_checklist=checklist,
            vulnerable_household_priorities=priorities,
            timestamp=now_ist,
            authorized_by=auth_status,
        )

    def record_headcount_tally(self, req: HeadcountTallyRequest) -> HeadcountTallyReport:
        tally_id = f"TALLY-{uuid.uuid4().hex[:6].upper()}"
        total_accounted = req.evacuated_citizens + req.missing_unaccounted
        safe_pct = round((req.evacuated_citizens / max(1, total_accounted)) * 100.0, 1)

        sos_needed = (req.missing_unaccounted > 0) or (req.urgent_medical_cases > 0)
        sos_frame_hex = None

        if sos_needed:
            # Build an emergency 64-byte PRITHVI-Mesh SOS packet to relay back to NDRF
            # Hazard code 6 = EVACUATION/SOS, Severity = 3 (CRITICAL_RED)
            payload_msg = f"SOS:{req.village_panchayat[:12]}|MISS:{req.missing_unaccounted}|MED:{req.urgent_medical_cases}"
            sos_packet = PrithviMeshPacket(
                hazard_code=6,
                severity=3,
                latitude=req.latitude,
                longitude=req.longitude,
                radius_meters=15000,
                ttl=16,
                sequence_id=int(time.time()) % 65535,
                payload_text=payload_msg[:40],
            )
            raw_frame = prithvi_mesh_service.pack_mesh_frame(sos_packet)
            sos_frame_hex = raw_frame.hex()

        return HeadcountTallyReport(
            tally_id=tally_id,
            muster_point=req.shelter_name,
            safe_percentage=safe_pct,
            sos_beacon_required=sos_needed,
            prithvi_mesh_sos_frame_hex=sos_frame_hex,
            logged_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )


aapda_mitra_service = AapdaMitraService()
