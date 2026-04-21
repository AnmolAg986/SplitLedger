import React, { useEffect, useState } from 'react';
import { api } from '../../../shared/utils/api';
import { ArrowLeft, Bell, Mail, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../../shared/store/useToastStore';

interface Preferences {
  emailOnExpense: boolean;
  emailOnSettlement: boolean;
  emailOnNudge: boolean;
  pushOnExpense: boolean;
  pushOnChat: boolean;
  pushOnNudge: boolean;
  inAppAll: boolean;
}

export function NotificationPreferences() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkPushStatus();
  }, []);

  const loadPreferences = async () => {
    try {
      const res = await api.get('/notifications/preferences');
      setPrefs({
        emailOnExpense: res.data.emailOnExpense,
        emailOnSettlement: res.data.emailOnSettlement,
        emailOnNudge: res.data.emailOnNudge,
        pushOnExpense: res.data.pushOnExpense,
        pushOnChat: res.data.pushOnChat,
        pushOnNudge: res.data.pushOnNudge,
        inAppAll: res.data.inAppAll,
      });
    } catch (err) {
      console.error('Failed to load preferences', err);
    } finally {
      setLoading(false);
    }
  };

  const checkPushStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setPushEnabled(!!subscription);
    } catch (err) {
      console.error('Push status error', err);
    }
  };

  const handleToggle = async (key: keyof Preferences) => {
    if (!prefs) return;
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    try {
      await api.patch('/notifications/preferences', newPrefs);
    } catch (err) {
      toast.error('Failed to update preferences');
      setPrefs(prefs); // revert
    }
  };

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      // Note: VAPID public key would come from env in a real app
      const vapidPublicKey = 'dummy_public_key_for_now_replace_me';
      
      try {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey
        });

        await api.post('/notifications/push/subscribe', {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!) as any)),
            auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!) as any))
          }
        });
        
        setPushEnabled(true);
        toast.success('Push notifications enabled!');
      } catch (subErr) {
        // Dummy key will fail to subscribe in real browsers
        toast.error('Failed to subscribe to push service (requires valid VAPID keys)');
      }
    } catch (err) {
      console.error('Push enable error', err);
      toast.error('Failed to enable push notifications');
    }
  };

  if (loading || !prefs) return <div className="p-8 text-zinc-400">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto w-full h-full">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/profile')}
          className="p-2 bg-zinc-900/50 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800/50"
        >
          <ArrowLeft size={20} className="text-zinc-400" />
        </button>
        <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
      </div>

      <div className="space-y-8">
        {/* Email Settings */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Mail className="text-blue-400 w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Email Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <ToggleRow 
              label="New Expenses" 
              description="When someone adds you to an expense"
              checked={prefs.emailOnExpense}
              onChange={() => handleToggle('emailOnExpense')}
            />
            <ToggleRow 
              label="Settlements" 
              description="When a payment is recorded towards you"
              checked={prefs.emailOnSettlement}
              onChange={() => handleToggle('emailOnSettlement')}
            />
            <ToggleRow 
              label="Nudges & Reminders" 
              description="When a friend nudges you to settle up"
              checked={prefs.emailOnNudge}
              onChange={() => handleToggle('emailOnNudge')}
            />
          </div>
        </div>

        {/* Push Settings */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <Smartphone className="text-rose-400 w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">Push Notifications</h2>
            </div>
            
            {!pushEnabled && (
              <button 
                onClick={handleEnablePush}
                className="px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg text-sm hover:bg-cyan-400 transition-colors"
              >
                Enable Push
              </button>
            )}
            {pushEnabled && (
              <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Active on this device
              </span>
            )}
          </div>
          
          <div className="space-y-4 opacity-100">
            <ToggleRow 
              label="New Expenses" 
              description="When an expense involves you"
              checked={prefs.pushOnExpense}
              onChange={() => handleToggle('pushOnExpense')}
            />
            <ToggleRow 
              label="Chat Messages" 
              description="When you receive a direct or group message"
              checked={prefs.pushOnChat}
              onChange={() => handleToggle('pushOnChat')}
            />
            <ToggleRow 
              label="Nudges" 
              description="When you are nudged"
              checked={prefs.pushOnNudge}
              onChange={() => handleToggle('pushOnNudge')}
            />
          </div>
        </div>

        {/* In-App Settings */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Bell className="text-emerald-400 w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">In-App Alerts</h2>
          </div>
          
          <ToggleRow 
            label="In-App Notification Center" 
            description="Show all alerts in the notification panel inside the app"
            checked={prefs.inAppAll}
            onChange={() => handleToggle('inAppAll')}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="pr-4">
        <p className="text-white font-medium">{label}</p>
        <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
      </div>
      <button 
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-cyan-500' : 'bg-zinc-700'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
