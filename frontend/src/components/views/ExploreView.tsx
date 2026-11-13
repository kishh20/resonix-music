import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Sparkles, Loader2, Compass } from 'lucide-react';
import { Genre, Track } from '../../types/music';
import { api } from '../../services/api';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { TrackCard } from '../common/TrackCard';
import { SectionHeader } from '../common/SectionHeader';

interface ExploreViewProps {
  initialGenre?: string | null;
  onOpenAddToPlaylist: (track: Track) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  initialGenre = null,
  onOpenAddToPlaylist
}) => {
  const { playTrack } = usePlayerStore();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [genreTracks, setGenreTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadGenres() {
      try {
        const data = await api.getGenres();
        setGenres(data);

        if (initialGenre) {
          const match = data.find(g => g.id.toLowerCase() === initialGenre.toLowerCase());
          if (match) {
            handleSelectGenre(match);
          }
        }
      } catch (e) {
        console.error('Failed to load genres:', e);
      }
    }
    loadGenres();
  }, [initialGenre]);

  const handleSelectGenre = async (genre: Genre) => {
    setSelectedGenre(genre);
    setIsLoading(true);
    try {
      const tracks = await api.getTrending(genre.id, 36);
      setGenreTracks(tracks);
    } catch (e) {
      console.error('Failed to load genre tracks:', e);
      setGenreTracks([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* If a genre is selected */}
      {selectedGenre ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className={`relative rounded-3xl overflow-hidden p-8 md:p-12 bg-gradient-to-r ${selectedGenre.color} shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6`}>
            <div className="relative z-10 max-w-lg">
              <button
                onClick={() => setSelectedGenre(null)}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white mb-4 bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Genres</span>
              </button>

              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
                {selectedGenre.name}
              </h1>

              <p className="text-sm md:text-base text-white/90 mt-2 font-medium">
                Top streams, emerging releases and trending creators in {selectedGenre.name}
              </p>

              {genreTracks.length > 0 && (
                <button
                  onClick={() => playTrack(genreTracks[0], genreTracks)}
                  className="mt-6 flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-black font-bold text-sm hover:scale-105 active:scale-95 transition-transform shadow-xl"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Play Genre Radio</span>
                </button>
              )}
            </div>

            <div className="relative w-40 h-40 md:w-52 md:h-52 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border-2 border-white/20">
              <img
                src={selectedGenre.image}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Tracks List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-aurora-accent" />
              <p className="text-sm">Loading {selectedGenre.name} tracks...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {genreTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  queueContext={genreTracks}
                  onAddToPlaylist={onOpenAddToPlaylist}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Genre Catalog Grid */
        <div className="space-y-6">
          <SectionHeader
            title="Explore Everything"
            subtitle="Discover music by vibe, rhythm, culture, and sonic texture"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
            {genres.map((g) => (
              <div
                key={g.id}
                onClick={() => handleSelectGenre(g)}
                className={`group relative h-40 md:h-48 rounded-2xl p-5 overflow-hidden bg-gradient-to-br ${g.color} shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-white/10`}
              >
                {/* Title */}
                <h3 className="relative z-10 text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-md">
                  {g.name}
                </h3>

                {/* Angled image thumbnail at bottom right */}
                <div className="absolute -bottom-2 -right-4 w-28 h-28 md:w-32 md:h-32 rounded-xl overflow-hidden shadow-2xl transform rotate-[25deg] group-hover:rotate-[15deg] group-hover:scale-110 transition-transform duration-500 border border-white/20">
                  <img
                    src={g.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
