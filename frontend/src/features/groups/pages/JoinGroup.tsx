import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export const JoinGroup = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Joining group...');

  useEffect(() => {
    const join = async () => {
      try {
        const { data } = await apiClient.post('/groups/join', { token });
        setStatus('success');
        setMessage(data.message);
        setTimeout(() => navigate(`/groups/${data.groupId}`), 2000);
      } catch (err: unknown) {
        setStatus('error');
        const error = err as { response?: { data?: { error?: string } } };
        setMessage(error.response?.data?.error || 'Failed to join group');
      }
    };
    join();
  }, [token, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-black/40">
       <div className="w-full max-w-sm p-8 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            {status === 'loading' && (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Joining Group</h2>
                <p className="text-zinc-500 text-sm">Please wait while we process your invitation...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 animate-in zoom-in duration-300" />
                <h2 className="text-xl font-bold text-white mb-2">Welcome!</h2>
                <p className="text-zinc-500 text-sm mb-4">{message}</p>
                <p className="text-[11px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Redirecting to group...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center">
                <XCircle className="w-12 h-12 text-rose-500 mb-4 animate-in zoom-in duration-300" />
                <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
                <p className="text-zinc-500 text-sm mb-6">{message}</p>
                <button 
                  onClick={() => navigate('/groups')}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all"
                >
                  Back to Groups
                </button>
              </div>
            )}
          </div>
       </div>
    </div>
  );
};
