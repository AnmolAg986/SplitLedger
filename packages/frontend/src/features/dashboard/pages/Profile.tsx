import { LazyImage } from '../../../shared/components/LazyImage';
import { useState, useRef } from 'react';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { apiClient } from '../../../shared/api/axios';
import { toast } from '../../../shared/store/useToastStore';
import { Camera, Loader2, Save, Moon, Sun, Monitor, ShieldCheck, ShieldOff, Copy, Check, Monitor as DeviceIcon, Smartphone, Globe, Trash2, LogOut, Download, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../../shared/store/useThemeStore';
import { QRCodeSVG } from 'qrcode.react';
export const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const { theme, setTheme } = useThemeStore();

  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<'setup' | 'verify' | 'codes'>('setup');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState('');
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const is2FAEnabled = user?.twoFaEnabled ?? false;

  // Sessions state
  interface Session { id: string; ipAddress: string | null; userAgent: string | null; lastActive: string; createdAt: string; device: string; }
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  const fetchSessions = async () => {
    if (sessionsLoaded) return;
    setSessionsLoading(true);
    try {
      const res = await apiClient.get('/auth/sessions');
      setSessions(res.data.sessions);
      setSessionsLoaded(true);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await apiClient.delete(`/auth/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  const handleLogoutOtherDevices = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return;
    try {
      await apiClient.post('/auth/sessions/logout-others', { refreshToken });
      setSessions(prev => prev.slice(0, 1)); // keep first (current)
      toast.success('All other devices logged out');
    } catch {
      toast.error('Failed to logout other devices');
    }
  };

  // GDPR state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteScheduled, setDeleteScheduled] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get('/auth/export-data', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `splitledger-export-${Date.now()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded!');
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient.delete('/auth/account', { data: { password: deletePassword } });
      setDeleteScheduled(res.data.scheduledDeletion);
      setShowDeleteModal(false);
      setDeletePassword('');
      toast.success('Account scheduled for deletion in 30 days.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
    }
  };

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
    } catch {
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
        username: username.trim() || undefined,
        avatarUrl
      });
      useAuthStore.setState({ user: { ...user, ...res.data.user } });
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    try {
      const res = await apiClient.post('/auth/2fa/setup');
      setQrDataUrl(res.data.qrDataUrl);
      setTotpSecret(res.data.secret);
      setTwoFAStep('setup');
      setShow2FAModal(true);
    } catch {
      toast.error('Failed to start 2FA setup');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!totpCode.trim()) return;
    setTwoFALoading(true);
    try {
      const res = await apiClient.post('/auth/2fa/verify', { code: totpCode });
      setRecoveryCodes(res.data.recoveryCodes);
      setTwoFAStep('codes');
      useAuthStore.setState({ user: { ...user!, twoFaEnabled: true } });
      toast.success('2FA enabled successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setTwoFALoading(false);
      setTotpCode('');
    }
  };

  const handleDisable2FA = async () => {
    if (!disableCode.trim()) return;
    setTwoFALoading(true);
    try {
      await apiClient.post('/auth/2fa/disable', { code: disableCode });
      useAuthStore.setState({ user: { ...user!, twoFaEnabled: false } });
      setShow2FADisableModal(false);
      setDisableCode('');
      toast.success('2FA disabled.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid code.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar relative bg-gray-50 dark:bg-transparent transition-colors duration-300">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-2xl mx-auto mt-10 relative z-10">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 transition-colors">Your Profile</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 transition-colors">Manage your personal information, theme, and profile picture.</p>

        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors">
          <div className="flex flex-col md:flex-row gap-10 items-start">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <div className="relative">
                <div 
                  className="w-32 h-32 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center relative group cursor-pointer overflow-hidden shadow-lg"
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                >
                   {avatarUrl ? (
                     <LazyImage src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${avatarUrl}`} alt="Profile" className="w-full h-full object-cover" />
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
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Username</label>
                  <div className="relative flex items-center bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden focus-within:border-cyan-500/50 transition-colors">
                    <div className="pl-4 pr-2 text-zinc-500 font-medium">splitledger.app/u/</div>
                    <input 
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full bg-transparent py-3 pr-4 text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                      placeholder="username"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1.5 ml-1">Optional. Must be unique and contain only letters, numbers, and underscores.</p>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Theme Preference</label>
                  <div className="flex gap-2 p-1 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 rounded-xl">
                    <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-colors ${theme === 'light' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                      <Sun className="w-4 h-4" /> Light
                    </button>
                    <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-colors ${theme === 'dark' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                      <Moon className="w-4 h-4" /> Dark
                    </button>
                    <button onClick={() => setTheme('system')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-colors ${theme === 'system' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                      <Monitor className="w-4 h-4" /> System
                    </button>
                  </div>
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
        {/* Notification Settings */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative overflow-hidden mt-6 flex items-center justify-between transition-colors">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 transition-colors">Notification Settings</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage email, push, and in-app alerts.</p>
          </div>
          <button onClick={() => navigate('/profile/notifications')} className="px-6 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white font-medium hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">Configure</button>
        </div>

        {/* Personal Analytics */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative overflow-hidden mt-6 flex items-center justify-between transition-colors">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 transition-colors">Personal Analytics</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">View your spending trends, category breakdowns, and more.</p>
          </div>
          <button onClick={() => navigate('/profile/analytics')} className="px-6 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold hover:bg-cyan-500/20 transition-colors">View Analytics</button>
        </div>

        {/* Security Settings — 2FA */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative overflow-hidden mt-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 transition-colors">Two-Factor Authentication</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {is2FAEnabled ? 'Your account is protected with TOTP 2FA.' : 'Add an extra layer of security to your account.'}
              </p>
            </div>
            {is2FAEnabled ? (
              <button
                onClick={() => setShow2FADisableModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold hover:bg-rose-500/20 transition-colors"
              >
                <ShieldOff className="w-4 h-4" /> Disable 2FA
              </button>
            ) : (
              <button
                onClick={handleSetup2FA}
                disabled={twoFALoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
              >
                {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Enable 2FA
              </button>
            )}
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative overflow-hidden mt-6 transition-colors">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 transition-colors">Active Sessions</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Devices currently signed into your account.</p>
            </div>
            <div className="flex gap-2">
              {!sessionsLoaded && (
                <button onClick={fetchSessions} disabled={sessionsLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-sm font-bold hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50">
                  {sessionsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />} Load Sessions
                </button>
              )}
              {sessionsLoaded && sessions.length > 1 && (
                <button onClick={handleLogoutOtherDevices} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold hover:bg-rose-500/20 transition-colors">
                  <LogOut className="w-4 h-4" /> Logout Other Devices
                </button>
              )}
            </div>
          </div>

          {sessionsLoaded && sessions.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4">No active sessions found.</p>
          )}

          <div className="space-y-3">
            {sessions.map((session, idx) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    {/mobile|android|iphone/i.test(session.userAgent || '') ? <Smartphone className="w-5 h-5 text-cyan-400" /> : <DeviceIcon className="w-5 h-5 text-cyan-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                      {session.device}{idx === 0 ? <span className="ml-2 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Current</span> : null}
                    </p>
                    <p className="text-xs text-zinc-500">{session.ipAddress || 'Unknown IP'} · Last active {new Date(session.lastActive).toLocaleDateString()}</p>
                  </div>
                </div>
                {idx !== 0 && (
                  <button onClick={() => revokeSession(session.id)} className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors" title="Revoke session">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Data Privacy & GDPR */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative overflow-hidden mt-6 transition-colors">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 transition-colors">Data Privacy &amp; GDPR</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Manage your personal data in accordance with GDPR.</p>

          <div className="space-y-3">
            {/* Export */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">Export Your Data</p>
                <p className="text-xs text-zinc-500 mt-0.5">Download all your expenses, messages, and settlements as JSON.</p>
              </div>
              <button onClick={handleExportData} disabled={exporting} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold hover:bg-cyan-500/20 transition-colors disabled:opacity-50">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export
              </button>
            </div>

            {/* Delete account */}
            <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-rose-400">Delete Account</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {deleteScheduled
                    ? `Deletion scheduled for ${new Date(deleteScheduled).toLocaleDateString()}. Contact support to cancel.`
                    : 'Permanently removes your account after a 30-day grace period.'}
                </p>
              </div>
              {!deleteScheduled && (
                <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold hover:bg-rose-500/20 transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Account Modal ──────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-[#0c0c0e] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Account</h3>
                <p className="text-xs text-zinc-400">This cannot be undone after 30 days.</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
              Your account will be <strong className="text-white">soft-deleted immediately</strong> and all data permanently erased after 30 days. Enter your password to confirm.
            </p>
            <input
              type="password"
              autoFocus
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl focus:border-rose-500/50 outline-none text-white placeholder-zinc-600 mb-4"
              placeholder="Confirm your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading || !deletePassword.trim()}
              className="w-full py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-400 transition-colors disabled:opacity-50 mb-3"
            >
              {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Permanently Delete My Account'}
            </button>
            <button onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }} className="w-full py-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-colors text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* ── 2FA Setup Modal ─────────────────────────────────────── */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-[#0c0c0e] border border-white/10 rounded-3xl p-8 shadow-2xl">
            {twoFAStep === 'setup' && (
              <>
                <h3 className="text-xl font-bold text-white mb-2">Scan QR Code</h3>
                <p className="text-sm text-zinc-400 mb-6">Scan this with Google Authenticator, Authy, or any TOTP app.</p>
                <div className="flex justify-center mb-6 p-4 bg-white rounded-2xl">
                  <QRCodeSVG value={qrDataUrl.replace('data:image/png;base64,', '') || totpSecret} size={180} />
                </div>
                <p className="text-xs text-zinc-500 text-center mb-2">Or enter manually:</p>
                <p className="text-xs font-mono text-cyan-400 text-center break-all mb-6 select-all">{totpSecret}</p>
                <button onClick={() => setTwoFAStep('verify')} className="w-full py-3 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-colors">Next — Enter Code</button>
                <button onClick={() => setShow2FAModal(false)} className="mt-3 w-full py-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-colors text-sm">Cancel</button>
              </>
            )}
            {twoFAStep === 'verify' && (
              <>
                <h3 className="text-xl font-bold text-white mb-2">Verify Your Authenticator</h3>
                <p className="text-sm text-zinc-400 mb-6">Enter the 6-digit code from your app to confirm setup.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl focus:border-cyan-500/50 outline-none text-[22px] font-bold text-white text-center tracking-[0.4em] mb-5"
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button
                  onClick={handleVerify2FA}
                  disabled={twoFALoading || totpCode.length !== 6}
                  className="w-full py-3 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                  {twoFALoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Activate 2FA'}
                </button>
                <button onClick={() => setTwoFAStep('setup')} className="mt-3 w-full py-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-colors text-sm">← Back</button>
              </>
            )}
            {twoFAStep === 'codes' && (
              <>
                <h3 className="text-xl font-bold text-white mb-2">Save Your Recovery Codes</h3>
                <p className="text-sm text-zinc-400 mb-5">Store these codes somewhere safe. Each can be used once if you lose access to your authenticator.</p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {recoveryCodes.map((c, i) => (
                    <div key={i} className="font-mono text-xs text-cyan-300 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-center select-all">{c}</div>
                  ))}
                </div>
                <button onClick={handleCopyCodes} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors mb-3">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy All Codes'}
                </button>
                <button onClick={() => { setShow2FAModal(false); setTotpCode(''); }} className="w-full py-3 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-colors">Done</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Disable 2FA Modal ───────────────────────────────────── */}
      {show2FADisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-[#0c0c0e] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Disable 2FA</h3>
            <p className="text-sm text-zinc-400 mb-6">Enter your current TOTP code to confirm disabling 2FA.</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl focus:border-rose-500/50 outline-none text-[22px] font-bold text-white text-center tracking-[0.4em] mb-5"
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button
              onClick={handleDisable2FA}
              disabled={twoFALoading || disableCode.length !== 6}
              className="w-full py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-400 transition-colors disabled:opacity-50 mb-3"
            >
              {twoFALoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Disable'}
            </button>
            <button onClick={() => { setShow2FADisableModal(false); setDisableCode(''); }} className="w-full py-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-colors text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

