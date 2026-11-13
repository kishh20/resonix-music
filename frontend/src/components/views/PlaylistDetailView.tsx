import React, { useState } from 'react';
import { Play, Shuffle, Trash2, ArrowLeft, Music, Clock } from 'lucide-react';
import { Track } from '../../types/music';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { TrackRow } from '../common/TrackRow';

interface PlaylistDetailViewProps {
  playlistId: string;
  onBack: () => void;
  onOpenAddToPlaylist: (track: Track) => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  playlistId,
  onBack,
  onOpenAddToPlaylist
}) => {
  const { playlists, deletePlaylist, removeTrackFromPlaylist } = useLibraryStore();
  const { playTrack, toggleShuffle } = usePlayerStore();
  const { user } = useAuthStore();

  const [filterText, setFilterText] = useState('');

  const playlist = playlists.find(p => p.id === playlistId);

  if (!playlist) {
    return (
      <div className="py-20 text-center text-slate-400 space-y-4">
        <p>Playlist not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const filteredTracks = playlist.tracks.filter(t =>
    t.title.toLowerCase().includes(filterText.toLowerCase()) ||
    t.artist.toLowerCase().includes(filterText.toLowerCase())
  );

  const totalDurationSecs = playlist.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalMins = Math.floor(totalDurationSecs / 60);

  const handlePlayAll = () => {
    if (playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleShufflePlay = () => {
    if (playlist.tracks.length > 0) {
      toggleShuffle();
      const randomIdx = Math.floor(Math.random() * playlist.tracks.length);
      playTrack(playlist.tracks[randomIdx], playlist.tracks);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${playlist.title}"?`)) {
      await deletePlaylist(playlist.id, user?.id);
      onBack();
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Playlists</span>
      </button>

      {/* Playlist Hero Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-gradient-to-t from-aurora-surface via-aurora-card to-emerald-950/40 border border-white/10 shadow-2xl">
        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl flex-shrink-0 border border-white/10">
          {playlist.cover_url ? (
            <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
              <Music className="w-16 h-16" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 font-semibold">
            Custom Playlist
          </span>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mt-1 truncate">
            {playlist.title}
          </h1>

          {playlist.description && (
            <p className="text-sm text-slate-300 mt-2 line-clamp-2">
              {playlist.description}
            </p>
          )}

          <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 mt-4 font-mono">
            <span>{playlist.track_count} tracks</span>
            <span>•</span>
            <span>Approx. {totalMins} minutes</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayAll}
            disabled={playlist.tracks.length === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-aurora-accent text-black font-bold text-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>Play</span>
          </button>

          <button
            onClick={handleShufflePlay}
            disabled={playlist.tracks.length === 0}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
            title="Shuffle play"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="p-3 rounded-full text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
            title="Delete playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Filter within playlist */}
        {playlist.tracks.length > 5 && (
          <div className="w-48 sm:w-64">
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter playlist..."
              className="w-full px-3 py-1.5 rounded-xl bg-aurora-surface border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aurora-accent"
            />
          </div>
        )}
      </div>

      {/* Tracks Table */}
      {filteredTracks.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm bg-aurora-card/20 rounded-2xl border border-white/5">
          {playlist.tracks.length === 0
            ? "This playlist has no songs yet. Search and click '+ Add to Playlist'!"
            : "No songs match your filter."}
        </div>
      ) : (
        <div className="space-y-1 bg-aurora-card/30 rounded-2xl p-2 border border-white/5">
          {filteredTracks.map((track, idx) => (
            <TrackRow
              key={`${track.id}-${idx}`}
              track={track}
              index={idx}
              queueContext={playlist.tracks}
              onOpenAddToPlaylist={onOpenAddToPlaylist}
              onRemoveFromPlaylist={(trackId) => removeTrackFromPlaylist(playlist.id, trackId, user?.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
