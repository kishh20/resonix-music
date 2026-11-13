import httpx
import logging
from typing import List, Optional, Dict, Any
from app.models.music import Track
from app.config import settings
from cachetools import TTLCache

logger = logging.getLogger(__name__)
cache = TTLCache(maxsize=100, ttl=600)

class JamendoService:
    BASE_URL = "https://api.jamendo.com/v3.0"

    def __init__(self):
        self.client_id = settings.JAMENDO_CLIENT_ID

    def _parse_track(self, raw: Dict[str, Any]) -> Optional[Track]:
        try:
            track_id = raw.get("id")
            title = raw.get("name")
            audio_url = raw.get("audio")
            if not track_id or not title or not audio_url:
                return None

            artist_name = raw.get("artist_name") or "Jamendo Artist"
            artwork_url = (
                raw.get("album_image") or 
                raw.get("image") or 
                "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80"
            )
            duration = int(raw.get("duration", 0))
            musicinfo = raw.get("musicinfo", {})
            genre = (musicinfo.get("tags") or {}).get("genres", ["Acoustic"])[0] if musicinfo.get("tags") else "Indie"

            return Track(
                id=f"jamendo:{track_id}",
                title=title,
                artist=artist_name,
                artist_id=str(raw.get("artist_id", "")),
                album=raw.get("album_name") or "Independent",
                artwork_url=artwork_url,
                duration=duration,
                stream_url=audio_url,
                provider="jamendo",
                genre=genre,
                bitrate="192kbps MP3",
                release_date=raw.get("releasedate"),
                permalink=raw.get("shareurl")
            )
        except Exception as e:
            logger.error(f"Error parsing Jamendo track: {e}")
            return None

    async def get_popular(self, genre: Optional[str] = None, limit: int = 30) -> List[Track]:
        cache_key = f"jamendo_popular_{genre}_{limit}"
        if cache_key in cache:
            return cache[cache_key]

        params = {
            "client_id": self.client_id,
            "format": "jsonpretty",
            "limit": limit,
            "order": "popularity_total",
            "include": "musicinfo"
        }
        if genre and genre.lower() != "all":
            params["tags"] = genre.lower()

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(f"{self.BASE_URL}/tracks/", params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    tracks = []
                    for item in results:
                        t = self._parse_track(item)
                        if t:
                            tracks.append(t)
                    if tracks:
                        cache[cache_key] = tracks
                        return tracks
        except Exception as e:
            logger.warning(f"Jamendo request failed: {e}")
        return []

    async def search_tracks(self, query: str, limit: int = 30) -> List[Track]:
        if not query.strip():
            return []

        cache_key = f"jamendo_search_{query.lower()}_{limit}"
        if cache_key in cache:
            return cache[cache_key]

        params = {
            "client_id": self.client_id,
            "format": "jsonpretty",
            "namesearch": query,
            "limit": limit,
            "include": "musicinfo"
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(f"{self.BASE_URL}/tracks/", params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    tracks = []
                    for item in results:
                        t = self._parse_track(item)
                        if t:
                            tracks.append(t)
                    if tracks:
                        cache[cache_key] = tracks
                        return tracks
        except Exception as e:
            logger.warning(f"Jamendo search failed: {e}")
        return []

jamendo_service = JamendoService()
