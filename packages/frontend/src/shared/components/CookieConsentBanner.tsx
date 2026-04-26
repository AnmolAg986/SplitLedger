import { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';

const CONSENT_KEY = 'splitledger-cookie-consent';

type ConsentState = 'pending' | 'accepted' | 'declined';

export const CookieConsentBanner = () => {
  // Initialize from localStorage directly via lazy initializer (avoids setState-in-effect)
  const [state, setState] = useState<ConsentState>(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    return (saved as ConsentState) || 'pending';
  });
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (state !== 'pending') return;
    // Delay slightly so it doesn't flash immediately on every page load
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [state]);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setState('accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setState('declined');
    setVisible(false);
  };

  if (!visible || state !== 'pending') return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-[420px] z-[200] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#0c0c0e] border border-white/[0.1] rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.8)] p-5 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Cookie className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-[14px]">Cookie &amp; Privacy Notice</h3>
            <p className="text-zinc-400 text-[12px] mt-1 leading-relaxed">
              We use essential cookies to keep you logged in and to remember your preferences. No tracking or ad cookies are used.
            </p>
          </div>
          <button onClick={decline} className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors mt-0.5" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors mb-3 ml-0.5"
        >
          {showDetails ? '▲ Hide details' : '▼ What do we store?'}
        </button>

        {showDetails && (
          <div className="mb-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1.5 animate-in fade-in duration-200">
            {[
              { name: 'Authentication tokens', desc: 'Keeps you signed in securely across sessions.', required: true },
              { name: 'Theme preference', desc: 'Remembers your light/dark mode choice.', required: false },
              { name: 'Onboarding state', desc: 'Remembers if you have completed setup.', required: false },
            ].map(item => (
              <div key={item.name} className="flex items-start gap-2">
                <Check className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-zinc-300">{item.name}</span>
                  {item.required && <span className="ml-1 text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">Required</span>}
                  <p className="text-[11px] text-zinc-500">{item.desc}</p>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-zinc-600 pt-1">
              We do not use advertising, analytics, or third-party tracking cookies. See our{' '}
              <a href="/privacy" className="text-cyan-500 hover:underline">Privacy Policy</a> for full details.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={accept}
            id="cookie-accept"
            className="flex-1 py-2.5 px-4 text-[13px] font-bold bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-colors active:scale-[0.97]"
          >
            Accept All
          </button>
          <button
            onClick={decline}
            id="cookie-decline"
            className="flex-1 py-2.5 px-4 text-[13px] font-bold bg-white/5 text-zinc-300 border border-white/10 rounded-xl hover:bg-white/10 transition-colors active:scale-[0.97]"
          >
            Essential Only
          </button>
        </div>
      </div>
    </div>
  );
};
