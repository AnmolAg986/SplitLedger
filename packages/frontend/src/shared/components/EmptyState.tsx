import React, { type ReactNode } from 'react';

/* ─────────────────────── SVG Illustrations ─────────────────────── */

const FriendsIllustration = () => (
  <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="60" cy="48" r="22" fill="#6366f1" fillOpacity="0.15" />
    <circle cx="60" cy="38" r="12" fill="#6366f1" fillOpacity="0.4" />
    <path d="M36 80c0-13.255 10.745-24 24-24s24 10.745 24 24" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="110" cy="52" r="18" fill="#8b5cf6" fillOpacity="0.12" />
    <circle cx="110" cy="43" r="10" fill="#8b5cf6" fillOpacity="0.35" />
    <path d="M90 80c0-11.046 8.954-20 20-20s20 8.954 20 20" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M78 68l8-6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
    <circle cx="83" cy="65" r="3" fill="#c4b5fd" fillOpacity="0.6" />
    {/* sparkle dots */}
    <circle cx="30" cy="30" r="2" fill="#6366f1" fillOpacity="0.4" />
    <circle cx="130" cy="28" r="2" fill="#8b5cf6" fillOpacity="0.4" />
    <circle cx="80" cy="15" r="3" fill="#a78bfa" fillOpacity="0.3" />
  </svg>
);

const GroupsIllustration = () => (
  <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="20" y="55" width="120" height="50" rx="10" fill="#06b6d4" fillOpacity="0.08" />
    <circle cx="50" cy="52" r="12" fill="#06b6d4" fillOpacity="0.35" />
    <circle cx="80" cy="48" r="14" fill="#06b6d4" fillOpacity="0.45" />
    <circle cx="110" cy="52" r="12" fill="#06b6d4" fillOpacity="0.35" />
    <path d="M30 85c0-11 8.954-20 20-20" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
    <path d="M130 85c0-11-8.954-20-20-20" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
    <path d="M54 82c0-14.359 11.641-26 26-26s26 11.641 26 82" stroke="#0e7490" strokeWidth="2.5" strokeLinecap="round" />
    {/* grid dots */}
    <circle cx="25" cy="25" r="2" fill="#06b6d4" fillOpacity="0.3" />
    <circle cx="135" cy="20" r="2.5" fill="#06b6d4" fillOpacity="0.4" />
    <circle cx="80" cy="12" r="3" fill="#22d3ee" fillOpacity="0.25" />
  </svg>
);

const ExpensesIllustration = () => (
  <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Receipt */}
    <rect x="45" y="20" width="70" height="88" rx="8" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeOpacity="0.3" strokeWidth="1.5" />
    <rect x="55" y="34" width="50" height="6" rx="3" fill="#10b981" fillOpacity="0.4" />
    <rect x="55" y="48" width="35" height="4" rx="2" fill="#10b981" fillOpacity="0.25" />
    <rect x="55" y="60" width="42" height="4" rx="2" fill="#10b981" fillOpacity="0.25" />
    <rect x="55" y="72" width="28" height="4" rx="2" fill="#10b981" fillOpacity="0.25" />
    <rect x="55" y="88" width="50" height="8" rx="4" fill="#10b981" fillOpacity="0.35" />
    {/* Coin */}
    <circle cx="122" cy="42" r="16" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeOpacity="0.4" strokeWidth="1.5" />
    <text x="122" y="47" textAnchor="middle" fontSize="14" fill="#f59e0b" fillOpacity="0.7" fontWeight="bold">₹</text>
    {/* sparkles */}
    <circle cx="32" cy="38" r="2" fill="#10b981" fillOpacity="0.35" />
    <circle cx="28" cy="75" r="2.5" fill="#10b981" fillOpacity="0.25" />
    <circle cx="140" cy="80" r="2" fill="#f59e0b" fillOpacity="0.4" />
  </svg>
);

const NotificationsIllustration = () => (
  <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Bell */}
    <path d="M80 20 C60 20, 52 36, 52 52 L52 70 L44 78 L116 78 L108 70 L108 52 C108 36, 100 20, 80 20Z" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeOpacity="0.4" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M72 78 C72 82.418 75.582 86 80 86 C84.418 86 88 82.418 88 78" stroke="#f59e0b" strokeOpacity="0.5" strokeWidth="1.5" />
    <circle cx="80" cy="20" r="5" fill="#f59e0b" fillOpacity="0.4" />
    {/* ZZZ */}
    <text x="104" y="42" fontSize="11" fill="#f59e0b" fillOpacity="0.5" fontWeight="bold">z</text>
    <text x="112" y="33" fontSize="9" fill="#f59e0b" fillOpacity="0.35" fontWeight="bold">z</text>
    <text x="118" y="26" fontSize="7" fill="#f59e0b" fillOpacity="0.25" fontWeight="bold">z</text>
    {/* sparkles */}
    <circle cx="35" cy="50" r="2" fill="#f59e0b" fillOpacity="0.3" />
    <circle cx="30" cy="80" r="2.5" fill="#fbbf24" fillOpacity="0.2" />
    <circle cx="135" cy="65" r="2" fill="#f59e0b" fillOpacity="0.3" />
  </svg>
);

const GenericIllustration = () => (
  <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect x="35" y="30" width="90" height="70" rx="10" fill="#6366f1" fillOpacity="0.08" stroke="#6366f1" strokeOpacity="0.2" strokeWidth="1.5" />
    <rect x="50" y="48" width="60" height="6" rx="3" fill="#6366f1" fillOpacity="0.3" />
    <rect x="50" y="62" width="45" height="4" rx="2" fill="#6366f1" fillOpacity="0.2" />
    <rect x="50" y="74" width="52" height="4" rx="2" fill="#6366f1" fillOpacity="0.2" />
    <circle cx="80" cy="30" r="12" fill="#6366f1" fillOpacity="0.2" />
    <path d="M76 30 L80 26 L84 30 M80 26 L80 34" stroke="#6366f1" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─────────────────────── Variant Config ─────────────────────── */

type Variant = 'friends' | 'groups' | 'expenses' | 'notifications' | 'generic';

const VARIANT_CONFIG: Record<Variant, {
  illustration: () => React.JSX.Element;
  accentClass: string;
  ringClass: string;
  bgClass: string;
}> = {
  friends: {
    illustration: FriendsIllustration,
    accentClass: 'from-indigo-500/20 to-violet-500/10',
    ringClass: 'ring-indigo-500/20',
    bgClass: 'bg-indigo-500/5',
  },
  groups: {
    illustration: GroupsIllustration,
    accentClass: 'from-cyan-500/20 to-sky-500/10',
    ringClass: 'ring-cyan-500/20',
    bgClass: 'bg-cyan-500/5',
  },
  expenses: {
    illustration: ExpensesIllustration,
    accentClass: 'from-emerald-500/20 to-teal-500/10',
    ringClass: 'ring-emerald-500/20',
    bgClass: 'bg-emerald-500/5',
  },
  notifications: {
    illustration: NotificationsIllustration,
    accentClass: 'from-amber-500/20 to-orange-500/10',
    ringClass: 'ring-amber-500/20',
    bgClass: 'bg-amber-500/5',
  },
  generic: {
    illustration: GenericIllustration,
    accentClass: 'from-indigo-500/20 to-purple-500/10',
    ringClass: 'ring-indigo-500/20',
    bgClass: 'bg-indigo-500/5',
  },
};

/* ─────────────────────── Main Component ─────────────────────── */

interface EmptyStateProps {
  variant?: Variant;
  headline: string;
  subtext: string;
  ctaLabel?: string;
  onCta?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Custom illustration to override the default */
  illustration?: ReactNode;
  compact?: boolean;
}

export const EmptyState = ({
  variant = 'generic',
  headline,
  subtext,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  illustration,
  compact = false,
}: EmptyStateProps) => {
  const cfg = VARIANT_CONFIG[variant];
  const Illustration = cfg.illustration;

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10 px-6' : 'py-16 px-8'} w-full`}>
      {/* Illustration container */}
      <div className={`relative mb-6 ${compact ? 'w-28 h-20' : 'w-40 h-28'}`}>
        {/* Glow ring */}
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${cfg.accentClass} blur-xl`} />
        <div className={`relative w-full h-full rounded-3xl ring-1 ${cfg.ringClass} ${cfg.bgClass} flex items-center justify-center overflow-hidden`}>
          {illustration ?? <Illustration />}
        </div>
      </div>

      {/* Text */}
      <h3 className={`font-bold text-white mb-2 ${compact ? 'text-[15px]' : 'text-lg'}`}>
        {headline}
      </h3>
      <p className={`text-zinc-500 leading-relaxed max-w-xs ${compact ? 'text-[12px]' : 'text-[13px]'}`}>
        {subtext}
      </p>

      {/* CTAs */}
      {(ctaLabel || secondaryLabel) && (
        <div className={`flex items-center gap-3 ${compact ? 'mt-5' : 'mt-7'} flex-wrap justify-center`}>
          {ctaLabel && onCta && (
            <button
              onClick={onCta}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:scale-105 active:scale-95`}
            >
              {ctaLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
