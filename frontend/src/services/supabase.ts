import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Track, Playlist, UserProfile } from '../types/music';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local storage fallback keys
const STORAGE_KEYS = {
  LIKED: 'aurora_liked_songs',
  PLAYLISTS: 'aurora_custom_playlists',
  HISTORY: 'aurora_listening_history',
  PROFILE: 'aurora_user_profile'
};

// ==========================================
// LIKED SONGS
// ==========================================
export async function getLikedSongsCloud(userId?: string): Promise<Track[]> {
  if (supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('liked_songs')
        .select('*')
        .eq('user_id', userId)
        .order('liked_at', { ascending: false });

      if (!error && data) {
        return data.map(item => ({
          id: item.track_id,
          title: item.title,
          artist: item.artist,
          album: item.album,
          artwork_url: item.artwork_url,
          duration: item.duration,
          stream_url: item.stream_url,
          provider: item.provider
        }));
      }
    } catch (e) {
      console.warn('Supabase getLikedSongs error, falling back to local:', e);
    }
  }

  // Fallback to local storage
  const stored = localStorage.getItem(STORAGE_KEYS.LIKED);
  return stored ? JSON.parse(stored) : [];
}

export async function toggleLikedSongCloud(track: Track, isLiked: boolean, userId?: string): Promise<void> {
  // Update local storage first for instant optimistic response
  const stored = localStorage.getItem(STORAGE_KEYS.LIKED);
  let localList: Track[] = stored ? JSON.parse(stored) : [];

  if (isLiked) {
    if (!localList.some(t => t.id === track.id)) {
      localList.unshift(track);
    }
  } else {
    localList = localList.filter(t => t.id !== track.id);
  }
  localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(localList));

  // If Supabase is connected and user is logged in, sync to database
  if (supabase && userId) {
    try {
      if (isLiked) {
        await supabase.from('liked_songs').upsert({
          user_id: userId,
          track_id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album || null,
          artwork_url: track.artwork_url || null,
          duration: track.duration,
          stream_url: track.stream_url,
          provider: track.provider
        });
      } else {
        await supabase
          .from('liked_songs')
          .delete()
          .match({ user_id: userId, track_id: track.id });
      }
    } catch (e) {
      console.error('Failed to sync like state to Supabase:', e);
    }
  }
}

// ==========================================
// PLAYLISTS
// ==========================================
export async function getPlaylistsCloud(userId?: string): Promise<Playlist[]> {
  if (supabase && userId) {
    try {
      const { data: playlistsData, error: pError } = await supabase
        .from('playlists')
        .select(`
          id, name, description, cover_url, is_public, created_at,
          playlist_tracks (
            track_id, title, artist, album, artwork_url, duration, stream_url, provider, position
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!pError && playlistsData) {
        return playlistsData.map(p => {
          const rawTracks = (p.playlist_tracks || []) as any[];
          const sortedTracks = rawTracks
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map(t => ({
              id: t.track_id,
              title: t.title,
              artist: t.artist,
              album: t.album,
              artwork_url: t.artwork_url,
              duration: t.duration,
              stream_url: t.stream_url,
              provider: t.provider
            }));

          return {
            id: p.id,
            title: p.name,
            description: p.description,
            cover_url: p.cover_url,
            is_public: p.is_public,
            created_at: p.created_at,
            track_count: sortedTracks.length,
            tracks: sortedTracks
          };
        });
      }
    } catch (e) {
      console.warn('Supabase getPlaylists error, using local:', e);
    }
  }

  const stored = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
  return stored ? JSON.parse(stored) : [];
}

export async function savePlaylistCloud(playlist: Playlist, userId?: string): Promise<void> {
  // Update local storage
  const stored = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
  let localPlaylists: Playlist[] = stored ? JSON.parse(stored) : [];
  const idx = localPlaylists.findIndex(p => p.id === playlist.id);

  if (idx >= 0) {
    localPlaylists[idx] = playlist;
  } else {
    localPlaylists.unshift(playlist);
  }
  localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(localPlaylists));

  // Sync to Supabase
  if (supabase && userId) {
    try {
      // 1. Upsert playlist metadata
      await supabase.from('playlists').upsert({
        id: playlist.id.length === 36 ? playlist.id : undefined, // Check if valid UUID
        user_id: userId,
        name: playlist.title,
        description: playlist.description || null,
        cover_url: playlist.cover_url || null,
        is_public: Boolean(playlist.is_public)
      });

      // 2. Sync tracks
      if (playlist.id.length === 36) {
        // Clear existing tracks and re-insert in order
        await supabase.from('playlist_tracks').delete().eq('playlist_id', playlist.id);
        if (playlist.tracks.length > 0) {
          const trackInserts = playlist.tracks.map((t, pos) => ({
            playlist_id: playlist.id,
            track_id: t.id,
            title: t.title,
            artist: t.artist,
            album: t.album || null,
            artwork_url: t.artwork_url || null,
            duration: t.duration,
            stream_url: t.stream_url,
            provider: t.provider,
            position: pos
          }));
          await supabase.from('playlist_tracks').insert(trackInserts);
        }
      }
    } catch (e) {
      console.error('Failed to sync playlist to Supabase:', e);
    }
  }
}

export async function deletePlaylistCloud(playlistId: string, userId?: string): Promise<void> {
  const stored = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
  if (stored) {
    const list: Playlist[] = JSON.parse(stored);
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(list.filter(p => p.id !== playlistId)));
  }

  if (supabase && userId && playlistId.length === 36) {
    try {
      await supabase.from('playlists').delete().match({ id: playlistId, user_id: userId });
    } catch (e) {
      console.error('Failed to delete playlist from Supabase:', e);
    }
  }
}

// ==========================================
// LISTENING HISTORY
// ==========================================
export async function recordHistoryCloud(track: Track, userId?: string): Promise<void> {
  const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
  let history: { track: Track; played_at: string }[] = stored ? JSON.parse(stored) : [];

  history.unshift({ track, played_at: new Date().toISOString() });
  // Keep last 100
  if (history.length > 100) history = history.slice(0, 100);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));

  if (supabase && userId) {
    try {
      await supabase.from('listening_history').insert({
        user_id: userId,
        track_id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album || null,
        artwork_url: track.artwork_url || null,
        duration: track.duration,
        provider: track.provider,
        genre: track.genre || null
      });
    } catch (e) {
      console.warn('Failed to record history to Supabase:', e);
    }
  }
}
