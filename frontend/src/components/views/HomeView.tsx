import React, { useEffect, useState, useCallback } from 'react';
import { 
  Play, 
  Sparkles, 
  SlidersHorizontal, 
  RefreshCw,
  Flame, 
  Radio, 
  Music, 
  Compass, 
  Heart,
  Globe2
} from 'lucide-react';
import { Track, RecommendationResponse } from '../../types/music';
import { api } from '../../services/api';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { SectionHeader } from '../common/SectionHeader';
import { TrackCard } from '../common/TrackCard';
import { TrackRow } from '../common/TrackRow';
import { SafeImage } from '../common/SafeImage';

interface HomeViewProps {
  onSelectGenre: (genre: string) => void;
  onOpenAddToPlaylist: (track: Track) => void;
  onOpenSpotifyImport: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectGenre,
  onOpenAddToPlaylist,
  onOpenSpotifyImport
}) => {
  const { playTrack } = usePlayerStore();
  const { listeningHistory, likedSongs } = useLibraryStore();
  const { 
    languages, 
    genres, 
    artists, 
    region, 
    hasCompletedOnboarding, 
    openOnboarding 
  } = usePreferencesStore();

  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [favoriteArtistTracks, setFavoriteArtistTracks] = useState<Track[]>([]);
  const [languageTracks, setLanguageTracks] = useState<Track[]>([]);
  const [regionalTracks, setRegionalTracks] = useState<Track[]>([]);
  
  // Independent loading states so trending isn't blocked by personalized searches
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [isRecsLoading, setIsRecsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Dynamic rotation: select an active artist and language for featured shelves
  const [activeArtist, setActiveArtist] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);

  const loadHomeData = useCallback(async (forcedSeed?: string) => {
    const seed = forcedSeed || Date.now().toString();
    setIsRefreshing(true);

    // 1. Pick rotating artist & language from user preferences (single source of truth)
    const selectedArtist = (artists && artists.length > 0)
      ? artists[Math.floor(Math.random() * artists.length)]
      : null;
    setActiveArtist(selectedArtist);

    const nonEnglishLangs = (languages || []).filter(l => l.toLowerCase() !== 'english');
    const selectedLang = nonEnglishLangs.length > 0
      ? nonEnglishLangs[Math.floor(Math.random() * nonEnglishLangs.length)]
      : (languages && languages.length > 0 ? languages[0] : null);
    setActiveLanguage(selectedLang);

    const recentIds = listeningHistory.slice(0, 10).map(h => h.track.id);
    const likedIds = likedSongs.slice(0, 10).map(t => t.id);

    // 2. Fetch trending immediately & independently so page renders fast
    const trendingPromise = api.getTrending(undefined, 24)
      .then((tracks) => {
        setTrendingTracks(tracks || []);
        setIsTrendingLoading(false);
        return tracks;
      })
      .catch((err) => {
        console.debug('Failed to fetch trending tracks:', err);
        setIsTrendingLoading(false);
        return [];
      });

    // 3. Fetch dynamic recommendations with refresh_nonce
    setIsRecsLoading(true);
    const recsPromise = api.getRecommendations({
      recent_track_ids: recentIds,
      liked_track_ids: likedIds,
      preferred_genres: genres.length > 0 ? genres : ['Pop', 'Electronic / EDM'],
      favorite_artists: artists,
      preferred_languages: languages,
      region: region,
      limit: 16,
      refresh_nonce: seed,
      force_refresh: true
    })
      .then((recs) => {
        setRecommendations(recs);
        return recs;
      })
      .catch(() => null);

    // 4. Fetch rotating featured artist shelf using the EXACT SAME selectedArtist
    const artistPromise = selectedArtist 
      ? api.search(selectedArtist, undefined, 16)
          .then(res => {
            const raw = res.tracks || [];
            const sLower = selectedArtist.toLowerCase();
            const matched = raw.filter(t => 
              t.artist.toLowerCase().includes(sLower) || 
              sLower.includes(t.artist.toLowerCase())
            );
            setFavoriteArtistTracks(matched.length >= 3 ? matched : raw);
          })
          .catch(() => setFavoriteArtistTracks([]))
      : Promise.resolve();

    // 5. Fetch rotating language shelf using the EXACT SAME selectedLang
    const langPromise = selectedLang
      ? api.search(`${selectedLang} hits`, undefined, 14)
          .then(res => setLanguageTracks(res.tracks || []))
          .catch(() => setLanguageTracks([]))
      : Promise.resolve();

    // 6. Fetch regional shelf in parallel
    const regionPromise = (region && region.toLowerCase() !== 'global' && region.toLowerCase() !== 'worldwide')
      ? api.search(`top hits ${region}`, undefined, 12)
          .then(res => setRegionalTracks(res.tracks || []))
          .catch(() => setRegionalTracks([]))
      : Promise.resolve();

    try {
      await Promise.allSettled([trendingPromise, recsPromise, artistPromise, langPromise, regionPromise]);
    } finally {
      setIsRecsLoading(false);
      setIsRefreshing(false);
    }
  }, [languages, genres, artists, region, listeningHistory, likedSongs]);

  useEffect(() => {
    loadHomeData();
  }, [languages, genres, artists, region]);

  const handleRefreshClick = () => {
    loadHomeData(Date.now().toString());
  };

  // Determine hero track: prioritize a personalized recommendation or top trending
  const heroTrack = (recommendations?.personalized_tracks && recommendations.personalized_tracks.length > 0)
    ? recommendations.personalized_tracks[0]
    : trendingTracks[0];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* 0. Spotify-Style Taste Customization & Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 px-4 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-white">Your Music Taste: </span>
            <span className="text-slate-400">
              {region ? `${region}` : 'Global'} 
              {languages.length > 0 ? ` • ${languages.slice(0, 3).join(', ')}` : ''} 
              {genres.length > 0 ? ` • ${genres.slice(0, 2).join(', ')}` : ''}
              {artists.length > 0 ? ` • ${artists.slice(0, 2).join(', ')}` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Suggestions Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Get fresh personalized songs & mixes"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'New Suggestions'}</span>
          </button>

          <button
            onClick={openOnboarding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-black text-xs font-semibold text-emerald-400 transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{hasCompletedOnboarding ? 'Customize Taste' : 'Set Your Preferences'}</span>
          </button>
        </div>
      </div>

      {/* 1. Hero Feature Banner */}
      {heroTrack && (
        <div className="relative rounded-3xl overflow-hidden p-6 md:p-10 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aurora-accent/20 border border-aurora-accent/30 text-aurora-accent text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized Pick • {heroTrack.bitrate || '320kbps High Fidelity'}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight line-clamp-2">
              {heroTrack.title}
            </h1>

            <p className="text-base md:text-lg text-slate-300 font-medium mt-2">
              By {heroTrack.artist}
            </p>

            <p className="text-xs text-slate-400 mt-2 font-mono uppercase tracking-wider">
              OG Creator Audio • Streamed via {heroTrack.provider}
            </p>

            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={() => playTrack(heroTrack, recommendations?.personalized_tracks || trendingTracks)}
                className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-aurora-accent text-black font-bold text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-emerald-500/25"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Now</span>
              </button>

              <button
                onClick={onOpenSpotifyImport}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm backdrop-blur-md transition-colors"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Import Spotify Playlist</span>
              </button>
            </div>
          </div>

          {/* Hero Artwork with SafeImage */}
          <div 
            className="relative w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border border-white/10 group cursor-pointer bg-slate-900"
            onClick={() => playTrack(heroTrack, recommendations?.personalized_tracks || trendingTracks)}
          >
            <SafeImage
              src={heroTrack.artwork_url}
              alt={heroTrack.title}
              aspectRatio="square"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-aurora-accent/90 text-black flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-100 scale-90">
                <Play className="w-6 h-6 fill-current ml-1" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Made For You / Smart AI Mixes */}
      {recommendations && recommendations.mixes.length > 0 && (
        <section>
          <SectionHeader
            title="Made For You"
            subtitle="Rotating curated playlists tailored to your favorite languages, artists & genres"
          />
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.mixes.map((mix) => (
              <div
                key={mix.id}
                onClick={() => {
                  if (mix.tracks.length > 0) {
                    playTrack(mix.tracks[0], mix.tracks);
                  }
                }}
                className="group relative p-4 rounded-2xl bg-aurora-surface/60 hover:bg-aurora-cardHover/90 border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-slate-900 shadow-md">
                  <SafeImage
                    src={mix.cover_url}
                    alt={mix.title}
                    aspectRatio="square"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                    <div className="w-10 h-10 rounded-full bg-aurora-accent text-black flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-aurora-accent transition-colors truncate">
                  {mix.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {mix.description}
                </p>
                <span className="text-[10px] font-mono text-emerald-400 mt-2 block font-semibold">
                  {mix.tracks.length} tracks
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Because You Love [Active Favorite Artist] Shelf */}
      {activeArtist && favoriteArtistTracks.length > 0 && (
        <section>
          <SectionHeader
            title={`Because You Like ${activeArtist}`}
            subtitle={`Top original audio, hits and essential tracks by ${activeArtist}`}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {favoriteArtistTracks.slice(0, 12).map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                queueContext={favoriteArtistTracks}
                onAddToPlaylist={onOpenAddToPlaylist}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. Regional Shelf: Top Hits in [Region] */}
      {regionalTracks.length > 0 && (
        <section>
          <SectionHeader
            title={`Trending in ${region}`}
            subtitle={`Top streamed hits, local viral anthems, and popular recordings in ${region}`}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {regionalTracks.slice(0, 12).map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                queueContext={regionalTracks}
                onAddToPlaylist={onOpenAddToPlaylist}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. Language Shelf: Sounds in [Active Language] */}
      {activeLanguage && languageTracks.length > 0 && (
        <section>
          <SectionHeader
            title={`Sounds of ${activeLanguage}`}
            subtitle={`Essential chartbusters, melodies, and new drops in ${activeLanguage}`}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {languageTracks.slice(0, 12).map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                queueContext={languageTracks}
                onAddToPlaylist={onOpenAddToPlaylist}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. Trending Hits Worldwide */}
      <section>
        <SectionHeader
          title="Trending Hits Worldwide"
          subtitle="Top streamed tracks across authorized independent creator nodes"
        />

        {isTrendingLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-slate-800/60 border border-white/5 animate-pulse flex flex-col justify-end p-3">
                <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-2 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trendingTracks.slice(0, 18).map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                queueContext={trendingTracks}
                onAddToPlaylist={onOpenAddToPlaylist}
              />
            ))}
          </div>
        )}
      </section>

      {/* 7. Quick Genre Exploration Chips */}
      <section>
        <SectionHeader
          title="Browse By Mood & Genre"
          subtitle="Explore curated soundscapes and sonic atmospheres"
        />
        <div className="flex flex-wrap gap-2.5">
          {[
            { id: 'electronic', label: '⚡ Electronic & EDM' },
            { id: 'lofi', label: '☕ Lo-Fi & Beats' },
            { id: 'hip-hop', label: '🎤 Hip-Hop & Trap' },
            { id: 'pop', label: '✨ Pop & Indie' },
            { id: 'ambient', label: '🌌 Ambient & Chill' },
            { id: 'rock', label: '🎸 Rock & Alt' },
            { id: 'acoustic', label: '🌿 Acoustic & Folk' },
            { id: 'classical', label: '🎹 Classical & Piano' },
          ].map((g) => (
            <button
              key={g.id}
              onClick={() => onSelectGenre(g.id)}
              className="px-4 py-2.5 rounded-xl bg-aurora-surface hover:bg-white/10 border border-white/5 text-sm font-medium text-slate-200 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              {g.label}
            </button>
          ))}
        </div>
      </section>

      {/* 8. Recently Played (if any) */}
      {listeningHistory.length > 0 && (
        <section>
          <SectionHeader
            title="Recently Played"
            subtitle="Jump right back into your listening sessions"
          />
          <div className="space-y-1 bg-aurora-card/40 rounded-2xl p-2 border border-white/5">
            {listeningHistory.slice(0, 6).map((item, index) => (
              <TrackRow
                key={`${item.track.id}-${index}`}
                track={item.track}
                index={index}
                queueContext={listeningHistory.map(h => h.track)}
                onOpenAddToPlaylist={onOpenAddToPlaylist}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
