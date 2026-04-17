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
      <div className="relative z-10 w-full max-w-[460px] bg-[#0c0c0e] border border-white/[0.08] rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] p-6 sm:p-10">
        
        <div className="flex flex-col items-center text-center">
          
          {/* Logo */}
          <div className="h-12 w-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md shadow-inner">
            <Activity className="h-6 w-6 text-white" strokeWidth={2} />
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1.5 text-white">
            SplitLedger
          </h2>
          <p className="text-zinc-400 text-[14px] mb-6 font-medium">
            Access your secure account.
          </p>

          {error && (
            <div className={`w-full mb-5 p-3 text-[13px] font-medium rounded-lg flex items-center justify-between text-left border ${
              error.includes('verify') 
                ? 'text-amber-300 bg-amber-500/10 border-amber-500/20' 
                : 'text-rose-300 bg-rose-500/10 border-rose-500/20'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${error.includes('verify') ? 'bg-amber-500' : 'bg-rose-500'}`} />
                <span>{error}</span>
              </div>
              {error.includes('verify') && (
                <button 
                  onClick={() => navigate(`/verify-email?identifier=${encodeURIComponent(identifier)}`)}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded font-bold transition-colors ml-4"
                >
                  Verify
                </button>
              )}
            </div>
          )}

          <form className="w-full space-y-5" noValidate onSubmit={handleSubmit}>
            {/* Identifier */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[11px] font-bold text-white uppercase tracking-widest ml-1">
                Email or Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:border-white/30 focus:ring-0 outline-none transition-colors text-[14px] font-medium text-white placeholder-zinc-600"
                  placeholder="you@domain.com or +1234567890"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[11px] font-bold text-white uppercase tracking-widest">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[12px] font-medium text-white hover:text-zinc-300 transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <LockKeyhole className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                </div>
                <input
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:border-white/30 focus:ring-0 outline-none transition-colors text-[14px] font-medium text-white placeholder-zinc-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword 
                    ? <EyeOff className="h-4 w-4" strokeWidth={2} /> 
                    : <Eye className="h-4 w-4" strokeWidth={2} />}
                </button>
              </div>
            </div>

            <div className="pt-2.5">
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="relative w-full flex justify-center items-center py-3.5 px-4 text-[15px] font-bold rounded-lg text-black bg-white hover:bg-zinc-200 focus:outline-none focus:ring-0 transition-all duration-200 active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                {!loading && <ArrowRight className="ml-2 h-4 w-4 transform transition-transform" strokeWidth={2.5} />}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-[14px] font-medium text-zinc-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-white hover:text-zinc-300 transition-colors underline decoration-white/30 underline-offset-4">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
