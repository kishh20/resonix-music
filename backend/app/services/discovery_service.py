import os
import json
import time
import httpx
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from app.models.music import (
    Track, CatalogueAlbum, FollowedArtist, SyncLog, 
    SyncStatusResponse, NewReleasesResponse
)
from app.services.audius_service import audius_service
from app.services.archive_service import archive_service
from app.services.jamendo_service import jamendo_service
from app.services.spotify_service import spotify_service
from app.config import settings

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
CATALOGUE_FILE = os.path.join(DATA_DIR, "catalogue.json")

class DiscoveryService:
    def __init__(self):
        self.tracks: Dict[str, Track] = {}
        self.albums: Dict[str, CatalogueAlbum] = {}
        self.followed_artists: Dict[str, List[FollowedArtist]] = {} # user_id -> list
        self.sync_logs: List[SyncLog] = []
        self.is_syncing: bool = False
        self.last_synced_at: Optional[str] = None
        self._ensure_storage()
        self._load_catalogue()

    def _ensure_storage(self):
        os.makedirs(DATA_DIR, exist_ok=True)

    def _load_catalogue(self):
        if os.path.exists(CATALOGUE_FILE):
            try:
                with open(CATALOGUE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.last_synced_at = data.get("last_synced_at")
                    
                    raw_tracks = data.get("tracks", {})
                    for tid, tdict in raw_tracks.items():
                        self.tracks[tid] = Track(**tdict)
                        
                    raw_albums = data.get("albums", {})
                    for aid, adict in raw_albums.items():
                        self.albums[aid] = CatalogueAlbum(**adict)

                    raw_followed = data.get("followed_artists", {})
                    for uid, flist in raw_followed.items():
                        self.followed_artists[uid] = [FollowedArtist(**item) for item in flist]

                    raw_logs = data.get("sync_logs", [])
                    self.sync_logs = [SyncLog(**item) for item in raw_logs][-20:]
                    logger.info(f"Loaded {len(self.tracks)} tracks and {len(self.albums)} albums from catalogue storage.")
            except Exception as e:
                logger.error(f"Error loading catalogue: {e}")

    def _save_catalogue(self):
        try:
            payload = {
                "last_synced_at": self.last_synced_at,
                "tracks": {tid: t.model_dump() for tid, t in self.tracks.items()},
                "albums": {aid: a.model_dump() for aid, a in self.albums.items()},
                "followed_artists": {uid: [f.model_dump() for f in flist] for uid, flist in self.followed_artists.items()},
                "sync_logs": [log.model_dump() for log in self.sync_logs[-20:]]
            }
            with open(CATALOGUE_FILE, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save catalogue to storage: {e}")

    async def discover_audius_releases(self, limit: int = 40) -> int:
        discovered_count = 0
        try:
            tracks = await audius_service.get_trending(limit=limit)
            now_iso = datetime.now(timezone.utc).isoformat()

            for t in tracks:
                if t.id not in self.tracks:
                    t.release_date = t.release_date or now_iso
                    t.availability_status = "available"
                    self.tracks[t.id] = t
                    discovered_count += 1

                # Group by album if present
                if t.album and t.album.lower() not in ["single", "unknown album", ""]:
                    album_id = f"audius_album:{t.artist}_{t.album}".replace(" ", "_").lower()
                    if album_id not in self.albums:
                        self.albums[album_id] = CatalogueAlbum(
                            id=album_id,
                            title=t.album,
                            artist=t.artist,
                            artist_id=t.artist_id,
                            cover_url=t.artwork_url,
                            release_date=t.release_date or now_iso,
                            release_type="album",
                            provider="audius",
                            provider_id=album_id,
                            track_count=1,
                            tracks=[t],
                            last_synced_at=now_iso
                        )
                    else:
                        existing = self.albums[album_id]
                        if not any(x.id == t.id for x in existing.tracks):
                            existing.tracks.append(t)
                            existing.track_count = len(existing.tracks)
        except Exception as e:
            logger.warning(f"Audius discovery error: {e}")
        return discovered_count

    async def discover_archive_releases(self, limit: int = 30) -> int:
        discovered_count = 0
        try:
            url = f"{archive_service.BASE_URL}/advancedsearch.php"
            query = "collection:(freemusicarchive OR netlabels) AND mediatype:(audio)"
            params = {
                "q": query,
                "fl[]": ["identifier", "title", "creator", "description", "publicdate", "addeddate", "year", "genre"],
                "sort[]": "publicdate desc",
                "rows": limit,
                "page": 1,
                "output": "json"
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    docs = resp.json().get("response", {}).get("docs", [])
                    now_iso = datetime.now(timezone.utc).isoformat()
                    for doc in docs:
                        ident = doc.get("identifier")
                        if not ident:
                            continue
                        tid = f"archive:{ident}"
                        if tid not in self.tracks:
                            title = doc.get("title") or "Archive Audio Release"
                            creator = doc.get("creator") or "Community Artist"
                            genre = doc.get("genre") or "Acoustic / Indie"
                            if isinstance(genre, list):
                                genre = genre[0] if genre else "Indie"
                            rel_date = doc.get("publicdate") or doc.get("addeddate") or now_iso

                            new_track = Track(
                                id=tid,
                                title=title,
                                artist=creator,
                                album=title,
                                artwork_url=f"{archive_service.BASE_URL}/services/img/{ident}",
                                duration=200,
                                stream_url=f"{archive_service.BASE_URL}/download/{ident}",
                                provider="archive",
                                genre=str(genre),
                                bitrate="High VBR MP3",
                                release_date=rel_date,
                                availability_status="available"
                            )
                            self.tracks[tid] = new_track
                            discovered_count += 1

                            # Register as album release
                            album_id = f"archive_album:{ident}"
                            if album_id not in self.albums:
                                self.albums[album_id] = CatalogueAlbum(
                                    id=album_id,
                                    title=title,
                                    artist=creator,
                                    cover_url=new_track.artwork_url,
                                    release_date=rel_date,
                                    release_type="ep",
                                    provider="archive",
                                    provider_id=ident,
                                    track_count=1,
                                    tracks=[new_track],
                                    last_synced_at=now_iso
                                )
        except Exception as e:
            logger.warning(f"Archive discovery error: {e}")
        return discovered_count

    async def discover_jamendo_releases(self, limit: int = 25) -> int:
        discovered_count = 0
        try:
            tracks = await jamendo_service.get_popular(limit=limit)
            now_iso = datetime.now(timezone.utc).isoformat()
            for t in tracks:
                if t.id not in self.tracks:
                    t.release_date = t.release_date or now_iso
                    t.availability_status = "available"
                    self.tracks[t.id] = t
                    discovered_count += 1
        except Exception as e:
            logger.warning(f"Jamendo discovery error: {e}")
        return discovered_count

    async def discover_spotify_new_releases(self) -> int:
        """
        Discovers trending releases from Spotify Web API if credentials are provided.
        Searches matching streams on authorized platforms. If unmatched, catalogs with status 'unavailable'.
        """
        token = await spotify_service._get_spotify_token()
        if not token:
            return 0

        discovered_count = 0
        try:
            headers = {"Authorization": f"Bearer {token}"}
            url = "https://api.spotify.com/v1/browse/new-releases?limit=15"
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    items = resp.json().get("albums", {}).get("items", [])
                    now_iso = datetime.now(timezone.utc).isoformat()

                    for album in items:
                        aid = f"spotify_album:{album.get('id')}"
                        title = album.get("name", "New Release")
                        artists = ", ".join([a.get("name", "") for a in album.get("artists", [])])
                        cover = album.get("images", [{}])[0].get("url")
                        rel_date = album.get("release_date") or now_iso
                        rel_type = album.get("album_type", "album")

                        if aid not in self.albums:
                            # Search for corresponding authorized stream on Audius
                            match_res = await audius_service.search_tracks(f"{title} {artists}".strip(), limit=2)
                            matched_track = match_res[0] if match_res else None

                            album_tracks = []
                            status = "available" if matched_track else "unavailable"

                            if matched_track:
                                self.tracks[matched_track.id] = matched_track
                                album_tracks.append(matched_track)

                            self.albums[aid] = CatalogueAlbum(
                                id=aid,
                                title=title,
                                artist=artists,
                                cover_url=cover,
                                release_date=rel_date,
                                release_type=rel_type,
                                provider="spotify_discovery",
                                provider_id=album.get("id"),
                                track_count=album.get("total_tracks", 1),
                                tracks=album_tracks,
                                last_synced_at=now_iso
                            )
                            discovered_count += 1
        except Exception as e:
            logger.warning(f"Spotify new releases discovery error: {e}")
        return discovered_count

    async def verify_streaming_links(self, sample_size: int = 15) -> int:
        """
        Lightweight verification of existing streaming URLs using HTTP HEAD or Range 0-1024 requests.
        """
        verified_count = 0
        now_iso = datetime.now(timezone.utc).isoformat()
        sample_tracks = list(self.tracks.values())[:sample_size]

        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            for track in sample_tracks:
                try:
                    resp = await client.get(track.stream_url, headers={"User-Agent": "Mozilla/5.0", "Range": "bytes=0-1024"})
                    if resp.status_code in [200, 206, 302]:
                        track.availability_status = "available"
                    else:
                        track.availability_status = "unavailable"
                    verified_count += 1
                except Exception:
                    track.availability_status = "unavailable"
        
        self.last_synced_at = now_iso
        self._save_catalogue()
        return verified_count

    async def run_full_discovery_sync(self) -> Dict[str, Any]:
        if self.is_syncing:
            return {"status": "in_progress", "message": "Synchronization is already underway"}

        self.is_syncing = True
        start_time = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()

        try:
            logger.info("Starting automatic music discovery cycle...")
            
            # Run discovery across providers concurrently
            results = await asyncio.gather(
                self.discover_audius_releases(limit=40),
                self.discover_archive_releases(limit=30),
                self.discover_jamendo_releases(limit=20),
                self.discover_spotify_new_releases(),
                return_exceptions=True
            )

            audius_new = results[0] if isinstance(results[0], int) else 0
            archive_new = results[1] if isinstance(results[1], int) else 0
            jamendo_new = results[2] if isinstance(results[2], int) else 0
            spotify_new = results[3] if isinstance(results[3], int) else 0

            total_new = audius_new + archive_new + jamendo_new + spotify_new
            duration = round(time.time() - start_time, 2)
            self.last_synced_at = now_iso

            # Log sync result
            log_entry = SyncLog(
                id=f"log_{int(time.time())}",
                provider="all_providers",
                action="discovery",
                items_count=total_new,
                status="success",
                duration_seconds=duration,
                created_at=now_iso
            )
            self.sync_logs.append(log_entry)
            self._save_catalogue()

            logger.info(f"Music discovery complete in {duration}s! New items discovered: {total_new}")
            return {
                "status": "success",
                "new_tracks_discovered": total_new,
                "audius_new": audius_new,
                "archive_new": archive_new,
                "jamendo_new": jamendo_new,
                "spotify_new": spotify_new,
                "total_catalogue_tracks": len(self.tracks),
                "total_catalogue_albums": len(self.albums),
                "duration_seconds": duration,
                "synced_at": now_iso
            }
        except Exception as e:
            logger.error(f"Discovery synchronization failure: {e}")
            duration = round(time.time() - start_time, 2)
            log_entry = SyncLog(
                id=f"log_{int(time.time())}",
                provider="all_providers",
                action="discovery",
                items_count=0,
                status="failed",
                duration_seconds=duration,
                error_message=str(e),
                created_at=now_iso
            )
            self.sync_logs.append(log_entry)
            return {"status": "failed", "error": str(e)}
        finally:
            self.is_syncing = False

    def get_new_releases(self, user_id: Optional[str] = None) -> NewReleasesResponse:
        # Sort all catalogue tracks by release_date descending
        all_tracks = list(self.tracks.values())
        all_tracks.sort(key=lambda t: t.release_date or "", reverse=True)

        all_albums = list(self.albums.values())
        all_albums.sort(key=lambda a: a.release_date or "", reverse=True)

        # Get followed artists for user
        followed = self.followed_artists.get(user_id or "default", [])
        followed_names = {f.artist_name.lower().strip() for f in followed}

        from_followed: List[Track] = []
        recent_singles: List[Track] = []

        for t in all_tracks:
            if t.artist.lower().strip() in followed_names:
                from_followed.append(t)
            else:
                recent_singles.append(t)

        now_iso = self.last_synced_at or datetime.now(timezone.utc).isoformat()

        return NewReleasesResponse(
            from_followed_artists=from_followed[:24],
            recent_singles=recent_singles[:48],
            recent_albums=all_albums[:24],
            total_discovered=len(self.tracks),
            last_synced_at=now_iso
        )

    def follow_artist(self, artist_name: str, artist_id: Optional[str], image_url: Optional[str], provider: str = "audius", user_id: Optional[str] = None) -> FollowedArtist:
        uid = user_id or "default"
        if uid not in self.followed_artists:
            self.followed_artists[uid] = []

        existing = next((f for f in self.followed_artists[uid] if f.artist_name.lower() == artist_name.lower()), None)
        if existing:
            return existing

        now_iso = datetime.now(timezone.utc).isoformat()
        fa = FollowedArtist(
            id=f"fa_{int(time.time())}_{len(self.followed_artists[uid])}",
            user_id=uid,
            artist_name=artist_name,
            artist_id=artist_id,
            image_url=image_url or "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
            provider=provider,
            followed_at=now_iso
        )
        self.followed_artists[uid].append(fa)
        self._save_catalogue()
        return fa

    def unfollow_artist(self, artist_name: str, user_id: Optional[str] = None) -> bool:
        uid = user_id or "default"
        if uid in self.followed_artists:
            before_len = len(self.followed_artists[uid])
            self.followed_artists[uid] = [f for f in self.followed_artists[uid] if f.artist_name.lower() != artist_name.lower()]
            if len(self.followed_artists[uid]) != before_len:
                self._save_catalogue()
                return True
        return False

    def get_followed_artists(self, user_id: Optional[str] = None) -> List[FollowedArtist]:
        uid = user_id or "default"
        return self.followed_artists.get(uid, [])

    def is_artist_followed(self, artist_name: str, user_id: Optional[str] = None) -> bool:
        uid = user_id or "default"
        flist = self.followed_artists.get(uid, [])
        return any(f.artist_name.lower() == artist_name.lower().strip() for f in flist)

    def get_sync_status(self) -> SyncStatusResponse:
        return SyncStatusResponse(
            is_syncing=self.is_syncing,
            last_sync_at=self.last_synced_at,
            next_scheduled_sync="In 2 hours",
            total_tracks=len(self.tracks),
            total_albums=len(self.albums),
            total_artists=len({t.artist.lower().strip() for t in self.tracks.values()}),
            sync_frequency="Every 2 hours",
            recent_logs=self.sync_logs[-10:]
        )

discovery_service = DiscoveryService()
