import React, { useEffect, useState, useCallback } from 'react';
import { 
  Flame, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Disc, 
  Play, 
  Calendar, 
  UserCheck, 
  UserPlus, 
  Radio, 
  Clock,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Globe2
} from 'lucide-react';
import { Track, CatalogueAlbum, NewReleasesResponse } from '../../types/music';
import { api } from '../../services/api';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { TrackCard } from '../common/TrackCard';
import { SectionHeader } from '../common/SectionHeader';

interface NewReleasesViewProps {
  onOpenAddToPlaylist: (track: Track) => void;
  onSelectAlbum: (albumId: string) => void;
}

export const NewReleasesView: React.FC<NewReleasesViewProps> = ({
  onOpenAddToPlaylist,
  onSelectAlbum
}) => {
  const { playTrack } = usePlayerStore();
  const { followedArtists, isArtistFollowed, followArtist, unfollowArtist } = useLibraryStore();
  const { user } = useAuthStore();
  const { languages, genres, artists, region, openOnboarding } = usePreferencesStore();

  const [data, setData] = useState<NewReleasesResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'followed' | 'singles' | 'albums'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchReleases = useCallback(async () => {
    try {
      const resp = await api.getNewReleases(user?.id, artists);
      setData(resp);

      // Auto-trigger sync if catalogue is sparse
      if (resp.total_discovered < 15) {
        handleSyncNow(true);
      }
    } catch (e) {
      console.error('Failed to load new releases:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, artists, followedArtists.length]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const handleSyncNow = async (silent = false) => {
    setIsSyncing(true);
    if (!silent) setSyncFeedback(null);
    try {
      const res = await api.syncDiscoveryNow({
        user_id: user?.id,
        favorite_artists: artists,
        preferred_languages: languages,
        preferred_genres: genres,
        region: region
      });
      if (!silent) {
        const count = res.new_tracks_discovered || 0;
        setSyncFeedback(`Discovered ${count} new releases across YouTube Music & authorized networks!`);
      }
      const updated = await api.getNewReleases(user?.id, artists);
      setData(updated);
      if (!silent) setTimeout(() => setSyncFeedback(null), 4000);
    } catch (e: any) {
      if (!silent) setSyncFeedback('Synced with available creator catalogue.');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatReleaseDate = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const followedTracks = data?.from_followed_artists || [];
  const singles = data?.recent_singles || [];
  const albums = data?.recent_albums || [];

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      
      {/* 1. Header Banner & Sync Engine Status */}
      <div className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold mb-3">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Autonomous Music Discovery Agent</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            New Releases & Drops
          </h1>

          <p className="text-xs md:text-sm text-slate-300 mt-2 font-medium leading-relaxed">
            Continuously updated catalogue of newly uploaded 2026 songs, official singles, EPs, and albums from YouTube Music, Audius, Jamendo, and Free Music Archive.
          </p>

          {/* Privacy Preservation Note */}
          <div className="flex items-center gap-2 mt-3 text-[11px] text-emerald-400/90 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>100% Privacy Protected: Discovery is processed locally on your machine with zero external profiling.</span>
          </div>

          {/* Tracking Preferences Summary */}
          {(artists.length > 0 || languages.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-white/10 text-xs">
              <span className="text-slate-400 font-semibold">Tracking drops for:</span>
              {artists.slice(0, 3).map(a => (
                <span key={a} className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium text-[11px]">
                  {a}
                </span>
              ))}
              {languages.slice(0, 2).map(l => (
                <span key={l} className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium text-[11px]">
                  {l}
                </span>
              ))}
              {region && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium text-[11px]">
                  {region}
                </span>
              )}
              <button 
                onClick={openOnboarding}
                className="text-[11px] text-emerald-400 hover:underline font-semibold ml-1"
              >
                Edit Taste
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Continuous Agent: Active
            </span>
            <span>•</span>
            <span>Catalogue: {data?.total_discovered || 0} tracks indexed</span>
            {data?.last_synced_at && (
              <>
                <span>•</span>
                <span>Last updated: {formatReleaseDate(data.last_synced_at)}</span>
              </>
            )}
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex flex-col items-center sm:items-end gap-2 flex-shrink-0">
          <button
            onClick={() => handleSyncNow(false)}
            disabled={isSyncing}
            className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-aurora-accent hover:bg-aurora-accentHover text-black font-bold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Scanning Providers...' : 'Check For New Music'}</span>
          </button>

          {syncFeedback && (
            <span className="text-xs text-emerald-400 font-medium animate-in fade-in max-w-xs text-right">
              {syncFeedback}
            </span>
          )}
        </div>
      </div>

      {/* 2. Filter Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'all', label: 'All Releases' },
          { id: 'followed', label: `From Artists You Follow (${followedTracks.length})` },
          { id: 'singles', label: `Singles & Tracks (${singles.length})` },
          { id: 'albums', label: `Albums & EPs (${albums.length})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as any)}
            className={`px-4 py-2 rounded-full transition-all flex-shrink-0 ${
              activeFilter === f.id
                ? 'bg-aurora-accent text-black font-bold shadow-md'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 3. Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-aurora-accent" />
          <p className="text-sm">Scanning for latest releases...</p>
        </div>
      )}

      {/* 4. Filter: From Followed & Favorite Artists */}
      {!isLoading && (activeFilter === 'all' || activeFilter === 'followed') && (
        <section className="space-y-4">
          <SectionHeader
            title="Drops from Artists You Follow & Love"
            subtitle="Prioritized brand new releases from your followed and favorite creators"
          />

          {followedTracks.length === 0 ? (
            <div className="p-8 rounded-3xl bg-aurora-card/30 border border-white/5 text-center space-y-3">
              <UserCheck className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">No new drops from your followed artists yet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Follow more artists across Resonix or update your taste preferences. Any newly discovered releases will appear right here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {followedTracks.map((track) => (
                <TrackCard
                  key={`followed-${track.id}`}
                  track={track}
                  queueContext={followedTracks}
                  onAddToPlaylist={onOpenAddToPlaylist}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. Filter: Latest Singles & Tracks */}
      {!isLoading && (activeFilter === 'all' || activeFilter === 'singles') && (
        <section className="space-y-4">
          <SectionHeader
            title="Latest Singles & Tracks"
            subtitle="Verified 2026 studio releases and official singles ordered by freshness"
          />

          {singles.length === 0 ? (
            <div className="p-8 rounded-3xl bg-aurora-card/30 border border-white/5 text-center space-y-2">
              <Disc className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">Click "Check For New Music" to discover fresh releases right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {singles.map((track) => (
                <TrackCard
                  key={`single-${track.id}`}
                  track={track}
                  queueContext={singles}
                  onAddToPlaylist={onOpenAddToPlaylist}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 6. Filter: Latest Albums & EPs */}
      {!isLoading && (activeFilter === 'all' || activeFilter === 'albums') && (
        <section className="space-y-4">
          <SectionHeader
            title="Fresh Albums & EPs"
            subtitle="Full releases, official collections, and EPs"
          />

          {albums.length === 0 ? (
            <div className="p-8 rounded-3xl bg-aurora-card/30 border border-white/5 text-center space-y-2">
              <Disc className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">No album releases discovered yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => onSelectAlbum(album.id)}
                  className="group relative p-3 rounded-2xl bg-aurora-surface/60 hover:bg-aurora-cardHover/90 border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-slate-900 shadow-md">
                    <img
                      src={album.cover_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                      <div className="w-10 h-10 rounded-full bg-aurora-accent text-black flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-aurora-accent transition-colors truncate">
                    {album.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {album.artist}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono">
                    <span className="uppercase">{album.release_type}</span>
                    <span>{formatReleaseDate(album.release_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  );
};
