import { LazyImage } from './LazyImage';
import { useState, useRef } from 'react';
import { Camera, UserPlus, Receipt, Layers, ArrowRight, Loader2, Check } from 'lucide-react';
import { useAuthStore } from '../../app/store/useAuthStore';
import { apiClient } from '../api/axios';
import { toast } from '../store/useToastStore';

interface Props {
  onComplete: () => void;
}

export const OnboardingModal = ({ onComplete }: Props) => {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [friendIdentifier, setFriendIdentifier] = useState('');
  const [loadingFriend, setLoadingFriend] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSkip = async () => {
    try {
      await apiClient.put('/auth/onboarding');
      useAuthStore.setState({ user: { ...user!, onboardingCompleted: true } });
      onComplete();
    } catch {
      toast.error('Failed to complete onboarding');
    }
  };

  const handleNext = () => setStep(prev => prev + 1);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const res = await apiClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAvatarUrl(res.data.url);
      await apiClient.put('/auth/profile', {
        displayName: user?.displayName,
        avatarUrl: res.data.url
      });
      useAuthStore.setState({ user: { ...user!, avatarUrl: res.data.url } });
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!friendIdentifier.trim()) return handleNext();
    setLoadingFriend(true);
    try {
      await apiClient.post('/friends/request', { target_id: friendIdentifier });
      toast.success('Friend request sent!');
      handleNext();
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error('User not found. Try searching by exact email or username.');
      } else if (err.response?.status === 409) {
        toast.error('Request already sent or already friends.');
        handleNext();
      } else {
        toast.error('Failed to send friend request');
      }
    } finally {
      setLoadingFriend(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#0c0c0e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Progress */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition-colors ${s <= step ? 'bg-indigo-500' : 'bg-white/10'}`} />
            ))}
          </div>
          <button onClick={handleSkip} className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
            Skip Tour
          </button>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
              <div 
                className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6 flex items-center justify-center overflow-hidden cursor-pointer group relative"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <LazyImage src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to SplitLedger!</h2>
              <p className="text-zinc-400 text-sm mb-8">Let's get your profile set up. Add a photo so your friends can easily recognize you.</p>

              <button onClick={handleNext} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                <UserPlus className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Add your first friend</h2>
              <p className="text-zinc-400 text-sm mb-6">Splitting bills is better with friends. Search by their email or @username to send a request.</p>

              <input 
                type="text"
                placeholder="Email or @username..."
                value={friendIdentifier}
                onChange={e => setFriendIdentifier(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-8 focus:outline-none focus:border-emerald-500 transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
              />

              <div className="flex gap-3">
                <button onClick={handleNext} className="flex-1 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors">
                  I'll do this later
                </button>
                <button onClick={handleAddFriend} disabled={loadingFriend} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2">
                  {loadingFriend ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Friend'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                <Receipt className="w-6 h-6 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Create Groups & Expenses</h2>
              <p className="text-zinc-400 text-sm mb-6">You can split single expenses with friends, or create Groups for trips, apartments, and events to keep track of shared costs.</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2">
                  <Receipt className="w-5 h-5 text-zinc-300" />
                  <span className="text-sm font-bold text-white">Split an Expense</span>
                  <span className="text-xs text-zinc-500">Ctrl+N anywhere</span>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2">
                  <Layers className="w-5 h-5 text-zinc-300" />
                  <span className="text-sm font-bold text-white">Create a Group</span>
                  <span className="text-xs text-zinc-500">In Connections</span>
                </div>
              </div>

              <button onClick={handleNext} className="w-full py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
                <Check className="w-6 h-6 text-rose-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">You're all set!</h2>
              <p className="text-zinc-400 text-sm mb-6">Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded-md text-xs font-mono text-white">?</kbd> at any time to see the keyboard shortcuts.</p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="w-2 h-2 rounded-full bg-rose-500" /> Dashboard gives you a smart overview.
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="w-2 h-2 rounded-full bg-rose-500" /> Use the Command Palette (Ctrl+K) for quick actions.
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="w-2 h-2 rounded-full bg-rose-500" /> Settle up easily using smart payment suggestions.
                </div>
              </div>

              <button onClick={handleSkip} className="w-full py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-400 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
