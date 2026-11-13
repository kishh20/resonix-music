import { create } from 'zustand';
import { UserPreferences } from '../types/music';

interface PreferencesState extends UserPreferences {
  isOnboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  completeOnboarding: (prefs?: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

const STORAGE_KEY = 'resonix_taste_preferences';

function getInitialPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        languages: Array.isArray(parsed.languages) ? parsed.languages : ['English'],
        genres: Array.isArray(parsed.genres) ? parsed.genres : ['Pop', 'Hip-Hop / Rap'],
        artists: Array.isArray(parsed.artists) ? parsed.artists : [],
        region: typeof parsed.region === 'string' ? parsed.region : 'Global',
        hasCompletedOnboarding: Boolean(parsed.hasCompletedOnboarding),
      };
    }
  } catch (e) {
    console.warn('Failed to parse saved taste preferences:', e);
  }

  return {
    languages: [],
    genres: [],
    artists: [],
    region: 'Global',
    hasCompletedOnboarding: false,
  };
}

function persistPreferences(state: UserPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      languages: state.languages,
      genres: state.genres,
      artists: state.artists,
      region: state.region,
      hasCompletedOnboarding: state.hasCompletedOnboarding,
    }));
  } catch (e) {
    console.warn('Failed to persist taste preferences:', e);
  }
}

const initial = getInitialPreferences();

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  languages: initial.languages,
  genres: initial.genres,
  artists: initial.artists,
  region: initial.region,
  hasCompletedOnboarding: initial.hasCompletedOnboarding,
  // If user has not completed onboarding yet, open it automatically!
  isOnboardingOpen: !initial.hasCompletedOnboarding,

  openOnboarding: () => set({ isOnboardingOpen: true }),
  closeOnboarding: () => set({ isOnboardingOpen: false }),

  setPreferences: (partial) => {
    set((state) => {
      const updated: UserPreferences = {
        languages: partial.languages !== undefined ? partial.languages : state.languages,
        genres: partial.genres !== undefined ? partial.genres : state.genres,
        artists: partial.artists !== undefined ? partial.artists : state.artists,
        region: partial.region !== undefined ? partial.region : state.region,
        hasCompletedOnboarding: partial.hasCompletedOnboarding !== undefined ? partial.hasCompletedOnboarding : state.hasCompletedOnboarding,
      };
      persistPreferences(updated);
      return updated;
    });
  },

  completeOnboarding: (partial) => {
    set((state) => {
      const updated: UserPreferences = {
        languages: partial?.languages !== undefined ? partial.languages : state.languages,
        genres: partial?.genres !== undefined ? partial.genres : state.genres,
        artists: partial?.artists !== undefined ? partial.artists : state.artists,
        region: partial?.region !== undefined ? partial.region : state.region,
        hasCompletedOnboarding: true,
      };
      persistPreferences(updated);
      return {
        ...updated,
        isOnboardingOpen: false,
      };
    });
  },

  resetPreferences: () => {
    const empty: UserPreferences = {
      languages: [],
      genres: [],
      artists: [],
      region: 'Global',
      hasCompletedOnboarding: false,
    };
    persistPreferences(empty);
    set({
      ...empty,
      isOnboardingOpen: true,
    });
  },
}));
