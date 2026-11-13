import React from 'react';
import { X, Trash2, Music, Sparkles } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';

export const QueueDrawer: React.FC = () => {
  const {
    currentTrack,
    queue,
    queueIndex,
    isQueueOpen,
    setQueueOpen,
    playTrack,
    removeFromQueue,
    clearQueue,
    autoPlay,
    toggleAutoPlay
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  const upNextTracks = queue.slice(queueIndex + 1);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setQueueOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-aurora-card border-l border-white/10 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-aurora-accent" />
              <h2 className="text-lg font-bold text-white">Playback Queue</h2>
            </div>
            <div className="flex items-center gap-2">
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded hover:bg-white/5 transition-colors"
                >
                  Clear Queue
                </button>
              )}
              <button
                onClick={() => setQueueOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Smart Auto-Play / Infinite Radio Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-transparent border border-primary-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary-500/20 text-primary-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Smart Auto-Play</p>
                  <p className="text-[11px] text-white/50">Keep music playing with similar songs</p>
                </div>
              </div>
              <button
                onClick={toggleAutoPlay}
                className={`w-11 h-6 rounded-full transition-colors relative ${autoPlay ? 'bg-primary-500' : 'bg-white/10'}`}
              >
                <div 
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${autoPlay ? 'left-6' : 'left-1'}`} 
                />
              </button>
            </div>

            {/* Now Playing Section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Now Playing
              </h3>
              {currentTrack ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-aurora-surface border border-emerald-500/30 shadow-lg">
                  <img
                    src={currentTrack.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                    alt={currentTrack.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-aurora-accent truncate">
                      {currentTrack.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {currentTrack.artist}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No track playing</p>
              )}
            </div>

            {/* Up Next Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Next In Queue ({upNextTracks.length})
                </h3>
              </div>

              {upNextTracks.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Queue is empty. Click "+ Add to queue" on any track!
                </div>
              ) : (
                <div className="space-y-1">
                  {upNextTracks.map((track, i) => {
                    const actualIndex = queueIndex + 1 + i;
                    return (
                      <div
                        key={`${track.id}-${actualIndex}`}
                        className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div
                          onClick={() => playTrack(track, queue)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <img
                            src={track.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-9 h-9 rounded-md object-cover bg-slate-800"
                          />
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-medium text-white truncate group-hover:text-aurora-accent">
                              {track.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {track.artist}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => removeFromQueue(actualIndex)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/10"
                            title="Remove from queue"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
