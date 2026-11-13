import httpx
import logging
from typing import List, Optional, Dict, Any
from app.models.music import Track
from cachetools import TTLCache

logger = logging.getLogger(__name__)
cache = TTLCache(maxsize=100, ttl=600)

class ArchiveMusicService:
    BASE_URL = "https://archive.org"

    async def get_featured(self, limit: int = 25) -> List[Track]:
        cache_key = f"archive_featured_{limit}"
        if cache_key in cache:
            return cache[cache_key]

        query = "collection:(freemusicarchive OR netlabels) AND mediatype:(audio) AND format:(VBR MP3 OR 128Kbps MP3 OR 320Kbps MP3)"
        params = {
            "q": query,
            "fl[]": ["identifier", "title", "creator", "description", "year", "genre"],
            "sort[]": "downloads desc",
            "rows": limit,
            "page": 1,
            "output": "json"
        }

        tracks: List[Track] = []
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(f"{self.BASE_URL}/advancedsearch.php", params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    docs = data.get("response", {}).get("docs", [])
                    for doc in docs:
                        ident = doc.get("identifier")
                        title = doc.get("title") or "Archive Audio"
                        if isinstance(title, list):
                            title = " / ".join(str(t) for t in title if t) or "Archive Audio"
                        creator = doc.get("creator") or "Community Artist"
                        if isinstance(creator, list):
                            creator = ", ".join(str(c) for c in creator if c) or "Community Artist"
                        genre = doc.get("genre") or "Acoustic / Indie"
                        if isinstance(genre, list):
                            genre = genre[0] if genre else "Indie"
                        
                        # Streaming audio file resolver via archive download endpoint
                        stream_url = f"{self.BASE_URL}/download/{ident}"
                        artwork_url = f"{self.BASE_URL}/services/img/{ident}"

                        tracks.append(Track(
                            id=f"archive:{ident}",
                            title=title,
                            artist=creator,
                            album="Free Music Archive",
                            artwork_url=artwork_url,
                            duration=210,
                            stream_url=stream_url,
                            provider="archive",
                            genre=str(genre),
                            bitrate="High VBR MP3",
                            release_date=str(doc.get("year", "2024")),
                            permalink=f"{self.BASE_URL}/details/{ident}"
                        ))
                    if tracks:
                        cache[cache_key] = tracks
                        return tracks
        except Exception as e:
            logger.warning(f"Archive service request failed: {e}")
        return tracks

    async def search_tracks(self, query: str, limit: int = 25) -> List[Track]:
        if not query.strip():
            return []

        cache_key = f"archive_search_{query.lower()}_{limit}"
        if cache_key in cache:
            return cache[cache_key]

        escaped_query = query.replace('"', '').replace("'", "")
        search_q = f"({escaped_query}) AND mediatype:(audio) AND collection:(freemusicarchive OR netlabels OR audio_music)"
        params = {
            "q": search_q,
            "fl[]": ["identifier", "title", "creator", "genre", "year"],
            "sort[]": "downloads desc",
            "rows": limit,
            "page": 1,
            "output": "json"
        }

        tracks: List[Track] = []
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(f"{self.BASE_URL}/advancedsearch.php", params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    docs = data.get("response", {}).get("docs", [])
                    for doc in docs:
                        ident = doc.get("identifier")
                        title = doc.get("title") or query
                        if isinstance(title, list):
                            title = " / ".join(str(t) for t in title if t) or query
                        creator = doc.get("creator") or "Community Artist"
                        if isinstance(creator, list):
                            creator = ", ".join(str(c) for c in creator if c) or "Community Artist"
                        genre = doc.get("genre") or "Acoustic"
                        if isinstance(genre, list):
                            genre = genre[0] if genre else "Acoustic"

                        tracks.append(Track(
                            id=f"archive:{ident}",
                            title=title,
                            artist=creator,
                            album="Community Release",
                            artwork_url=f"{self.BASE_URL}/services/img/{ident}",
                            duration=195,
                            stream_url=f"{self.BASE_URL}/download/{ident}",
                            provider="archive",
                            genre=str(genre),
                            bitrate="High VBR MP3",
                            release_date=str(doc.get("year", "2024")),
                            permalink=f"{self.BASE_URL}/details/{ident}"
                        ))
                    if tracks:
                        cache[cache_key] = tracks
                        return tracks
        except Exception as e:
            logger.warning(f"Archive search failed: {e}")
        return tracks

archive_service = ArchiveMusicService()
