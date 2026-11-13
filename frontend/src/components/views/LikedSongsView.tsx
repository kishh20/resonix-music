import React, { useState } from 'react';
import { Heart, Play, Shuffle, ArrowLeft, Search } from 'lucide-react';
import { Track } from '../../types/music';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { TrackRow } from '../common/TrackRow';

interface LikedSongsViewProps {
  onBack: () => void;
  onOpenAddToPlaylist: (track: Track) => void;
}

export const LikedSongsView: React.FC<LikedSongsViewProps> = ({
  onBack,
  onOpenAddToPlaylist
}) => {
  const { likedSongs } = useLibraryStore();
  const { playTrack, toggleShuffle } = usePlayerStore();
  const [filterText, setFilterText] = useState('');

  const filtered = likedSongs.filter(t =>
    t.title.toLowerCase().includes(filterText.toLowerCase()) ||
    t.artist.toLowerCase().includes(filterText.toLowerCase())
  );

  const totalSecs = likedSongs.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalMins = Math.floor(totalSecs / 60);

  const handlePlayAll = () => {
    if (likedSongs.length > 0) {
      playTrack(likedSongs[0], likedSongs);
    }
  };

  const handleShufflePlay = () => {
    if (likedSongs.length > 0) {
      toggleShuffle();
      const randIdx = Math.floor(Math.random() * likedSongs.length);
      playTrack(likedSongs[randIdx], likedSongs);
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

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-gradient-to-t from-aurora-surface via-purple-950/40 to-rose-950/60 border border-white/10 shadow-2xl">
        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 shadow-2xl flex-shrink-0 flex items-center justify-center text-white border border-white/10">
          <Heart className="w-24 h-24 fill-current drop-shadow-lg" />
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <span className="text-xs uppercase font-mono tracking-widest text-rose-400 font-semibold">
            Collection
          </span>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mt-1 truncate">
            Liked Songs
          </h1>

          <p className="text-sm text-slate-300 mt-2 font-medium">
            Your personal sanctuary of hearted melodies & beats
          </p>

          <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 mt-4 font-mono">
            <span>{likedSongs.length} tracks</span>
            <span>•</span>
            <span>{totalMins} minutes</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayAll}
            disabled={likedSongs.length === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-aurora-accent text-black font-bold text-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>Play</span>
          </button>

          <button
            onClick={handleShufflePlay}
            disabled={likedSongs.length === 0}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {/* Filter */}
        {likedSongs.length > 5 && (
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search in liked songs..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-aurora-surface border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aurora-accent"
            />
          </div>
        )}
      </div>

      {/* Tracks List */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-500 text-sm bg-aurora-card/20 rounded-2xl border border-white/5">
          {likedSongs.length === 0
            ? "You haven't liked any songs yet. Tap the heart on any track to save it here!"
            : "No liked songs match your filter."}
        </div>
      ) : (
        <div className="space-y-1 bg-aurora-card/30 rounded-2xl p-2 border border-white/5">
          {filtered.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              queueContext={likedSongs}
              onOpenAddToPlaylist={onOpenAddToPlaylist}
            />
          ))}
        </div>
      )}
    </div>
  );
};
