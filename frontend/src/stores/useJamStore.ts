import { create } from 'zustand';
import { Track } from '../types/music';
import { api } from '../services/api';
import { usePlayerStore } from './usePlayerStore';

export interface JamParticipant {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  is_host: boolean;
}

export interface JamStateData {
  jam_code: string;
  host_id: string;
  host_name: string;
  host_controls_only: boolean;
  current_track: Track | null;
  is_playing: boolean;
  position: number;
  participants: JamParticipant[];
  queue: Track[];
}

interface JamStore {
  isOpen: boolean;
  activeJam: JamStateData | null;
  isConnected: boolean;
  isConnecting: boolean;
  isHost: boolean;
  hostControlsOnly: boolean;
  participants: JamParticipant[];
  sharedQueue: Track[];
  error: string | null;
  myUserId: string | null;
  isRemoteSync: boolean;

  // Actions
  setOpen: (open: boolean) => void;
  createJam: (user: { id: string; name: string; avatar?: string }, currentTrack?: Track | null) => Promise<string>;
  joinJam: (jamCode: string, user: { id: string; name: string; avatar?: string }) => Promise<void>;
  leaveJam: () => void;
  sendPlayTrack: (track: Track) => void;
  sendPlayState: (isPlaying: boolean) => void;
  sendSeek: (time: number) => void;
  sendQueueAdd: (track: Track) => void;
  sendQueueRemove: (trackId: string) => void;
  sendToggleHostOnly: (hostOnly: boolean) => void;
  clearError: () => void;
}

let jamSocket: WebSocket | null = null;

export const useJamStore = create<JamStore>((set, get) => ({
  isOpen: false,
  activeJam: null,
  isConnected: false,
  isConnecting: false,
  isHost: false,
  hostControlsOnly: false,
  participants: [],
  sharedQueue: [],
  error: null,
  myUserId: null,
  isRemoteSync: false,

  setOpen: (open: boolean) => set({ isOpen: open, error: null }),
  clearError: () => set({ error: null }),

  createJam: async (user, currentTrack) => {
    set({ isConnecting: true, error: null });
    try {
      const resp = await api.createJam({
        user_id: user.id,
        user_name: user.name,
        avatar_url: user.avatar,
        current_track: currentTrack || undefined
      });

      const jamCode = resp.jam_code;
      await get().joinJam(jamCode, user);
      set({ isHost: true });
      return jamCode;
    } catch (err: any) {
      set({ isConnecting: false, error: err.message || 'Failed to start Jam session' });
      throw err;
    }
  },

  joinJam: async (jamCode, user) => {
    const cleanCode = jamCode.trim().toUpperCase();
    if (!cleanCode) throw new Error('Please enter a valid Jam code');

    set({ isConnecting: true, error: null });

    // Close any prior socket
    if (jamSocket) {
      try {
        jamSocket.close();
      } catch {}
      jamSocket = null;
    }

    try {
      // 1. Verify existence via REST API
      const jamInfo = await api.getJam(cleanCode);

      // 2. Connect via WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/jam/ws/${encodeURIComponent(cleanCode)}?user_id=${encodeURIComponent(user.id)}&user_name=${encodeURIComponent(user.name)}&avatar_url=${encodeURIComponent(user.avatar || '')}`;

      const socket = new WebSocket(wsUrl);
      jamSocket = socket;

      set({ myUserId: user.id });

      socket.onopen = () => {
        set({
          isConnected: true,
          isConnecting: false,
          activeJam: jamInfo,
          isHost: jamInfo.host_id === user.id,
          hostControlsOnly: jamInfo.host_controls_only || false,
          participants: jamInfo.participants || [],
          sharedQueue: jamInfo.queue || []
        });

        // If the Jam has an active track and this user is joining, sync current track
        if (jamInfo.current_track && jamInfo.host_id !== user.id) {
          const player = usePlayerStore.getState();
          player.playTrack(jamInfo.current_track);
          if (jamInfo.position > 1) {
            player.seekTo(jamInfo.position);
          }
          if (!jamInfo.is_playing) {
            player.pause();
          }
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const state = get();
          const player = usePlayerStore.getState();

          switch (data.type) {
            case 'USER_JOINED':
              if (data.state) {
                set({
                  participants: data.state.participants || [],
                  sharedQueue: data.state.queue || [],
                  hostControlsOnly: data.state.host_controls_only || false
                });
              }
              break;

            case 'USER_LEFT':
              if (data.participants) {
                set({ participants: data.participants });
              }
              break;

            case 'TRACK_CHANGED':
              if (data.track) {
                if (data.sender_id !== state.myUserId) {
                  set({ isRemoteSync: true });
                  player.playTrack(data.track);
                  setTimeout(() => set({ isRemoteSync: false }), 500);
                }
              }
              break;

            case 'PLAY_STATE_CHANGED':
              if (data.sender_id !== state.myUserId) {
                set({ isRemoteSync: true });
                if (data.is_playing) {
                  player.play();
                } else {
                  player.pause();
                }
                setTimeout(() => set({ isRemoteSync: false }), 500);
              }
              break;

            case 'SEEK_SYNC':
              if (data.sender_id !== state.myUserId && typeof data.time === 'number') {
                set({ isRemoteSync: true });
                player.seekTo(data.time);
                setTimeout(() => set({ isRemoteSync: false }), 500);
              }
              break;

            case 'QUEUE_UPDATED':
              if (Array.isArray(data.queue)) {
                set({ sharedQueue: data.queue });
              }
              break;

            case 'SETTINGS_CHANGED':
              set({ hostControlsOnly: Boolean(data.host_controls_only) });
              break;

            default:
              break;
          }
        } catch (e) {
          console.warn('Jam WS parse error:', e);
        }
      };

      socket.onerror = () => {
        set({ isConnecting: false, error: 'Connection to Jam server failed' });
      };

      socket.onclose = () => {
        set({
          isConnected: false,
          isConnecting: false,
          activeJam: null,
          participants: [],
          sharedQueue: []
        });
        jamSocket = null;
      };

    } catch (err: any) {
      set({ isConnecting: false, error: err.message || 'Could not join Jam session' });
      throw err;
    }
  },

  leaveJam: () => {
    if (jamSocket) {
      try {
        jamSocket.close();
      } catch {}
      jamSocket = null;
    }
    set({
      isConnected: false,
      isConnecting: false,
      activeJam: null,
      participants: [],
      sharedQueue: [],
      error: null
    });
  },

  sendPlayTrack: (track: Track) => {
    if (jamSocket && jamSocket.readyState === WebSocket.OPEN) {
      jamSocket.send(JSON.stringify({
        type: 'PLAY_TRACK',
        track
      }));
    }
  },

  sendPlayState: (isPlaying: boolean) => {
    if (jamSocket && jamSocket.readyState === WebSocket.OPEN) {
      jamSocket.send(JSON.stringify({
        type: 'SET_PLAYING',
        is_playing: isPlaying
      }));
    }
  },

  sendSeek: (time: number) => {
    if (jamSocket && jamSocket.readyState === WebSocket.OPEN) {
      jamSocket.send(JSON.stringify({
        type: 'SEEK',
        time
      }));
    }
  },

  sendQueueAdd: (track: Track) => {
    if (jamSocket && jamSocket.readyState === WebSocket.OPEN) {
      jamSocket.send(JSON.stringify({
        type: 'QUEUE_ADD',
        track
      }));
    }
  },

  sendQueueRemove: (trackId: string) => {
    if (jamSocket && jamSocket.readyState === WebSocket.OPEN) {
      jamSocket.send(JSON.stringify({
        type: 'QUEUE_REMOVE',
        track_id: trackId
      }));
    }
  },

  sendToggleHostOnly: (hostOnly: boolean) => {
    if (jamSocket && jamSocket.readyState === WebSocket.OPEN) {
      jamSocket.send(JSON.stringify({
        type: 'TOGGLE_HOST_ONLY',
        host_controls_only: hostOnly
      }));
    }
  }
}));