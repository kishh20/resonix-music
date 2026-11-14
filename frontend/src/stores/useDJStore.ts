import { create } from 'zustand';
import { Track, AIDJResponse, AgentTelemetry } from '../types/music';
import { api } from '../services/api';

interface DJStore {
  isDJOpen: boolean;
  setDJOpen: (open: boolean) => void;
  isLoading: boolean;
  session: AIDJResponse | null;
  telemetry: AgentTelemetry | null;
  activeTab: 'dj' | 'fleet';
  setActiveTab: (tab: 'dj' | 'fleet') => void;
  
  spinVibe: (params: {
    prompt: string;
    userName?: string;
    favoriteArtists?: string[];
    preferredLanguages?: string[];
    preferredGenres?: string[];
    region?: string;
    currentTrack?: Track;
  }) => Promise<void>;

  fetchTelemetry: () => Promise<void>;
  triggerAgent: (agentName: string) => Promise<any>;
}

export const useDJStore = create<DJStore>((set, get) => ({
  isDJOpen: false,
  setDJOpen: (open) => {
    set({ isDJOpen: open });
    if (open) {
      get().fetchTelemetry();
    }
  },
  isLoading: false,
  session: null,
  telemetry: null,
  activeTab: 'dj',
  setActiveTab: (tab) => set({ activeTab: tab }),

  spinVibe: async ({
    prompt,
    userName,
    favoriteArtists,
    preferredLanguages,
    preferredGenres,
    region,
    currentTrack
  }) => {
    if (!prompt.trim()) return;
    set({ isLoading: true });
    try {
      const res = await api.spinAIDJ({
        prompt: prompt.trim(),
        user_name: userName || 'Listener',
        favorite_artists: favoriteArtists || [],
        preferred_languages: preferredLanguages || [],
        preferred_genres: preferredGenres || [],
        region: region,
        current_track: currentTrack
      });
      set({ session: res, isLoading: false });
    } catch (err) {
      console.error('Failed to spin vibe with AI DJ:', err);
      set({ isLoading: false });
    }
  },

  fetchTelemetry: async () => {
    try {
      const data = await api.getAgentTelemetry();
      set({ telemetry: data });
    } catch (err) {
      console.debug('Failed to fetch telemetry:', err);
    }
  },

  triggerAgent: async (agentName: string) => {
    try {
      const res = await api.triggerAgent(agentName);
      await get().fetchTelemetry();
      return res;
    } catch (err) {
      console.error(`Failed to trigger agent ${agentName}:`, err);
      throw err;
    }
  }
}));
