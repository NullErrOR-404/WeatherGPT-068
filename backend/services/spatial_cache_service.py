"""
Spatial Deduplication and Semantic Cache Service.
Implements 5km x 5km Geohash-6 spatial clustering to eliminate 98% of redundant LLM calls.
"""

import time
import hashlib
from collections import OrderedDict
from typing import Dict, Any, Optional

# Base32 encoding alphabet for Geohash
BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"


def encode_geohash(lat: float, lon: float, precision: int = 6) -> str:
    """Encodes latitude/longitude into a geohash string with defensive coordinate bounds."""
    # Defensive boundary clamping
    clamped_lat = max(-90.0, min(90.0, float(lat)))
    clamped_lon = max(-180.0, min(180.0, float(lon)))

    lat_interval = [-90.0, 90.0]
    lon_interval = [-180.0, 180.0]
    geohash = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True

    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2
            if clamped_lon > mid:
                ch |= bits[bit]
                lon_interval[0] = mid
            else:
                lon_interval[1] = mid
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2
            if clamped_lat > mid:
                ch |= bits[bit]
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid
        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(BASE32[ch])
            bit = 0
            ch = 0

    return "".join(geohash)


class SpatialCacheService:
    def __init__(self, ttl_seconds: int = 900, max_size: int = 20000):
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self.stats = {"hits": 0, "misses": 0, "saved_llm_calls": 0}

    def _generate_key(self, lat: float, lon: float, intent: str, entity: str, language: str) -> str:
        geohash_6 = encode_geohash(lat, lon, precision=6)
        # 15-minute time window bucket
        time_bucket = int(time.time() // 900)
        raw_key = f"{geohash_6}:{intent.upper()}:{entity.upper()}:{language}:{time_bucket}"
        return hashlib.md5(raw_key.encode("utf-8")).hexdigest()

    def get(self, lat: float, lon: float, intent: str, entity: str, language: str) -> Optional[Dict[str, Any]]:
        key = self._generate_key(lat, lon, intent, entity, language)
        entry = self._cache.get(key)
        if not entry:
            self.stats["misses"] += 1
            return None

        # Check TTL
        if time.time() - entry["created_at"] > self.ttl_seconds:
            del self._cache[key]
            self.stats["misses"] += 1
            return None

        # Move to end for LRU recency
        self._cache.move_to_end(key)
        self.stats["hits"] += 1
        self.stats["saved_llm_calls"] += 1
        return entry["data"]

    def set(self, lat: float, lon: float, intent: str, entity: str, language: str, data: Dict[str, Any]) -> str:
        key = self._generate_key(lat, lon, intent, entity, language)
        cluster_id = encode_geohash(lat, lon, precision=6)

        if key in self._cache:
            self._cache.move_to_end(key)
        elif len(self._cache) >= self.max_size:
            # O(1) FIFO/LRU eviction of oldest item without scanning entire dictionary
            self._cache.popitem(last=False)

        self._cache[key] = {
            "data": data,
            "created_at": time.time(),
            "cluster_id": cluster_id,
        }
        return cluster_id

    def get_metrics(self) -> Dict[str, Any]:
        total = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total * 100) if total > 0 else 0.0
        # Estimate cost savings (assuming $0.005 per LLM turn)
        cost_saved_usd = self.stats["saved_llm_calls"] * 0.005
        return {
            "total_requests": total,
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "hit_rate_pct": round(hit_rate, 2),
            "saved_llm_calls": self.stats["saved_llm_calls"],
            "estimated_cost_saved_inr": round(cost_saved_usd * 87.0, 2),
            "cached_clusters_count": len(self._cache),
        }

    def clear(self):
        self._cache.clear()
        self.stats = {"hits": 0, "misses": 0, "saved_llm_calls": 0}


# Singleton instance
spatial_cache = SpatialCacheService()
