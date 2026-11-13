import logging
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.models.music import LyricsResponse
from app.services.lyrics_service import lyrics_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lyrics", tags=["Lyrics"])

@router.get("", response_model=LyricsResponse)
async def get_lyrics(
    title: str = Query(..., description="Track title"),
    artist: str = Query(..., description="Track artist"),
    duration: Optional[int] = Query(None, description="Track duration in seconds"),
    track_id: Optional[str] = Query(None, description="Internal track ID")
):
    """
    Retrieves time-synchronized karaoke lyrics for the specified track.
    Falls back to plain text lyrics or empty gracefully if not found.
    """
    if not title.strip() or not artist.strip():
        raise HTTPException(status_code=400, detail="Title and artist must not be empty.")

    return await lyrics_service.get_lyrics(
        title=title,
        artist=artist,
        duration=duration,
        track_id=track_id
    )
