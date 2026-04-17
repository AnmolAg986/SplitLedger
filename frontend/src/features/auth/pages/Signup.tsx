import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, LockKeyhole, User, ArrowRight, Activity, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';

export const Signup = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-zinc-800', textColor: 'text-zinc-800' };
    
    if (/[^a-zA-Z0-9]/.test(pass)) {
      return { score: 1, label: 'Invalid characters', color: 'bg-rose-500', textColor: 'text-rose-500' };
    }
    
    let score = 0;
    if (pass.length > 0) {
      if (pass.length >= 6) score = 1;
      if (pass.length >= 8) score = 2;
      if (pass.length >= 10 || (pass.length >= 8 && /[0-9]/.test(pass) && /[a-zA-Z]/.test(pass))) score = 3;
    }

    switch (score) {
      case 0: return { score: 1, label: 'Too short', color: 'bg-rose-500', textColor: 'text-rose-500' };
      case 1: return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-500' };
      case 2: return { score: 2, label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-500' };
      case 3: return { score: 3, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
      default: return { score: 0, label: '', color: 'bg-zinc-800', textColor: 'text-zinc-800' };
    }
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (/[^a-zA-Z0-9]/.test(password)) {
      setError('Password can only contain letters and numbers.');
      return;
    }
    if (strength.score < 2) {
      setError('Password is too weak. Please use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/register', { identifier, password, displayName });
      navigate(`/verify-email?identifier=${encodeURIComponent(identifier)}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string | { message?: string }[] } } };
      if (error.response?.data?.error === 'Account with this email or phone already exists') {
        setError('An account with this email/phone already exists.');
      } else if (Array.isArray(error.response?.data?.error)) {
        setError(error.response.data.error[0]?.message || 'Invalid input.');
      } else {
        const fallbackMsg = error.response?.data?.error && typeof error.response.data.error === 'string' 
          ? error.response.data.error 
          : (err as Error).message || 'Registration failed. Please try again.';
        setError(fallbackMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#050505] font-sans overflow-y-auto">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[460px] bg-[#0c0c0e] border border-white/[0.08] rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] p-6 my-6">
        
        <div className="flex flex-col items-center text-center">
          
          {/* Logo */}
          <div className="h-12 w-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md shadow-inner">
            <Activity className="h-6 w-6 text-white" strokeWidth={2} />
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-white">
            SplitLedger
          </h2>
          <p className="text-zinc-400 text-[14px] mb-4 font-medium">
            Create an account to track expenses.
          </p>

          {error && (
            <div className="w-full mb-5 p-3 text-[13px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center space-x-2 text-left">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="w-full space-y-4" noValidate onSubmit={handleSubmit}>
            {/* Name */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[11px] font-bold text-white uppercase tracking-widest ml-1">
                Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                </div>
                <input
                  id="displayName"
                  name="displayName"
                  autoComplete="name"
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:border-white/30 focus:ring-0 outline-none transition-colors text-[14px] font-medium text-white placeholder-zinc-600"
                  placeholder="Jane Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>

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
              <label className="block text-[11px] font-bold text-white uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <LockKeyhole className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                </div>
                <input
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  pattern="^[a-zA-Z0-9]+$"
                  title="Password can only contain letters and numbers (no special characters or spaces)"
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
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mx-1 mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex justify-between items-center text-[10px] font-bold tracking-wider uppercase">
                    <span className="text-zinc-500">Security</span>
                    <span className={strength.textColor}>{strength.label}</span>
                  </div>
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3].map(level => (
                      <div 
                        key={level} 
                        className={`flex-1 rounded-full transition-colors duration-300 ${strength.score >= level ? strength.color : 'bg-white/10'}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[11px] font-bold text-white uppercase tracking-widest ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <LockKeyhole className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                </div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  autoComplete="new-password"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  className={`w-full pl-10 pr-10 py-2.5 bg-[#050505] border rounded-lg focus:ring-0 outline-none transition-colors text-[14px] font-medium text-white placeholder-zinc-600 ${
                    passwordsMismatch
                      ? 'border-rose-500/50 focus:border-rose-500/70'
                      : passwordsMatch
                      ? 'border-emerald-500/40 focus:border-emerald-500/60'
                      : 'border-white/10 focus:border-white/30'
                  }`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
                </button>
              </div>
              {passwordsMismatch && (
                <p className="text-[12px] font-medium text-rose-400 ml-1 mt-1 animate-in fade-in duration-200">Passwords do not match.</p>
              )}
              {passwordsMatch && (
                <p className="text-[12px] font-medium text-emerald-400 ml-1 mt-1 animate-in fade-in duration-200">Passwords match ✓</p>
              )}
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="relative w-full flex justify-center items-center py-3.5 px-4 text-[15px] font-bold rounded-lg text-black bg-white hover:bg-zinc-200 focus:outline-none focus:ring-0 transition-all duration-200 active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                <span>{loading ? 'Processing...' : 'Create Account'}</span>
                {!loading && <ArrowRight className="ml-2 h-4 w-4 transform transition-transform" strokeWidth={2.5} />}
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-[14px] font-medium text-zinc-400">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:text-zinc-300 transition-colors underline decoration-white/30 underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
