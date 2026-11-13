from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Track(BaseModel):
    id: str
    title: str
    artist: str
    artist_id: Optional[str] = None
    album: Optional[str] = None
    album_id: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: int = 0  # in seconds
    stream_url: str
    provider: str  # 'audius', 'jamendo', 'archive'
    genre: Optional[str] = None
    bitrate: Optional[str] = "320kbps Ultra HD"
    release_date: Optional[str] = None
    play_count: Optional[int] = 0
    permalink: Optional[str] = None
    availability_status: Optional[str] = "available"  # 'available', 'unavailable', 'verifying'

class Artist(BaseModel):
    id: str
    name: str
    bio: Optional[str] = None
    image_url: Optional[str] = None
    provider: str
    track_count: Optional[int] = 0

class Album(BaseModel):
    id: str
    title: str
    artist: str
    cover_url: Optional[str] = None
    release_date: Optional[str] = None
    track_count: int = 0
    provider: str
    tracks: List[Track] = []

class Playlist(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_public: bool = False
    tracks: List[Track] = []
    track_count: int = 0
    created_at: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    total: int
    tracks: List[Track]
    providers: List[str]

class LyricLine(BaseModel):
    time: float  # time offset in seconds
    text: str

class LyricsResponse(BaseModel):
    track_id: Optional[str] = None
    title: str
    artist: str
    is_synced: bool = False
    lyrics: List[LyricLine] = []
    plain_lyrics: Optional[str] = None
    source: str = "lrclib"

class SpotifyTrack(BaseModel):
    spotify_id: Optional[str] = None
    title: str
    artist: str
    album: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: int = 0
    matched_track: Optional[Track] = None
    match_confidence: float = 0.0  # 0.0 to 1.0
    status: str = "pending"  # "matched", "unmatched"

class SpotifyImportRequest(BaseModel):
    url_or_id: str

class SpotifyImportResponse(BaseModel):
    playlist_id: str
    playlist_name: str
    playlist_description: Optional[str] = None
    cover_url: Optional[str] = None
    total_tracks: int
    matched_count: int
    unmatched_count: int
    tracks: List[SpotifyTrack]

class RecommendationRequest(BaseModel):
    recent_track_ids: List[str] = []
    liked_track_ids: List[str] = []
    preferred_genres: List[str] = []
    favorite_artists: List[str] = []
    preferred_languages: List[str] = []
    region: Optional[str] = None
    limit: int = 25

class RecommendationMix(BaseModel):
    id: str
    title: str
    description: str
    cover_url: str
    tracks: List[Track]

class RecommendationResponse(BaseModel):
    personalized_tracks: List[Track]
    mixes: List[RecommendationMix]

# ==========================================
# CATALOGUE & AUTOMATIC DISCOVERY MODELS
# ==========================================
class CatalogueTrack(BaseModel):
    id: str
    title: str
    artist: str
    artist_id: Optional[str] = None
    album: Optional[str] = None
    album_id: Optional[str] = None
    artwork_url: Optional[str] = None
    duration: int = 0
    stream_url: str
    provider: str
    provider_id: str
    release_date: str
    release_type: str = "single"  # 'single', 'ep', 'album'
    availability_status: str = "available"  # 'available', 'unavailable', 'verifying'
    genre: Optional[str] = None
    bitrate: Optional[str] = "320kbps MP3"
    play_count: int = 0
    last_synced_at: Optional[str] = None

class CatalogueAlbum(BaseModel):
    id: str
    title: str
    artist: str
    artist_id: Optional[str] = None
    cover_url: Optional[str] = None
    release_date: str
    release_type: str = "album"  # 'album', 'ep', 'single'
    provider: str
    provider_id: str
    track_count: int = 1
    tracks: List[Track] = []
    last_synced_at: Optional[str] = None

class FollowedArtist(BaseModel):
    id: str
    user_id: Optional[str] = None
    artist_name: str
    artist_id: Optional[str] = None
    image_url: Optional[str] = None
    provider: str = "audius"
    followed_at: Optional[str] = None

class FollowArtistRequest(BaseModel):
    artist_name: str
    artist_id: Optional[str] = None
    image_url: Optional[str] = None
    provider: str = "audius"
    user_id: Optional[str] = None

class DiscoverySyncRequest(BaseModel):
    user_id: Optional[str] = None
    favorite_artists: List[str] = []
    preferred_languages: List[str] = []
    preferred_genres: List[str] = []
    region: Optional[str] = None

class SyncLog(BaseModel):
    id: str
    provider: str
    action: str
    items_count: int
    status: str
    duration_seconds: float
    error_message: Optional[str] = None
    created_at: str

class SyncStatusResponse(BaseModel):
    is_syncing: bool
    last_sync_at: Optional[str] = None
    next_scheduled_sync: Optional[str] = None
    total_tracks: int
    total_albums: int
    total_artists: int
    sync_frequency: str = "Every 2 hours"
    recent_logs: List[SyncLog] = []

class NewReleasesResponse(BaseModel):
    from_followed_artists: List[Track] = []
    recent_singles: List[Track] = []
    recent_albums: List[CatalogueAlbum] = []
    total_discovered: int
    last_synced_at: str
