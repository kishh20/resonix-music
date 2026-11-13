import { create } from 'zustand';
import { Track, Playlist, FollowedArtist } from '../types/music';
import { 
  getLikedSongsCloud, 
  toggleLikedSongCloud, 
  getPlaylistsCloud, 
  savePlaylistCloud, 
  deletePlaylistCloud, 
  recordHistoryCloud 
} from '../services/supabase';
import { api } from '../services/api';

// Robust RFC4122 v4 UUID generator ensuring valid UUID for Supabase database sync
function generateValidUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface LibraryState {
  likedSongs: Track[];
  playlists: Playlist[];
  listeningHistory: { track: Track; played_at: string }[];
  followedArtists: FollowedArtist[];
  isLoading: boolean;

  // Actions
  loadLibrary: (userId?: string) => Promise<void>;
  toggleLike: (track: Track, userId?: string) => Promise<void>;
  isLiked: (trackId: string) => boolean;
  createPlaylist: (name: string, description?: string, coverUrl?: string, userId?: string) => Promise<Playlist>;
  createPlaylistWithTracks: (name: string, description?: string, coverUrl?: string, tracks?: Track[], userId?: string) => Promise<Playlist>;
  deletePlaylist: (playlistId: string, userId?: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track, userId?: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string, userId?: string) => Promise<void>;
  recordHistory: (track: Track, userId?: string) => Promise<void>;
  followArtist: (artistName: string, artistId?: string, imageUrl?: string, provider?: string, userId?: string) => Promise<void>;
  unfollowArtist: (artistName: string, userId?: string) => Promise<void>;
  isArtistFollowed: (artistName: string) => boolean;
}

// Synchronously restore library from localStorage on frame 0 so playlists never vanish on code update/HMR
function getInitialLibraryState() {
  try {
    const rawPl = localStorage.getItem('resonix_custom_playlists') || localStorage.getItem('aurora_custom_playlists');
    const playlists = rawPl ? JSON.parse(rawPl) : [];
    const rawLiked = localStorage.getItem('resonix_liked_songs') || localStorage.getItem('aurora_liked_songs');
    const liked = rawLiked ? JSON.parse(rawLiked) : [];
    const rawHist = localStorage.getItem('resonix_listening_history') || localStorage.getItem('aurora_listening_history');
    const history = rawHist ? JSON.parse(rawHist) : [];
    return {
      playlists: Array.isArray(playlists) ? playlists : [],
      likedSongs: Array.isArray(liked) ? liked : [],
      listeningHistory: Array.isArray(history) ? history : []
    };
  } catch (e) {
    console.warn('Error reading synchronous initial library:', e);
    return { playlists: [], likedSongs: [], listeningHistory: [] };
  }
}

const initialLib = getInitialLibraryState();

export const useLibraryStore = create<LibraryState>((set, get) => ({
  likedSongs: initialLib.likedSongs,
  playlists: initialLib.playlists,
  listeningHistory: initialLib.listeningHistory,
  followedArtists: [],
  isLoading: false,

  loadLibrary: async (userId?: string) => {
    try {
      const [liked, playlists, followed] = await Promise.all([
        getLikedSongsCloud(userId),
        getPlaylistsCloud(userId),
        api.getFollowedArtists(userId).catch(() => [])
      ]);

      const rawHist = localStorage.getItem('resonix_listening_history') || localStorage.getItem('aurora_listening_history');
      const history = rawHist ? JSON.parse(rawHist) : get().listeningHistory;

      set({
        likedSongs: liked && liked.length > 0 ? liked : get().likedSongs,
        playlists: playlists && playlists.length > 0 ? playlists : get().playlists,
        listeningHistory: history,
        followedArtists: followed,
        isLoading: false
      });
    } catch (e) {
      console.error('Failed to load library:', e);
      set({ isLoading: false });
    }
  },

  toggleLike: async (track: Track, userId?: string) => {
    const { likedSongs } = get();
    const currentlyLiked = likedSongs.some(t => t.id === track.id);
    const newLiked = !currentlyLiked;

    // Optimistic update
    if (newLiked) {
      set({ likedSongs: [track, ...likedSongs] });
    } else {
      set({ likedSongs: likedSongs.filter(t => t.id !== track.id) });
    }

    await toggleLikedSongCloud(track, newLiked, userId);
  },

  isLiked: (trackId: string) => {
    return get().likedSongs.some(t => t.id === trackId);
  },

  createPlaylist: async (name: string, description?: string, coverUrl?: string, userId?: string) => {
    const newPlaylist: Playlist = {
      id: generateValidUUID(),
      title: name,
      description: description || '',
      cover_url: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      tracks: [],
      track_count: 0,
      created_at: new Date().toISOString()
    };

    set(state => ({ playlists: [newPlaylist, ...state.playlists] }));
    await savePlaylistCloud(newPlaylist, userId);
    return newPlaylist;
  },

  createPlaylistWithTracks: async (name: string, description?: string, coverUrl?: string, tracks: Track[] = [], userId?: string) => {
    const newPlaylist: Playlist = {
      id: generateValidUUID(),
      title: name,
      description: description || '',
      cover_url: coverUrl || (tracks[0]?.artwork_url) || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      tracks: tracks,
      track_count: tracks.length,
      created_at: new Date().toISOString()
    };

    set(state => ({ playlists: [newPlaylist, ...state.playlists] }));
    await savePlaylistCloud(newPlaylist, userId);
    return newPlaylist;
  },

  deletePlaylist: async (playlistId: string, userId?: string) => {
    set(state => ({ playlists: state.playlists.filter(p => p.id !== playlistId) }));
    await deletePlaylistCloud(playlistId, userId);
  },

  addTrackToPlaylist: async (playlistId: string, track: Track, userId?: string) => {
    const { playlists } = get();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    if (playlist.tracks.some(t => t.id === track.id)) {
      return; // Already in playlist
    }

    const updatedTracks = [...playlist.tracks, track];
    const updatedPlaylist: Playlist = {
      ...playlist,
      tracks: updatedTracks,
      track_count: updatedTracks.length
    };

    set(state => ({
      playlists: state.playlists.map(p => p.id === playlistId ? updatedPlaylist : p)
    }));

    await savePlaylistCloud(updatedPlaylist, userId);
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string, userId?: string) => {
    const { playlists } = get();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const updatedTracks = playlist.tracks.filter(t => t.id !== trackId);
    const updatedPlaylist: Playlist = {
      ...playlist,
      tracks: updatedTracks,
      track_count: updatedTracks.length
    };

    set(state => ({
      playlists: state.playlists.map(p => p.id === playlistId ? updatedPlaylist : p)
    }));

    await savePlaylistCloud(updatedPlaylist, userId);
  },

  recordHistory: async (track: Track, userId?: string) => {
    const { listeningHistory } = get();
    const filtered = listeningHistory.filter(h => h.track.id !== track.id);
    const updated = [{ track, played_at: new Date().toISOString() }, ...filtered].slice(0, 50);

    // Save to local storage cache so history persists across sessions
    localStorage.setItem('resonix_listening_history', JSON.stringify(updated));
    set({ listeningHistory: updated });

    await recordHistoryCloud(track, userId);
  },

  followArtist: async (artistName: string, artistId?: string, imageUrl?: string, provider: string = 'audius', userId?: string) => {
    const { followedArtists } = get();
    if (followedArtists.some(f => f.artist_name.toLowerCase() === artistName.toLowerCase().trim())) {
      return;
    }
    try {
      const fa = await api.followArtist(artistName, artistId, imageUrl, provider, userId);
      set(state => ({ followedArtists: [fa, ...state.followedArtists] }));
    } catch (e) {
      console.error('Follow artist error:', e);
    }
  },

  unfollowArtist: async (artistName: string, userId?: string) => {
    try {
      await api.unfollowArtist(artistName, userId);
      set(state => ({
        followedArtists: state.followedArtists.filter(f => f.artist_name.toLowerCase() !== artistName.toLowerCase().trim())
      }));
    } catch (e) {
      console.error('Unfollow artist error:', e);
    }
  },

  isArtistFollowed: (artistName: string) => {
    return get().followedArtists.some(f => f.artist_name.toLowerCase() === artistName.toLowerCase().trim());
  }
}));
