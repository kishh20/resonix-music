import httpx
import logging
from typing import List, Optional, Dict, Any
from app.models.music import Track, Artist
from app.config import settings
from cachetools import TTLCache

logger = logging.getLogger(__name__)

# Cache for discovery nodes and popular tracks (TTL: 10 minutes)
cache = TTLCache(maxsize=300, ttl=600)

DISCOVERY_NODES = [
    "https://discoveryprovider.audius.co",
    "https://api.audius.co",
    "https://discoveryprovider2.audius.co",
    "https://discoveryprovider3.audius.co"
]

class AudiusService:
    def __init__(self):
        self.active_node = DISCOVERY_NODES[0]
        self.app_name = settings.AUDIUS_APP_NAME

    def _parse_track(self, raw: Dict[str, Any]) -> Optional[Track]:
        try:
            track_id = raw.get("id")
            title = raw.get("title")
            if not track_id or not title:
                return None
            
            user = raw.get("user", {})
            artist_name = user.get("name") or user.get("handle") or "Unknown Artist"
            
            # Select best artwork URL
            artwork_dict = raw.get("artwork") or {}
            artwork_url = (
                artwork_dict.get("480x480") or 
                artwork_dict.get("1000x1000") or 
                artwork_dict.get("150x150") or
                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80"
            )
            
            stream_url = f"{self.active_node}/v1/tracks/{track_id}/stream?app_name={self.app_name}"
            duration = int(raw.get("duration", 0))
            genre = raw.get("genre") or "Electronic"
            play_count = raw.get("play_count", 0)
            release_date = raw.get("release_date")
            permalink = raw.get("permalink")

            return Track(
                id=f"audius:{track_id}",
                title=title,
                artist=artist_name,
                artist_id=str(user.get("id", "")),
                album=raw.get("album_name") or "Single",
                artwork_url=artwork_url,
                duration=duration,
                stream_url=stream_url,
                provider="audius",
                genre=genre,
                bitrate="320kbps MP3",
                release_date=release_date,
                play_count=play_count,
                permalink=permalink
            )
        except Exception as e:
            logger.error(f"Error parsing Audius track: {e}")
            return None

    async def get_trending(self, genre: Optional[str] = None, limit: int = 50) -> List[Track]:
        cache_key = f"audius_trending_{genre}_{limit}"
        if cache_key in cache:
            return cache[cache_key]

        params = {"app_name": self.app_name, "limit": limit}
        if genre and genre.lower() != "all":
            params["genre"] = genre

        for node in [self.active_node] + DISCOVERY_NODES:
            try:
                url = f"{node}/v1/tracks/trending"
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(url, params=params)
                    if resp.status_code == 200:
                        self.active_node = node
                        data = resp.json().get("data", [])
                        tracks = [self._parse_track(item) for item in data]
                        valid_tracks = [t for t in tracks if t is not None]
                        cache[cache_key] = valid_tracks
                        return valid_tracks
            except Exception as e:
                logger.warning(f"Audius node {node} trending failed: {e}")
                continue
                
        return []

    async def search_tracks(self, query: str, limit: int = 30) -> List[Track]:
        if not query.strip():
            return []
            
        cache_key = f"audius_search_{query.lower()}_{limit}"
        if cache_key in cache:
            return cache[cache_key]

        params = {"query": query, "app_name": self.app_name, "limit": limit}

        for node in [self.active_node] + DISCOVERY_NODES:
            try:
                url = f"{node}/v1/tracks/search"
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(url, params=params)
                    if resp.status_code == 200:
                        self.active_node = node
                        data = resp.json().get("data", [])
                        tracks = [self._parse_track(item) for item in data]
                        valid_tracks = [t for t in tracks if t is not None]
                        cache[cache_key] = valid_tracks
                        return valid_tracks
            except Exception as e:
                logger.warning(f"Audius search failed on node {node}: {e}")
                continue

        cache[cache_key] = []
        return []

    async def get_track(self, raw_id: str) -> Optional[Track]:
        track_id = raw_id.replace("audius:", "")
        url = f"{self.active_node}/v1/tracks/{track_id}"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, params={"app_name": self.app_name})
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    return self._parse_track(data)
        except Exception as e:
            logger.error(f"Error fetching Audius track {track_id}: {e}")
        return None

audius_service = AudiusService()
