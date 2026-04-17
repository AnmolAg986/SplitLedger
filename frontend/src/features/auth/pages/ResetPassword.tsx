import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, LockKeyhole, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';

type Step = 'otp' | 'password';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const identifier = new URLSearchParams(location.search).get('identifier');

  const [step, setStep] = useState<Step>('otp');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [identifierInput, setIdentifierInput] = useState(identifier || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!identifier) navigate('/login');
  }, [identifier, navigate]);

  useEffect(() => {
    if (step === 'otp') inputRefs.current[0]?.focus();
  }, [step]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/verify-reset-otp', { identifier, code });
      setStep('password');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!identifier) return;
    setResendLoading(true);
    setResendMessage('');
    setError('');
    try {
      await apiClient.post('/auth/forgot-password', { identifier });
      setResendMessage('Code resent! Check your email.');
      setResendCooldown(30);
      setTimeout(() => setResendMessage(''), 3000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { identifier, code: otp.join(''), newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } } };
      setError(errorObj.response?.data?.error || 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!identifier) return null;

  if (success) {
    return (
      <div className="relative h-screen w-full flex items-center justify-center p-4 bg-[#050505] font-sans overflow-hidden">
        <div className="relative z-10 w-full max-w-[480px] bg-[#0c0c0e] border border-white/[0.08] rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] p-6 sm:p-10 text-center">
          <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">Password Reset Successful</h2>
          <p className="text-zinc-400 text-sm">You will be redirected to the login page shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#050505] font-sans overflow-y-auto">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[460px] bg-[#0c0c0e] border border-white/[0.08] rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] p-6 sm:p-10 my-6">
        <div className="flex flex-col items-center text-center">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold border transition-colors ${step === 'otp' ? 'bg-white text-black border-white' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
              {step === 'otp' ? '1' : '✓'}
            </div>
            <div className="w-8 h-px bg-white/20" />
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold border transition-colors ${step === 'password' ? 'bg-white text-black border-white' : 'bg-white/10 text-zinc-500 border-white/10'}`}>
              2
            </div>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
            {step === 'otp' ? 'Verify Code' : 'Set New Password'}
          </h2>
          {step === 'otp' && (
            <p className="text-zinc-400 text-[14px] mb-8 font-medium px-2">
              Enter the 6-digit code sent to <span className="text-white font-bold">{identifier}</span>
            </p>
          )}

          {error && (
            <div className="w-full mb-5 p-3 text-[13px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center space-x-2 text-left">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Step 1: OTP ── */}
          {step === 'otp' && (
            <form className="w-full space-y-6" noValidate onSubmit={handleVerifyOtp}>
              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-bold text-white uppercase tracking-widest text-center mb-3">
                  6-Digit Recovery Code
                </label>
                <div className="flex justify-between gap-2 max-w-[340px] mx-auto" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-[#050505] border border-white/10 rounded-xl focus:border-white/40 focus:ring-0 outline-none text-white transition-colors"
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="relative w-full flex justify-center items-center py-3.5 px-4 text-[15px] font-bold rounded-lg text-black bg-white hover:bg-zinc-200 focus:outline-none transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{loading ? 'Verifying...' : 'Verify Code'}</span>
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.5} />}
                </button>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading || resendCooldown > 0}
                  className="text-[13px] font-medium text-white hover:text-zinc-300 transition-colors underline decoration-white/30 underline-offset-4 disabled:opacity-50 disabled:no-underline disabled:hover:text-white"
                >
                  {resendLoading ? 'Sending...' : 'Resend Code'}
                </button>
                {resendCooldown > 0 && (
                  <span className="text-[13px] text-zinc-500 font-medium ml-2">in {resendCooldown}s</span>
                )}
                {resendMessage && <p className="text-[12px] text-emerald-400 mt-2">{resendMessage}</p>}
              </div>
            </form>
          )}

          {/* ── Step 2: New Password ── */}
          {step === 'password' && (
            <form className="w-full space-y-5" noValidate onSubmit={handleResetPassword}>
              {/* New Password */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-bold text-white uppercase tracking-widest ml-1">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <LockKeyhole className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                  </div>
                  <input
                    id="new-password"
                    name="new-password"
                    autoComplete="new-password"
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
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
                  </button>
                </div>
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
                      confirmPassword && confirmPassword !== password
                        ? 'border-rose-500/50 focus:border-rose-500/70'
                        : confirmPassword && confirmPassword === password
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
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[12px] font-medium text-rose-400 ml-1 mt-1">Passwords do not match.</p>
                )}
                {confirmPassword && confirmPassword === password && (
                  <p className="text-[12px] font-medium text-emerald-400 ml-1 mt-1">Passwords match ✓</p>
                )}
              </div>

              <div className="pt-1 relative group">
                <button
                  type="submit"
                  disabled={loading || password.length < 8 || password !== confirmPassword}
                  className="relative w-full flex justify-center items-center py-3.5 px-4 text-[15px] font-bold rounded-lg text-black bg-white hover:bg-zinc-200 focus:outline-none transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{loading ? 'Resetting...' : 'Reset Password'}</span>
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.5} />}
                </button>
                {/* Tooltip for weak password (less than 8 chars) */}
                {password.length > 0 && password.length < 8 && (
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max px-3 py-1.5 bg-zinc-800 text-xs font-medium text-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-zinc-700 pointer-events-none before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-zinc-800">
                    Choose a strong new password for your account
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
