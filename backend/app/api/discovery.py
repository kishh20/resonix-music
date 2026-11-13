from fastapi import APIRouter, Query, HTTPException, Body
from typing import Optional, List
from app.models.music import (
    NewReleasesResponse, SyncStatusResponse, FollowedArtist, 
    FollowArtistRequest, CatalogueAlbum, DiscoverySyncRequest
)
from app.services.discovery_service import discovery_service

router = APIRouter(prefix="/api/discovery", tags=["Discovery & Releases"])

@router.get("/new-releases", response_model=NewReleasesResponse)
async def get_new_releases(
    user_id: Optional[str] = Query(None, description="Optional user ID for followed artist prioritization"),
    favorite_artists: Optional[List[str]] = Query(None, description="User's favorite artists for priority drops")
):
    # If catalogue has few items, run a quick discovery
    if len(discovery_service.tracks) < 5:
        await discovery_service.run_full_discovery_sync()
    return discovery_service.get_new_releases(user_id=user_id, favorite_artists=favorite_artists)

@router.post("/sync-now")
async def sync_now(req: Optional[DiscoverySyncRequest] = Body(None)):
    """
    Manually trigger an immediate full catalogue synchronization across YouTube Music, Audius, Jamendo & Archive.
    Accepts user preferences (favorite artists, languages, region) for personalized local discovery without privacy leakage.
    """
    res = await discovery_service.run_full_discovery_sync(req=req)
    return res

@router.get("/status", response_model=SyncStatusResponse)
async def get_sync_status():
    return discovery_service.get_sync_status()

@router.get("/followed-artists", response_model=List[FollowedArtist])
async def get_followed_artists(user_id: Optional[str] = Query(None)):
    return discovery_service.get_followed_artists(user_id=user_id)

@router.post("/follow-artist", response_model=FollowedArtist)
async def follow_artist(req: FollowArtistRequest):
    return discovery_service.follow_artist(
        artist_name=req.artist_name,
        artist_id=req.artist_id,
        image_url=req.image_url,
        provider=req.provider,
        user_id=req.user_id
    )

@router.post("/unfollow-artist")
async def unfollow_artist(req: FollowArtistRequest):
    success = discovery_service.unfollow_artist(
        artist_name=req.artist_name,
        user_id=req.user_id
    )
    return {"success": success, "artist_name": req.artist_name}

@router.get("/album/{album_id:path}", response_model=CatalogueAlbum)
async def get_album(album_id: str):
    album = discovery_service.albums.get(album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found in catalogue")
    return album
