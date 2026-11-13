from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.discord_service import discord_service

router = APIRouter(prefix="/api/discord", tags=["discord"])

class PresencePayload(BaseModel):
    title: str
    artist: str
    album: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: Optional[int] = 0
    position: Optional[float] = 0.0
    is_playing: bool = True

class TogglePayload(BaseModel):
    enabled: bool

@router.get("/status")
def get_discord_status():
    """
    Checks if Discord IPC connection is active.
    """
    if not discord_service.is_connected:
        discord_service.connect()
    return {
        "connected": discord_service.is_connected,
        "enabled": discord_service.enabled
    }

@router.post("/presence")
def update_presence(payload: PresencePayload):
    """
    Updates the local Discord client status with currently playing song.
    """
    success = discord_service.update_presence(
        title=payload.title,
        artist=payload.artist,
        album=payload.album,
        artwork_url=payload.artwork_url,
        duration=payload.duration,
        position=payload.position,
        is_playing=payload.is_playing
    )
    return {"success": success, "connected": discord_service.is_connected}

@router.post("/clear")
def clear_presence():
    """
    Clears the Discord presence.
    """
    success = discord_service.clear()
    return {"success": success}

@router.post("/toggle")
def toggle_presence(payload: TogglePayload):
    """
    Enables or disables Discord Rich Presence.
    """
    discord_service.enabled = payload.enabled
    if not payload.enabled:
        discord_service.clear()
    return {"enabled": discord_service.enabled}
