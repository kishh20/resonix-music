import { useEffect } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an input, textarea or contenteditable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const store = usePlayerStore.getState();

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          store.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          store.seekTo(Math.max(0, store.currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          store.seekTo(store.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          store.setVolume(Math.min(1, store.volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          store.setVolume(Math.max(0, store.volume - 0.05));
          break;
        case 'KeyM':
          e.preventDefault();
          store.toggleMute();
          break;
        case 'KeyN':
          e.preventDefault();
          store.nextTrack();
          break;
        case 'KeyP':
          e.preventDefault();
          store.previousTrack();
          break;
        case 'KeyL':
          e.preventDefault();
          store.toggleLyrics();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Attached ONCE, reads latest state directly from store
}
