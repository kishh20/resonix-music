import os
import json
import logging
from typing import List, Dict, Optional, Any
from app.models.music import Playlist, Track

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
LIBRARY_FILE = os.path.join(DATA_DIR, "user_library.json")

class LibraryService:
    def __init__(self):
        self.playlists: Dict[str, Playlist] = {}
        self.liked_songs: List[Track] = []
        self._ensure_storage()
        self._load_library()

    def _ensure_storage(self):
        os.makedirs(DATA_DIR, exist_ok=True)

    def _load_library(self):
        if os.path.exists(LIBRARY_FILE):
            try:
                with open(LIBRARY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    raw_pls = data.get("playlists", {})
                    for pid, pdict in raw_pls.items():
                        try:
                            self.playlists[pid] = Playlist(**pdict)
                        except Exception as pe:
                            logger.warning(f"Error parsing playlist {pid}: {pe}")

                    raw_liked = data.get("liked_songs", [])
                    for tdict in raw_liked:
                        try:
                            self.liked_songs.append(Track(**tdict))
                        except Exception as te:
                            logger.warning(f"Error parsing liked track: {te}")

                    logger.info(f"Loaded {len(self.playlists)} playlists and {len(self.liked_songs)} liked songs from permanent disk storage.")
            except Exception as e:
                logger.error(f"Error loading user library: {e}")

    def _save_library(self):
        try:
            payload = {
                "playlists": {pid: p.model_dump() for pid, p in self.playlists.items()},
                "liked_songs": [t.model_dump() for t in self.liked_songs]
            }
            with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save user library: {e}")

    def get_playlists(self) -> List[Playlist]:
        return list(self.playlists.values())

    def save_playlist(self, playlist: Playlist) -> Playlist:
        playlist.track_count = len(playlist.tracks)
        self.playlists[playlist.id] = playlist
        self._save_library()
        logger.info(f"Saved playlist '{playlist.title}' ({playlist.id}) with {playlist.track_count} tracks to permanent disk storage.")
        return playlist

    def delete_playlist(self, playlist_id: str) -> bool:
        if playlist_id in self.playlists:
            del self.playlists[playlist_id]
            self._save_library()
            logger.info(f"Deleted playlist {playlist_id} from permanent disk storage.")
            return True
        return False

    def get_liked_songs(self) -> List[Track]:
        return self.liked_songs

    def toggle_liked_song(self, track: Track, is_liked: bool) -> List[Track]:
        if is_liked:
            if not any(t.id == track.id for t in self.liked_songs):
                self.liked_songs.insert(0, track)
        else:
            self.liked_songs = [t for t in self.liked_songs if t.id != track.id]
        self._save_library()
        return self.liked_songs

library_service = LibraryService()
