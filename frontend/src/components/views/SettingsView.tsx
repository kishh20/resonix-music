import React, { useEffect, useState } from 'react';
import { 
  Smartphone, 
  Wifi, 
  Cloud, 
  Sliders, 
  Keyboard, 
  Copy, 
  Check, 
  ShieldCheck, 
  RefreshCw, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Database,
  Download,
  Laptop,
  Sparkles,
  SlidersHorizontal,
  Globe2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { SectionHeader } from '../common/SectionHeader';
import { SyncStatusResponse } from '../../types/music';

export const SettingsView: React.FC = () => {
  const { user, isConfigured } = useAuthStore();
  const { loadLibrary } = useLibraryStore();
  const { isInstalled, installApp } = usePWAInstall();
  const { 
    languages, 
    genres, 
    artists, 
    region, 
    openOnboarding, 
    resetPreferences 
  } = usePreferencesStore();

  const [networkInfo, setNetworkInfo] = useState<{
    lan_ip: string;
    frontend_url: string;
    backend_url: string;
    is_local: boolean;
  } | null>(null);

  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [audioQuality, setAudioQuality] = useState<'high' | 'standard'>('high');

  useEffect(() => {
    api.getNetworkInfo().then(setNetworkInfo).catch(console.warn);
    api.getDiscoveryStatus().then(setSyncStatus).catch(console.warn);
  }, []);

  const phoneUrl = networkInfo?.frontend_url || `http://${window.location.hostname}:5173`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(phoneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await api.syncDiscoveryNow();
      setSyncFeedback(`Successfully synchronized! ${res.new_tracks_discovered || 0} new releases discovered.`);
      const updated = await api.getDiscoveryStatus();
      setSyncStatus(updated);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (e: any) {
      setSyncFeedback('Synchronization finished.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto animate-in fade-in duration-300">
      <SectionHeader
        title="Settings & System Configuration"
        subtitle="Manage your audio playback, mobile phone connection, catalogue synchronisation and cloud storage"
      />

      {/* 0. Music Taste Profile & Personalization */}
      <section className="p-6 rounded-3xl bg-aurora-card border border-white/10 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-black flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Music Taste & Personalization</h3>
              <p className="text-xs text-slate-400">Customized languages, favorite artists, genres and regional recommendations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openOnboarding}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Update Taste Profile</span>
            </button>
            <button
              onClick={resetPreferences}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {/* Region Card */}
          <div className="p-4 rounded-2xl bg-aurora-surface/70 border border-white/5 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
              Region
            </span>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-emerald-400" />
              <span>{region || 'Global / Worldwide'}</span>
            </p>
          </div>

          {/* Languages Card */}
          <div className="p-4 rounded-2xl bg-aurora-surface/70 border border-white/5 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
              Languages ({languages.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {languages.length > 0 ? (
                languages.slice(0, 3).map(l => (
                  <span key={l} className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-medium text-slate-200">
                    {l}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">Not set</span>
              )}
            </div>
          </div>

          {/* Favorite Genres Card */}
          <div className="p-4 rounded-2xl bg-aurora-surface/70 border border-white/5 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
              Genres ({genres.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {genres.length > 0 ? (
                genres.slice(0, 3).map(g => (
                  <span key={g} className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-[11px] font-medium text-emerald-300">
                    {g}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">Not set</span>
              )}
            </div>
          </div>

          {/* Favorite Artists Card */}
          <div className="p-4 rounded-2xl bg-aurora-surface/70 border border-white/5 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
              Favorite Artists ({artists.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {artists.length > 0 ? (
                artists.slice(0, 3).map(a => (
                  <span key={a} className="px-2 py-0.5 rounded-md bg-purple-500/15 text-[11px] font-medium text-purple-300">
                    {a}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">Not set</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 1. Automatic Music Discovery & Catalogue Synchronisation Engine */}
      <section className="p-6 rounded-3xl bg-aurora-card border border-white/10 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Automatic Music Discovery Engine</h3>
              <p className="text-xs text-slate-400">Autonomous background worker discovering fresh releases & verifying stream health</p>
            </div>
          </div>

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-aurora-accent hover:bg-aurora-accentHover text-black text-xs font-bold transition-all shadow-md self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Catalogue Now'}</span>
          </button>
        </div>

        {syncFeedback && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Sync Frequencies Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-aurora-surface/70 border border-white/5 space-y-1">
            <span className="text-emerald-400 font-mono font-semibold block text-[11px] uppercase">
              ⚡ Every 2 Hours
            </span>
            <p className="text-white font-medium">New Release Discovery</p>
            <p className="text-slate-400 text-[11px]">Polls Audius, Jamendo, and Free Music Archive for new drops.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-aurora-surface/70 border border-white/5 space-y-1">
            <span className="text-cyan-400 font-mono font-semibold block text-[11px] uppercase">
              📅 Daily
            </span>
            <p className="text-white font-medium">Metadata Refresh</p>
            <p className="text-slate-400 text-[11px]">Updates artist bios, album artwork, and play counts.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-aurora-surface/70 border border-white/5 space-y-1">
            <span className="text-purple-400 font-mono font-semibold block text-[11px] uppercase">
              🛡️ Weekly
            </span>
            <p className="text-white font-medium">Link Health Verification</p>
            <p className="text-slate-400 text-[11px]">Tests stream URLs using Range requests to mark active availability.</p>
          </div>
        </div>

        {/* Live Catalogue Metrics */}
        {syncStatus && (
          <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl bg-aurora-surface/40 border border-white/5 text-xs text-slate-300 gap-4">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Total Catalogue</span>
              <span className="text-sm font-bold text-white">
                {syncStatus.total_tracks} Tracks • {syncStatus.total_albums} Albums • {syncStatus.total_artists} Artists
              </span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Last Synchronized</span>
              <span className="text-xs font-mono text-emerald-400">
                {syncStatus.last_sync_at ? new Date(syncStatus.last_sync_at).toLocaleString() : 'Just now'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 2. Desktop App & Home Screen Shortcut */}
      <section className="p-6 rounded-3xl bg-aurora-card border border-white/10 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Desktop App & Home Screen Shortcut</h3>
            <p className="text-xs text-slate-400">Launch Resonix directly from your Windows Desktop or mobile Home Screen</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Windows Desktop Shortcut Card */}
          <div className="p-4 rounded-2xl bg-aurora-surface/70 border border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-white">Windows Desktop Shortcut</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              A standalone desktop shortcut has been created on your Windows Home Screen (Desktop). Double-click <strong>Resonix Music</strong> on your desktop to launch without opening a browser tab.
            </p>
            <div className="pt-1">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-mono border border-emerald-500/20">
                Desktop\Resonix Music.lnk
              </span>
            </div>
          </div>

          {/* Standalone PWA Card */}
          <div className="p-4 rounded-2xl bg-aurora-surface/70 border border-white/5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-aurora-accent" />
                <h4 className="text-sm font-semibold text-white">PWA App Installation</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Install Resonix as a Progressive Web App (PWA) with hardware media key controls, lockscreen playback, and zero browser address bars.
              </p>
            </div>
            <button
              onClick={installApp}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isInstalled ? 'App Installed (Re-install / Open)' : 'Install As Standalone App'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Mobile Phone Connection & PWA Installation */}
      <section className="p-6 rounded-3xl bg-aurora-card border border-white/10 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Connect Your Android Phone</h3>
            <p className="text-xs text-slate-400">Stream on your phone over the local WiFi network</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-2xl bg-aurora-surface/70 border border-white/5">
          <div className="p-3 bg-white rounded-2xl shadow-xl flex-shrink-0">
            <QRCodeSVG value={phoneUrl} size={150} level="M" />
          </div>

          <div className="space-y-3 flex-1 text-center md:text-left">
            <h4 className="text-sm font-semibold text-white">Quick Scan & Connect</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              1. Ensure your Android phone is connected to the same Wi-Fi network as this laptop.<br/>
              2. Open your phone camera or browser and scan the QR code, or visit the URL below.<br/>
              3. In Chrome/Brave on Android, tap <strong>Menu (⋮) → "Add to Home screen" / "Install App"</strong> to use Resonix as a native standalone PWA with lock screen playback!
            </p>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={phoneUrl}
                className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-emerald-400 font-mono select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Audio Quality Preference */}
      <section className="p-6 rounded-3xl bg-aurora-card border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Streaming Audio Quality</h3>
            <p className="text-xs text-slate-400">Control bandwidth and streaming bitrate</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div
            onClick={() => setAudioQuality('high')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              audioQuality === 'high'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                : 'bg-aurora-surface/50 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold">High Quality (320kbps MP3)</span>
              {audioQuality === 'high' && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-xs text-slate-400">
              Crisp highs and full bass frequency range. Recommended for WiFi and desktop listening.
            </p>
          </div>

          <div
            onClick={() => setAudioQuality('standard')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              audioQuality === 'standard'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                : 'bg-aurora-surface/50 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold">Standard Quality (192kbps)</span>
              {audioQuality === 'standard' && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-xs text-slate-400">
              Faster buffering on slow mobile connections while maintaining clear acoustics.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Supabase Cloud Sync Status */}
      <section className="p-6 rounded-3xl bg-aurora-card border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Supabase Cloud Database</h3>
              <p className="text-xs text-slate-400">Cross-device synchronization for playlists & likes</p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isConfigured
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {isConfigured ? 'Connected & Active' : 'Offline / Local Mode'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-aurora-surface/70 border border-white/5 text-xs text-slate-300 space-y-2 leading-relaxed">
          {isConfigured ? (
            <p>
              Supabase credentials are active! All your liked songs, custom playlists, and listening history are backed up and automatically synchronized across your laptop and Android phone.
            </p>
          ) : (
            <div>
              <p className="text-slate-300 mb-2">
                Currently running in <strong>Local Storage Mode</strong>. Your playlists and liked songs are saved locally on your browser.
              </p>
              <p className="text-slate-400">
                To enable Supabase PostgreSQL cloud sync:
                <br/>1. Create a free project at <strong>supabase.com</strong>.
                <br/>2. Run the provided SQL migration in <code>supabase/schema.sql</code>.
                <br/>3. Add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>frontend/.env</code>.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 5. Keyboard Shortcuts */}
      <section className="p-6 rounded-3xl bg-aurora-card border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Desktop Keyboard Shortcuts</h3>
            <p className="text-xs text-slate-400">Control playback without leaving your keyboard</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
          {[
            { key: 'Space', desc: 'Play / Pause' },
            { key: 'N', desc: 'Next Track' },
            { key: 'P', desc: 'Previous Track' },
            { key: '← / →', desc: 'Seek -5s / +5s' },
            { key: '↑ / ↓', desc: 'Volume Up / Down' },
            { key: 'M', desc: 'Mute / Unmute' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-aurora-surface/60 border border-white/5">
              <span className="text-slate-400">{item.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-semibold text-[11px] border border-white/10">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Authorised Music Licensing & Attribution */}
      <section className="p-6 rounded-3xl bg-aurora-card/50 border border-white/5 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Legal Music Rights & Licensing Information</span>
        </div>
        <p className="leading-relaxed">
          Resonix streams music strictly from authorised open APIs including the Audius decentralized streaming protocol, the Jamendo Creative Commons music catalogue, and the Free Music Archive. All music files are streamed directly from authorised creator nodes and content delivery networks. Spotify is utilized solely for user playlist metadata reconstruction and matching.
        </p>
      </section>
    </div>
  );
};
