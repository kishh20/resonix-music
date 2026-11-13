import React, { useEffect, useState } from 'react';
import { Play, Sparkles, Flame, Clock, Radio, Music, Compass } from 'lucide-react';
import { Track, RecommendationResponse } from '../../types/music';
import { api } from '../../services/api';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { SectionHeader } from '../common/SectionHeader';
import { TrackCard } from '../common/TrackCard';
import { TrackRow } from '../common/TrackRow';

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

  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setIsLoading(true);
      try {
        const recentIds = listeningHistory.slice(0, 10).map(h => h.track.id);
        const likedIds = likedSongs.slice(0, 10).map(t => t.id);

        const [trending, recs] = await Promise.all([
          api.getTrending(undefined, 24),
          api.getRecommendations({
            recent_track_ids: recentIds,
            liked_track_ids: likedIds,
            preferred_genres: ['electronic', 'lofi', 'pop', 'ambient'],
            limit: 12
          }).catch(() => null)
        ]);

        setTrendingTracks(trending);
        setRecommendations(recs);
      } catch (e) {
        console.error('Failed to load home tracks:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadHomeData();
  }, []);

  const heroTrack = trendingTracks[0];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* 1. Hero Feature Banner */}
      {heroTrack && (
        <div className="relative rounded-3xl overflow-hidden p-6 md:p-10 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aurora-accent/20 border border-aurora-accent/30 text-aurora-accent text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Featured Release • {heroTrack.bitrate}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight line-clamp-2">
              {heroTrack.title}
            </h1>

            <p className="text-base md:text-lg text-slate-300 font-medium mt-2">
              By {heroTrack.artist}
            </p>

            <p className="text-xs text-slate-400 mt-2 font-mono uppercase tracking-wider">
              High Quality Audio • Streamed via {heroTrack.provider}
            </p>

            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={() => playTrack(heroTrack, trendingTracks)}
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

          {/* Hero Artwork */}
          <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border border-white/10 group cursor-pointer"
               onClick={() => playTrack(heroTrack, trendingTracks)}>
            <img
              src={heroTrack.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
              alt={heroTrack.title}
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
            subtitle="Personalized playlists based on your music taste & history"
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
                  <img
                    src={mix.cover_url}
                    alt={mix.title}
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

      {/* 3. Trending Now */}
      <section>
        <SectionHeader
          title="Trending Hits"
          subtitle="Top streamed tracks across authorized independent providers"
        />

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
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

      {/* 4. Quick Genre Exploration Chips */}
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

      {/* 5. Recently Played (if any) */}
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
