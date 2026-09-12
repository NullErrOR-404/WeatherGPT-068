import pytest
from backend.services.ai_chat_service import ai_chat_service
from backend.models.schemas import ChatQuery

@pytest.mark.asyncio
async def test_chat_spray_query_intent():
    from backend.services.spatial_cache_service import spatial_cache
    spatial_cache.clear()
    
    query = ChatQuery(
        message="Can I spray pesticide on my cotton field today?",
        latitude=20.7453,
        longitude=78.6022,
        language="en"
    )
    res = await ai_chat_service.process_query(query)
    assert res is not None
    assert len(res.reply_text) > 10
    assert res.detected_intent == "AGROMET_SPRAY"
    assert res.action_badge in ["SAFE", "CAUTION", "DANGER"]
    assert res.cache_hit is False

@pytest.mark.asyncio
async def test_spatial_cache_deduplication():
    # First query in Sector
    q1 = ChatQuery(
        message="Will it rain in the next 3 hours?",
        latitude=20.7453,
        longitude=78.6022,
        language="hi"
    )
    res1 = await ai_chat_service.process_query(q1)

    # Second query virtually same coordinates (~50m apart)
    q2 = ChatQuery(
        message="Will it rain in the next 3 hours?",
        latitude=20.7455,
        longitude=78.6024,
        language="hi"
    )
    res2 = await ai_chat_service.process_query(q2)

    # Cache hit check
    assert res2.cache_hit is True
    assert res2.reply_text == res1.reply_text
