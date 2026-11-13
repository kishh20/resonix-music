export interface Track {
  id: string;
  title: string;
  artist: string;
  artist_id?: string;
  album?: string;
  album_id?: string;
  artwork_url?: string;
  duration: number; // in seconds
  stream_url: string;
  provider: 'audius' | 'jamendo' | 'archive' | 'spotify_matched' | 'youtube' | string;
  genre?: string;
  bitrate?: string;
  release_date?: string;
  play_count?: number;
  permalink?: string;
  availability_status?: 'available' | 'unavailable' | 'verifying';
}

export interface CatalogueAlbum {
  id: string;
  title: string;
  artist: string;
  artist_id?: string;
  cover_url?: string;
  release_date: string;
  release_type: 'album' | 'ep' | 'single';
  provider: string;
  provider_id: string;
  track_count: number;
  tracks?: Track[];
  last_synced_at?: string;
}

export interface FollowedArtist {
  id: string;
  user_id?: string;
  artist_name: string;
  artist_id?: string;
  image_url?: string;
  provider: string;
  followed_at?: string;
}

export interface SyncLog {
  id: string;
  provider: string;
  action: string;
  items_count: number;
  status: string;
  duration_seconds: number;
  error_message?: string;
  created_at: string;
}

export interface SyncStatusResponse {
  is_syncing: boolean;
  last_sync_at?: string;
  next_scheduled_sync?: string;
  total_tracks: number;
  total_albums: number;
  total_artists: number;
  sync_frequency: string;
  recent_logs: SyncLog[];
}

export interface NewReleasesResponse {
  from_followed_artists: Track[];
  recent_singles: Track[];
  recent_albums: CatalogueAlbum[];
  total_discovered: number;
  last_synced_at: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  is_public?: boolean;
  tracks: Track[];
  track_count: number;
  created_at?: string;
  user_id?: string;
}

export interface Genre {
  id: string;
  name: string;
  color: string;
  image: string;
}

export interface SearchResponse {
  query: string;
  total: number;
  tracks: Track[];
  providers: string[];
}

export interface SuggestionsResponse {
  query: string;
  suggestions: string[];
  tracks: Track[];
}

export interface LyricLine {
  time: number; // time in seconds (e.g. 34.92)
  text: string;
}

export interface LyricsResponse {
  track_id?: string;
  title: string;
  artist: string;
  is_synced: boolean;
  lyrics: LyricLine[];
  plain_lyrics?: string;
  source: string;
}

export interface SpotifyTrack {
  spotify_id?: string;
  title: string;
  artist: string;
  album?: string;
  artwork_url?: string;
  duration: number;
  matched_track?: Track | null;
  match_confidence: number;
  status: 'matched' | 'unmatched' | 'pending';
}

export interface SpotifyImportResponse {
  playlist_id: string;
  playlist_name: string;
  playlist_description?: string;
  cover_url?: string;
  total_tracks: number;
  matched_count: number;
  unmatched_count: number;
  tracks: SpotifyTrack[];
}

export interface RecommendationMix {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  tracks: Track[];
}

export interface RecommendationResponse {
  personalized_tracks: Track[];
  mixes: RecommendationMix[];
}

export interface UserPreferences {
  languages: string[];
  genres: string[];
  artists: string[];
  region: string;
  hasCompletedOnboarding: boolean;
}

export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  avatar_url?: string;
  preferred_quality?: 'standard' | 'high';
}

export type RepeatMode = 'off' | 'all' | 'one';
