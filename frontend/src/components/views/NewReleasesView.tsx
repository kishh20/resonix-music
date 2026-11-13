import React, { useEffect, useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { Track, CatalogueAlbum, NewReleasesResponse } from '../../types/music';
import { api } from '../../services/api';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAuthStore } from '../../stores/useAuthStore';
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

  const [data, setData] = useState<NewReleasesResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'followed' | 'singles' | 'albums'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchReleases = async () => {
    try {
      const resp = await api.getNewReleases(user?.id);
      setData(resp);
    } catch (e) {
      console.error('Failed to load new releases:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, [user?.id, followedArtists.length]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await api.syncDiscoveryNow();
      setSyncFeedback(`Discovered ${res.new_tracks_discovered || 0} new releases!`);
      await fetchReleases();
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (e: any) {
      setSyncFeedback('Sync completed with existing catalogue.');
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
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold mb-3">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Continuous Discovery Engine</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            New Releases & Drops
          </h1>

          <p className="text-xs md:text-sm text-slate-300 mt-2 max-w-xl font-medium">
            Continuously updated catalogue of newly uploaded songs, singles, EPs, and albums from Audius, Jamendo, and Free Music Archive.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Auto-sync: Every 2 hours
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
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-aurora-accent hover:bg-aurora-accentHover text-black font-bold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Scanning Providers...' : 'Check For New Music'}</span>
          </button>

          {syncFeedback && (
            <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
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
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-aurora-accent" />
          <p className="text-sm">Fetching fresh releases from music providers...</p>
        </div>
      )}

      {/* 4. Section: From Followed Artists (Prioritized) */}
      {!isLoading && (activeFilter === 'all' || activeFilter === 'followed') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-xl md:text-2xl font-bold text-white">
                From Artists You Follow
              </h2>
            </div>
            {followedTracks.length > 0 && (
              <span className="text-xs font-mono text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Prioritized Drops
              </span>
            )}
          </div>

          {followedTracks.length === 0 ? (
            <div className="p-6 rounded-2xl bg-aurora-surface/40 border border-dashed border-white/10 text-center">
              <p className="text-sm font-semibold text-white">No drops from followed artists yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Follow your favorite artists using the "+ Follow" button on any track or album, and their latest releases will automatically be highlighted here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {followedTracks.map((track) => (
                <div key={track.id} className="relative">
                  <TrackCard
                    track={track}
                    queueContext={followedTracks}
                    onAddToPlaylist={onOpenAddToPlaylist}
                  />
                  <div className="absolute top-2 right-2 z-20 pointer-events-none">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500 text-black shadow">
                      Followed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. Section: New Albums & EPs */}
      {!isLoading && (activeFilter === 'all' || activeFilter === 'albums') && albums.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Fresh Albums & EPs"
            subtitle="Full collections and multi-track records freshly landed in the catalogue"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.map((album) => {
              const isFollowed = isArtistFollowed(album.artist);
              return (
                <div
                  key={album.id}
                  onClick={() => onSelectAlbum(album.id)}
                  className="group relative p-3 rounded-2xl bg-aurora-surface/70 hover:bg-aurora-cardHover border border-white/5 hover:border-white/10 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900 shadow-md mb-3">
                    {album.cover_url ? (
                      <img
                        src={album.cover_url}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                        <Disc className="w-12 h-12" />
                      </div>
                    )}

                    <span className="absolute top-2 left-2 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-500/30">
                      {album.release_type}
                    </span>

                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (album.tracks && album.tracks.length > 0) {
                            playTrack(album.tracks[0], album.tracks);
                          } else {
                            onSelectAlbum(album.id);
                          }
                        }}
                        className="w-10 h-10 rounded-full bg-aurora-accent text-black flex items-center justify-center shadow-lg hover:scale-105"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-aurora-accent truncate transition-colors">
                      {album.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {album.artist}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-white/5">
                    <span>{formatReleaseDate(album.release_date)}</span>
                    <span>{album.track_count} {album.track_count === 1 ? 'track' : 'tracks'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Section: Latest Singles & Tracks */}
      {!isLoading && (activeFilter === 'all' || activeFilter === 'singles') && singles.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Latest Singles & Track Drops"
            subtitle="Standalone releases and premiere singles"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {singles.map((track) => (
              <div key={track.id} className="relative flex flex-col">
                <TrackCard
                  track={track}
                  queueContext={singles}
                  onAddToPlaylist={onOpenAddToPlaylist}
                />
                {/* Release date subtitle under card */}
                <div className="px-1 pt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{formatReleaseDate(track.release_date)}</span>
                  {track.availability_status === 'unavailable' ? (
                    <span className="text-amber-400">Unavailable</span>
                  ) : (
                    <span className="text-emerald-400">Available</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
