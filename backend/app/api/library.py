from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from pydantic import BaseModel
from app.models.music import Playlist, Track
from app.services.library_service import library_service

router = APIRouter(prefix="/api/library", tags=["Library & Playlists"])

class ToggleLikeRequest(BaseModel):
    track: Track
    is_liked: bool

@router.get("/playlists", response_model=List[Playlist])
async def get_playlists():
    """
    Retrieves all user playlists stored permanently on the local machine disk.
    """
    return library_service.get_playlists()

@router.post("/save-playlist", response_model=Playlist)
async def save_playlist(playlist: Playlist):
    """
    Saves or updates a user playlist permanently to disk storage.
    """
    return library_service.save_playlist(playlist)

@router.delete("/playlist/{playlist_id}")
async def delete_playlist(playlist_id: str):
    """
    Deletes a playlist from permanent disk storage.
    """
    success = library_service.delete_playlist(playlist_id)
    if not success:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"success": True, "playlist_id": playlist_id}

@router.get("/liked-songs", response_model=List[Track])
async def get_liked_songs():
    """
    Retrieves all liked songs stored permanently on local disk.
    """
    return library_service.get_liked_songs()

@router.post("/toggle-like", response_model=List[Track])
async def toggle_like(req: ToggleLikeRequest):
    """
    Toggles a song's liked status and persists to disk.
    """
    return library_service.toggle_liked_song(req.track, req.is_liked)
