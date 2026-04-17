import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { apiClient } from '../../../shared/api/axios';

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const identifier = searchParams.get('identifier');

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (!identifier) {
      navigate('/signup');
    }
  }, [identifier, navigate]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/verify-otp', { identifier, code });
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/resend-otp', { identifier });
      setError('A new verification code has been sent!');
      setResendCooldown(30);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to resend code. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  if (!identifier) return null;

  return (
    <div className="relative h-screen w-screen flex items-center justify-center p-4 bg-[#050505] font-sans overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-[480px] bg-[#0c0c0e] border border-white/[0.08] rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] p-6 sm:p-10">
        <div className="flex flex-col items-center text-center">
          
          <div className="h-12 w-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md shadow-inner">
            <ShieldCheck className="h-6 w-6 text-[#22d3ee]" strokeWidth={2} />
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
            Verify your account
          </h2>
          <p className="text-zinc-400 text-[14px] mb-8 font-medium px-2">
            We've sent a secure 6-digit code to <span className="text-white font-bold">{identifier}</span>. Please enter it below to activate your account.
          </p>

          {error && (
            <div className={`w-full mb-6 p-3 text-[13px] font-medium rounded-lg flex items-center space-x-2 text-left border ${error.includes('sent') ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-300 bg-rose-500/10 border-rose-500/20'}`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${error.includes('sent') ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              <span>{error}</span>
            </div>
          )}

          <form className="w-full space-y-6" noValidate onSubmit={handleSubmit}>
            <div className="flex justify-between gap-2 max-w-[340px] mx-auto">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold bg-[#050505] border border-white/10 rounded-xl focus:border-white/40 focus:ring-0 outline-none text-white transition-colors"
                />
              ))}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || otp.join('').length !== 6}
                className="relative w-full flex justify-center items-center py-4 px-4 text-[16px] font-bold rounded-xl text-black bg-white hover:bg-zinc-200 focus:outline-none focus:ring-0 transition-all duration-200 active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                <span>{loading ? 'Verifying...' : 'Verify'}</span>
                {!loading && <ArrowRight className="ml-2 h-4 w-4 transform transition-transform" strokeWidth={2.5} />}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-[14px] font-medium text-zinc-400">
            Didn't receive the code?{' '}
            <button 
              type="button" 
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
              className="text-white hover:text-zinc-300 transition-colors underline decoration-white/30 underline-offset-4 disabled:opacity-50 disabled:no-underline disabled:hover:text-white"
            >
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </button>
            {resendCooldown > 0 && (
              <span className="text-zinc-500 ml-2">in {resendCooldown}s</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
