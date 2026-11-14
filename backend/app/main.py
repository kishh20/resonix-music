import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.middleware import RateLimiterMiddleware
from app.api import (
    music_router, spotify_router, recommendations_router, 
    health_router, discovery_router, lyrics_router, 
    discord_router, jam_router, library_router
)
from app.services.scheduler_service import catalogue_scheduler

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start automatic catalogue discovery scheduler
    catalogue_scheduler.start()
    yield
    # Shutdown: Stop scheduler and close connection pools
    catalogue_scheduler.stop()
    try:
        from app.api.music import close_stream_client
        await close_stream_client()
    except Exception as e:
        logger.debug(f"Error closing stream client: {e}")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="High-performance, authorized music streaming backend with multi-provider aggregation, Spotify playlist import, and automatic catalogue discovery.",
    lifespan=lifespan
)

# 1. GZip Compression Middleware (compresses responses > 1KB, saves up to 85% bandwidth under high traffic)
app.add_middleware(GZipMiddleware, minimum_size=1024)

# 2. Rate Limiting DoS Shield (protects backend and upstream providers from traffic floods)
app.add_middleware(
    RateLimiterMiddleware,
    requests_per_minute=240,
    burst_allowance=60
)

# 3. Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Crash-Proof Exception Boundary
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred. The server recovered safely without crashing.",
            "path": request.url.path
        }
    )

# Register routers
app.include_router(music_router)
app.include_router(spotify_router)
app.include_router(recommendations_router)
app.include_router(health_router)
app.include_router(discovery_router)
app.include_router(lyrics_router)
app.include_router(discord_router)
app.include_router(jam_router)
app.include_router(library_router)

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs"
    }
