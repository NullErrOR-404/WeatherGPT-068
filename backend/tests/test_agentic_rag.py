import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.agentic_rag_service import agentic_rag_service, WeatherAgentState

client = TestClient(app)


@pytest.mark.asyncio
async def test_agentic_rag_flow_marathi_cotton_spray():
    """
    Verifies full 5-node agentic RAG flow:
    - Marathi query on cotton spray
    - Proper entity routing (cotton)
    - Dynamic NWP retrieval
    - CIBRC Rule 37 statutory guardrail attachment
    - Marathi vernacular synthesis
    - Sarvam Bulbul voice metadata
    """
    state = WeatherAgentState(
        user_query="कपाशीवर आज कीटकनाशक फवारणी करावी का?",
        latitude=20.7453,
        longitude=78.6022,
        language="mr",
        user_persona="farmer"
    )
    result = await agentic_rag_service.execute_agentic_flow(state)

    assert result.detected_intent == "AGROMET_SPRAY"
    assert result.target_entity == "cotton"
    assert result.statutory_shield_applied is True
    assert "CIBRC Rule 37" in result.statutory_disclaimer
    assert result.action_badge in ["SAFE_WINDOW", "UNSAFE_RAIN", "UNSAFE_DRIFT"]
    assert "कपास" in result.synthesized_answer or "कपाशी" in result.synthesized_answer or "पिकावर" in result.synthesized_answer
    assert "ICAR दिशा-निर्देश" in result.synthesized_answer
    assert result.voice_engine_used == "SARVAM_AI_BULBUL_V2"
    assert result.voice_latency_ms <= 250
    assert len(result.execution_trace) >= 5


@pytest.mark.asyncio
async def test_agentic_rag_flow_hindi_irrigation():
    """
    Verifies irrigation cutoff flow with ICAR guidelines.
    """
    state = WeatherAgentState(
        user_query="क्या मुझे आज गेहूं में पानी (सिंचाई) देना चाहिए?",
        latitude=28.6139,
        longitude=77.2090,
        language="hi",
        user_persona="farmer"
    )
    result = await agentic_rag_service.execute_agentic_flow(state)

    assert result.detected_intent == "AGROMET_IRRIGATION"
    assert result.target_entity == "wheat"
    assert result.action_badge in ["IRRIGATION_CUTOFF", "IRRIGATE_SAFE"]
    assert len(result.execution_trace) >= 5


def test_agentic_rag_self_learning_bias_update():
    """
    Verifies self-learning pattern calibration:
    Online Exponential Moving Average (EMA) updates local NWP temperature bias per geohash cell.
    """
    geohash_cell = "te7u1d"
    
    # Simulate ground truth measured 32°C while NWP forecast was 30°C (residual +2°C)
    agentic_rag_service.record_ground_truth_bias(geohash_cell, measured_temp_c=32.0, nwp_forecast_temp_c=30.0)
    bias_1 = agentic_rag_service.get_calibrated_bias(geohash_cell)
    assert bias_1 > 0.0

    # Next reading shows +2.5°C residual
    agentic_rag_service.record_ground_truth_bias(geohash_cell, measured_temp_c=32.5, nwp_forecast_temp_c=30.0)
    bias_2 = agentic_rag_service.get_calibrated_bias(geohash_cell)
    assert bias_2 >= bias_1


def test_api_agent_rag_chat_endpoint():
    """
    Verifies POST /api/agent/rag-chat HTTP endpoint.
    """
    payload = {
        "user_query": "Will it rain during my commute home?",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "language": "en",
        "user_persona": "commuter"
    }
    response = client.post("/api/agent/rag-chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_intent"] in ["COMMUTER_FLOOD", "GENERAL_WEATHER"]
    assert "synthesized_answer" in data
    assert data["voice_engine_used"] == "SARVAM_AI_BULBUL_V2"
    assert len(data["execution_trace"]) >= 5
