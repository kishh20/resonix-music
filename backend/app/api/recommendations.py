from fastapi import APIRouter, Query
from typing import Optional, List
from app.models.music import RecommendationRequest, RecommendationResponse, Track
from app.services.recommendation_service import recommendation_service
from app.services.unified_music_service import unified_music_service

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

@router.post("/for-you", response_model=RecommendationResponse)
async def get_for_you(req: RecommendationRequest):
    return await recommendation_service.get_personalized_recommendations(req)

@router.get("/radio", response_model=List[Track])
async def get_track_radio(
    genre: Optional[str] = Query(None, description="Seed genre"),
    artist: Optional[str] = Query(None, description="Seed artist"),
    limit: int = Query(25, ge=5, le=50)
):
    query = f"{artist or ''} {genre or ''}".strip() or "electronic"
    search_res = await unified_music_service.search(query=query, limit=limit)
    if not search_res.tracks:
        return await unified_music_service.get_trending(genre=genre, limit=limit)
    return search_res.tracks
