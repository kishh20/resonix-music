import React from 'react';
import { 
  Home, 
  Flame, 
  Search, 
  Compass, 
  Library, 
  Heart, 
  Plus, 
  Music, 
  Sparkles,
  Smartphone,
  Download,
  Headphones
} from 'lucide-react';
import { useLibraryStore } from '../../stores/useLibraryStore';
import { useDJStore } from '../../stores/useDJStore';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string, contextId?: string) => void;
  onOpenCreatePlaylist: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCreatePlaylist
}) => {
  const { playlists, likedSongs } = useLibraryStore();
  const { setDJOpen } = useDJStore();
  const { isInstalled, installApp } = usePWAInstall();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'new-releases', label: 'New Releases', icon: Flame },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'explore', label: 'Explore & Genres', icon: Compass },
    { id: 'spotify', label: 'Import Playlists', icon: Sparkles },
    { id: 'liked', label: 'Liked Songs', icon: Heart, count: likedSongs.length },
    { id: 'library', label: 'Your Library', icon: Library },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-full bg-aurora-card/80 backdrop-blur-xl border-r border-white/10 select-none flex-shrink-0">
      {/* Brand Header */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Music className="w-5 h-5 text-black font-extrabold" />
        </div>
        <div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            RESONIX
          </span>
          <span className="block text-[10px] font-mono tracking-widest text-emerald-400 font-semibold uppercase">
            Music Stream
          </span>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="px-3 py-2 space-y-1">
        {/* AI DJ & Agent Fleet Quick Launch Button */}
        <button
          onClick={() => setDJOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 bg-gradient-to-r from-emerald-500/15 via-indigo-500/10 to-purple-500/15 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500/40 hover:scale-[1.02] shadow-sm group mb-2"
        >
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5 text-emerald-400 group-hover:animate-pulse" />
            <span className="font-bold">DJ Resonix & Fleet</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            4 AI
          </span>
        </button>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-aurora-accent/15 text-aurora-accent font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-aurora-accent' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="my-2 px-6">
        <div className="h-px bg-white/10" />
      </div>

      {/* Playlists Header */}
      <div className="px-6 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Playlists
        </span>
        <button
          onClick={onOpenCreatePlaylist}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Create Playlist"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {playlists.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-500">
            No custom playlists yet. Create one or import from Spotify!
          </div>
        ) : (
          playlists.map((pl) => {
            const isActive = currentTab === `playlist:${pl.id}`;
            return (
              <button
                key={pl.id}
                onClick={() => onSelectTab('playlist', pl.id)}
                className={`w-full text-left px-3.5 py-2 rounded-lg text-sm truncate transition-colors flex items-center gap-2.5 ${
                  isActive
                    ? 'text-aurora-accent bg-white/10 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="w-6 h-6 rounded bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {pl.cover_url ? (
                    <img src={pl.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-3 h-3 text-slate-500" />
                  )}
                </div>
                <span className="truncate">{pl.title}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Mobile Connect & Install App Footer */}
      <div className="p-4 border-t border-white/10 space-y-2">
        {!isInstalled && (
          <button
            onClick={installApp}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}
        <button
          onClick={() => onSelectTab('settings')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium transition-colors"
        >
          <Smartphone className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Connect Phone / QR Code</span>
        </button>
      </div>
    </aside>
  );
};
