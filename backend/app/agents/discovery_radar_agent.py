import time
import logging
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.models.music import Track
from app.services.discovery_service import discovery_service
from app.services.unified_music_service import unified_music_service

logger = logging.getLogger(__name__)

class DiscoveryRadarAgent:
    """
    Autonomous Music Discovery & Chart Radar Agent.
    Monitors global trending charts, user favorite artists, and emerging music nodes.
    Applies strict originality filters to ensure only pure OG creator masters enter the catalogue.
    """
    def __init__(self):
        self.name = "Chart Radar Agent"
        self.is_running = False
        self.last_run_timestamp: Optional[str] = None
        self.total_discovered_tracks: int = len(discovery_service.tracks)
        self.last_run_duration: float = 0.0
        self.last_status: str = "idle"
        self.active_targets: List[str] = [
            "Global Trending", "India Hot 50", "Viral Drops", "Electronic Top", "Tamil Chartbusters"
        ]

    def _is_valid_original_track(self, track: Track) -> bool:
        """
        Originality Filter: Ensures zero fan-made re-uploads, unofficial bootlegs,
        or amateur covers enter the official Resonix catalogue.
        """
        title_l = track.title.lower()
        artist_l = track.artist.lower()

        disqualified_terms = [
            "fan made", "fanmade", "mashup edit", "slowed + reverb",
            "slowed and reverb", "bass boosted edit", "whatsapp status",
            "ringtone", "short video", "cover by", "dance cover",
            "tribute cover", "karaoke version", "instrumental remake"
        ]

        if any(term in title_l for term in disqualified_terms):
            return False

        if "cover" in artist_l or "tribute" in artist_l:
            return False

        # Must have valid duration (> 45s and < 900s)
        if track.duration and (track.duration < 45 or track.duration > 900):
            return False

        return True

    async def scan_and_harvest(
        self,
        target_artists: Optional[List[str]] = None,
        target_genres: Optional[List[str]] = None,
        limit_per_target: int = 15
    ) -> Dict[str, Any]:
        """
        Executes a full discovery radar sweep across multiple chart vectors.
        """
        if self.is_running:
            return {
                "status": "already_running",
                "message": "Discovery radar agent is already actively harvesting.",
                "total_catalogue_tracks": len(discovery_service.tracks)
            }

        self.is_running = True
        self.last_status = "crawling"
        start_time = time.time()
        newly_harvested = 0

        try:
            # 1. Harvest base trending from authorized nodes (Audius & Jamendo)
            logger.info("[Chart Radar Agent] Crawling trending feeds from decentralized nodes...")
            try:
                base_sync_res = await discovery_service.run_full_discovery_sync()
                newly_harvested += base_sync_res.get("items_count", 0)
            except Exception as e:
                logger.warning(f"[Chart Radar Agent] Base sync error: {e}")

            # 2. Target specific favorite artists for new singles/releases
            artists_to_scan = target_artists or ["Anirudh Ravichander", "Arijit Singh", "The Weeknd", "Taylor Swift", "Dhanush"]
            for artist in artists_to_scan:
                try:
                    res = await unified_music_service.search(query=f"{artist} official songs", limit=limit_per_target)
                    for t in (res.tracks or []):
                        if self._is_valid_original_track(t):
                            if t.id not in discovery_service.tracks:
                                discovery_service.add_track(t)
                                newly_harvested += 1
                except Exception as e:
                    logger.debug(f"[Chart Radar Agent] Error harvesting artist {artist}: {e}")

            # 3. Target regional viral charts (e.g. India Top, Tamil Hits, Bollywood)
            chart_queries = ["top trending songs India", "latest tamil chartbusters", "billboard hot hits"]
            for q in chart_queries:
                try:
                    res = await unified_music_service.search(query=q, limit=limit_per_target)
                    for t in (res.tracks or []):
                        if self._is_valid_original_track(t):
                            if t.id not in discovery_service.tracks:
                                discovery_service.add_track(t)
                                newly_harvested += 1
                except Exception as e:
                    logger.debug(f"[Chart Radar Agent] Error harvesting chart {q}: {e}")

            self.total_discovered_tracks = len(discovery_service.tracks)
            self.last_run_duration = round(time.time() - start_time, 2)
            self.last_run_timestamp = datetime.now(timezone.utc).isoformat()
            self.last_status = "success"

            return {
                "status": "success",
                "agent": self.name,
                "new_tracks_harvested": newly_harvested,
                "total_catalogue_size": self.total_discovered_tracks,
                "duration_seconds": self.last_run_duration,
                "completed_at": self.last_run_timestamp
            }

        except Exception as e:
            self.last_status = f"error: {str(e)}"
            logger.error(f"[Chart Radar Agent] Harvesting failure: {e}")
            return {
                "status": "error",
                "error": str(e),
                "duration_seconds": round(time.time() - start_time, 2)
            }
        finally:
            self.is_running = False

    def get_telemetry(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.last_status,
            "is_active": self.is_running,
            "total_catalogue_size": len(discovery_service.tracks),
            "last_run": self.last_run_timestamp,
            "last_duration_seconds": self.last_run_duration,
            "monitored_vectors": self.active_targets
        }

discovery_radar_agent = DiscoveryRadarAgent()
