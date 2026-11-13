import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "Resonix Music"
    VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Music Provider Settings
    AUDIUS_APP_NAME: str = "RESONIX_MUSIC"
    JAMENDO_CLIENT_ID: str = "b6747d04" # Pre-configured default; user can override
    
    # Optional Spotify API credentials (if provided, enables extended private playlist import)
    SPOTIFY_CLIENT_ID: str = ""
    SPOTIFY_CLIENT_SECRET: str = ""
    
    # Supabase credentials (optional for backend, primarily used in frontend)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    
    # CORS Origins (allow frontend dev and mobile network access)
    CORS_ORIGINS: List[str] = ["*"]
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
