import React, { useState, useEffect } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAuthStore } from './stores/useAuthStore';
import { useLibraryStore } from './stores/useLibraryStore';
import { usePlayerStore } from './stores/usePlayerStore';
import { Track } from './types/music';

// Layout & Player Components
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { MobileNav } from './components/layout/MobileNav';
import { BottomPlayer } from './components/player/BottomPlayer';
import { MobileMiniPlayer } from './components/player/MobileMiniPlayer';
import { MobileFullPlayer } from './components/player/MobileFullPlayer';
import { QueueDrawer } from './components/player/QueueDrawer';
import { FullScreenVisualizer } from './components/layout/FullScreenVisualizer';
import { LyricsView } from './components/player/LyricsView';
import { NowPlayingSidebar } from './components/player/NowPlayingSidebar';
import { SleepTimerModal } from './components/player/SleepTimerModal';
import { JamModal } from './components/jam/JamModal';
import { AddToPlaylistModal } from './components/common/AddToPlaylistModal';
import { AuthModal } from './components/views/AuthModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';

// Views
import { HomeView } from './components/views/HomeView';
import { NewReleasesView } from './components/views/NewReleasesView';
import { SearchView } from './components/views/SearchView';
import { ExploreView } from './components/views/ExploreView';
import { LibraryView } from './components/views/LibraryView';
import { PlaylistDetailView } from './components/views/PlaylistDetailView';
import { AlbumDetailView } from './components/views/AlbumDetailView';
import { LikedSongsView } from './components/views/LikedSongsView';
import { SpotifyImportView } from './components/views/SpotifyImportView';
import { SettingsView } from './components/views/SettingsView';

export default function App() {
  // Initialize Core Audio Engine & Global Shortcuts
  useAudioEngine();
  useKeyboardShortcuts();

  const { initAuth, user } = useAuthStore();
  const { loadLibrary, createPlaylist } = useLibraryStore();
  const { isSleepTimerOpen, setSleepTimerOpen } = usePlayerStore();

  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [trackForPlaylist, setTrackForPlaylist] = useState<Track | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    initAuth().then(() => {
      const activeUser = useAuthStore.getState().user;
      loadLibrary(activeUser?.id);
    });
  }, []);

  // Reload library whenever user ID changes
  useEffect(() => {
    if (user?.id) {
      loadLibrary(user.id);
    }
  }, [user?.id]);

  const handleSelectTab = (tab: string, contextId?: string) => {
    if (tab === 'playlist') {
      setSelectedPlaylistId(contextId || null);
    } else if (tab === 'album') {
      setSelectedAlbumId(contextId || null);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectGenre = (genreId: string) => {
    setSelectedGenre(genreId);
    setCurrentTab('explore');
  };

  const handleQuickCreatePlaylist = async () => {
    const name = prompt('Enter a name for your new playlist:');
    if (name && name.trim()) {
      const pl = await createPlaylist(name.trim(), '', undefined, user?.id);
      setSelectedPlaylistId(pl.id);
      setCurrentTab('playlist');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-aurora-dark text-slate-100 font-sans">
      {/* 1. Desktop Left Sidebar */}
      <Sidebar
        currentTab={currentTab === 'playlist' ? `playlist:${selectedPlaylistId}` : currentTab}
        onSelectTab={handleSelectTab}
        onOpenCreatePlaylist={handleQuickCreatePlaylist}
      />

      {/* 2. Main Content View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <TopNav
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (currentTab !== 'search') setCurrentTab('search');
          }}
          onSearchFocus={() => {
            if (currentTab !== 'search') setCurrentTab('search');
          }}
          onOpenSettings={() => setCurrentTab('settings')}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-36 md:pb-32">
          {currentTab === 'home' && (
            <HomeView
              onSelectGenre={handleSelectGenre}
              onOpenAddToPlaylist={(t) => setTrackForPlaylist(t)}
              onOpenSpotifyImport={() => setCurrentTab('spotify')}
            />
          )}

          {currentTab === 'new-releases' && (
            <NewReleasesView
              onOpenAddToPlaylist={(t) => setTrackForPlaylist(t)}
              onSelectAlbum={(albumId) => handleSelectTab('album', albumId)}
            />
          )}

          {currentTab === 'search' && (
            <SearchView
              initialQuery={searchQuery}
              onOpenAddToPlaylist={(t) => setTrackForPlaylist(t)}
            />
          )}

          {currentTab === 'explore' && (
            <ExploreView
              initialGenre={selectedGenre}
              onOpenAddToPlaylist={(t) => setTrackForPlaylist(t)}
            />
          )}

          {currentTab === 'library' && (
            <LibraryView
              onSelectPlaylist={(id) => handleSelectTab('playlist', id)}
              onOpenLikedSongs={() => setCurrentTab('liked')}
              onOpenCreatePlaylist={handleQuickCreatePlaylist}
              onOpenSpotifyImport={() => setCurrentTab('spotify')}
              onOpenNewReleases={() => setCurrentTab('new-releases')}
            />
          )}

          {currentTab === 'playlist' && selectedPlaylistId && (
            <PlaylistDetailView
              playlistId={selectedPlaylistId}
              onBack={() => setCurrentTab('library')}
              onOpenAddToPlaylist={(t) => setTrackForPlaylist(t)}
            />
          )}

          {currentTab === 'album' && selectedAlbumId && (
            <AlbumDetailView
              albumId={selectedAlbumId}
              onBack={() => setCurrentTab('new-releases')}
              onOpenAddToPlaylist={(t) => setTrackForPlaylist(t)}
            />
          )}

          {currentTab === 'liked' && (
            <LikedSongsView
              onBack={() => setCurrentTab('library')}
              onOpenAddToPlaylist={(t) => setTrackForPlaylist(t)}
            />
          )}

          {currentTab === 'spotify' && (
            <SpotifyImportView
              onPlaylistCreated={(id) => handleSelectTab('playlist', id)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* 3. Desktop Right Now-Playing Sidebar (with Live Synced Lyrics Preview) */}
      <NowPlayingSidebar />

      {/* 4. Playback Controls & Drawers */}
      <BottomPlayer />
      <MobileMiniPlayer />
      <MobileFullPlayer />
      <MobileNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
      />
      <QueueDrawer />
      <FullScreenVisualizer />
      <LyricsView />

      {/* 4. Global Modals */}
      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => setSleepTimerOpen(false)}
      />

      <JamModal />

      <AddToPlaylistModal
        track={trackForPlaylist}
        onClose={() => setTrackForPlaylist(null)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <OnboardingModal />
    </div>
  );
}
