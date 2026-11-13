import os
import time
import logging
from typing import Optional, Dict, Any
from pypresence import Presence

logger = logging.getLogger(__name__)

# Default registered open Discord Rich Presence App ID for Aurora Music
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "1314992523282219080")

class DiscordRPCService:
    def __init__(self):
        self.client_id = DISCORD_CLIENT_ID
        self.rpc: Optional[Presence] = None
        self.is_connected: bool = False
        self.enabled: bool = True
        self.last_connect_attempt: float = 0

    def connect(self) -> bool:
        """
        Attempts to connect to Discord local IPC pipe without throwing errors if Discord is closed.
        """
        if not self.enabled:
            return False

        now = time.time()
        # Rate limit connection attempts to once every 10 seconds
        if now - self.last_connect_attempt < 10:
            return self.is_connected

        self.last_connect_attempt = now

        try:
            if not self.rpc:
                self.rpc = Presence(self.client_id)
            self.rpc.connect()
            self.is_connected = True
            logger.info("Connected to Discord Rich Presence (RPC) successfully.")
            return True
        except Exception as e:
            self.is_connected = False
            self.rpc = None
            logger.debug(f"Discord not running or IPC pipe unavailable: {e}")
            return False

    def update_presence(
        self,
        title: str,
        artist: str,
        album: Optional[str] = None,
        artwork_url: Optional[str] = None,
        duration: Optional[int] = None,
        position: Optional[float] = None,
        is_playing: bool = True
    ) -> bool:
        """
        Updates Discord Rich Presence with current song title, artist, artwork, and duration timestamps.
        """
        if not self.enabled:
            return False

        if not self.is_connected:
            if not self.connect():
                return False

        try:
            now = int(time.time())
            start_time = None
            end_time = None

            if is_playing and duration and duration > 0:
                pos = position or 0
                start_time = max(0, int(now - pos))
                end_time = int(start_time + duration)

            # Ensure image url is valid for Discord
            large_img = artwork_url if artwork_url and artwork_url.startswith("http") else "resonix_logo"

            self.rpc.update(
                details=f"{title[:120]}",
                state=f"by {artist[:120]}",
                large_image=large_img,
                large_text=f"{album or 'Resonix Music'}"[:120],
                small_image="play" if is_playing else "pause",
                small_text="Playing on Resonix" if is_playing else "Paused",
                start=start_time,
                end=end_time
            )
            return True
        except Exception as e:
            logger.debug(f"Failed to update Discord presence: {e}")
            self.is_connected = False
            self.rpc = None
            return False

    def clear(self) -> bool:
        """
        Clears Discord status when playback stops.
        """
        if self.is_connected and self.rpc:
            try:
                self.rpc.clear()
                return True
            except Exception:
                self.is_connected = False
                self.rpc = None
        return False

discord_service = DiscordRPCService()
