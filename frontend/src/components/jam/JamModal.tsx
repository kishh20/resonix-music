import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Users, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  LogOut, 
  Music2, 
  Play, 
  Trash2,
  Share2
} from 'lucide-react';
import { useJamStore } from '../../stores/useJamStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { Track } from '../../types/music';

export const JamModal: React.FC = () => {
  const { 
    isOpen, 
    setOpen, 
    activeJam, 
    isConnected, 
    isConnecting, 
    isHost, 
    hostControlsOnly, 
    participants, 
    sharedQueue, 
    error, 
    createJam, 
    joinJam, 
    leaveJam, 
    sendToggleHostOnly, 
    sendQueueRemove,
    clearError 
  } = useJamStore();

  const { user } = useAuthStore();
  const { currentTrack, playTrack } = usePlayerStore();

  const [inputCode, setInputCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-detect ?jam= code from URL on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlJam = params.get('jam');
      if (urlJam && !isConnected) {
        setInputCode(urlJam.toUpperCase());
        setOpen(true);
      }
    }
  }, [isConnected]);

  if (!isOpen) return null;

  const currentUserId = user?.id || 'guest_user';
  const currentUserName = user?.username || 'Resonix Explorer';
  const currentUserAvatar = user?.avatar_url;

  const handleStartJam = async () => {
    clearError();
    try {
      await createJam({
        id: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar
      }, currentTrack);
    } catch {}
  };

  const handleJoinJam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    clearError();
    try {
      await joinJam(inputCode.trim(), {
        id: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar
      });
      setInputCode('');
    } catch {}
  };

  const handleCopyCode = () => {
    if (!activeJam) return;
    navigator.clipboard.writeText(activeJam.jam_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!activeJam) return;
    const shareUrl = `${window.location.origin}/?jam=${activeJam.jam_code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-[#18181b]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary-500/20 text-primary-400'}`}>
              <Radio className={`w-5 h-5 ${isConnected ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">Spotify Jam</h3>
                {isConnected && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Live Room
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">Listen together in real-time across devices</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {!isConnected ? (
            /* Not in Jam - Start or Join Screen */
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-500/10 via-purple-500/5 to-transparent border border-primary-500/20 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-white text-base">Start a Collaborative Jam</h4>
                <p className="text-xs text-white/60 max-w-sm mx-auto leading-relaxed">
                  Invite friends to listen simultaneously with shared playback, 320kbps streaming quality, and a real-time queue.
                </p>
                <button
                  onClick={handleStartJam}
                  disabled={isConnecting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium text-sm transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  {isConnecting ? 'Starting Jam...' : 'Start Jam Session'}
                </button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold text-white/40 uppercase tracking-wider">or join existing</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              {/* Join with code */}
              <form onSubmit={handleJoinJam} className="space-y-3">
                <label className="block text-xs font-medium text-white/70">
                  Enter Jam Code (e.g. JAM-4X9K)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="JAM-XXXX"
                    maxLength={10}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary-500 font-mono tracking-wider"
                  />
                  <button
                    type="submit"
                    disabled={isConnecting || !inputCode.trim()}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all disabled:opacity-40"
                  >
                    Join
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Active Jam Screen */
            <div className="space-y-6">
              {/* Jam Code Banner */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Jam Code</span>
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Syncing
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold font-mono tracking-widest text-white">
                    {activeJam?.jam_code}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Copy Code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copied' : 'Code'}
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Copy Invite Link"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                      {copiedLink ? 'Copied Link' : 'Invite'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Host Permissions Control */}
              {isHost && (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary-400" />
                    <div>
                      <p className="text-xs font-medium text-white">Host Controls Only</p>
                      <p className="text-[11px] text-white/40">Only you can skip, pause or change songs</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendToggleHostOnly(!hostControlsOnly)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${hostControlsOnly ? 'bg-primary-500' : 'bg-white/10'}`}
                  >
                    <div 
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${hostControlsOnly ? 'left-6' : 'left-1'}`} 
                    />
                  </button>
                </div>
              )}

              {/* Participants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-white/70">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Listeners ({participants.length})
                  </span>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {participants.map((p) => (
                    <div 
                      key={p.user_id} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-300 font-bold text-xs flex items-center justify-center">
                            {p.user_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium text-white truncate">
                          {p.user_name} {p.user_id === currentUserId && '(You)'}
                        </span>
                      </div>
                      {p.is_host && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          HOST
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Shared Jam Queue */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-white/70">
                  <span className="flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5" />
                    Shared Jam Queue ({sharedQueue.length})
                  </span>
                </div>
                {sharedQueue.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                    <p className="text-xs text-white/40">Shared queue is empty</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {sharedQueue.map((track: Track, idx: number) => (
                      <div 
                        key={`${track.id}-${idx}`}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img 
                            src={track.artwork_url || '/placeholder.png'} 
                            alt="" 
                            className="w-8 h-8 rounded-lg object-cover" 
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-white truncate">{track.title}</p>
                            <p className="text-[11px] text-white/50 truncate">{track.artist}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => playTrack(track)}
                            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Play"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => sendQueueRemove(track.id)}
                            className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Leave / End Session */}
              <button
                onClick={leaveJam}
                className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-xs transition-colors flex items-center justify-center gap-2 border border-red-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isHost ? 'End Jam for Everyone' : 'Leave Jam Session'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
