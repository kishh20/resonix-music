import { create } from 'zustand';
import { Track, RepeatMode } from '../types/music';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Track[];
  queueIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isBuffering: boolean;
  audioError: string | null;
  isQueueOpen: boolean;
  isFullPlayerOpen: boolean;
  isVisualizerOpen: boolean;
  isLyricsOpen: boolean;
  isNowPlayingOpen: boolean;
  seekRequest: { time: number; timestamp: number } | null;
  sleepTimerEndsAt: number | null;
  sleepTimerMinutes: number | null;
  isSleepTimerOpen: boolean;
  autoPlay: boolean;

  // Actions
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  pause: () => void;
  play: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track | Track[]) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setBuffering: (buffering: boolean) => void;
  setAudioError: (error: string | null) => void;
  setQueueOpen: (open: boolean) => void;
  setFullPlayerOpen: (open: boolean) => void;
  setVisualizerOpen: (open: boolean) => void;
  setLyricsOpen: (open: boolean) => void;
  toggleLyrics: () => void;
  setNowPlayingOpen: (open: boolean) => void;
  toggleNowPlaying: () => void;
  swapAudioVersion: () => void;
  setSleepTimer: (minutes: number | null) => void;
  clearSleepTimer: () => void;
  setSleepTimerOpen: (open: boolean) => void;
  toggleAutoPlay: () => void;
  setAutoPlay: (enabled: boolean) => void;
}

const savedVolume = parseFloat(localStorage.getItem('aurora_volume') || '0.8');

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: isNaN(savedVolume) ? 0.8 : savedVolume,
  isMuted: false,
  queue: [],
  queueIndex: -1,
  shuffle: false,
  repeat: 'off',
  isBuffering: false,
  audioError: null,
  isQueueOpen: false,
  isFullPlayerOpen: false,
  isVisualizerOpen: false,
  isLyricsOpen: false,
  isNowPlayingOpen: typeof window !== 'undefined' ? (localStorage.getItem('aurora_now_playing') !== 'false' && window.innerWidth >= 1200) : true,
  seekRequest: null,
  sleepTimerEndsAt: null,
  sleepTimerMinutes: null,
  isSleepTimerOpen: false,
  autoPlay: typeof window !== 'undefined' ? localStorage.getItem('aurora_autoplay') !== 'false' : true,

  playTrack: (track: Track, newQueue?: Track[]) => {
    const current = get().currentTrack;
    if (current && current.id === track.id) {
      if (!get().isPlaying) {
        set({ isPlaying: true });
      }
      return;
    }

    let queue = newQueue || get().queue;
    let idx = queue.findIndex(t => t.id === track.id);

    if (idx === -1) {
      queue = [track, ...queue];
      idx = 0;
    }

    set({
      currentTrack: track,
      queue,
      queueIndex: idx,
      isPlaying: true,
      currentTime: 0,
      duration: track.duration || 0,
      audioError: null,
      isBuffering: true
    });
  },

  togglePlay: () => {
    const { isPlaying, currentTrack, queue } = get();
    if (!currentTrack && queue.length > 0) {
      set({ currentTrack: queue[0], queueIndex: 0, isPlaying: true });
      return;
    }
    set({ isPlaying: !isPlaying });
  },

  pause: () => set({ isPlaying: false }),
  play: () => set({ isPlaying: true }),

  nextTrack: () => {
    const { queue, queueIndex, repeat, shuffle } = get();
    if (queue.length === 0) return;

    if (repeat === 'one') {
      get().seekTo(0);
      set({ isPlaying: true });
      return;
    }

    let nextIdx: number;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') {
          nextIdx = 0;
        } else {
          set({ isPlaying: false, currentTime: 0 });
          return;
        }
      }
    }

    const nextTrack = queue[nextIdx];
    if (nextTrack) {
      set({
        currentTrack: nextTrack,
        queueIndex: nextIdx,
        isPlaying: true,
        currentTime: 0,
        duration: nextTrack.duration || 0,
        audioError: null,
        isBuffering: true
      });
    }
  },

  previousTrack: () => {
    const { queue, queueIndex, currentTime } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart track
    if (currentTime > 3) {
      get().seekTo(0);
      return;
    }

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }

    const prevTrack = queue[prevIdx];
    if (prevTrack) {
      set({
        currentTrack: prevTrack,
        queueIndex: prevIdx,
        isPlaying: true,
        currentTime: 0,
        duration: prevTrack.duration || 0,
        audioError: null,
        isBuffering: true
      });
    }
  },

  seekTo: (time: number) => {
    const clamped = Math.max(0, Math.min(time, get().duration || time));
    set({
      seekRequest: { time: clamped, timestamp: Date.now() },
      currentTime: clamped
    });
  },

  setVolume: (volume: number) => {
    const vol = Math.max(0, Math.min(1, volume));
    localStorage.setItem('aurora_volume', vol.toString());
    set({ volume: vol, isMuted: vol === 0 });
  },

  toggleMute: () => {
    const { isMuted, volume } = get();
    if (isMuted) {
      set({ isMuted: false });
    } else {
      set({ isMuted: true });
    }
  },

  toggleShuffle: () => set(state => ({ shuffle: !state.shuffle })),

  toggleRepeat: () => set(state => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(state.repeat);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    return { repeat: nextMode };
  }),

  addToQueue: (track: Track | Track[]) => set(state => ({
    queue: [...state.queue, ...(Array.isArray(track) ? track : [track])]
  })),

  removeFromQueue: (index: number) => set(state => {
    const newQueue = state.queue.filter((_, i) => i !== index);
    let newIndex = state.queueIndex;
    if (index < state.queueIndex) newIndex--;
    return { queue: newQueue, queueIndex: newIndex };
  }),

  reorderQueue: (fromIndex: number, toIndex: number) => set(state => {
    const queue = [...state.queue];
    const [moved] = queue.splice(fromIndex, 1);
    queue.splice(toIndex, 0, moved);
    let newIdx = state.queueIndex;
    if (state.queueIndex === fromIndex) newIdx = toIndex;
    else if (fromIndex < state.queueIndex && toIndex >= state.queueIndex) newIdx--;
    else if (fromIndex > state.queueIndex && toIndex <= state.queueIndex) newIdx++;
    return { queue, queueIndex: newIdx };
  }),

  clearQueue: () => set({ queue: [], queueIndex: -1 }),

  setCurrentTime: (time: number) => set({ currentTime: time }),
  setDuration: (duration: number) => set({ duration }),
  setBuffering: (buffering: boolean) => set({ isBuffering: buffering }),
  setAudioError: (error: string | null) => set({ audioError: error }),
  setQueueOpen: (open: boolean) => set({ isQueueOpen: open }),
  setFullPlayerOpen: (open: boolean) => set({ isFullPlayerOpen: open }),
  setVisualizerOpen: (open: boolean) => set({ isVisualizerOpen: open }),
  setLyricsOpen: (open: boolean) => set({ isLyricsOpen: open }),
  toggleLyrics: () => set(state => ({ isLyricsOpen: !state.isLyricsOpen })),
  setNowPlayingOpen: (open: boolean) => {
    localStorage.setItem('aurora_now_playing', open.toString());
    set({ isNowPlayingOpen: open });
  },
  toggleNowPlaying: () => {
    const next = !get().isNowPlayingOpen;
    localStorage.setItem('aurora_now_playing', next.toString());
    set({ isNowPlayingOpen: next });
  },

  swapAudioVersion: () => {
    const { currentTrack } = get();
    if (!currentTrack || !currentTrack.stream_url) return;

    try {
      const url = new URL(currentTrack.stream_url, window.location.origin);
      const currentSwap = parseInt(url.searchParams.get('swap') || '0', 10);
      const nextSwap = (currentSwap + 1) % 4; // Cycles through 0, 1, 2, 3
      url.searchParams.set('swap', nextSwap.toString());
      url.searchParams.set('_t', Date.now().toString());

      const updatedTrack: Track = {
        ...currentTrack,
        stream_url: url.pathname + url.search
      };

      set({
        currentTrack: updatedTrack,
        isPlaying: true,
        isBuffering: true,
        audioError: `Swapping to alternate studio audio (source #${nextSwap + 1})...`,
        currentTime: 0
      });

      // Clear the temporary notification message after 3 seconds
      setTimeout(() => {
        if (get().audioError?.startsWith('Swapping')) {
          set({ audioError: null });
        }
      }, 3000);
    } catch (e) {
      console.warn('Failed to swap audio version:', e);
    }
  },

  setSleepTimer: (minutes: number | null) => {
    // minutes == -1 indicates 'End of Track'
    if (minutes === -1) {
      set({ sleepTimerEndsAt: null, sleepTimerMinutes: -1 });
      return;
    }
    if (!minutes || minutes <= 0) {
      set({ sleepTimerEndsAt: null, sleepTimerMinutes: null });
      return;
    }
    const endsAt = Date.now() + minutes * 60 * 1000;
    set({ sleepTimerEndsAt: endsAt, sleepTimerMinutes: minutes });
  },

  clearSleepTimer: () => {
    set({ sleepTimerEndsAt: null, sleepTimerMinutes: null });
  },

  setSleepTimerOpen: (open: boolean) => set({ isSleepTimerOpen: open }),

  toggleAutoPlay: () => {
    const next = !get().autoPlay;
    localStorage.setItem('aurora_autoplay', next.toString());
    set({ autoPlay: next });
  },

  setAutoPlay: (enabled: boolean) => {
    localStorage.setItem('aurora_autoplay', enabled.toString());
    set({ autoPlay: enabled });
  }
}));
