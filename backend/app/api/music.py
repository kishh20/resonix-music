import asyncio
import httpx
import logging
from fastapi import APIRouter, Query, HTTPException, Request
from fastapi.responses import StreamingResponse, RedirectResponse
from typing import Optional, List, Dict, Any
from app.models.music import Track, SearchResponse
from app.services.unified_music_service import unified_music_service
from app.services.audius_service import audius_service
from app.services.yt_service import yt_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/music", tags=["Music"])

# High-capacity connection pool for audio proxying to prevent socket exhaustion under high traffic
_stream_client: Optional[httpx.AsyncClient] = None

def get_stream_client() -> httpx.AsyncClient:
    global _stream_client
    if _stream_client is None or _stream_client.is_closed:
        _stream_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=6.0, read=30.0, write=15.0, pool=30.0),
            limits=httpx.Limits(max_keepalive_connections=150, max_connections=500, keepalive_expiry=30.0),
            follow_redirects=True
        )
    return _stream_client

async def close_stream_client():
    global _stream_client
    if _stream_client and not _stream_client.is_closed:
        await _stream_client.aclose()
        _stream_client = None

@router.get("/trending", response_model=List[Track])
async def get_trending(
    genre: Optional[str] = Query(None, description="Genre filter (e.g. electronic, lofi, rock)"),
    limit: int = Query(40, ge=1, le=100)
):
    return await unified_music_service.get_trending(genre=genre, limit=limit)

@router.get("/search", response_model=SearchResponse)
async def search_music(
    q: str = Query(..., min_length=1, description="Search query"),
    provider: Optional[str] = Query(None, description="Provider filter: youtube, audius, jamendo, archive, or all"),
    limit: int = Query(30, ge=1, le=50)
):
    return await unified_music_service.search(query=q, provider=provider, limit=limit)

@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=1, description="Autocomplete query")
):
    """
    Returns instant search suggestions and matching tracks while typing.
    """
    return await unified_music_service.get_suggestions(query=q)

@router.get("/genres")
async def get_genres():
    return unified_music_service.get_genres()

@router.get("/track/{track_id:path}", response_model=Optional[Track])
async def get_track(track_id: str):
    if track_id.startswith("audius:"):
        return await audius_service.get_track(track_id)
    if track_id.startswith("yt_"):
        raw_id = track_id.replace("yt_", "")
        tracks = await yt_service.search_tracks(raw_id, limit=1)
        if tracks:
            return tracks[0]
    # Search fallback
    res = await unified_music_service.search(query=track_id, limit=1)
    if res.tracks:
        return res.tracks[0]
    raise HTTPException(status_code=404, detail="Track not found")

@router.get("/stream")
async def stream_audio(
    request: Request,
    id: Optional[str] = Query(None, description="YouTube Video ID or audio track ID"),
    q: Optional[str] = Query(None, description="Search query or title artist"),
    title: Optional[str] = Query(None, description="Song title for candidate verification"),
    artist: Optional[str] = Query(None, description="Primary artist for candidate verification"),
    duration: Optional[int] = Query(None, description="Target duration in seconds for candidate verification"),
    sp_id: Optional[str] = Query(None, description="Spotify Track ID for reference"),
    swap: Optional[int] = Query(0, description="Alternative version offset (0 for best, 1 for 2nd best, etc.)")
):
    """
    Dynamically resolves studio master audio stream on demand and pipes audio with HTTP 206 Partial Content.
    Guarantees pure studio audio (filtered of video dialogues, ads, and BGM clips).
    """
    target = id or q
    if not target:
        raise HTTPException(status_code=400, detail="Missing stream identifier 'id' or search query 'q'")

    resolved = await yt_service.resolve_stream_url(
        target,
        target_title=title,
        target_artist=artist,
        target_duration=duration,
        swap_offset=swap or 0
    )
    if not resolved or not resolved.get("stream_url"):
        raise HTTPException(status_code=404, detail="Could not resolve playable audio stream for track")

    stream_url = resolved["stream_url"]

    # Stream through proxy with client Range headers
    return await _pipe_audio_stream(stream_url, request)

@router.get("/stream-proxy")
async def stream_proxy(url: str, request: Request):
    """
    Proxies streaming audio with HTTP 206 Partial Content / Range header support.
    Prevents CORS and mixed-content issues across local network / mobile browsers.
    """
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid audio stream URL")

    return await _pipe_audio_stream(url, request)

async def _pipe_audio_stream(url: str, request: Request):
    # Forward client Range header if present
    req_headers = {"User-Agent": "Mozilla/5.0"}
    if "range" in request.headers:
        req_headers["range"] = request.headers["range"]

    client = get_stream_client()
    try:
        req = client.build_request("GET", url, headers=req_headers)
        resp = await client.send(req, stream=True)

        async def stream_generator():
            try:
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk
            except (asyncio.CancelledError, GeneratorExit, httpx.HTTPError):
                pass
            finally:
                try:
                    await resp.aclose()
                except Exception:
                    pass

        response_headers = {
            "Content-Type": resp.headers.get("content-type", "audio/mpeg"),
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Range, Content-Range",
            "Cache-Control": "public, max-age=3600"
        }
        if "content-range" in resp.headers:
            response_headers["Content-Range"] = resp.headers["content-range"]
        if "content-length" in resp.headers:
            response_headers["Content-Length"] = resp.headers["content-length"]

        status_code = resp.status_code if resp.status_code in [200, 206] else 200

        return StreamingResponse(
            stream_generator(),
            status_code=status_code,
            headers=response_headers,
            media_type=response_headers["Content-Type"]
        )
    except Exception as e:
        logger.error(f"Streaming error for {url}: {e}")
        raise HTTPException(status_code=502, detail=f"Streaming proxy error: {str(e)}")
