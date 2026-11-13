from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import music_router, spotify_router, recommendations_router, health_router, discovery_router, lyrics_router, discord_router, jam_router
from app.services.scheduler_service import catalogue_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start automatic catalogue discovery scheduler
    catalogue_scheduler.start()
    yield
    # Shutdown: Stop scheduler
    catalogue_scheduler.stop()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="High-performance, authorized music streaming backend with multi-provider aggregation, Spotify playlist import, and automatic catalogue discovery.",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs"
    }
