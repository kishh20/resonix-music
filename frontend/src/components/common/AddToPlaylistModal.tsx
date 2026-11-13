import React, { useState } from 'react';
import { X, Plus, Music, Check } from 'lucide-react';
import { Track } from '../../types/music';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface AddToPlaylistModalProps {
  track: Track | null;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ track, onClose }) => {
  const { playlists, addTrackToPlaylist, createPlaylist } = useLibraryStore();
  const { user } = useAuthStore();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  if (!track) return null;

  const handleAddToPlaylist = async (playlistId: string) => {
    await addTrackToPlaylist(playlistId, track, user?.id);
    setAddedIds(prev => [...prev, playlistId]);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const pl = await createPlaylist(newPlaylistName.trim(), '', track.artwork_url, user?.id);
    await addTrackToPlaylist(pl.id, track, user?.id);
    setAddedIds(prev => [...prev, pl.id]);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl bg-aurora-card border border-white/10 shadow-2xl p-6 text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold">Add to Playlist</h3>
            <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
              {track.title} • {track.artist}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create New Playlist Form */}
        <div className="my-4">
          {isCreating ? (
            <form onSubmit={handleCreateAndAdd} className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                className="flex-1 px-3 py-2 rounded-lg bg-aurora-surface border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-aurora-accent"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-aurora-accent text-black font-semibold text-xs hover:bg-aurora-accentHover"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-2 rounded-lg bg-white/5 text-slate-400 text-xs hover:text-white"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 transition-colors text-sm font-medium"
            >
              <Plus className="w-5 h-5 text-aurora-accent" />
              <span>Create New Playlist</span>
            </button>
          )}
        </div>

        {/* Existing Playlists List */}
        <div className="max-h-60 overflow-y-auto space-y-1">
          {playlists.length === 0 ? (
            <p className="text-xs text-center text-slate-500 py-6">
              No playlists created yet. Create your first one above!
            </p>
          ) : (
            playlists.map((pl) => {
              const alreadyHas = pl.tracks.some(t => t.id === track.id) || addedIds.includes(pl.id);
              return (
                <button
                  key={pl.id}
                  disabled={alreadyHas}
                  onClick={() => handleAddToPlaylist(pl.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors ${
                    alreadyHas
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'hover:bg-white/5 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {pl.cover_url ? (
                        <img src={pl.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{pl.title}</p>
                      <p className="text-xs text-slate-500">{pl.track_count} tracks</p>
                    </div>
                  </div>
                  {alreadyHas && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
