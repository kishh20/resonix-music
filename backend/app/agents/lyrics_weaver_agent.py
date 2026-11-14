import time
import logging
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.models.music import Track, LyricsResponse
from app.services.lyrics_service import lyrics_service, lyrics_cache
from app.services.discovery_service import discovery_service

logger = logging.getLogger(__name__)

class LyricsWeaverAgent:
    """
    Autonomous Lyrics Weaver Agent.
    Continuously monitors catalogue tracks and queue requests to resolve,
    align, and persist time-synchronized karaoke lyrics in all languages.
    """
    def __init__(self):
        self.name = "Lyrics Weaver Agent"
        self.is_running = False
        self.last_run_timestamp: Optional[str] = None
        self.healed_tracks_count: int = 0
        self.instrumental_identified_count: int = 0
        self.last_healed_title: Optional[str] = None
        self.last_status: str = "idle"

    async def heal_single_track(self, track: Track) -> Optional[LyricsResponse]:
        """
        Actively weaves/resolves lyrics for a specific song on demand.
        """
        try:
            res = await lyrics_service.get_lyrics(
                title=track.title,
                artist=track.artist,
                duration=track.duration,
                track_id=track.id
            )
            if res and (res.is_synced or res.plain_lyrics or res.is_instrumental):
                if res.is_instrumental:
                    self.instrumental_identified_count += 1
                else:
                    self.healed_tracks_count += 1
                self.last_healed_title = f"{track.title} - {track.artist}"
                return res
        except Exception as e:
            logger.debug(f"[Lyrics Weaver Agent] Failed to heal track {track.title}: {e}")
        return None

    async def scan_and_heal_catalogue(self, batch_size: int = 20) -> Dict[str, Any]:
        """
        Scans un-cached tracks in the local catalogue and actively heals their lyrics in the background.
        """
        if self.is_running:
            return {
                "status": "already_running",
                "message": "Lyrics weaver is already running a healing pass."
            }

        self.is_running = True
        self.last_status = "weaving_lyrics"
        start_time = time.time()
        processed = 0
        synced_found = 0

        try:
            tracks_to_process = list(discovery_service.tracks.values())[:batch_size]

            for track in tracks_to_process:
                cache_key = f"{track.title.lower().strip()}_{track.artist.lower().strip()}_{track.duration or 0}"
                # If not cached or cached as empty
                cached_res = lyrics_cache.get(cache_key)
                if not cached_res or cached_res.source == "none":
                    res = await self.heal_single_track(track)
                    processed += 1
                    if res and res.is_synced:
                        synced_found += 1
                    # Polite rate-spacing between external API checks
                    await asyncio.sleep(0.5)

            self.last_run_timestamp = datetime.now(timezone.utc).isoformat()
            self.last_status = "idle"

            return {
                "status": "success",
                "agent": self.name,
                "processed_count": processed,
                "synced_lyrics_found": synced_found,
                "total_healed_all_time": self.healed_tracks_count,
                "duration_seconds": round(time.time() - start_time, 2),
                "timestamp": self.last_run_timestamp
            }

        except Exception as e:
            self.last_status = f"error: {str(e)}"
            logger.error(f"[Lyrics Weaver Agent] Healing batch error: {e}")
            return {"status": "error", "error": str(e)}
        finally:
            self.is_running = False

    def get_telemetry(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.last_status,
            "is_active": self.is_running,
            "total_healed_count": self.healed_tracks_count,
            "instrumentals_tagged": self.instrumental_identified_count,
            "last_healed_song": self.last_healed_title,
            "last_run": self.last_run_timestamp
        }

lyrics_weaver_agent = LyricsWeaverAgent()
