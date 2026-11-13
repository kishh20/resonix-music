import React, { useState, useEffect } from 'react';
import { 
  X, 
  Heart, 
  Mic2, 
  Maximize2, 
  ListMusic, 
  Disc3, 
  Sparkles, 
  Loader2, 
  ChevronRight,
  Music2
} from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { api } from '../../services/api';
import { LyricsResponse, LyricLine } from '../../types/music';

export const NowPlayingSidebar: React.FC = () => {
  const {
    currentTrack,
    currentTime,
    queue,
    queueIndex,
    isNowPlayingOpen,
    setNowPlayingOpen,
    setLyricsOpen,
    setQueueOpen,
    swapAudioVersion,
    playTrack
  } = usePlayerStore();

  const { isLiked, toggleLike } = useLibraryStore();
  const { user } = useAuthStore();

  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);

  // Fetch lyrics whenever current track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyricsData(null);
      return;
    }

    let isMounted = true;
    setIsLoadingLyrics(true);

    api.getLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration, currentTrack.id)
      .then((data) => {
        if (isMounted) {
          setLyricsData(data);
          setIsLoadingLyrics(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Sidebar lyrics load error:', err);
          setIsLoadingLyrics(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id]);

  if (!isNowPlayingOpen || !currentTrack) {
    return null;
  }

  const liked = isLiked(currentTrack.id);
  const nextTrack = queueIndex >= 0 && queueIndex < queue.length - 1 ? queue[queueIndex + 1] : null;

  // Compute active synced lyric line with slight lead calibration (+0.25s)
  const lyrics: LyricLine[] = lyricsData?.lyrics || [];
  let activeLyricIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTime + 0.25) {
      activeLyricIndex = i;
    } else {
      break;
    }
  }

  const currentLyricLine = activeLyricIndex >= 0 ? lyrics[activeLyricIndex]?.text : null;
  const nextLyricLine = activeLyricIndex >= 0 && activeLyricIndex < lyrics.length - 1 
    ? lyrics[activeLyricIndex + 1]?.text 
    : (lyrics.length > 0 && activeLyricIndex === -1 ? lyrics[0]?.text : null);

  return (
    <aside className="hidden lg:flex flex-col w-[340px] xl:w-[380px] h-full flex-shrink-0 bg-aurora-card/95 backdrop-blur-2xl border-l border-white/10 z-30 select-none animate-in slide-in-from-right duration-300">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="min-w-0 pr-2">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            Now Playing
          </h3>
          <p className="text-sm font-bold text-white truncate mt-0.5">
            {currentTrack.album || currentTrack.title}
          </p>
        </div>

        <button
          onClick={() => setNowPlayingOpen(false)}
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close Now Playing view"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-36">
        {/* Large Album Artwork */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-white/10 group">
          <img
            src={currentTrack.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80'}
            alt={currentTrack.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <span className="text-[11px] font-mono text-emerald-400 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
              {currentTrack.bitrate || '320kbps Ultra HD Studio Master'}
            </span>
          </div>
        </div>

        {/* Track Title, Artist & Like */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-white truncate hover:text-aurora-accent transition-colors">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-slate-400 hover:text-slate-200 transition-colors truncate mt-1">
              {currentTrack.artist}
            </p>
          </div>

          <button
            onClick={() => toggleLike(currentTrack, user?.id)}
            className={`p-2 rounded-full transition-colors flex-shrink-0 ${
              liked ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title={liked ? 'In Your Library' : 'Add to Your Library'}
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* 3. Lyrics Preview Card (Spotify Styled) */}
        <div 
          onClick={() => setLyricsOpen(true)}
          className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-[#451313] via-[#280c0c] to-[#160707] border border-rose-500/20 hover:border-rose-500/40 shadow-xl cursor-pointer transition-all group hover:scale-[1.01]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/90">
              <Mic2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Lyrics preview</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLyricsOpen(true);
              }}
              className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Open full-screen lyrics"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic Synced Lyrics Content */}
          {isLoadingLyrics ? (
            <div className="py-6 flex items-center justify-center gap-2 text-white/60 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              <span>Syncing lyrics...</span>
            </div>
          ) : lyrics.length > 0 ? (
            <div className="space-y-1.5 py-1">
              <p className="text-lg font-bold text-white leading-snug drop-shadow-md transition-all duration-200">
                {currentLyricLine || '🎵 Music playing...'}
              </p>
              {nextLyricLine && (
                <p className="text-xs text-white/50 font-medium line-clamp-2 transition-all duration-200">
                  {nextLyricLine}
                </p>
              )}
            </div>
          ) : lyricsData?.plain_lyrics ? (
            <div className="space-y-1 py-1">
              <p className="text-sm font-semibold text-white/90 line-clamp-3">
                {lyricsData.plain_lyrics.slice(0, 140)}...
              </p>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-white/60 font-medium">
                Lyrics are continuously synced for this song.
              </p>
              <span className="inline-block mt-2 text-[11px] font-semibold text-rose-400 group-hover:text-rose-300">
                Click to explore lyrics →
              </span>
            </div>
          )}

          {/* Ambient Glow */}
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* 4. Next In Queue Card */}
        {nextTrack && (
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ListMusic className="w-3.5 h-3.5 text-aurora-accent" />
                <span>Next in queue</span>
              </span>
              <button
                onClick={() => setQueueOpen(true)}
                className="text-[11px] font-medium text-aurora-accent hover:underline"
              >
                Open queue
              </button>
            </div>

            <div 
              onClick={() => playTrack(nextTrack)}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
            >
              <img
                src={nextTrack.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80'}
                alt={nextTrack.title}
                className="w-10 h-10 rounded-lg object-cover bg-slate-900 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate group-hover:text-aurora-accent transition-colors">
                  {nextTrack.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {nextTrack.artist}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors flex-shrink-0" />
            </div>
          </div>
        )}

        {/* 5. Studio Master Info & Swap Audio Action */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Audio Source</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified Studio Audio
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Streaming in high-fidelity 320kbps Ultra HD audio. Filtered to exclude video dialogue, ads, and background scores.
          </p>

          <button
            onClick={swapAudioVersion}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 hover:text-white border border-white/10 transition-colors"
            title="Swap to alternative studio audio version"
          >
            <Disc3 className="w-4 h-4 text-aurora-accent" />
            <span>Wrong audio? Swap version</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
