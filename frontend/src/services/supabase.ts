import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Track, Playlist, UserProfile } from '../types/music';
import { api } from './api';

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

// Local storage fallback keys (with legacy backward compatibility)
const STORAGE_KEYS = {
  LIKED: 'resonix_liked_songs',
  PLAYLISTS: 'resonix_custom_playlists',
  HISTORY: 'resonix_listening_history',
  PROFILE: 'resonix_user_profile',
  // Backward compatibility keys
  LEGACY_LIKED: 'aurora_liked_songs',
  LEGACY_PLAYLISTS: 'aurora_custom_playlists',
  LEGACY_HISTORY: 'aurora_listening_history',
  LEGACY_PROFILE: 'aurora_user_profile'
};

function getLocalPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYLISTS) || localStorage.getItem(STORAGE_KEYS.LEGACY_PLAYLISTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading local playlists:', e);
  }
  return [];
}

function getLocalLikedSongs(): Track[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LIKED) || localStorage.getItem(STORAGE_KEYS.LEGACY_LIKED);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading local liked songs:', e);
  }
  return [];
}

// ==========================================
// LIKED SONGS (Triple-Redundant: Local + Disk + Supabase)
// ==========================================
export async function getLikedSongsCloud(userId?: string): Promise<Track[]> {
  const localLiked = getLocalLikedSongs();
  let diskLiked: Track[] = [];
  let cloudLiked: Track[] = [];

  try {
    diskLiked = await api.getLikedSongsDisk();
  } catch {}

  if (supabase && userId && userId !== 'guest_user' && userId.length === 36) {
    try {
      const { data, error } = await supabase
        .from('liked_songs')
        .select('*')
        .eq('user_id', userId)
        .order('liked_at', { ascending: false });

      if (!error && data) {
        cloudLiked = data.map(item => ({
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
      console.warn('Supabase getLikedSongs error:', e);
    }
  }

  // Merge all sources without losing any liked track
  const mergedMap = new Map<string, Track>();
  localLiked.forEach(t => mergedMap.set(t.id, t));
  diskLiked.forEach(t => mergedMap.set(t.id, t));
  cloudLiked.forEach(t => mergedMap.set(t.id, t));

  const merged = Array.from(mergedMap.values());
  localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(merged));
  return merged;
}

export async function toggleLikedSongCloud(track: Track, isLiked: boolean, userId?: string): Promise<void> {
  // 1. Update local storage first for instant optimistic response
  const localList = getLocalLikedSongs();
  let updatedList: Track[] = [];
  if (isLiked) {
    updatedList = [track, ...localList.filter(t => t.id !== track.id)];
  } else {
    updatedList = localList.filter(t => t.id !== track.id);
  }
  localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(updatedList));

  // 2. Persist to permanent backend disk storage
  try {
    await api.toggleLikeDisk(track, isLiked);
  } catch (e) {
    console.warn('Failed to sync like to local disk backend:', e);
  }

  // 3. If Supabase is connected and user is logged in with valid UUID, sync to cloud
  if (supabase && userId && userId !== 'guest_user' && userId.length === 36) {
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
// PLAYLISTS (Triple-Redundant: Local + Disk + Supabase)
// ==========================================
export async function getPlaylistsCloud(userId?: string): Promise<Playlist[]> {
  const localPlaylists = getLocalPlaylists();
  let diskPlaylists: Playlist[] = [];
  let cloudPlaylists: Playlist[] = [];

  // Fetch permanent playlists from local backend disk
  try {
    diskPlaylists = await api.getPlaylistsDisk();
  } catch (e) {
    console.warn('Failed to load playlists from backend disk:', e);
  }

  // Fetch from Supabase if valid user UUID
  if (supabase && userId && userId !== 'guest_user' && userId.length === 36) {
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

      if (!pError && playlistsData && playlistsData.length > 0) {
        cloudPlaylists = playlistsData.map(p => {
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
      console.warn('Supabase getPlaylists error:', e);
    }
  }

  // Merge all sources by playlist ID (preserves tracks from any source)
  const mergedMap = new Map<string, Playlist>();

  // Add backend disk playlists
  diskPlaylists.forEach(p => {
    if (p && p.id) mergedMap.set(p.id, p);
  });

  // Add/Merge local playlists
  localPlaylists.forEach(p => {
    if (p && p.id) {
      const existing = mergedMap.get(p.id);
      if (!existing || (p.tracks && p.tracks.length >= (existing.tracks?.length || 0))) {
        mergedMap.set(p.id, p);
      }
    }
  });

  // Add/Merge cloud playlists
  cloudPlaylists.forEach(p => {
    if (p && p.id) {
      const existing = mergedMap.get(p.id);
      if (!existing || (p.tracks && p.tracks.length >= (existing.tracks?.length || 0))) {
        mergedMap.set(p.id, p);
      }
    }
  });

  const merged = Array.from(mergedMap.values());

  // Keep local storage & backend disk in sync with the merged library
  localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(merged));
  
  // Asynchronously ensure disk backend has any missing local playlists
  merged.forEach(p => {
    if (!diskPlaylists.some(dp => dp.id === p.id)) {
      api.savePlaylistDisk(p).catch(() => null);
    }
  });

  return merged;
}

export async function savePlaylistCloud(playlist: Playlist, userId?: string): Promise<void> {
  // 1. Update local storage
  const localPlaylists = getLocalPlaylists();
  const idx = localPlaylists.findIndex(p => p.id === playlist.id);
  if (idx >= 0) {
    localPlaylists[idx] = playlist;
  } else {
    localPlaylists.unshift(playlist);
  }
  localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(localPlaylists));

  // 2. Persist to permanent backend disk storage (guarantees survival across reloads/code updates)
  try {
    await api.savePlaylistDisk(playlist);
  } catch (e) {
    console.warn('Failed to save playlist to local disk backend:', e);
  }

  // 3. Sync to Supabase if valid user UUID
  if (supabase && userId && userId !== 'guest_user' && userId.length === 36) {
    try {
      await supabase.from('playlists').upsert({
        id: playlist.id.length === 36 ? playlist.id : undefined,
        user_id: userId,
        name: playlist.title,
        description: playlist.description || null,
        cover_url: playlist.cover_url || null,
        is_public: Boolean(playlist.is_public)
      });

      if (playlist.id.length === 36) {
        await supabase.from('playlist_tracks').delete().eq('playlist_id', playlist.id);
        if (playlist.tracks && playlist.tracks.length > 0) {
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
  // 1. Remove from local storage
  const localPlaylists = getLocalPlaylists();
  const filtered = localPlaylists.filter(p => p.id !== playlistId);
  localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(filtered));

  // 2. Delete from permanent backend disk
  try {
    await api.deletePlaylistDisk(playlistId);
  } catch (e) {
    console.warn('Failed to delete playlist from disk backend:', e);
  }

  // 3. Delete from Supabase
  if (supabase && userId && userId !== 'guest_user' && userId.length === 36 && playlistId.length === 36) {
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
  const raw = localStorage.getItem(STORAGE_KEYS.HISTORY) || localStorage.getItem(STORAGE_KEYS.LEGACY_HISTORY);
  let history: { track: Track; played_at: string }[] = raw ? JSON.parse(raw) : [];

  history.unshift({ track, played_at: new Date().toISOString() });
  if (history.length > 100) history = history.slice(0, 100);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));

  if (supabase && userId && userId !== 'guest_user' && userId.length === 36) {
    try {
      await supabase.from('listening_history').insert({
        user_id: userId,
        track_id: track.id,
        title: track.title,
        artist: track.artist,
        played_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Failed to record history to Supabase:', e);
    }
  }
}
