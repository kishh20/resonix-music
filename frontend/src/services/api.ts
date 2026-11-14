import { 
  Track, 
  Playlist,
  Genre, 
  SearchResponse, 
  SpotifyImportResponse, 
  RecommendationResponse,
  NewReleasesResponse,
  SyncStatusResponse,
  CatalogueAlbum,
  FollowedArtist,
  LyricsResponse
} from '../types/music';

export const api = {
  async getTrending(genre?: string, limit: number = 40): Promise<Track[]> {
    const params = new URLSearchParams();
    if (genre && genre !== 'all') params.append('genre', genre);
    params.append('limit', limit.toString());

    const resp = await fetch(`/api/music/trending?${params.toString()}`);
    if (!resp.ok) throw new Error('Failed to fetch trending tracks');
    return resp.json();
  },

  async search(query: string, provider?: string, limit: number = 30): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    if (provider && provider !== 'all') params.append('provider', provider);

    const resp = await fetch(`/api/music/search?${params.toString()}`);
    if (!resp.ok) throw new Error('Failed to search tracks');
    return resp.json();
  },

  async getSuggestions(query: string): Promise<{ query: string; suggestions: string[]; tracks: Track[] }> {
    if (!query || query.trim().length < 2) {
      return { query, suggestions: [], tracks: [] };
    }
    const params = new URLSearchParams({ q: query.trim() });
    const resp = await fetch(`/api/music/suggestions?${params.toString()}`);
    if (!resp.ok) return { query, suggestions: [], tracks: [] };
    return resp.json();
  },

  async getGenres(): Promise<Genre[]> {
    const resp = await fetch('/api/music/genres');
    if (!resp.ok) throw new Error('Failed to fetch genres');
    return resp.json();
  },

  async getTrack(trackId: string): Promise<Track> {
    const resp = await fetch(`/api/music/track/${encodeURIComponent(trackId)}`);
    if (!resp.ok) throw new Error('Track not found');
    return resp.json();
  },

  async getLyrics(title: string, artist: string, duration?: number, trackId?: string): Promise<LyricsResponse> {
    const params = new URLSearchParams({
      title: title.trim(),
      artist: artist.trim()
    });
    if (duration) params.append('duration', duration.toString());
    if (trackId) params.append('track_id', trackId);

    try {
      const resp = await fetch(`/api/lyrics?${params.toString()}`);
      if (!resp.ok) {
        return {
          title,
          artist,
          is_synced: false,
          lyrics: [],
          source: 'none'
        };
      }
      return await resp.json();
    } catch {
      return {
        title,
        artist,
        is_synced: false,
        lyrics: [],
        source: 'none'
      };
    }
  },

  async importSpotifyPlaylist(urlOrId: string): Promise<SpotifyImportResponse> {
    const resp = await fetch('/api/spotify/import-playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url_or_id: urlOrId })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to import Spotify playlist');
    }
    return resp.json();
  },

  async searchAlternatives(query: string): Promise<Track[]> {
    const params = new URLSearchParams({ q: query, limit: '10' });
    const resp = await fetch(`/api/spotify/search-alternatives?${params.toString()}`);
    if (!resp.ok) throw new Error('Failed to search alternatives');
    return resp.json();
  },

  async getRecommendations(data: {
    recent_track_ids?: string[];
    liked_track_ids?: string[];
    preferred_genres?: string[];
    favorite_artists?: string[];
    preferred_languages?: string[];
    region?: string;
    limit?: number;
    refresh_nonce?: string;
    force_refresh?: boolean;
  }): Promise<RecommendationResponse> {
    const resp = await fetch('/api/recommendations/for-you', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error('Failed to fetch recommendations');
    return resp.json();
  },

  // ==========================================
  // AUTOMATIC DISCOVERY & CATALOGUE ENDPOINTS
  // ==========================================
  async getNewReleases(userId?: string, favoriteArtists?: string[]): Promise<NewReleasesResponse> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (favoriteArtists && favoriteArtists.length > 0) {
      favoriteArtists.forEach(a => params.append('favorite_artists', a));
    }
    const resp = await fetch(`/api/discovery/new-releases?${params.toString()}`);
    if (!resp.ok) throw new Error('Failed to fetch new releases');
    return resp.json();
  },

  async syncDiscoveryNow(preferences?: {
    user_id?: string;
    favorite_artists?: string[];
    preferred_languages?: string[];
    preferred_genres?: string[];
    region?: string;
  }): Promise<any> {
    const resp = await fetch('/api/discovery/sync-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: preferences ? JSON.stringify(preferences) : undefined
    });
    if (!resp.ok) throw new Error('Failed to trigger discovery synchronization');
    return resp.json();
  },

  async getDiscoveryStatus(): Promise<SyncStatusResponse> {
    const resp = await fetch('/api/discovery/status');
    if (!resp.ok) throw new Error('Failed to fetch sync status');
    return resp.json();
  },

  async getFollowedArtists(userId?: string): Promise<FollowedArtist[]> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    const resp = await fetch(`/api/discovery/followed-artists?${params.toString()}`);
    if (!resp.ok) throw new Error('Failed to fetch followed artists');
    return resp.json();
  },

  async followArtist(artistName: string, artistId?: string, imageUrl?: string, provider: string = 'audius', userId?: string): Promise<FollowedArtist> {
    const resp = await fetch('/api/discovery/follow-artist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist_name: artistName,
        artist_id: artistId,
        image_url: imageUrl,
        provider,
        user_id: userId
      })
    });
    if (!resp.ok) throw new Error('Failed to follow artist');
    return resp.json();
  },

  async unfollowArtist(artistName: string, userId?: string): Promise<boolean> {
    const resp = await fetch('/api/discovery/unfollow-artist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist_name: artistName,
        user_id: userId
      })
    });
    if (!resp.ok) throw new Error('Failed to unfollow artist');
    const data = await resp.json();
    return data.success;
  },

  async getAlbum(albumId: string): Promise<CatalogueAlbum> {
    const resp = await fetch(`/api/discovery/album/${encodeURIComponent(albumId)}`);
    if (!resp.ok) throw new Error('Album not found');
    return resp.json();
  },

  async getNetworkInfo(): Promise<{ lan_ip: string; frontend_url: string; backend_url: string; is_local: boolean }> {
    const resp = await fetch('/api/network-info');
    if (!resp.ok) throw new Error('Failed to fetch network info');
    return resp.json();
  },

  getProxyStreamUrl(streamUrl: string): string {
    return `/api/music/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
  },

  // Discord Rich Presence (RPC)
  async updateDiscordPresence(data: {
    title: string;
    artist: string;
    album?: string;
    artwork_url?: string;
    duration?: number;
    position?: number;
    is_playing?: boolean;
  }): Promise<boolean> {
    try {
      const resp = await fetch('/api/discord/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return resp.ok;
    } catch {
      return false;
    }
  },

  async clearDiscordPresence(): Promise<void> {
    try {
      await fetch('/api/discord/clear', { method: 'POST' });
    } catch {}
  },

  async getDiscordStatus(): Promise<{ connected: boolean; enabled: boolean }> {
    try {
      const resp = await fetch('/api/discord/status');
      if (resp.ok) return resp.json();
    } catch {}
    return { connected: false, enabled: false };
  },

  async toggleDiscord(enabled: boolean): Promise<boolean> {
    try {
      const resp = await fetch('/api/discord/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      return resp.ok;
    } catch {
      return false;
    }
  },

  // Spotify Jam Session
  async createJam(payload: {
    user_id: string;
    user_name: string;
    avatar_url?: string;
    current_track?: Track;
  }): Promise<any> {
    const resp = await fetch('/api/jam/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error('Failed to create Jam session');
    return resp.json();
  },

  async getJam(jamCode: string): Promise<any> {
    const resp = await fetch(`/api/jam/${encodeURIComponent(jamCode.trim().toUpperCase())}`);
    if (!resp.ok) throw new Error('Jam session not found or expired');
    return resp.json();
  },

  // ==========================================
  // PERMANENT LOCAL DISK PLAYLIST STORAGE
  // ==========================================
  async getPlaylistsDisk(): Promise<Playlist[]> {
    try {
      const resp = await fetch('/api/library/playlists');
      if (resp.ok) return resp.json();
    } catch (e) {
      console.warn('Failed to fetch playlists from disk backend:', e);
    }
    return [];
  },

  async savePlaylistDisk(playlist: Playlist): Promise<Playlist | null> {
    try {
      const resp = await fetch('/api/library/save-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlist)
      });
      if (resp.ok) return resp.json();
    } catch (e) {
      console.warn('Failed to save playlist to disk backend:', e);
    }
    return null;
  },

  async deletePlaylistDisk(playlistId: string): Promise<boolean> {
    try {
      const resp = await fetch(`/api/library/playlist/${encodeURIComponent(playlistId)}`, {
        method: 'DELETE'
      });
      return resp.ok;
    } catch {
      return false;
    }
  },

  async getLikedSongsDisk(): Promise<Track[]> {
    try {
      const resp = await fetch('/api/library/liked-songs');
      if (resp.ok) return resp.json();
    } catch {}
    return [];
  },

  async toggleLikeDisk(track: Track, isLiked: boolean): Promise<Track[]> {
    try {
      const resp = await fetch('/api/library/toggle-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track, is_liked: isLiked })
      });
      if (resp.ok) return resp.json();
    } catch {}
    return [];
  }
};
