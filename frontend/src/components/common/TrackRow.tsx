import React, { useState } from 'react';
import { Play, Pause, Heart, MoreVertical, Plus, ListPlus, UserPlus, UserCheck, AlertTriangle } from 'lucide-react';
import { Track } from '../../types/music';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface TrackRowProps {
  track: Track;
  index: number;
  queueContext?: Track[];
  onOpenAddToPlaylist?: (track: Track) => void;
  onRemoveFromPlaylist?: (trackId: string) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  queueContext,
  onOpenAddToPlaylist,
  onRemoveFromPlaylist
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = usePlayerStore();
  const { isLiked, toggleLike, isArtistFollowed, followArtist, unfollowArtist } = useLibraryStore();
  const { user } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const isPlayingThis = isCurrent && isPlaying;
  const liked = isLiked(track.id);
  const isFollowed = isArtistFollowed(track.artist);
  const isUnavailable = track.availability_status === 'unavailable';

  const handleRowClick = () => {
    if (isUnavailable) {
      alert(`"${track.title}" is currently unavailable for streaming. Use Spotify Importer or Search to find alternatives.`);
      return;
    }
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queueContext);
    }
  };

  const handleToggleFollow = () => {
    if (isFollowed) {
      unfollowArtist(track.artist, user?.id);
    } else {
      followArtist(track.artist, track.artist_id, track.artwork_url, track.provider, user?.id);
    }
    setMenuOpen(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-sm ${
        isCurrent
          ? 'bg-white/10 text-aurora-accent font-medium'
          : isUnavailable
          ? 'opacity-60 hover:bg-white/5 text-slate-400'
          : 'hover:bg-white/5 text-slate-300'
      }`}
    >
      {/* Index or Equalizer / Play icon */}
      <div className="w-6 flex-shrink-0 text-center font-mono text-xs text-slate-500">
        {isPlayingThis ? (
          <div className="flex items-end justify-center gap-0.5 h-3">
            <span className="w-0.5 h-3 bg-aurora-accent animate-pulse"></span>
            <span className="w-0.5 h-2 bg-aurora-accent animate-pulse delay-75"></span>
            <span className="w-0.5 h-3.5 bg-aurora-accent animate-pulse delay-150"></span>
          </div>
        ) : (
          <>
            <span className="group-hover:hidden">{index + 1}</span>
            <Play className="w-3.5 h-3.5 hidden group-hover:block mx-auto fill-current text-white" />
          </>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-slate-800">
        <img
          src={track.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
          alt={track.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {isUnavailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2">
          <p className={`truncate font-medium ${isCurrent ? 'text-aurora-accent' : 'text-white'}`}>
            {track.title}
          </p>
          {isUnavailable && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Unavailable
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-400 mt-0.5">
          {track.artist}
        </p>
      </div>

      {/* Album (Desktop only) */}
      <div className="hidden md:block flex-1 min-w-0 pr-4 text-xs text-slate-400 truncate">
        {track.album || 'Single'}
      </div>

      {/* Provider badge */}
      <div className="hidden sm:block flex-shrink-0">
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
          {track.provider}
        </span>
      </div>

      {/* Like Heart Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleLike(track, user?.id);
        }}
        className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
          liked
            ? 'text-rose-500'
            : 'text-slate-500 hover:text-white opacity-0 group-hover:opacity-100'
        }`}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
      </button>

      {/* Duration */}
      <div className="w-12 text-right font-mono text-xs text-slate-400 flex-shrink-0">
        {formatDuration(track.duration)}
      </div>

      {/* Context Menu Button */}
      <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded text-slate-500 hover:text-white transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-aurora-surface border border-white/10 shadow-2xl z-50 py-1 text-xs">
              <button
                onClick={() => {
                  addToQueue(track);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <ListPlus className="w-4 h-4 text-emerald-400" />
                Add to Queue
              </button>
              {onOpenAddToPlaylist && (
                <button
                  onClick={() => {
                    onOpenAddToPlaylist(track);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <Plus className="w-4 h-4 text-purple-400" />
                  Add to Playlist
                </button>
              )}
              <button
                onClick={handleToggleFollow}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                {isFollowed ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Unfollow {track.artist}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-cyan-400" />
                    Follow {track.artist}
                  </>
                )}
              </button>
              {onRemoveFromPlaylist && (
                <button
                  onClick={() => {
                    onRemoveFromPlaylist(track.id);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-white/10"
                >
                  Remove from Playlist
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
