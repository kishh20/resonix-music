import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Sparkles, Filter, Music, X, Play } from 'lucide-react';
import { Track, SearchResponse } from '../../types/music';
import { api } from '../../services/api';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { TrackRow } from '../common/TrackRow';
import { TrackCard } from '../common/TrackCard';

interface SearchViewProps {
  initialQuery?: string;
  onOpenAddToPlaylist: (track: Track) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  initialQuery = '',
  onOpenAddToPlaylist
}) => {
  const { playTrack } = usePlayerStore();
  const [query, setQuery] = useState(initialQuery);
  const [provider, setProvider] = useState<string>('all');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Suggestions state while typing
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [quickTracks, setQuickTracks] = useState<Track[]>([]);
  const debounceSearchRef = useRef<any>(null);
  const debounceSuggestRef = useRef<any>(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery, provider);
    }
  }, [initialQuery]);

  // Live suggestions when typing 2+ characters
  useEffect(() => {
    if (debounceSuggestRef.current) clearTimeout(debounceSuggestRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setQuickTracks([]);
      return;
    }

    debounceSuggestRef.current = setTimeout(async () => {
      try {
        const res = await api.getSuggestions(trimmed);
        setSuggestions(res.suggestions || []);
        setQuickTracks(res.tracks || []);
      } catch (e) {
        console.error('Suggestions error:', e);
      }
    }, 150);

    return () => {
      if (debounceSuggestRef.current) clearTimeout(debounceSuggestRef.current);
    };
  }, [query]);

  const handleSearch = async (q: string, prov: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    setSuggestions([]);
    try {
      const resp: SearchResponse = await api.search(trimmed, prov);
      setResults(resp.tracks || []);
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onProviderChange = (newProv: string) => {
    setProvider(newProv);
    if (query.trim()) {
      handleSearch(query, newProv);
    }
  };

  const topResult = results[0];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Search Bar & Filters */}
      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) {
                setResults([]);
                setHasSearched(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch(query, provider);
            }}
            placeholder="Search by song, artist, album, or genre..."
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-aurora-card border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-aurora-accent focus:ring-1 focus:ring-aurora-accent shadow-xl text-sm"
          />

          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setSuggestions([]);
                setHasSearched(false);
              }}
              className="absolute right-20 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => handleSearch(query, provider)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-aurora-accent text-black font-semibold text-xs hover:bg-aurora-accentHover transition-colors"
          >
            Search
          </button>
        </div>

        {/* Live Search Suggestions (when typing) */}
        {suggestions.length > 0 && !hasSearched && (
          <div className="max-w-2xl bg-aurora-surface/90 border border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
              <Sparkles className="w-3.5 h-3.5 text-aurora-accent" />
              Suggestions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(item);
                    handleSearch(item, provider);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 hover:border-aurora-accent/40 border border-white/5 text-xs text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Search className="w-3 h-3 text-slate-400" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Provider Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" /> Source:
          </span>
          {[
            { id: 'all', label: 'All Providers' },
            { id: 'youtube', label: 'YouTube Music' },
            { id: 'audius', label: 'Audius (320kbps)' },
            { id: 'jamendo', label: 'Jamendo' },
            { id: 'archive', label: 'Free Music Archive' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onProviderChange(item.id)}
              className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                provider === item.id
                  ? 'bg-aurora-accent text-black font-bold shadow-md'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-aurora-accent" />
          <p className="text-sm">Searching across all music providers...</p>
        </div>
      )}

      {/* 3. Results Section */}
      {!isLoading && hasSearched && results.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Result Card */}
            {topResult && (
              <div className="lg:col-span-1">
                <h3 className="text-lg font-bold text-white mb-3">Top Result</h3>
                <div
                  onClick={() => playTrack(topResult, results)}
                  className="group relative p-6 rounded-2xl bg-aurora-surface hover:bg-aurora-cardHover border border-white/5 hover:border-white/10 transition-all cursor-pointer shadow-xl flex flex-col justify-between h-auto"
                >
                  <div className="w-28 h-28 rounded-xl overflow-hidden mb-4 bg-slate-900 shadow-md">
                    <img
                      src={topResult.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div>
                    <span className="inline-block text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold mb-2">
                      Song • {topResult.provider}
                    </span>
                    <h4 className="text-2xl font-bold text-white group-hover:text-aurora-accent transition-colors line-clamp-1">
                      {topResult.title}
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">
                      {topResult.artist}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>{topResult.bitrate}</span>
                    <span>{Math.floor(topResult.duration / 60)}:{(topResult.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Songs List */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-bold text-white mb-3">Songs</h3>
              <div className="space-y-1 bg-aurora-card/40 rounded-2xl p-2 border border-white/5">
                {results.slice(0, 10).map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    queueContext={results}
                    onOpenAddToPlaylist={onOpenAddToPlaylist}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* More Results Grid */}
          {results.length > 10 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-3">More Matches</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {results.slice(10, 22).map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    queueContext={results}
                    onAddToPlaylist={onOpenAddToPlaylist}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Empty State: No results */}
      {!isLoading && hasSearched && results.length === 0 && (
        <div className="text-center py-16 bg-aurora-card/30 rounded-3xl border border-white/5 p-8">
          <Music className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No results found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            We couldn't find matches for "{query}". Try searching with alternate artist or track keywords.
          </p>
        </div>
      )}

      {/* 5. Pre-search Discovery Tags */}
      {!hasSearched && (
        <div className="space-y-6 pt-4">
          {/* Personalized Favorites Chips */}
          {(() => {
            const { artists, languages, genres } = usePreferencesStore.getState();
            const personalizedTags = [
              ...artists,
              ...languages.map(l => `${l} Hits`),
              ...genres
            ];
            
            if (personalizedTags.length === 0) return null;

            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                    Based On Your Taste
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {personalizedTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setQuery(tag);
                        handleSearch(tag, provider);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-sm font-semibold text-emerald-300 border border-emerald-500/20 transition-all hover:scale-105 active:scale-95 shadow-sm"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Suggested Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                'Arijit Singh',
                'Sid Sriram',
                'Anirudh Ravichander',
                'The Weeknd',
                'Taylor Swift',
                'A.R. Rahman',
                'Lo-Fi Study',
                'Acoustic Guitar'
              ].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setQuery(tag);
                    handleSearch(tag, provider);
                  }}
                  className="px-4 py-2 rounded-xl bg-aurora-surface hover:bg-white/10 text-sm font-medium text-slate-300 hover:text-white border border-white/5 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
