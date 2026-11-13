import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Settings, 
  User, 
  X,
  Play,
  Loader2,
  Sparkles,
  Download
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { api } from '../../services/api';
import { Track } from '../../types/music';

interface TopNavProps {
  onSearchFocus: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onSelectSuggestion?: (suggestion: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onSearchFocus,
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onOpenAuth,
  onSelectSuggestion
}) => {
  const { user, isAuthenticated, isConfigured } = useAuthStore();
  const { playTrack } = usePlayerStore();
  const { isInstalled, installApp } = usePWAInstall();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [matchingTracks, setMatchingTracks] = useState<Track[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with 150ms debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setMatchingTracks([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.getSuggestions(trimmed);
        setSuggestions(res.suggestions || []);
        setMatchingTracks(res.tracks || []);
        setIsOpen((res.suggestions?.length > 0) || (res.tracks?.length > 0));
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSuggestionClick = (text: string) => {
    onSearchChange(text);
    if (onSelectSuggestion) {
      onSelectSuggestion(text);
    }
    setIsOpen(false);
  };

  const handleTrackClick = (track: Track) => {
    playTrack(track, matchingTracks);
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-aurora-dark/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 flex items-center justify-between gap-4">
      {/* 1. History navigation & Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => window.history.back()}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => window.history.forward()}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Go forward"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Global Search Bar with Live Suggestions Dropdown */}
        <div ref={containerRef} className="relative flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                onSearchFocus();
                if (suggestions.length > 0 || matchingTracks.length > 0) {
                  setIsOpen(true);
                }
              }}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search songs, artists, albums or genres..."
              className="w-full pl-10 pr-9 py-2 rounded-full bg-aurora-card/90 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aurora-accent focus:ring-1 focus:ring-aurora-accent transition-all shadow-inner"
            />
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-aurora-accent absolute right-3 top-1/2 -translate-y-1/2" />
            )}
            {!isLoading && searchQuery && (
              <button
                onClick={() => {
                  onSearchChange('');
                  setSuggestions([]);
                  setMatchingTracks([]);
                  setIsOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (suggestions.length > 0 || matchingTracks.length > 0) && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-aurora-surface/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Quick Matching Songs */}
              {matchingTracks.length > 0 && (
                <div className="p-2 border-b border-white/5">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-aurora-accent" />
                    Top Song Matches
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {matchingTracks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleTrackClick(t)}
                        className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                          <img
                            src={t.artwork_url || '/favicon.svg'}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-3.5 h-3.5 text-white fill-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate group-hover:text-aurora-accent transition-colors">
                            {t.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {t.artist}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono px-2">
                          {Math.floor(t.duration / 60)}:{(t.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Query Suggestions */}
              {suggestions.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Suggestions
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {suggestions.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(item)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. User & Actions Right */}
      <div className="flex items-center gap-3">
        {/* Cloud Sync Status Indicator */}
        <div
          title={isConfigured ? 'Supabase Cloud Connected' : 'Running in Local Storage Mode'}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10"
        >
          <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-slate-400">{isConfigured ? 'Cloud Sync' : 'Offline / Local'}</span>
        </div>

        {/* Install App / Add to Home Screen Button */}
        {!isInstalled && (
          <button
            onClick={installApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            title="Install Resonix Music App"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          title="Settings & Mobile Connect"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Profile Pill */}
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-aurora-surface/80 hover:bg-aurora-card border border-white/10 transition-colors"
        >
          <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-500 flex items-center justify-center text-xs font-bold text-black">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="text-xs font-semibold text-white max-w-[100px] truncate">
            {user?.username || (isAuthenticated ? 'Listener' : 'Sign In')}
          </span>
        </button>
      </div>
    </header>
  );
};
