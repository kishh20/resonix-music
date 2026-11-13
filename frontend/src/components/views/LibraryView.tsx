import React from 'react';
import { Heart, Plus, Music, Play, Sparkles, Clock, UserCheck, Flame } from 'lucide-react';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { SectionHeader } from '../common/SectionHeader';

interface LibraryViewProps {
  onSelectPlaylist: (playlistId: string) => void;
  onOpenLikedSongs: () => void;
  onOpenCreatePlaylist: () => void;
  onOpenSpotifyImport: () => void;
  onOpenNewReleases: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  onSelectPlaylist,
  onOpenLikedSongs,
  onOpenCreatePlaylist,
  onOpenSpotifyImport,
  onOpenNewReleases
}) => {
  const { playlists, likedSongs, listeningHistory, followedArtists, unfollowArtist } = useLibraryStore();
  const { playTrack } = usePlayerStore();
  const { user } = useAuthStore();

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      <SectionHeader
        title="Your Music Library"
        subtitle="Playlists, liked tracks, followed artists and listening history synced across your devices"
      />

      {/* 1. Hero Grid: Liked Songs & Quick Import & New Drops */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Liked Songs Card */}
        <div
          onClick={onOpenLikedSongs}
          className="group relative p-6 rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-rose-600 shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all flex flex-col justify-between h-56 md:h-64"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-4">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Liked Songs
            </h2>
            <p className="text-white/80 text-sm mt-1 font-medium">
              {likedSongs.length} favourite tracks saved
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-white/70">
              Personal Collection
            </span>
            {likedSongs.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playTrack(likedSongs[0], likedSongs);
                }}
                className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl group-hover:scale-110 active:scale-95 transition-transform"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            )}
          </div>
        </div>

        {/* New Releases & Drops Card */}
        <div
          onClick={onOpenNewReleases}
          className="group relative p-6 rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all flex flex-col justify-between h-56 md:h-64 border border-emerald-500/30"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center text-emerald-400 mb-4">
              <Flame className="w-6 h-6 fill-current" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              New Releases
            </h2>
            <p className="text-slate-200 text-sm mt-1 font-medium">
              Automatically discovered songs & albums from your favorite artists
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-emerald-300">
              Continuous Engine
            </span>
            <div className="w-10 h-10 rounded-full bg-aurora-accent text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </div>
        </div>

        {/* Spotify Import Card */}
        <div
          onClick={onOpenSpotifyImport}
          className="group relative p-6 rounded-3xl bg-gradient-to-br from-cyan-900 via-blue-950 to-slate-900 shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all flex flex-col justify-between h-56 md:h-64 border border-cyan-500/30"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-black/30 backdrop-blur-md flex items-center justify-center text-cyan-300 mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Spotify Importer
            </h2>
            <p className="text-slate-200 text-sm mt-1 font-medium">
              Import playlists from Spotify without DRM or login limits
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-cyan-300">
              Smart Song Matcher
            </span>
            <div className="w-10 h-10 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Followed Artists Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Followed Artists ({followedArtists.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              New releases from these artists are automatically prioritized in your Drops feed
            </p>
          </div>
        </div>

        {followedArtists.length === 0 ? (
          <div className="p-6 rounded-2xl bg-aurora-surface/40 border border-dashed border-white/10 text-center text-xs text-slate-500">
            You haven't followed any artists yet. Click "Follow Artist" from any song context menu or album header!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {followedArtists.map((fa) => (
              <div
                key={fa.id}
                className="group p-4 rounded-2xl bg-aurora-surface hover:bg-aurora-cardHover border border-white/5 transition-all text-center flex flex-col items-center justify-between"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800 shadow-md mb-3 border-2 border-emerald-500/30 group-hover:border-emerald-500 transition-colors">
                  <img
                    src={fa.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                    alt={fa.artist_name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <h4 className="font-bold text-sm text-white truncate max-w-full">
                  {fa.artist_name}
                </h4>
                <span className="text-[10px] font-mono uppercase text-emerald-400 mt-0.5 block">
                  {fa.provider}
                </span>

                <button
                  onClick={() => unfollowArtist(fa.artist_name, user?.id)}
                  className="mt-3 px-3 py-1 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-medium transition-colors"
                >
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Custom Playlists Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">Your Playlists</h2>
          <button
            onClick={onOpenCreatePlaylist}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-aurora-accent text-black text-xs font-bold hover:bg-aurora-accentHover transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Create New Playlist Card */}
          <div
            onClick={onOpenCreatePlaylist}
            className="group aspect-square rounded-2xl p-4 bg-aurora-surface/40 hover:bg-aurora-surface border border-dashed border-white/10 hover:border-aurora-accent/40 transition-all flex flex-col items-center justify-center text-center cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-aurora-accent/20 text-slate-400 group-hover:text-aurora-accent flex items-center justify-center transition-colors mb-2">
              <Plus className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">Create Playlist</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Start fresh</p>
          </div>

          {/* User Playlists */}
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl.id)}
              className="group p-3 rounded-2xl bg-aurora-surface hover:bg-aurora-cardHover border border-white/5 hover:border-white/10 transition-all cursor-pointer flex flex-col"
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-slate-900 shadow-md">
                {pl.cover_url ? (
                  <img
                    src={pl.cover_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                    <Music className="w-10 h-10" />
                  </div>
                )}
                {pl.tracks.length > 0 && (
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playTrack(pl.tracks[0], pl.tracks);
                      }}
                      className="w-10 h-10 rounded-full bg-aurora-accent text-black flex items-center justify-center shadow-lg hover:scale-105"
                    >
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="font-bold text-sm text-white truncate group-hover:text-aurora-accent transition-colors">
                {pl.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {pl.track_count} tracks
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
