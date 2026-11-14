import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import { Track } from '../../types/music';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { SafeImage } from './SafeImage';

interface TrackCardProps {
  track: Track;
  queueContext?: Track[];
  onAddToPlaylist?: (track: Track) => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({ track, queueContext }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isLiked, toggleLike } = useLibraryStore();
  const { user } = useAuthStore();

  const isCurrent = currentTrack?.id === track.id;
  const isPlayingThis = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queueContext);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(track, user?.id);
  };

  return (
    <div
      onClick={() => handlePlayClick({ stopPropagation: () => {} } as any)}
      className="group relative p-3 rounded-xl bg-aurora-surface/60 hover:bg-aurora-cardHover/90 border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* Artwork container */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-900 shadow-md">
        <SafeImage
          src={track.artwork_url}
          alt={track.title}
          aspectRatio="square"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Quality badge */}
        {track.bitrate && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-emerald-400 border border-emerald-500/20">
            {track.bitrate.split(' ')[0]}
          </span>
        )}

        {/* Floating Play Button */}
        <div
          className={`absolute bottom-2 right-2 transition-all duration-300 ${
            isPlayingThis
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          <button
            onClick={handlePlayClick}
            className="w-10 h-10 rounded-full bg-aurora-accent text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
            aria-label={isPlayingThis ? 'Pause' : 'Play'}
          >
            {isPlayingThis ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Like Button */}
        <button
          onClick={handleLikeClick}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all ${
            liked
              ? 'text-rose-500 bg-black/50 opacity-100'
              : 'text-white/70 bg-black/40 opacity-0 group-hover:opacity-100 hover:text-white'
          }`}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Track Info */}
      <div className="mt-3 flex-1 flex flex-col justify-between">
        <div>
          <h3
            className={`font-semibold text-sm line-clamp-1 transition-colors ${
              isCurrent ? 'text-aurora-accent' : 'text-white group-hover:text-aurora-accent'
            }`}
          >
            {track.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-medium">
            {track.artist}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
          <span className="capitalize">{track.provider}</span>
          <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
};
