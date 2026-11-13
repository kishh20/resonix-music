import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Shuffle, Disc, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { CatalogueAlbum, Track } from '../../types/music';
import { api } from '../../services/api';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { TrackRow } from '../common/TrackRow';

interface AlbumDetailViewProps {
  albumId: string;
  onBack: () => void;
  onOpenAddToPlaylist: (track: Track) => void;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({
  albumId,
  onBack,
  onOpenAddToPlaylist
}) => {
  const { playTrack, toggleShuffle } = usePlayerStore();
  const { isArtistFollowed, followArtist, unfollowArtist } = useLibraryStore();
  const { user } = useAuthStore();

  const [album, setAlbum] = useState<CatalogueAlbum | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.getAlbum(albumId)
      .then(setAlbum)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [albumId]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-aurora-accent" />
        <p className="text-sm">Loading album details...</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="py-20 text-center text-slate-400 space-y-4">
        <p>Album not found in catalogue.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
        >
          Return
        </button>
      </div>
    );
  }

  const followed = isArtistFollowed(album.artist);
  const tracks = album.tracks || [];

  const handleToggleFollow = () => {
    if (followed) {
      unfollowArtist(album.artist, user?.id);
    } else {
      followArtist(album.artist, album.artist_id, album.cover_url, album.provider, user?.id);
    }
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShufflePlay = () => {
    if (tracks.length > 0) {
      toggleShuffle();
      const randIdx = Math.floor(Math.random() * tracks.length);
      playTrack(tracks[randIdx], tracks);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Album Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-gradient-to-t from-aurora-surface via-aurora-card to-cyan-950/40 border border-white/10 shadow-2xl">
        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl flex-shrink-0 border border-white/10">
          {album.cover_url ? (
            <img src={album.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
              <Disc className="w-16 h-16" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs uppercase font-mono tracking-widest text-cyan-400 font-semibold">
              {album.release_type.toUpperCase()} • {album.provider.toUpperCase()}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mt-1 truncate">
            {album.title}
          </h1>

          <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
            <p className="text-base text-slate-200 font-bold">
              {album.artist}
            </p>
            <button
              onClick={handleToggleFollow}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                followed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {followed ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{followed ? 'Following' : 'Follow Artist'}</span>
            </button>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 mt-4 font-mono">
            <span>{album.track_count} tracks</span>
            <span>•</span>
            <span>Released {new Date(album.release_date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3 py-2">
        <button
          onClick={handlePlayAll}
          disabled={tracks.length === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-aurora-accent text-black font-bold text-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 shadow-lg shadow-emerald-500/20"
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
          <span>Play Album</span>
        </button>

        <button
          onClick={handleShufflePlay}
          disabled={tracks.length === 0}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
          title="Shuffle album"
        >
          <Shuffle className="w-4 h-4" />
        </button>
      </div>

      {/* Tracks List */}
      <div className="space-y-1 bg-aurora-card/30 rounded-2xl p-2 border border-white/5">
        {tracks.length === 0 ? (
          <p className="py-8 text-center text-slate-500 text-xs">
            Album tracks are being indexed by the automatic discovery engine.
          </p>
        ) : (
          tracks.map((track, idx) => (
            <TrackRow
              key={`${track.id}-${idx}`}
              track={track}
              index={idx}
              queueContext={tracks}
              onOpenAddToPlaylist={onOpenAddToPlaylist}
            />
          ))
        )}
      </div>
    </div>
  );
};
