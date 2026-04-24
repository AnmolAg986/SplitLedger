import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download } from 'lucide-react';

export const PWAPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Handle 'Add to Home Screen' prompt tracking
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Track visits
      const visits = parseInt(localStorage.getItem('pwa_visits') || '0', 10) + 1;
      localStorage.setItem('pwa_visits', visits.toString());

      const hasDismissed = localStorage.getItem('pwa_prompt_dismissed') === 'true';

      if (visits >= 3 && !hasDismissed) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initial visit track (if no prompt supported or already installed, we still track)
    if (!localStorage.getItem('pwa_visits')) {
      localStorage.setItem('pwa_visits', '1');
    } else if (!deferredPrompt) {
        // If the event hasn't fired yet, we increment on mount assuming this is a visit.
        // Wait, best is to just track visits on mount.
        const v = parseInt(localStorage.getItem('pwa_visits') || '0', 10);
        if (v < 3) {
            localStorage.setItem('pwa_visits', (v + 1).toString());
        }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <>
      {/* App Update Prompt */}
      {needRefresh && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="text-sm font-medium">New content available</div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 bg-white text-indigo-600 rounded-lg text-xs font-bold hover:bg-zinc-100 transition-colors"
          >
            Reload
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            className="text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[100] bg-zinc-900 border border-white/10 p-5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <h3 className="text-sm font-bold text-white">Install SplitLedger</h3>
              <p className="text-xs text-zinc-400">Install our app for a better experience and offline support!</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-bold transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
