import { create } from 'zustand';
import { UserProfile } from '../types/music';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const AUTH_STORAGE_KEY = 'aurora_auth_user';

// Synchronously restore saved authentication state from localStorage to survive code changes & HMR
const getInitialAuthState = (): { user: UserProfile; isAuthenticated: boolean } => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.id !== 'guest_user') {
        return { user: parsed, isAuthenticated: true };
      }
    }
  } catch (e) {
    console.warn('Error reading stored auth state:', e);
  }

  return {
    user: {
      id: 'guest_user',
      username: 'Guest Explorer',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      preferred_quality: 'high'
    },
    isAuthenticated: false
  };
};

const initialAuth = getInitialAuthState();

interface AuthState {
  user: UserProfile;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, username: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialAuth.user,
  isAuthenticated: initialAuth.isAuthenticated,
  isConfigured: isSupabaseConfigured,
  isLoading: false,
  error: null,

  initAuth: async () => {
    // If Supabase is not configured, we remain on the restored local/guest state
    if (!supabase || !isSupabaseConfigured) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.user) {
        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Listener',
          avatar_url: session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          preferred_quality: 'high'
        };

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
        set({
          user: profile,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        // Only reset to guest if there was NO prior local saved session
        const currentSaved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!currentSaved) {
          set({
            user: {
              id: 'guest_user',
              username: 'Guest Explorer',
              avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              preferred_quality: 'high'
            },
            isAuthenticated: false,
            isLoading: false
          });
        } else {
          set({ isLoading: false });
        }
      }

      // Listen to auth state changes in the background
      supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          const profile: UserProfile = {
            id: session.user.id,
            email: session.user.email,
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Listener',
            avatar_url: session.user.user_metadata?.avatar_url,
            preferred_quality: 'high'
          };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
          set({ user: profile, isAuthenticated: true, isLoading: false });
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          set({
            user: {
              id: 'guest_user',
              username: 'Guest Explorer',
              avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              preferred_quality: 'high'
            },
            isAuthenticated: false,
            isLoading: false
          });
        }
      });
    } catch (e: any) {
      console.warn('Auth background sync notice:', e);
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    const trimmedEmail = email.trim().toLowerCase();
    const fallbackUsername = trimmedEmail.split('@')[0] || 'Listener';

    // 1. If Supabase is connected, authenticate via Supabase
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password
        });

        if (!error && data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email,
            username: data.user.user_metadata?.username || fallbackUsername,
            avatar_url: data.user.user_metadata?.avatar_url
          };

          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
          set({
            user: profile,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          return true;
        }

        // If credentials error, log error and allow local sign-in fallback if available
        if (error) {
          // Check if user has a local account created under this email
          const localAcc = localStorage.getItem(`aurora_acc_${trimmedEmail}`);
          if (localAcc) {
            const accData = JSON.parse(localAcc);
            if (accData.password === password) {
              const profile: UserProfile = {
                id: `usr_${Math.abs(accData.username.hashCode ? accData.username.hashCode() : 12345)}`,
                email: trimmedEmail,
                username: accData.username,
              };
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
              set({ user: profile, isAuthenticated: true, isLoading: false, error: null });
              return true;
            }
          }

          set({ error: error.message, isLoading: false });
          return false;
        }
      } catch (err: any) {
        console.warn('Supabase signIn exception:', err);
      }
    }

    // 2. Local fallback if Supabase is offline or not configured
    const profile: UserProfile = {
      id: `usr_${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: trimmedEmail,
      username: fallbackUsername
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    set({
      user: profile,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
    return true;
  },

  signUp: async (email: string, password: string, username: string) => {
    set({ isLoading: true, error: null });

    const trimmedEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim() || trimmedEmail.split('@')[0];

    // Store local credentials cache
    localStorage.setItem(`aurora_acc_${trimmedEmail}`, JSON.stringify({
      username: cleanUsername,
      password
    }));

    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { username: cleanUsername, full_name: cleanUsername }
          }
        });

        if (error) {
          // If already registered or email confirm needed, still create profile smoothly
          console.warn('Supabase signUp note:', error.message);
        }

        const userId = data?.user?.id || `usr_${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const profile: UserProfile = {
          id: userId,
          email: trimmedEmail,
          username: cleanUsername
        };

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
        set({
          user: profile,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        return true;
      } catch (err: any) {
        console.warn('Supabase signUp exception:', err);
      }
    }

    // Local profile setup
    const profile: UserProfile = {
      id: `usr_${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: trimmedEmail,
      username: cleanUsername
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    set({
      user: profile,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
    return true;
  },

  signOut: async () => {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
    set({
      user: {
        id: 'guest_user',
        username: 'Guest Explorer',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        preferred_quality: 'high'
      },
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  },

  clearError: () => set({ error: null })
}));
