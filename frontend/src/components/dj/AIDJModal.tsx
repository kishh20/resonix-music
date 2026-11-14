import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Radio, 
  Play, 
  ListPlus, 
  Bot, 
  Activity, 
  RefreshCw, 
  Headphones, 
  Volume2, 
  CheckCircle2, 
  ShieldCheck, 
  Disc, 
  FileText, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { useDJStore } from '../../stores/useDJStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { SafeImage } from '../common/SafeImage';

const QUICK_VIBES = [
  { label: '🌙 Midnight Cruise', prompt: 'Smooth late-night city drive with moody synths and bass' },
  { label: '⚡ Gym Adrenaline', prompt: 'Heavy-hitting high-energy workout songs with 140+ BPM drops' },
  { label: '☕ Lo-Fi Deep Focus', prompt: 'Warm mellow lo-fi beats and soft piano for deep work' },
  { label: '🎉 Weekend Party', prompt: 'Peak-time dance bangers and club chartbusters to get hyped' },
  { label: '🌧️ Rainy Acoustic', prompt: 'Soulful gentle acoustic songs and melancholy rain vibes' },
  { label: '🌴 Retro 90s Throwback', prompt: 'Classic 90s and 2000s nostalgic chartbusters and singalongs' },
  { label: '🥥 Tamil Melodies', prompt: 'Top soulful Tamil melody hits and acoustic cinema soundtrack' }
];

export const AIDJModal: React.FC = () => {
  const { 
    isDJOpen, 
    setDJOpen, 
    isLoading, 
    session, 
    telemetry, 
    activeTab, 
    setActiveTab,
    spinVibe,
    triggerAgent
  } = useDJStore();

  const { playTrack, addToQueue, currentTrack } = usePlayerStore();
  const { artists, languages, genres, region } = usePreferencesStore();
  const { user } = useAuthStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [triggeringAgent, setTriggeringAgent] = useState<string | null>(null);

  if (!isDJOpen) return null;

  const handleSpin = async (promptToUse?: string) => {
    const text = promptToUse || inputPrompt;
    if (!text.trim()) return;

    await spinVibe({
      prompt: text,
      userName: user?.username || 'Listener',
      favoriteArtists: artists,
      preferredLanguages: languages,
      preferredGenres: genres,
      region: region,
      currentTrack: currentTrack || undefined
    });
    setInputPrompt('');
  };

  const handlePlayDJSet = () => {
    if (!session || session.tracks.length === 0) return;
    playTrack(session.tracks[0], session.tracks);
    setDJOpen(false);
  };

  const handleAppendQueue = () => {
    if (!session || session.tracks.length === 0) return;
    addToQueue(session.tracks);
  };

  const handleManualTrigger = async (agentKey: string) => {
    setTriggeringAgent(agentKey);
    try {
      await triggerAgent(agentKey);
    } finally {
      setTriggeringAgent(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-slate-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-purple-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-indigo-500 text-black flex items-center justify-center shadow-lg shadow-emerald-500/20 font-bold">
              <Headphones className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white tracking-tight">
                  DJ Resonix
                </h2>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI Companion
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Autonomous Vibe Curator & Multi-Agent Intelligence Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('dj')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'dj'
                    ? 'bg-emerald-500 text-black shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎧 DJ Booth
              </button>
              <button
                onClick={() => setActiveTab('fleet')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'fleet'
                    ? 'bg-emerald-500 text-black shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Fleet (4 Agents)</span>
              </button>
            </div>

            <button
              onClick={() => setDJOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-2"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: DJ BOOTH */}
          {activeTab === 'dj' && (
            <div className="space-y-6">
              {/* Quick Vibe Chips */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                  Instant Sonic Vibes
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_VIBES.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => handleSpin(v.prompt)}
                      disabled={isLoading}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 hover:border-emerald-500/40 border border-white/5 text-xs font-medium text-slate-200 hover:text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Input Box */}
              <div className="relative">
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSpin();
                  }}
                  placeholder="Describe any vibe, tempo, scene or artist fusion (e.g. 'Chill Tamil acoustic with rain sounds')..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-4 py-3.5 pr-28 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-inner"
                />
                <button
                  onClick={() => handleSpin()}
                  disabled={isLoading || !inputPrompt.trim()}
                  className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Mixing...' : 'Spin'}</span>
                </button>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="p-8 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mx-auto" />
                  <h4 className="text-sm font-bold text-white">DJ Resonix is in the booth...</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Analyzing mood semantics, matching tempo transitions, and digging through authorized creator nodes for the perfect setlist.
                  </p>
                </div>
              )}

              {/* Active Session Display */}
              {!isLoading && session && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* DJ Voice Commentary Card */}
                  <div className="relative p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                          DJ Mic Live
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10">
                          {session.energy_level}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-extrabold text-white tracking-tight">
                      {session.vibe_title}
                    </h3>

                    <p className="text-sm text-slate-200 italic leading-relaxed">
                      "{session.dj_commentary}"
                    </p>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handlePlayDJSet}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                        <span>Play This Set</span>
                      </button>

                      <button
                        onClick={handleAppendQueue}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
                      >
                        <ListPlus className="w-4 h-4" />
                        <span>Add to Queue</span>
                      </button>
                    </div>
                  </div>

                  {/* Track List */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Setlist ({session.tracks.length} Tracks)
                    </h4>
                    <div className="space-y-1.5 bg-black/40 rounded-2xl p-2 border border-white/5">
                      {session.tracks.map((t, idx) => (
                        <div
                          key={t.id}
                          onClick={() => playTrack(t, session.tracks)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <span className="text-xs font-mono text-slate-500 w-5 text-center">
                              {idx + 1}
                            </span>
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
                              <SafeImage
                                src={t.artwork_url}
                                alt={t.title}
                                aspectRatio="square"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-400">
                                {t.title}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {t.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-right flex-shrink-0 font-mono text-[11px] text-slate-500">
                            <span className="capitalize hidden sm:inline">{t.provider}</span>
                            <span>{Math.floor(t.duration / 60)}:{(t.duration % 60).toString().padStart(2, '0')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUTONOMOUS FLEET TELEMETRY */}
          {activeTab === 'fleet' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Resonix Multi-Agent Fleet Active</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    4 specialized background autonomous agents continuously optimize your music experience.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  4 Agents Healthy
                </span>
              </div>

              {/* The 4 Agent Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Agent 1: DJ Resonix */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">DJ Resonix</h4>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Natural language vibe interpreter and interactive setlist composer.
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-slate-500 border-t border-white/5 flex justify-between">
                    <span>Engine</span>
                    <span className="text-slate-300">
                      {telemetry?.agents?.ai_dj?.model_source || 'Gemini 2.5 Flash / Semantic'}
                    </span>
                  </div>
                </div>

                {/* Agent 2: Chart Radar */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-sky-400" />
                      <h4 className="text-sm font-bold text-white">Chart Radar Agent</h4>
                    </div>
                    <button
                      onClick={() => handleManualTrigger('radar')}
                      disabled={triggeringAgent === 'radar'}
                      className="text-[10px] font-mono text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${triggeringAgent === 'radar' ? 'animate-spin' : ''}`} />
                      <span>Scan Now</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Crawls YouTube Music, Spotify Top 50 & Audius for new artist drops with strict OG filters.
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-slate-500 border-t border-white/5 flex justify-between">
                    <span>Catalogue Tracks</span>
                    <span className="text-slate-300">
                      {telemetry?.agents?.discovery_radar?.total_catalogue_size || 180}+ Songs
                    </span>
                  </div>
                </div>

                {/* Agent 3: Lyrics Weaver */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-bold text-white">Lyrics Weaver Agent</h4>
                    </div>
                    <button
                      onClick={() => handleManualTrigger('weaver')}
                      disabled={triggeringAgent === 'weaver'}
                      className="text-[10px] font-mono text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                    >
                      <Zap className={`w-3 h-3 ${triggeringAgent === 'weaver' ? 'animate-spin' : ''}`} />
                      <span>Heal Now</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Extracts millisecond-accurate YouTube subtitles & LRCLIB lyrics in English, Tamil, Hindi & 80+ langs.
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-slate-500 border-t border-white/5 flex justify-between">
                    <span>Status</span>
                    <span className="text-slate-300">
                      {telemetry?.agents?.lyrics_weaver?.status || 'Active Watcher'}
                    </span>
                  </div>
                </div>

                {/* Agent 4: Stream Quality Healer */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-rose-400" />
                      <h4 className="text-sm font-bold text-white">Stream Healer Agent</h4>
                    </div>
                    <button
                      onClick={() => handleManualTrigger('healer')}
                      disabled={triggeringAgent === 'healer'}
                      className="text-[10px] font-mono text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${triggeringAgent === 'healer' ? 'animate-spin' : ''}`} />
                      <span>Verify Now</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Proactively tests Google CDN URLs, auto-renews expired tokens & guarantees 320kbps master quality.
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-slate-500 border-t border-white/5 flex justify-between">
                    <span>Health Ratio</span>
                    <span className="text-slate-300">
                      {telemetry?.agents?.stream_healer?.healthy_ratio_pct || 100}% Operational
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
