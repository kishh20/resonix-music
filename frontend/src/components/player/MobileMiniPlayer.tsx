import React from 'react';
import { Play, Pause, SkipForward, Heart, Loader2 } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAuthStore } from '../../stores/useAuthStore';

export const MobileMiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    setFullPlayerOpen
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const { user } = useAuthStore();

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onClick={() => setFullPlayerOpen(true)}
      className="md:hidden fixed bottom-16 left-2 right-2 z-40 h-14 bg-aurora-card/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex items-center justify-between px-3 overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
    >
      {/* Slim progress bar along top edge */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
        <div
          className="h-full bg-aurora-accent"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Left: Thumbnail & Song info */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <img
          src={currentTrack.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
          alt={currentTrack.title}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-800"
        />
        <div className="min-w-0 pr-2">
          <p className="text-xs font-semibold text-white truncate">
            {currentTrack.title}
          </p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {currentTrack.artist}
          </p>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => toggleLike(currentTrack, user?.id)}
          className={`p-2 rounded-full ${liked ? 'text-rose-500' : 'text-slate-400'}`}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md active:scale-95"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isBuffering ? (
            <Loader2 className="w-4 h-4 animate-spin text-black" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={nextTrack}
          className="p-2 text-slate-300 hover:text-white"
          aria-label="Next track"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
};
