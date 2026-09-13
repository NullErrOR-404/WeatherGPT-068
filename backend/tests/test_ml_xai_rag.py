"""
Unit and Integration Tests for Machine Learning Risk Prediction, TreeSHAP Explainable AI (XAI),
and In-Memory Vector Store RAG.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.ml_risk_service import ml_risk_engine, MLRiskAssessment
from backend.services.vector_store_service import vector_store
from backend.services.agentic_rag_service import agentic_rag_service, WeatherAgentState
from backend.models.schemas import CurrentWeatherMetrics, NowcastHour

client = TestClient(app)


def test_ml_risk_engine_classification_and_bounds():
    """Verifies ML risk output conforms to probability bounds [0.0, 1.0] and valid severity levels."""
    curr = CurrentWeatherMetrics(
        time="2026-09-13T12:00",
        temperature_2m=34.0,
        relative_humidity_2m=78,
        apparent_temperature=41.0,
        precipitation=5.2,
        weather_code=65,
        wind_speed_10m=26.0,
        wind_gusts_10m=48.0,
        surface_pressure=994.0,
        dew_point_2m=28.0,
        vapour_pressure_deficit=0.4,
        soil_moisture_0_to_1cm=0.82,
    )
    nowcast = [
        NowcastHour(time="13:00", hour_label="1 PM", temp_c=33.0, rain_prob_pct=85, precip_mm=6.0, weather_code=65, icon="⛈️"),
        NowcastHour(time="14:00", hour_label="2 PM", temp_c=31.0, rain_prob_pct=90, precip_mm=12.0, weather_code=65, icon="⛈️"),
        NowcastHour(time="15:00", hour_label="3 PM", temp_c=29.0, rain_prob_pct=75, precip_mm=4.0, weather_code=65, icon="🌧️"),
    ]

    assessment = ml_risk_engine.evaluate_risk(curr, nowcast, pressure_tendency_3h=-3.5)

    assert 0.0 <= assessment.risk_probability <= 1.0
    assert assessment.risk_level in ["SAFE", "WATCH", "SEVERE", "DANGER"]
    assert assessment.risk_level in ["SEVERE", "DANGER"]  # High precipitation + pressure plunge
    assert len(assessment.primary_driver) > 0
    assert assessment.efficiency_axiom_verified is True


def test_treeshap_efficiency_axiom_mathematical_proof():
    """
    Mathematical Proof of Shapley Efficiency Axiom:
    For any input x, sum(phi_i) MUST identically equal f(x) - E[f(x)].
    Tested across 3 distinct extreme scenarios.
    """
    scenarios = [
        # Scenario 1: Calm benign conditions
        {
            "temp_c": 26.0, "dew_point_depression": 7.0, "surface_pressure": 1014.0,
            "pressure_tendency_3h": 0.5, "relative_humidity": 50.0, "wind_speed": 8.0,
            "wind_gusts": 12.0, "rain_prob_3h": 10.0, "soil_moisture": 0.25, "k_index": 18.0,
        },
        # Scenario 2: Violent cloudburst & squall
        {
            "temp_c": 32.0, "dew_point_depression": 1.2, "surface_pressure": 988.0,
            "pressure_tendency_3h": -4.2, "relative_humidity": 92.0, "wind_speed": 38.0,
            "wind_gusts": 62.0, "rain_prob_3h": 95.0, "soil_moisture": 0.88, "k_index": 42.0,
        },
        # Scenario 3: High wind agricultural spray drift
        {
            "temp_c": 30.0, "dew_point_depression": 4.0, "surface_pressure": 1008.0,
            "pressure_tendency_3h": -0.8, "relative_humidity": 65.0, "wind_speed": 22.0,
            "wind_gusts": 42.0, "rain_prob_3h": 35.0, "soil_moisture": 0.40, "k_index": 26.0,
        },
    ]

    for sc in scenarios:
        pred, phi = ml_risk_engine.predict_with_treeshap(sc)
        base = ml_risk_engine.ensemble_expected_value
        shap_sum = sum(phi.values())
        diff = pred - base
        # Verify efficiency property holds to within 0.005 rounding tolerance
        assert abs(shap_sum - diff) < 0.005, f"TreeSHAP Efficiency Axiom Violated! sum={shap_sum}, diff={diff}"


def test_dual_audience_xai_citizen_and_evaluator_payload():
    """Verifies dual-audience output format: Citizen badges (%) and Evaluator SHAP vector."""
    curr = CurrentWeatherMetrics(
        time="2026-09-13T12:00",
        temperature_2m=28.0,
        relative_humidity_2m=88,
        apparent_temperature=33.0,
        precipitation=8.0,
        weather_code=65,
        wind_speed_10m=24.0,
        wind_gusts_10m=42.0,
        surface_pressure=996.0,
        dew_point_2m=26.0,
        vapour_pressure_deficit=0.2,
        soil_moisture_0_to_1cm=0.78,
    )
    nowcast = [
        NowcastHour(time="13:00", hour_label="1 PM", temp_c=27.0, rain_prob_pct=80, precip_mm=8.0, weather_code=65, icon="⛈️")
    ]

    assessment = ml_risk_engine.evaluate_risk(curr, nowcast, pressure_tendency_3h=-2.8)

    # 1. Citizen audience check
    assert len(assessment.citizen_xai_badges) > 0
    pos_badges = [b for b in assessment.citizen_xai_badges if b.direction == "INCREASE_RISK"]
    assert len(pos_badges) > 0
    for b in pos_badges:
        assert b.impact_pct > 0
        assert len(b.icon) > 0
        assert len(b.display_label) > 0

    # 2. Evaluator audience check
    assert len(assessment.evaluator_shap_values) == 10  # All 10 meteorological features
    assert "rain_prob_3h" in assessment.evaluator_shap_values
    assert "wind_gusts" in assessment.evaluator_shap_values
    assert "pressure_tendency_3h" in assessment.evaluator_shap_values
    assert assessment.model_version == "WeatherGPT-TreeSHAP-v1.1"


def test_in_memory_vector_store_retrieval():
    """Verifies dense vector store cosine similarity retrieval and metadata sector filtering."""
    # Agro query: Cotton spray wash-off
    agro_results = vector_store.search("cotton fungicide spray wash off rain", sector="agro", top_k=2)
    assert len(agro_results) > 0
    assert any("cotton" in d.tags or "spray" in d.tags for d in agro_results)
    assert agro_results[0].statutory_authority in ["ICAR-CICR", "CIBRC"]

    # Marine query: High wave and border warnings
    marine_results = vector_store.search("fishing boat sea swell IMBL border alert", sector="marine", top_k=2)
    assert len(marine_results) > 0
    assert "INCOIS" in marine_results[0].statutory_authority
    assert "PFZ" in marine_results[0].content or "IMBL" in marine_results[0].content

    # Disaster SOP query: Cloudburst flash flood
    disaster_results = vector_store.search("cloudburst underpass waterlogging emergency evacuation", top_k=2)
    assert len(disaster_results) > 0
    assert any(d.statutory_authority in ["NDMA", "IMD"] for d in disaster_results)


@pytest.mark.asyncio
async def test_agentic_rag_end_to_end_with_vector_and_xai():
    """Verifies agentic RAG integrates dense vector retrieval and ML TreeSHAP risk assessment."""
    state = WeatherAgentState(
        user_query="Can I spray pesticide on my cotton crop today in Wardha?",
        latitude=20.7453,
        longitude=78.6022,
        language="en",
        user_persona="farmer",
    )
    result = await agentic_rag_service.execute_agentic_flow(state)

    # Verify dense vector chunks were retrieved
    assert len(result.retrieved_docs) > 0
    assert any("ICAR" in d.statutory_authority or "CIBRC" in d.statutory_authority for d in result.retrieved_docs)

    # Verify ML risk evaluation
    assert result.ml_risk_assessment is not None
    assert result.ml_risk_assessment.risk_level in ["SAFE", "WATCH", "SEVERE", "DANGER"]
    assert len(result.ml_risk_assessment.citizen_xai_badges) > 0

    # Verify execution trace mentions dense vector store and ML engine
    trace_text = " ".join(result.execution_trace)
    assert "VectorStore" in trace_text
    assert "MLRiskEngine" in trace_text


def test_api_ml_risk_assessment_endpoint():
    """Verifies GET /api/ml/risk-assessment endpoint."""
    response = client.get("/api/ml/risk-assessment?lat=20.7453&lon=78.6022&pressure_tendency_3h=-1.8")
    assert response.status_code == 200
    data = response.json()
    assert "risk_level" in data
    assert "risk_probability" in data
    assert "citizen_xai_badges" in data
    assert "evaluator_shap_values" in data
    assert data["efficiency_axiom_verified"] is True


def test_api_weather_current_includes_ml_risk():
    """Verifies GET /api/weather/current includes ML risk assessment payload."""
    response = client.get("/api/weather/current?lat=20.7453&lon=78.6022")
    assert response.status_code == 200
    data = response.json()
    assert "ml_risk" in data
    assert data["ml_risk"] is not None
    assert "risk_level" in data["ml_risk"]
    assert "citizen_xai_badges" in data["ml_risk"]


def test_api_chat_returns_ml_risk_and_vector_sources():
    """Verifies POST /api/chat returns ML risk and vector RAG citations."""
    payload = {
        "message": "Should I spray pesticide on my cotton crop today?",
        "latitude": 20.7453,
        "longitude": 78.6022,
        "language": "en",
        "user_persona": "farmer"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "ml_risk" in data
    assert data["ml_risk"] is not None
    assert "retrieved_knowledge_sources" in data
    assert len(data["retrieved_knowledge_sources"]) > 0
