import React, { useState } from 'react';
import { X, User, Mail, Lock, LogOut, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLibraryStore } from '../../stores/useLibraryStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, isAuthenticated, isConfigured, isLoading, error, signIn, signUp, signOut, clearError } = useAuthStore();
  const { loadLibrary } = useLibraryStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg(null);

    if (mode === 'signin') {
      const ok = await signIn(email, password);
      if (ok) {
        const activeUser = useAuthStore.getState().user;
        await loadLibrary(activeUser?.id);
        onClose();
      }
    } else {
      if (!username.trim()) return;
      const ok = await signUp(email, password, username.trim());
      if (ok) {
        const activeUser = useAuthStore.getState().user;
        await loadLibrary(activeUser?.id);
        onClose();
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    await loadLibrary();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-aurora-card border border-white/10 shadow-2xl p-6 text-white space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-aurora-accent/20 text-aurora-accent flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold">
              {isAuthenticated ? 'User Profile' : mode === 'signin' ? 'Sign In to Resonix' : 'Create Account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If Already Authenticated */}
        {isAuthenticated && user ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-aurora-surface/70 border border-white/5">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-emerald-500 flex items-center justify-center text-lg font-bold text-black flex-shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.username.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-white truncate">{user.username}</h4>
                <p className="text-xs text-slate-400 truncate">{user.email || 'No email attached'}</p>
                <span className="inline-block text-[10px] uppercase font-mono text-emerald-400 mt-1">
                  Cloud Synchronized
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-semibold transition-colors border border-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <div className="space-y-4">
            {!isConfigured && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                Running in guest local storage mode. To enable Supabase authentication, configure your Supabase URL & anon key in <code>frontend/.env</code>.
              </div>
            )}

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-aurora-surface border border-white/5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`py-2 rounded-lg transition-colors ${
                  mode === 'signin' ? 'bg-aurora-card text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`py-2 rounded-lg transition-colors ${
                  mode === 'signup' ? 'bg-aurora-card text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your listener alias"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-aurora-surface border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aurora-accent"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-aurora-surface border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aurora-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-aurora-surface border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-aurora-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-aurora-accent hover:bg-aurora-accentHover text-black font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-4 shadow-lg shadow-emerald-500/20"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
