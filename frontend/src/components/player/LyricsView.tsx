import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic2, 
  Sparkles, 
  FileText, 
  Play, 
  RefreshCw, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { api } from '../../services/api';
import { LyricsResponse, LyricLine } from '../../types/music';

export const LyricsView: React.FC = () => {
  const { 
    currentTrack, 
    currentTime, 
    isLyricsOpen, 
    setLyricsOpen, 
    seekTo 
  } = usePlayerStore();

  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlainMode, setIsPlainMode] = useState<boolean>(false);
  const [userScrolled, setUserScrolled] = useState<boolean>(false);
  const [syncOffset, setSyncOffset] = useState<number>(() => {
    return parseFloat(localStorage.getItem('aurora_lyrics_offset') || '0');
  });

  const updateSyncOffset = (delta: number) => {
    const next = Math.round((syncOffset + delta) * 10) / 10;
    setSyncOffset(next);
    localStorage.setItem('aurora_lyrics_offset', next.toString());
  };

  const resetSyncOffset = () => {
    setSyncOffset(0);
    localStorage.setItem('aurora_lyrics_offset', '0');
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const userScrollTimerRef = useRef<any>(null);

  // Fetch lyrics when track changes or lyrics opened
  useEffect(() => {
    if (!isLyricsOpen || !currentTrack) return;

    let isMounted = true;
    setIsLoading(true);

    api.getLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration, currentTrack.id)
      .then((data) => {
        if (isMounted) {
          setLyricsData(data);
          setIsPlainMode(!data.is_synced && Boolean(data.plain_lyrics));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load lyrics:', err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id, isLyricsOpen]);

  // Find active line index
  const activeIndex = React.useMemo(() => {
    if (!lyricsData || !lyricsData.lyrics || lyricsData.lyrics.length === 0) return -1;
    const lines = lyricsData.lyrics;
    
    // Find the last line whose time <= currentTime + lead calibration + user sync offset
    let active = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime + 0.25 + syncOffset) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  }, [lyricsData, currentTime, syncOffset]);

  // Smooth auto-scroll to active line
  useEffect(() => {
    if (userScrolled || isPlainMode) return;
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex, userScrolled, isPlainMode]);

  // Detect manual user scrolling
  const handleScroll = () => {
    setUserScrolled(true);
    if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    userScrollTimerRef.current = setTimeout(() => {
      setUserScrolled(false);
    }, 3500);
  };

  if (!isLyricsOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#070a13] flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* 1. Dynamic Ambient Blurred Artwork Background */}
      <div
        className="absolute inset-0 opacity-30 filter blur-3xl pointer-events-none scale-125 transition-all duration-700"
        style={{
          backgroundImage: `url(${currentTrack.artwork_url || '/favicon.svg'})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070a13]/70 via-[#070a13]/85 to-[#070a13] pointer-events-none" />

      {/* 2. Top Header Bar */}
      <header className="relative z-10 h-20 px-6 md:px-10 flex items-center justify-between border-b border-white/5 backdrop-blur-md">
        {/* Track Info Left */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0 shadow-lg">
            <img 
              src={currentTrack.artwork_url || '/favicon.svg'} 
              alt="" 
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate max-w-sm md:max-w-md">
              {currentTrack.title}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Sync Mode Badge & Controls Right */}
        <div className="flex items-center gap-3">
          {lyricsData?.is_synced && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Time-Synced</span>
              {/* Quick Nudge Calibration */}
              <div className="flex items-center gap-1 pl-2 border-l border-emerald-500/30 text-[11px] font-mono">
                <button
                  onClick={() => updateSyncOffset(-0.5)}
                  className="hover:text-white px-1 py-0.5 rounded bg-black/20"
                  title="Lyrics late? Advance 0.5s"
                >
                  -0.5s
                </button>
                <span
                  onClick={resetSyncOffset}
                  className="cursor-pointer font-bold text-white hover:underline px-0.5"
                  title="Click to reset offset to 0"
                >
                  {syncOffset === 0 ? '0s' : `${syncOffset > 0 ? '+' : ''}${syncOffset}s`}
                </span>
                <button
                  onClick={() => updateSyncOffset(0.5)}
                  className="hover:text-white px-1 py-0.5 rounded bg-black/20"
                  title="Lyrics early? Delay 0.5s"
                >
                  +0.5s
                </button>
              </div>
            </div>
          )}

          {/* Toggle Synced / Plain mode if both available */}
          {lyricsData?.plain_lyrics && lyricsData?.is_synced && (
            <button
              onClick={() => setIsPlainMode(!isPlainMode)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title={isPlainMode ? "Switch to Karaoke Synced View" : "Switch to Plain Text View"}
            >
              {isPlainMode ? <Mic2 className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4" />}
            </button>
          )}

          {/* Close button */}
          <button
            onClick={() => setLyricsOpen(false)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 active:scale-95"
            title="Close lyrics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 3. Main Lyrics Content Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 overflow-y-auto px-6 md:px-24 py-16 scroll-smooth select-none"
      >
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-aurora-accent" />
            <p className="text-sm font-medium">Synchronizing lyrics...</p>
          </div>
        )}

        {/* Synced Karaoke Lines */}
        {!isLoading && !isPlainMode && lyricsData?.is_synced && lyricsData.lyrics.length > 0 && (
          <div className="max-w-3xl mx-auto space-y-6 pb-48 pt-12">
            {lyricsData.lyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => seekTo(line.time)}
                  className={`group flex items-start gap-3 transition-all duration-300 cursor-pointer rounded-2xl p-2 -mx-2 ${
                    isActive
                      ? 'scale-[1.03] text-white opacity-100 font-extrabold'
                      : isPast
                        ? 'text-slate-400/50 hover:text-slate-200 hover:opacity-80 font-bold'
                        : 'text-slate-400/40 hover:text-slate-200 hover:opacity-80 font-bold'
                  }`}
                >
                  {/* Subtle play timestamp icon on hover */}
                  <span className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center justify-center shrink-0">
                    <Play className="w-3.5 h-3.5 text-aurora-accent fill-aurora-accent" />
                  </span>

                  <p 
                    className={`leading-relaxed tracking-tight transition-all duration-300 ${
                      isActive 
                        ? 'text-2xl sm:text-3xl md:text-4xl text-white drop-shadow-[0_4px_24px_rgba(16,185,129,0.35)]'
                        : 'text-xl sm:text-2xl md:text-3xl'
                    }`}
                  >
                    {line.text || '♪'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Plain Text Mode Fallback */}
        {!isLoading && (isPlainMode || (!lyricsData?.is_synced && lyricsData?.plain_lyrics)) && (
          <div className="max-w-2xl mx-auto py-12 text-slate-300 text-lg md:text-xl font-medium leading-loose whitespace-pre-line pb-40">
            {lyricsData?.plain_lyrics}
          </div>
        )}

        {/* Empty State: No Lyrics Found */}
        {!isLoading && (!lyricsData || (!lyricsData.is_synced && !lyricsData.plain_lyrics)) && (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <Mic2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-white">No lyrics available</h4>
            <p className="text-sm text-slate-400">
              We couldn't find verified lyrics for "{currentTrack.title}". Lyrics are continuously added to the catalog.
            </p>
            <button
              onClick={() => {
                setIsLoading(true);
                api.getLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration, currentTrack.id)
                  .then(data => { setLyricsData(data); setIsLoading(false); })
                  .catch(() => setIsLoading(false));
              }}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Search</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Bottom Scrubber Pill Info */}
      <footer className="relative z-10 h-16 px-6 md:px-10 flex items-center justify-between border-t border-white/5 bg-[#070a13]/80 backdrop-blur-md text-xs text-slate-400 font-mono">
        <span>Click any line to jump directly to that part</span>
        <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}</span>
      </footer>
    </div>
  );
};
