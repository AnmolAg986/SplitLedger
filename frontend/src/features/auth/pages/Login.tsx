import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, LockKeyhole, ArrowRight, Activity, Eye, EyeOff, Key, X } from 'lucide-react';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { apiClient } from '../../../shared/api/axios';

const SAVE_PW_DISMISSED_KEY = 'splitledger-save-pw-dismissed';

export const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Save-password popup state
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingNav, setPendingNav] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{ identifier: string; password: string } | null>(null);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Identifier can\'t be empty');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', { identifier, password });
      setAuth(data.user, data.accessToken, data.refreshToken);
      const dismissed = localStorage.getItem(SAVE_PW_DISMISSED_KEY);
      if (!dismissed) {
        setSavedCredentials({ identifier, password });
        setShowSavePrompt(true);
        setPendingNav(true);
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string | string[] } } };
      if (Array.isArray(error.response?.data?.error)) {
        setError('Invalid email or password.');
      } else {
        setError(error.response?.data?.error || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem(SAVE_PW_DISMISSED_KEY, '1');
    setShowSavePrompt(false);
    if (pendingNav) navigate('/');
  };

  const handleDontAsk = () => {
    localStorage.setItem(SAVE_PW_DISMISSED_KEY, '1');
    setShowSavePrompt(false);
    if (pendingNav) navigate('/');
  };

  const handleDismiss = () => {
    setShowSavePrompt(false);
    if (pendingNav) navigate('/');
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center p-4 bg-[#050505] font-sans overflow-y-auto">
      
      {/* Subtle ambient glow behind the card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Save Password Popup */}
      {showSavePrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:justify-end p-4 sm:p-6 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[360px] bg-[#141416] border border-white/[0.12] rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.9)] p-5 animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mt-0.5">
                <Key className="h-5 w-5 text-blue-400" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-[15px] leading-tight mb-0.5">Save password?</h3>
                <p className="text-zinc-400 text-[12px] font-medium leading-snug truncate">
                  {savedCredentials?.identifier}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors mt-0.5"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                className="flex-1 py-2 px-3 text-[13px] font-bold bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors active:scale-[0.97]"
              >
                Save
              </button>
              <button
                onClick={handleDontAsk}
                className="flex-1 py-2 px-3 text-[13px] font-bold bg-white/10 text-zinc-300 rounded-lg hover:bg-white/15 transition-colors active:scale-[0.97] border border-white/10"
              >
                Don't ask again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-[#0c0c0e] border border-white/[0.08] rounded-[32px] shadow-[0_0_80px_rgba(0,0,0,0.8)] p-7 sm:p-10 mx-auto">
        
        <div className="flex flex-col">
          
          {/* Header (Centered) */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="h-14 w-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-5 backdrop-blur-md shadow-inner">
              <Activity className="h-7 w-7 text-white" strokeWidth={2} />
            </div>

            <h2 className="font-display text-3xl font-bold tracking-tight mb-2 text-white">
              SplitLedger
            </h2>
            <p className="text-zinc-500 text-[14px] font-medium opacity-80">
              Access your secure account.
            </p>
          </div>

          {error && (
            <div className={`w-full mb-6 p-4 text-[13px] font-semibold rounded-xl flex items-center justify-between text-left border animate-in fade-in slide-in-from-top-2 duration-300 ${
              error.includes('verify') 
                ? 'text-amber-300 bg-amber-500/10 border-amber-500/20' 
                : 'text-rose-300 bg-rose-500/10 border-rose-500/20'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${error.includes('verify') ? 'bg-amber-500' : 'bg-rose-500'}`} />
                <span className="leading-snug">{error}</span>
              </div>
              {error.includes('verify') && (
                <button 
                  onClick={() => navigate(`/verify-email?identifier=${encodeURIComponent(identifier)}`)}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg font-bold transition-colors ml-4 shrink-0"
                >
                  Verify
                </button>
              )}
            </div>
          )}

          <form className="w-full space-y-6" noValidate onSubmit={handleSubmit}>
            {/* Identifier */}
            <div className="space-y-2">
              <label htmlFor="identifier" className="block text-[12px] font-bold text-zinc-400 uppercase tracking-[0.1em] ml-1">
                Email or Phone
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-500 group-focus-within:text-white transition-colors" strokeWidth={2} />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  type="text"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-[#050505] border border-white/5 rounded-xl focus:border-white/20 focus:bg-[#0a0a0a] focus:ring-4 focus:ring-white/[0.02] outline-none transition-all text-[15px] font-medium text-white placeholder-zinc-600"
                  placeholder="you@domain.com or +1234567890"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label htmlFor="password" className="text-[12px] font-bold text-zinc-400 uppercase tracking-[0.1em]">
                  Password
                </label>
                <Link to="/forgot-password" size="sm" className="text-[12px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockKeyhole className="h-4 w-4 text-zinc-500 group-focus-within:text-white transition-colors" strokeWidth={2} />
                </div>
                <input
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-11 pr-11 py-3 bg-[#050505] border border-white/5 rounded-xl focus:border-white/20 focus:bg-[#0a0a0a] focus:ring-4 focus:ring-white/[0.02] outline-none transition-all text-[15px] font-medium text-white placeholder-zinc-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword 
                    ? <EyeOff className="h-4 w-4" strokeWidth={2} /> 
                    : <Eye className="h-4 w-4" strokeWidth={2} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center px-1">
               <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center h-5 w-5 bg-[#050505] border border-white/10 rounded-md group-hover:border-white/20 transition-all">
                     <input type="checkbox" className="peer absolute h-full w-full opacity-0 cursor-pointer" defaultChecked />
                     <div className="h-2.5 w-2.5 bg-white rounded-[2px] opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[13px] font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Stay signed in</span>
               </label>
            </div>

            <div className="pt-4">
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="relative w-full flex justify-center items-center py-4 px-4 text-[15px] font-bold rounded-xl text-black bg-white hover:bg-zinc-200 focus:outline-none focus:ring-0 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(255,255,255,0.1)]"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                {!loading && <ArrowRight className="ml-2 h-4 w-4" strokeWidth={3} />}
              </button>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-[14px] font-medium text-zinc-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-white hover:text-indigo-400 font-bold transition-colors ml-1">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
