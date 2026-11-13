-- ============================================================
-- AURORA MUSIC STREAMING PLATFORM - SUPABASE DATABASE SCHEMA
-- Fully relational, secure with Row Level Security (RLS)
-- Run this script in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    preferred_quality TEXT DEFAULT 'high', -- 'standard' or 'high'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. PLAYLISTS TABLE
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. PLAYLIST TRACKS TABLE
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    artwork_url TEXT,
    duration INTEGER NOT NULL DEFAULT 0, -- in seconds
    stream_url TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'audius', -- 'audius', 'jamendo', 'archive'
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_playlist_track UNIQUE(playlist_id, track_id)
);

-- 4. LIKED SONGS TABLE
CREATE TABLE IF NOT EXISTS public.liked_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    artwork_url TEXT,
    duration INTEGER NOT NULL DEFAULT 0,
    stream_url TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'audius',
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_user_liked_track UNIQUE(user_id, track_id)
);

-- 5. LISTENING HISTORY TABLE (for AI and personal recommendations)
CREATE TABLE IF NOT EXISTS public.listening_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    artwork_url TEXT,
    duration INTEGER NOT NULL DEFAULT 0,
    provider TEXT NOT NULL DEFAULT 'audius',
    genre TEXT,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 6. CATALOGUE TRACKS TABLE (Automatic Music Discovery)
CREATE TABLE IF NOT EXISTS public.catalogue_tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    artist_id TEXT,
    album TEXT,
    album_id TEXT,
    artwork_url TEXT,
    duration INTEGER NOT NULL DEFAULT 0,
    stream_url TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'audius', 'jamendo', 'archive', 'spotify_matched'
    provider_id TEXT NOT NULL,
    release_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    release_type TEXT NOT NULL DEFAULT 'single', -- 'single', 'ep', 'album'
    availability_status TEXT NOT NULL DEFAULT 'available', -- 'available', 'unavailable', 'verifying'
    genre TEXT,
    bitrate TEXT DEFAULT '320kbps MP3',
    play_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. CATALOGUE ALBUMS TABLE (Automatic Album Discovery)
CREATE TABLE IF NOT EXISTS public.catalogue_albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    artist_id TEXT,
    cover_url TEXT,
    release_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    release_type TEXT NOT NULL DEFAULT 'album', -- 'album', 'ep', 'single'
    provider TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    track_count INTEGER NOT NULL DEFAULT 1,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 8. FOLLOWED ARTISTS TABLE
CREATE TABLE IF NOT EXISTS public.followed_artists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    artist_name TEXT NOT NULL,
    artist_id TEXT,
    image_url TEXT,
    provider TEXT DEFAULT 'audius',
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_user_followed_artist UNIQUE(user_id, artist_name)
);

-- 9. SYNC LOGS TABLE (Scheduled Background Synchronization)
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    action TEXT NOT NULL, -- 'discovery', 'verification', 'metadata_refresh'
    items_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'success', -- 'success', 'warning', 'failed'
    duration_seconds NUMERIC(6, 2) DEFAULT 0.0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON public.playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON public.playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_liked_songs_user_id ON public.liked_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_songs_liked_at ON public.liked_songs(user_id, liked_at DESC);
CREATE INDEX IF NOT EXISTS idx_listening_history_user ON public.listening_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalogue_tracks_release ON public.catalogue_tracks(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_catalogue_tracks_artist ON public.catalogue_tracks(artist);
CREATE INDEX IF NOT EXISTS idx_catalogue_albums_release ON public.catalogue_albums(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_followed_artists_user ON public.followed_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON public.sync_logs(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followed_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Playlists
CREATE POLICY "Users can view own or public playlists" 
    ON public.playlists FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert their own playlists" 
    ON public.playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own playlists" 
    ON public.playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own playlists" 
    ON public.playlists FOR DELETE USING (auth.uid() = user_id);

-- Playlist Tracks
CREATE POLICY "Users can view playlist tracks for accessible playlists" 
    ON public.playlist_tracks FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.playlists 
        WHERE public.playlists.id = public.playlist_tracks.playlist_id 
        AND (public.playlists.user_id = auth.uid() OR public.playlists.is_public = true)
    ));
CREATE POLICY "Users can insert tracks to their own playlists" 
    ON public.playlist_tracks FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.playlists 
        WHERE public.playlists.id = public.playlist_tracks.playlist_id 
        AND public.playlists.user_id = auth.uid()
    ));
CREATE POLICY "Users can update tracks in their own playlists" 
    ON public.playlist_tracks FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM public.playlists 
        WHERE public.playlists.id = public.playlist_tracks.playlist_id 
        AND public.playlists.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete tracks from their own playlists" 
    ON public.playlist_tracks FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM public.playlists 
        WHERE public.playlists.id = public.playlist_tracks.playlist_id 
        AND public.playlists.user_id = auth.uid()
    ));

-- Liked Songs
CREATE POLICY "Users can view their own liked songs" 
    ON public.liked_songs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to their liked songs" 
    ON public.liked_songs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from their liked songs" 
    ON public.liked_songs FOR DELETE USING (auth.uid() = user_id);

-- Listening History
CREATE POLICY "Users can view their own listening history" 
    ON public.listening_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can record listening history" 
    ON public.listening_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Catalogue Tracks & Albums (Publicly readable by all listeners)
CREATE POLICY "Catalogue tracks are viewable by everyone"
    ON public.catalogue_tracks FOR SELECT USING (true);
CREATE POLICY "Catalogue albums are viewable by everyone"
    ON public.catalogue_albums FOR SELECT USING (true);
CREATE POLICY "Sync logs are viewable by everyone"
    ON public.sync_logs FOR SELECT USING (true);

-- Followed Artists
CREATE POLICY "Users can view their own followed artists"
    ON public.followed_artists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can follow artists"
    ON public.followed_artists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow artists"
    ON public.followed_artists FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- AUTOMATIC PROFILE TRIGGER ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
