import { LazyImage } from '../../../shared/components/LazyImage';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from '../../../shared/store/useToastStore';

export const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const isLoggedIn = !!accessToken;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get(`/auth/public/${username}`);
        setProfile(res.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    };

    if (username) fetchProfile();
  }, [username]);

  const handleAddFriend = async () => {
    if (!isLoggedIn) {
      navigate(`/auth/login?redirect=/u/${username}`);
      return;
    }

    if (user?.username === username) {
      toast.error('You cannot add yourself as a friend');
      return;
    }

    setAdding(true);
    try {
      await apiClient.post('/friends/add', { identifier: username });
      toast.success('Friend request sent!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send request');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Back button (optional if they navigated from inside) */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors z-20 group"
      >
        <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-white" />
      </button>

      {profile ? (
        <div className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 shadow-2xl backdrop-blur-xl relative z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex items-center justify-center text-5xl font-black text-amber-400 mb-6 overflow-hidden">
            {profile.avatar_url ? (
              <LazyImage src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${profile.avatar_url}`} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              profile.display_name.charAt(0).toUpperCase()
            )}
          </div>

          <h1 className="text-3xl font-black text-white mb-1">{profile.display_name}</h1>
          <p className="text-lg text-amber-500/80 font-bold mb-6 tracking-wide">@{profile.username}</p>

          {isLoggedIn && profile.mutual_groups_count !== undefined && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 shadow-inner">
              <span className="text-sm font-bold text-zinc-400">Mutual Groups</span>
              <span className="text-sm font-black text-white bg-white/10 px-2.5 py-0.5 rounded-full">{profile.mutual_groups_count}</span>
            </div>
          )}

          <button 
            onClick={handleAddFriend}
            disabled={adding}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl text-black font-black text-lg shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0"
          >
            {adding ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserPlus className="w-6 h-6" />}
            {isLoggedIn ? 'Add Friend' : 'Log in to Add Friend'}
          </button>
        </div>
      ) : (
        <div className="text-center z-10">
          <h2 className="text-2xl font-bold text-white mb-2">User not found</h2>
          <p className="text-zinc-500">The profile you're looking for doesn't exist.</p>
        </div>
      )}
    </div>
  );
};
