import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';

export const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your email or phone number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { identifier });
      setSuccess(true);
      setTimeout(() => {
        navigate(`/reset-password?identifier=${encodeURIComponent(identifier)}`);
      }, 2000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center p-4 bg-[#050505] font-sans overflow-y-auto">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-[460px] bg-[#0c0c0e] border border-white/[0.08] rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] p-6 sm:p-10">
        <div className="flex flex-col items-center text-center">
          
          <div className="h-12 w-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md shadow-inner">
            <ShieldAlert className="h-6 w-6 text-white" strokeWidth={2} />
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1.5 text-white">
            Reset Password
          </h2>
          <p className="text-zinc-400 text-[14px] mb-6 font-medium px-4">
            Enter your email or phone number and we'll send you a 6-digit recovery code.
          </p>

          {error && (
            <div className="w-full mb-5 p-3 text-[13px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center space-x-2 text-left">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="w-full mb-5 p-3 text-[13px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center space-x-2 text-left">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
              <span>If you have an account, an OTP has been sent. Redirecting...</span>
            </div>
          )}

          <form className="w-full space-y-5" noValidate onSubmit={handleSubmit}>
            <div className="space-y-1.5 text-left">
              <label className="block text-[11px] font-bold text-white uppercase tracking-widest ml-1">
                Email or Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                </div>
                <input
                  type="text"
                  required
                  disabled={success || loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#050505] border border-white/10 rounded-lg focus:border-white/30 focus:ring-0 outline-none transition-colors text-[14px] font-medium text-white placeholder-zinc-600 disabled:opacity-50"
                  placeholder="you@domain.com or +919876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2.5">
              <button
                type="submit"
                disabled={loading || success}
                className="relative w-full flex justify-center items-center py-3.5 px-4 text-[15px] font-bold rounded-lg text-black bg-white hover:bg-zinc-200 focus:outline-none focus:ring-0 transition-all duration-200 active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                <span>{loading ? 'Sending...' : 'Send Recovery Code'}</span>
                {!loading && !success && <ArrowRight className="ml-2 h-4 w-4 transform transition-transform" strokeWidth={2.5} />}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-[14px] font-medium text-zinc-400">
            Remember your password?{' '}
            <Link to="/login" className="text-white hover:text-zinc-300 transition-colors underline decoration-white/30 underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
