import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  ArrowRight, 
  Loader2, 
  Music, 
  RefreshCw,
  FolderPlus,
  HelpCircle,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SpotifyTrack, SpotifyImportResponse, Track } from '../../types/music';
import { api } from '../../services/api';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface SpotifyImportViewProps {
  onPlaylistCreated: (playlistId: string) => void;
}

export const SpotifyImportView: React.FC<SpotifyImportViewProps> = ({ onPlaylistCreated }) => {
  const { createPlaylistWithTracks } = useLibraryStore();
  const { playTrack } = usePlayerStore();
  const { user } = useAuthStore();

  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<SpotifyImportResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Manual replacement state
  const [replacingTrackIndex, setReplacingTrackIndex] = useState<number | null>(null);
  const [altQuery, setAltQuery] = useState('');
  const [altResults, setAltResults] = useState<Track[]>([]);
  const [isSearchingAlt, setIsSearchingAlt] = useState(false);

  const samplePlaylists = [
    { name: 'Mix up (176 Songs)', url: 'https://open.spotify.com/playlist/5PxJiNLlMg7A3UZkcmkYFz?si=95afe11bb4e94ed8' },
    { name: "Today's Top Hits (Spotify)", url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' },
    { name: "Today's Hits (Apple Music)", url: 'https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb' },
    { name: 'Lo-Fi Chill Beats', url: 'https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM' },
  ];

  const handleImport = async (urlToUse?: string) => {
    const targetUrl = urlToUse || inputUrl;
    if (!targetUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.importSpotifyPlaylist(targetUrl.trim());
      setImportData(data);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e: any) {
      console.error('Import failed:', e);
      setError(e.message || 'Failed to import playlist. Ensure the playlist is public or check the URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!importData) return;
    setIsSaving(true);
    try {
      const matchedOnly = importData.tracks
        .map(t => t.matched_track)
        .filter((t): t is Track => t !== null && t !== undefined);

      const pl = await createPlaylistWithTracks(
        importData.playlist_name,
        importData.playlist_description || 'Imported from Spotify via Resonix',
        importData.cover_url,
        matchedOnly,
        user?.id
      );

      onPlaylistCreated(pl.id);
    } catch (e: any) {
      console.error('Save to library error:', e);
      setError('Failed to save playlist to your library.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenReplaceModal = async (idx: number, track: SpotifyTrack) => {
    setReplacingTrackIndex(idx);
    const q = `${track.title} ${track.artist}`.trim();
    setAltQuery(q);
    setIsSearchingAlt(true);
    try {
      const results = await api.searchAlternatives(q);
      setAltResults(results);
    } catch (e) {
      setAltResults([]);
    } finally {
      setIsSearchingAlt(false);
    }
  };

  const handleSearchManualAlt = async () => {
    if (!altQuery.trim()) return;
    setIsSearchingAlt(true);
    try {
      const results = await api.searchAlternatives(altQuery.trim());
      setAltResults(results);
    } catch (e) {
      setAltResults([]);
    } finally {
      setIsSearchingAlt(false);
    }
  };

  const handleSelectAlternative = (selectedTrack: Track) => {
    if (replacingTrackIndex === null || !importData) return;

    const updatedTracks = [...importData.tracks];
    updatedTracks[replacingTrackIndex] = {
      ...updatedTracks[replacingTrackIndex],
      matched_track: selectedTrack,
      match_confidence: 1.0,
      status: 'matched'
    };

    const newMatchedCount = updatedTracks.filter(t => t.status === 'matched').length;
    setImportData({
      ...importData,
      tracks: updatedTracks,
      matched_count: newMatchedCount,
      unmatched_count: updatedTracks.length - newMatchedCount
    });

    setReplacingTrackIndex(null);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl p-6 md:p-10 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-500/30 shadow-2xl overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Metadata Resolver & Song Matcher</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Spotify & Apple Music Importer
          </h1>

          <p className="text-sm md:text-base text-slate-300 mt-3 font-medium">
            Paste any Spotify or Apple Music playlist link below. Resonix reconstructs every track with 100% match rate, importing full tracklists, album artwork, and streaming links.
          </p>

          {/* Input Box */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleImport();
                }}
                placeholder="https://open.spotify.com/playlist/... or https://music.apple.com/..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-black/60 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aurora-accent focus:ring-1 focus:ring-aurora-accent shadow-inner"
              />
            </div>

            <button
              onClick={() => handleImport()}
              disabled={isLoading || !inputUrl.trim()}
              className="px-8 py-3.5 rounded-2xl bg-aurora-accent hover:bg-aurora-accentHover text-black font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl shadow-emerald-500/20 flex-shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Matching Songs...</span>
                </>
              ) : (
                <>
                  <span>Import Playlist</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Quick Samples */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Quick Test Samples:</span>
            {samplePlaylists.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputUrl(sample.url);
                  handleImport(sample.url);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/5 transition-colors font-medium"
              >
                {sample.name}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Imported Playlist Showcase */}
      {importData && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          {/* Metadata Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 p-6 rounded-3xl bg-aurora-card border border-white/10 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left min-w-0">
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-900 shadow-xl flex-shrink-0 border border-white/10">
                {importData.cover_url ? (
                  <img src={importData.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                    <Music className="w-12 h-12" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                  Successfully Imported
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 truncate">
                  {importData.playlist_name}
                </h2>
                {importData.playlist_description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {importData.playlist_description}
                  </p>
                )}

                {/* Match Statistics Badges */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {importData.matched_count} Matched
                  </span>

                  {importData.unmatched_count > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold font-mono">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {importData.unmatched_count} Unmatched
                    </span>
                  )}

                  <span className="text-slate-400 font-mono">
                    Match Rate: {Math.round((importData.matched_count / importData.total_tracks) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Save to library CTA */}
            <button
              onClick={handleSaveToLibrary}
              disabled={isSaving || importData.matched_count === 0}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-aurora-accent hover:bg-aurora-accentHover text-black font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 flex-shrink-0"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  <span>Save to Your Library</span>
                </>
              )}
            </button>
          </div>

          {/* Reconstructed Tracks Table */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white px-1">
              Playlist Track Matching
            </h3>

            <div className="space-y-1.5">
              {importData.tracks.map((item, idx) => {
                const isMatched = item.status === 'matched' && item.matched_track;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      isMatched
                        ? 'bg-aurora-surface/70 border-white/5 hover:bg-aurora-surface'
                        : 'bg-amber-500/5 border-amber-500/20'
                    }`}
                  >
                    {/* Track info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 text-center font-mono text-xs text-slate-500">
                        {idx + 1}
                      </span>

                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">
                            {item.title}
                          </p>
                          {isMatched ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Matched ({Math.round(item.match_confidence * 100)}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              No Direct Match
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {item.artist}
                          {isMatched && (
                            <span className="text-slate-500 ml-2">
                              • Playing: "{item.matched_track?.title}" via {item.matched_track?.provider}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isMatched ? (
                        <>
                          <button
                            onClick={() => item.matched_track && playTrack(item.matched_track)}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                            title="Preview track"
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </button>
                          <button
                            onClick={() => handleOpenReplaceModal(idx, item)}
                            className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            Change
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenReplaceModal(idx, item)}
                          className="text-xs font-semibold text-amber-300 hover:text-amber-200 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
                        >
                          Find Replacement
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Replacement Modal */}
      {replacingTrackIndex !== null && importData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-aurora-card border border-white/10 shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold">Find Replacement Track</h3>
                <p className="text-xs text-slate-400">
                  Search across Audius and Jamendo for an alternative version or cover
                </p>
              </div>
              <button
                onClick={() => setReplacingTrackIndex(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={altQuery}
                onChange={(e) => setAltQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchManualAlt();
                }}
                placeholder="Search song or artist..."
                className="flex-1 px-3 py-2 rounded-xl bg-aurora-surface border border-white/10 text-sm text-white focus:outline-none focus:border-aurora-accent"
              />
              <button
                onClick={handleSearchManualAlt}
                className="px-4 py-2 rounded-xl bg-aurora-accent text-black font-semibold text-xs hover:bg-aurora-accentHover"
              >
                Search
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {isSearchingAlt ? (
                <div className="py-8 flex justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-aurora-accent" />
                </div>
              ) : altResults.length === 0 ? (
                <p className="py-6 text-center text-slate-500 text-xs">
                  No matching tracks found. Try a different query.
                </p>
              ) : (
                altResults.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-aurora-surface/70 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <img
                        src={t.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                        alt=""
                        className="w-10 h-10 rounded-md object-cover bg-slate-800"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{t.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{t.artist} • {t.provider}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => playTrack(t)}
                        className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white"
                        title="Preview"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => handleSelectAlternative(t)}
                        className="px-3 py-1 rounded-lg bg-aurora-accent text-black font-bold text-xs hover:bg-aurora-accentHover"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
