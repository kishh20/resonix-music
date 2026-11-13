import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Heart, 
  ListMusic, 
  Activity, 
  Maximize2,
  Loader2,
  AlertCircle,
  Mic2,
  Disc3,
  PanelRightClose,
  Moon,
  Radio
} from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useJamStore } from '../../stores/useJamStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { ProgressBar } from './ProgressBar';
import { VolumeSlider } from './VolumeSlider';

export const BottomPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    audioError,
    shuffle,
    repeat,
    isQueueOpen,
    isVisualizerOpen,
    isLyricsOpen,
    isNowPlayingOpen,
    sleepTimerEndsAt,
    sleepTimerMinutes,
    togglePlay,
    nextTrack,
    previousTrack,
    toggleShuffle,
    toggleRepeat,
    setQueueOpen,
    setVisualizerOpen,
    setFullPlayerOpen,
    toggleLyrics,
    toggleNowPlaying,
    swapAudioVersion,
    setSleepTimerOpen
  } = usePlayerStore();

  const {
    setOpen: setJamOpen,
    isConnected: isJamConnected,
    participants: jamParticipants
  } = useJamStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const { user } = useAuthStore();

  if (!currentTrack) {
    return null;
  }

  const liked = isLiked(currentTrack.id);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 h-24 bg-aurora-card/95 backdrop-blur-xl border-t border-white/10 px-4 md:px-6 flex items-center justify-between gap-4 select-none">
      {/* 1. Left: Track Info */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        <div
          onClick={() => setFullPlayerOpen(true)}
          className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 shadow-md group cursor-pointer"
        >
          <img
            src={currentTrack.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
            alt={currentTrack.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="min-w-0 pr-2">
          <h4
            onClick={() => setFullPlayerOpen(true)}
            className="text-sm font-semibold text-white truncate hover:text-aurora-accent cursor-pointer transition-colors"
          >
            {currentTrack.title}
          </h4>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {currentTrack.artist}
          </p>
        </div>

        <button
          onClick={() => toggleLike(currentTrack, user?.id)}
          className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
            liked ? 'text-rose-500' : 'text-slate-400 hover:text-white'
          }`}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* 2. Center: Playback Controls & Progress Bar */}
      <div className="flex flex-col items-center justify-center max-w-2xl w-2/4">
        {/* Buttons */}
        <div className="flex items-center gap-4 mb-1">
          <button
            onClick={toggleShuffle}
            className={`p-1.5 rounded-full transition-colors ${
              shuffle ? 'text-aurora-accent' : 'text-slate-400 hover:text-white'
            }`}
            title={shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={previousTrack}
            className="p-1.5 rounded-full text-slate-300 hover:text-white transition-colors"
            title="Previous track (P)"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isBuffering && !currentTrack}
            className="w-10 h-10 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isBuffering ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-1.5 rounded-full text-slate-300 hover:text-white transition-colors"
            title="Next track (N)"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-1.5 rounded-full transition-colors ${
              repeat !== 'off' ? 'text-aurora-accent' : 'text-slate-400 hover:text-white'
            }`}
            title={`Repeat mode: ${repeat}`}
          >
            {repeat === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Scrubber */}
        <div className="w-full flex items-center">
          <ProgressBar />
        </div>

        {/* Audio Error message toast if any */}
        {audioError && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-rose-500/90 text-white text-[11px] px-3 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
            <AlertCircle className="w-3 h-3" />
            {audioError}
          </div>
        )}
      </div>

      {/* 3. Right: Quality, Visualizer, Queue, Volume */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
        {/* Bitrate / Quality badge */}
        {currentTrack.bitrate && (
          <span className="hidden lg:inline-block text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-emerald-400">
            {currentTrack.bitrate}
          </span>
        )}

        {/* Visualizer Toggle */}
        <button
          onClick={() => setVisualizerOpen(!isVisualizerOpen)}
          className={`p-2 rounded-lg transition-colors ${
            isVisualizerOpen
              ? 'bg-aurora-accent/20 text-aurora-accent'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Audio Spectrum Visualizer"
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Lyrics (Time-synced) Toggle */}
        <button
          onClick={toggleLyrics}
          className={`p-2 rounded-lg transition-colors ${
            isLyricsOpen
              ? 'bg-aurora-accent/20 text-aurora-accent'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Time-Synced Lyrics"
        >
          <Mic2 className="w-4 h-4" />
        </button>

        {/* Swap Studio Audio Version */}
        <button
          onClick={swapAudioVersion}
          className="p-2 rounded-lg text-slate-400 hover:text-aurora-accent hover:bg-white/5 transition-colors"
          title="Wrong audio or intro dialogue? Click to swap clean studio audio version"
        >
          <Disc3 className="w-4 h-4" />
        </button>

        {/* Sleep Timer Toggle */}
        <button
          onClick={() => setSleepTimerOpen(true)}
          className={`p-2 rounded-lg transition-colors relative ${
            sleepTimerEndsAt || sleepTimerMinutes
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={sleepTimerEndsAt ? "Sleep Timer Active (Click to edit/cancel)" : "Sleep Timer"}
        >
          <Moon className="w-4 h-4" />
          {(sleepTimerEndsAt || sleepTimerMinutes) && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-400" />
          )}
        </button>

        {/* Spotify Jam Collaborative Listening */}
        <button
          onClick={() => setJamOpen(true)}
          className={`p-2 rounded-lg transition-colors relative ${
            isJamConnected
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={isJamConnected ? `Spotify Jam Active (${jamParticipants.length} listeners)` : "Spotify Jam (Listen Together)"}
        >
          <Radio className={`w-4 h-4 ${isJamConnected ? 'animate-pulse' : ''}`} />
          {isJamConnected && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        {/* Queue Drawer Toggle */}
        <button
          onClick={() => setQueueOpen(!isQueueOpen)}
          className={`p-2 rounded-lg transition-colors ${
            isQueueOpen
              ? 'bg-aurora-accent/20 text-aurora-accent'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Play Queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Now Playing Right Sidebar Toggle */}
        <button
          onClick={toggleNowPlaying}
          className={`hidden lg:flex p-2 rounded-lg transition-colors ${
            isNowPlayingOpen
              ? 'bg-aurora-accent/20 text-aurora-accent'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Now Playing View"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>

        {/* Volume */}
        <div className="hidden sm:block">
          <VolumeSlider />
        </div>
      </div>
    </footer>
  );
};
