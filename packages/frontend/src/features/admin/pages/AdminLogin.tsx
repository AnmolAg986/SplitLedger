import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';

export const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data } = await apiClient.post('/admin/login', { password });
      localStorage.setItem('adminToken', data.token);
      
      // Override default axios auth header for admin routes
      // Note: We might want a dedicated adminApiClient, but since Admin is a separate layout,
      // it's easier to just use the global one or pass it in headers manually on admin requests.
      
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#0a0a0c] border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 p-8 opacity-20 blur-xl pointer-events-none">
            <Shield className="w-32 h-32 text-red-500" />
          </div>

          <div className="relative z-10">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center border border-red-500/30 mb-6">
              <Shield className="w-6 h-6 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-zinc-400 text-sm mb-8">Enter the secure administrative passphrase.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Passphrase</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter passphrase"
                    className="w-full bg-[#121214] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!password || isLoading}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Authenticate <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
