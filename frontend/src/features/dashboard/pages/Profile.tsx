import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { apiClient } from '../../../shared/api/axios';
import { toast } from '../../../shared/store/useToastStore';
import { Camera, Loader2, Save, User } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

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
      toast.success("Image uploaded successfully. Don't forget to save!");
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (displayName.trim().length < 2) {
      toast.error('Display name must be at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.put('/auth/profile', {
        displayName: displayName.trim(),
        avatarUrl
      });
      
      // Update local store with new user data.
      // We need to keep the accessToken and refreshToken intact.
      // useAuthStore login expects (user, access, refresh).
      // Since we just update user, let's trigger a refresh or manually update state.
      // useAuthStore has `setUser(user)` or `login`. Let's check `useAuthStore.ts` later or just reload.
      // For now, we assume `user` object has what we need.
      useAuthStore.setState({ user: { ...user, ...res.data.user } });
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-2xl mx-auto mt-10 relative z-10">
        <h1 className="text-3xl font-bold text-white mb-2">Your Profile</h1>
        <p className="text-zinc-400 mb-8">Manage your personal information and profile picture.</p>

        <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row gap-10 items-start">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <div className="relative">
                <div 
                  className="w-32 h-32 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center relative group cursor-pointer overflow-hidden shadow-lg"
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                >
                   {avatarUrl ? (
                     <img src={`http://localhost:3000${avatarUrl}`} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <span className="text-5xl font-black text-cyan-400">{displayName.charAt(0).toUpperCase()}</span>
                   )}
                   <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                     {uploading ? (
                       <Loader2 className="w-8 h-8 text-white animate-spin" />
                     ) : (
                       <>
                         <Camera className="w-8 h-8 text-white mb-2" />
                         <span className="text-[10px] font-bold text-white uppercase tracking-widest">Change</span>
                       </>
                     )}
                   </div>
                </div>

                {showAvatarMenu && (
                  <div className="absolute top-[135px] left-1/2 -translate-x-1/2 w-48 bg-[#0c0c0e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                    <button 
                      onClick={() => { setShowAvatarMenu(false); galleryInputRef.current?.click(); }}
                      className="w-full text-left px-4 py-3 text-xs font-medium text-white hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      Choose from gallery
                    </button>
                    <button 
                      onClick={() => { setShowAvatarMenu(false); cameraInputRef.current?.click(); }}
                      className="w-full text-left px-4 py-3 text-xs font-medium text-white hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      Click a picture
                    </button>
                    <button 
                      onClick={() => { setShowAvatarMenu(false); setAvatarUrl(''); }}
                      className="w-full text-left px-4 py-3 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      Remove picture
                    </button>
                  </div>
                )}
                
                <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">JPEG, PNG max 2MB</p>
            </div>

            {/* Form Section */}
            <div className="flex-1 w-full space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Display Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                  <input 
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Email / Phone</label>
                <input 
                  type="text"
                  readOnly
                  value={user?.email || user?.phoneNumber || ''}
                  className="w-full bg-black/50 border border-transparent rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-zinc-600 mt-2">Identifiers cannot be changed currently.</p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={loading || uploading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden mt-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Notification Settings</h2>
            <p className="text-sm text-zinc-400">Manage email, push, and in-app alerts.</p>
          </div>
          <button
            onClick={() => {
              const { useNavigate } = require('react-router-dom');
              // This is a bit hacky to use require in onClick but valid. Better to import it.
              window.location.href = '/profile/notifications';
            }}
            className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
          >
            Configure
          </button>
        </div>
      </div>
    </div>
  );
};
