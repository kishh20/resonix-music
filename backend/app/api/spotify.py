from fastapi import APIRouter, HTTPException, Query
from app.models.music import SpotifyImportRequest, SpotifyImportResponse, Track
from app.services.spotify_service import spotify_service
from app.services.unified_music_service import unified_music_service
from typing import List

router = APIRouter(prefix="/api/spotify", tags=["Spotify"])

@router.post("/import-playlist", response_model=SpotifyImportResponse)
async def import_spotify_playlist(req: SpotifyImportRequest):
    try:
        return await spotify_service.import_playlist(req.url_or_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import playlist: {str(e)}")

@router.get("/search-alternatives", response_model=List[Track])
async def search_alternatives(
    q: str = Query(..., min_length=1, description="Track title and artist to find replacement for"),
    limit: int = Query(10, ge=1, le=20)
):
    """
    Allows user to manually search and replace an unmatched track from an imported Spotify playlist.
    """
    res = await unified_music_service.search(query=q, limit=limit)
    return res.tracks
