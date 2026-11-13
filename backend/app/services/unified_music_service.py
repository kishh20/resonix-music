import asyncio
import re
import logging
from typing import List, Optional, Dict, Any
from app.models.music import Track, SearchResponse
from app.services.audius_service import audius_service
from app.services.jamendo_service import jamendo_service
from app.services.archive_service import archive_service
from app.services.yt_service import yt_service
from cachetools import TTLCache

logger = logging.getLogger(__name__)
cache = TTLCache(maxsize=200, ttl=300)

GENRES = [
    {"id": "electronic", "name": "Electronic & EDM", "color": "from-cyan-500 to-blue-600", "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80"},
    {"id": "lofi", "name": "Lo-Fi & Chill", "color": "from-indigo-500 to-purple-600", "image": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80"},
    {"id": "hip-hop", "name": "Hip-Hop & Trap", "color": "from-amber-500 to-red-600", "image": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80"},
    {"id": "pop", "name": "Pop & Indie", "color": "from-pink-500 to-rose-600", "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80"},
    {"id": "rock", "name": "Rock & Alternative", "color": "from-red-500 to-orange-600", "image": "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80"},
    {"id": "ambient", "name": "Ambient & Sleep", "color": "from-emerald-500 to-teal-700", "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80"},
    {"id": "acoustic", "name": "Acoustic & Folk", "color": "from-yellow-600 to-amber-700", "image": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500&auto=format&fit=crop&q=80"},
    {"id": "classical", "name": "Classical & Piano", "color": "from-violet-600 to-indigo-900", "image": "https://images.unsplash.com/photo-1520523839898-507125cd53c1?w=500&auto=format&fit=crop&q=80"}
]

class UnifiedMusicService:
    FAN_PATTERNS = re.compile(
        r'\b(multimix|mashup|slowed|reverb|8d\s*audio|8d|bass\s*boosted|whatsapp|status|ringtone|fan\s*made|butter\s*skotch|nova\s*lyrics|7clouds)\b',
        re.IGNORECASE
    )

    def _normalize_string(self, text: str) -> str:
        text = re.sub(r'[\(\[\{].*?[\)\]\}]', '', text.lower()) # remove (feat. ...), [remix], etc.
        text = re.sub(r'[^a-z0-9]', '', text)
        return text

    def _deduplicate_tracks(self, tracks: List[Track]) -> List[Track]:
        seen = set()
        unique = []
        for track in tracks:
            # Strictly filter out all fan-made re-uploads and edits
            t_str = f"{track.title} {track.artist}".lower()
            if self.FAN_PATTERNS.search(t_str):
                continue

            norm_key = f"{self._normalize_string(track.title)}_{self._normalize_string(track.artist)}"
            if norm_key in seen and len(norm_key) > 5:
                continue
            seen.add(norm_key)
            unique.append(track)
        return unique

    async def get_trending(self, genre: Optional[str] = None, limit: int = 40) -> List[Track]:
        cache_key = f"unified_trending_{genre}_{limit}"
        if cache_key in cache:
            return cache[cache_key]

        # Fetch from Audius and Jamendo concurrently
        audius_task = audius_service.get_trending(genre=genre, limit=limit)
        jamendo_task = jamendo_service.get_popular(genre=genre, limit=limit // 2)

        results = await asyncio.gather(audius_task, jamendo_task, return_exceptions=True)
        
        audius_tracks = results[0] if isinstance(results[0], list) else []
        jamendo_tracks = results[1] if isinstance(results[1], list) else []

        combined = []
        max_len = max(len(audius_tracks), len(jamendo_tracks))
        for i in range(max_len):
            if i < len(audius_tracks):
                combined.append(audius_tracks[i])
            if i < len(jamendo_tracks):
                combined.append(jamendo_tracks[i])

        deduped = self._deduplicate_tracks(combined)
        final_tracks = deduped[:limit]
        if final_tracks:
            cache[cache_key] = final_tracks
        return final_tracks

    async def search(self, query: str, provider: Optional[str] = None, limit: int = 30) -> SearchResponse:
        if not query.strip():
            return SearchResponse(query=query, total=0, tracks=[], providers=[])

        cache_key = f"unified_search_{query.lower()}_{provider}_{limit}"
        if cache_key in cache:
            return cache[cache_key]

        providers_used = []
        tasks = []

        # Include YouTube Music for mainstream fidelity
        if not provider or provider == "all" or provider == "youtube":
            tasks.append(yt_service.search_tracks(query, limit=limit // 2 if provider == "all" else limit))
            providers_used.append("youtube")

        if not provider or provider == "all" or provider == "audius":
            tasks.append(audius_service.search_tracks(query, limit=limit // 2 if provider == "all" else limit))
            providers_used.append("audius")

        if not provider or provider == "all" or provider == "jamendo":
            tasks.append(jamendo_service.search_tracks(query, limit=limit // 2 if provider == "all" else limit))
            providers_used.append("jamendo")

        if not provider or provider == "all" or provider == "archive":
            tasks.append(archive_service.search_tracks(query, limit=limit // 3))
            providers_used.append("archive")

        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_tracks = []
        for res in results:
            if isinstance(res, list):
                all_tracks.extend(res)

        deduped = self._deduplicate_tracks(all_tracks)
        response = SearchResponse(
            query=query,
            total=len(deduped),
            tracks=deduped[:limit],
            providers=providers_used
        )
        cache[cache_key] = response
        return response

    async def get_suggestions(self, query: str) -> Dict[str, Any]:
        """
        Fast live autocomplete suggestions (~50-100ms) for queries.
        Returns suggested search terms and quick matching tracks.
        """
        query = query.strip()
        if len(query) < 2:
            return {"query": query, "suggestions": [], "tracks": []}

        # Fetch text suggestions
        suggestions_task = yt_service.get_autocomplete_suggestions(query)
        # Fast 3-track search for immediate click-to-play
        tracks_task = yt_service.search_tracks(query, limit=3)

        results = await asyncio.gather(suggestions_task, tracks_task, return_exceptions=True)
        suggestions = results[0] if isinstance(results[0], list) else []
        tracks = results[1] if isinstance(results[1], list) else []

        return {
            "query": query,
            "suggestions": suggestions[:6],
            "tracks": tracks[:3]
        }

    def get_genres(self) -> List[Dict[str, Any]]:
        return GENRES

unified_music_service = UnifiedMusicService()
