import React from 'react';
import { 
  ChevronDown, 
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
  Loader2,
  Volume2,
  Mic2,
  Disc3,
  Moon,
  Radio
} from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useJamStore } from '../../stores/useJamStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { ProgressBar } from './ProgressBar';

export const MobileFullPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    shuffle,
    repeat,
    isFullPlayerOpen,
    volume,
    setVolume,
    togglePlay,
    nextTrack,
    previousTrack,
    toggleShuffle,
    toggleRepeat,
    setFullPlayerOpen,
    setQueueOpen,
    setVisualizerOpen,
    setLyricsOpen,
    swapAudioVersion,
    sleepTimerEndsAt,
    setSleepTimerOpen
  } = usePlayerStore();

  const {
    setOpen: setJamOpen,
    isConnected: isJamConnected
  } = useJamStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const { user } = useAuthStore();

  if (!isFullPlayerOpen || !currentTrack) return null;

  const liked = isLiked(currentTrack.id);

  return (
    <div className="fixed inset-0 z-50 bg-aurora-dark flex flex-col justify-between p-6 overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Dynamic ambient backdrop blur */}
      <div
        className="absolute inset-0 opacity-25 filter blur-3xl pointer-events-none scale-125"
        style={{
          backgroundImage: `url(${currentTrack.artwork_url})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between pb-2">
        <button
          onClick={() => setFullPlayerOpen(false)}
          className="p-2 -ml-2 rounded-full text-slate-300 hover:text-white"
          aria-label="Collapse player"
        >
          <ChevronDown className="w-7 h-7" />
        </button>

        <div className="text-center">
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
            Playing From {currentTrack.provider}
          </p>
          <p className="text-xs font-semibold text-slate-200 mt-0.5">
            {currentTrack.album || 'Single'}
          </p>
        </div>

        <div className="flex items-center gap-1 -mr-2">
          {/* Spotify Jam */}
          <button
            onClick={() => setJamOpen(true)}
            className={`p-2 rounded-full ${isJamConnected ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}`}
            title="Spotify Jam"
          >
            <Radio className={`w-5 h-5 ${isJamConnected ? 'animate-pulse' : ''}`} />
          </button>

          {/* Sleep Timer */}
          <button
            onClick={() => setSleepTimerOpen(true)}
            className={`p-2 rounded-full ${sleepTimerEndsAt ? 'text-purple-400' : 'text-slate-300 hover:text-white'}`}
            title="Sleep Timer"
          >
            <Moon className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setVisualizerOpen(true);
              setFullPlayerOpen(false);
            }}
            className="p-2 rounded-full text-slate-300 hover:text-white"
            aria-label="Spectrum visualizer"
          >
            <Activity className="w-5 h-5 text-aurora-accent" />
          </button>
        </div>
      </div>

      {/* Center Artwork */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-4 my-auto">
        <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900">
          <img
            src={currentTrack.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="relative z-10 flex flex-col gap-4 max-w-md mx-auto w-full pb-4">
        {/* Title, Artist & Like button */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl font-bold text-white truncate">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-slate-400 truncate mt-1">
              {currentTrack.artist}
            </p>
          </div>
          <button
            onClick={() => toggleLike(currentTrack, user?.id)}
            className={`p-2 rounded-full transition-colors ${
              liked ? 'text-rose-500' : 'text-slate-400'
            }`}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="pt-2">
          <ProgressBar />
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between px-2 pt-2">
          <button
            onClick={toggleShuffle}
            className={`p-2 rounded-full ${
              shuffle ? 'text-aurora-accent' : 'text-slate-400'
            }`}
            aria-label="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={previousTrack}
            className="p-2 text-white"
            aria-label="Previous track"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-xl active:scale-95 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <Loader2 className="w-8 h-8 animate-spin text-black" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-2 text-white"
            aria-label="Next track"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-2 rounded-full ${
              repeat !== 'off' ? 'text-aurora-accent' : 'text-slate-400'
            }`}
            aria-label="Repeat"
          >
            {repeat === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Volume & Queue Bottom Strip */}
        <div className="flex items-center justify-between pt-4 px-2 border-t border-white/5">
          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={swapAudioVersion}
              className="p-2 text-indigo-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold bg-indigo-500/10 rounded-xl transition-colors"
              title="Swap studio audio"
            >
              <Disc3 className="w-4 h-4" />
              <span>Swap</span>
            </button>

            <button
              onClick={() => {
                setLyricsOpen(true);
                setFullPlayerOpen(false);
              }}
              className="p-2 text-emerald-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 rounded-xl transition-colors"
            >
              <Mic2 className="w-4 h-4" />
              <span>Lyrics</span>
            </button>

            <button
              onClick={() => {
                setQueueOpen(true);
                setFullPlayerOpen(false);
              }}
              className="p-2 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-medium"
            >
              <ListMusic className="w-5 h-5" />
              <span>Queue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
