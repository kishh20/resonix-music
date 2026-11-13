import random
import logging
from typing import List
from app.models.music import Track, RecommendationRequest, RecommendationMix, RecommendationResponse
from app.services.unified_music_service import unified_music_service
from cachetools import TTLCache

logger = logging.getLogger(__name__)
cache = TTLCache(maxsize=50, ttl=600)

class RecommendationService:
    async def get_personalized_recommendations(self, req: RecommendationRequest) -> RecommendationResponse:
        # Cache key based on preferred genres
        cache_key = f"recs_{'-'.join(sorted(req.preferred_genres or []))}_{req.limit}"
        if cache_key in cache:
            return cache[cache_key]

        # Fetch one single trending batch (fast & cached)
        candidates = await unified_music_service.get_trending(limit=40)

        # Filter out liked tracks if needed
        unliked = [t for t in candidates if t.id not in req.liked_track_ids]
        if not unliked:
            unliked = candidates

        random.shuffle(unliked)
        personalized = unliked[:req.limit]

        # Generate curated mixes
        mixes = [
            RecommendationMix(
                id="mix-daily",
                title="Daily Discovery",
                description="Personalized based on your favorite artists and genres.",
                cover_url="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
                tracks=unliked[:12]
            ),
            RecommendationMix(
                id="mix-chill",
                title="Lo-Fi & Deep Focus",
                description="Mellow rhythms and soothing beats to stay in the flow.",
                cover_url="https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
                tracks=[t for t in unliked if (t.genre or "").lower() in ["lofi", "ambient", "acoustic"]][:10] or unliked[5:15]
            ),
            RecommendationMix(
                id="mix-energy",
                title="Electronic Surge",
                description="High tempo beats and club anthems to boost your energy.",
                cover_url="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
                tracks=[t for t in unliked if (t.genre or "").lower() in ["electronic", "edm", "dance"]][:10] or unliked[10:20]
            ),
            RecommendationMix(
                id="mix-radar",
                title="Release Radar",
                description="Fresh indie tracks and emerging creators across the globe.",
                cover_url="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
                tracks=unliked[15:25] if len(unliked) >= 25 else unliked[:10]
            )
        ]

        resp = RecommendationResponse(
            personalized_tracks=personalized,
            mixes=mixes
        )
        cache[cache_key] = resp
        return resp

recommendation_service = RecommendationService()
