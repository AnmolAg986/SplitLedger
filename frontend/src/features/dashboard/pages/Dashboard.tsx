import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { apiClient } from '../../../shared/api/axios';
import { ArrowUpRight, TrendingUp, TrendingDown, ChevronRight, Users, Sparkles } from 'lucide-react';

interface PersonBalance {
  user_id: string;
  display_name: string;
  amount: number;
}

interface Insights {
  topOwe: PersonBalance[];
  topOwed: PersonBalance[];
  spentThisMonth: number;
}

export const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalBalance: 0, totalOwed: 0, totalOwe: 0 });
  const [onboarding, setOnboarding] = useState({ hasFriendsOrGroups: false, hasExpenses: false });
  const [insights, setInsights] = useState<Insights>({ topOwe: [], topOwed: [], spentThisMonth: 0 });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await apiClient.get('/dashboard/summary');
        setMetrics(data.metrics);
        setOnboarding(data.onboarding);
        if (data.insights) setInsights(data.insights);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount / 100);

  // Merge topOwe and topOwed into a unified top-3 list sorted by abs amount
  const topBalances: (PersonBalance & { direction: 'owe' | 'owed' })[] = [
    ...insights.topOwed.map((p) => ({ ...p, direction: 'owed' as const })),
    ...insights.topOwe.map((p) => ({ ...p, direction: 'owe' as const })),
  ]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const hasInsights = topBalances.length > 0;

  const renderOnboardingState = () => {
    if (loading || hasInsights) return null;

    let title = '';
    let sub = '';

    if (!onboarding.hasFriendsOrGroups && !onboarding.hasExpenses) {
      title = 'Welcome to SplitLedger! 👋';
      sub = 'Add friends, create groups, and start splitting expenses effortlessly.';
    } else if (onboarding.hasFriendsOrGroups && !onboarding.hasExpenses) {
      title = 'Almost there!';
      sub = 'You have friends or groups. Add your first expense to get started.';
    } else {
      return null;
    }

    return (
      <div className="w-full bg-[#0c0c0e] border border-white/10 rounded-xl p-8 text-center animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 border border-white/10 mb-4 shadow-inner">
          <span className="text-zinc-500 font-bold text-lg">✨</span>
        </div>
        <h3 className="text-white font-bold text-[16px] mb-1">{title}</h3>
        <p className="text-zinc-500 text-[13px] font-medium max-w-sm mx-auto leading-relaxed">{sub}</p>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 relative z-10 font-sans h-full flex flex-col">

      {/* Header */}
      <header className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 shrink-0">
        <h1 className="text-3xl font-display font-bold text-white mb-2">
          Welcome back, {user?.displayName?.split(' ')?.[0] || 'User'}
        </h1>
        <p className="text-zinc-400 text-[15px] font-medium tracking-tight">
          Here's your financial overview
        </p>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 shrink-0">

        {/* Total Balance */}
        <div className="bg-[#0c0c0e] border border-white/10 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-white/20 transition-all animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Total Balance</h3>
          <div className={`text-3xl font-display font-bold ${metrics.totalBalance < 0 ? 'text-rose-400' : metrics.totalBalance > 0 ? 'text-emerald-400' : 'text-white'}`}>
            {loading ? <span className="opacity-0">0</span> : fmt(metrics.totalBalance)}
            {loading && <div className="absolute top-[42px] left-6 h-8 w-24 bg-white/5 animate-pulse rounded-md" />}
          </div>
        </div>

        {/* You are owed */}
        <div className="bg-[#0c0c0e] border border-white/10 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-white/20 transition-all animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">You are owed</h3>
          <div className="text-3xl font-display font-bold text-emerald-400 relative">
            {loading ? <span className="opacity-0">0</span> : fmt(metrics.totalOwed)}
            {loading && <div className="absolute top-1 left-0 h-8 w-24 bg-white/5 animate-pulse rounded-md" />}
          </div>
        </div>

        {/* You owe */}
        <div className="bg-[#0c0c0e] border border-white/10 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-white/20 transition-all animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">You owe</h3>
          <div className="text-3xl font-display font-bold text-rose-400 relative">
            {loading ? <span className="opacity-0">0</span> : fmt(metrics.totalOwe)}
            {loading && <div className="absolute top-1 left-0 h-8 w-24 bg-white/5 animate-pulse rounded-md" />}
          </div>
        </div>

      </div>

      {/* ── Top Balances (Deep-Link Cards) ── */}
      {(hasInsights || loading) && (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" strokeWidth={2} />
              <h2 className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest">Top Balances</h2>
            </div>
            <button
              onClick={() => navigate('/friends')}
              className="flex items-center gap-1 text-[12px] font-semibold text-zinc-500 hover:text-white transition-colors group"
            >
              <Users className="h-3.5 w-3.5" />
              View all friends
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-[#0c0c0e] border border-white/10 rounded-xl p-5 animate-pulse"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="h-4 w-20 bg-white/5 rounded mb-3" />
                    <div className="h-7 w-28 bg-white/5 rounded mb-1" />
                    <div className="h-3.5 w-16 bg-white/5 rounded" />
                  </div>
                ))
              : topBalances.map((person, i) => {
                  const isOwed = person.direction === 'owed';
                  return (
                    <button
                      key={person.user_id}
                      onClick={() => navigate(`/friends/${person.user_id}`)}
                      className="group bg-[#0c0c0e] border border-white/10 rounded-xl p-5 text-left relative overflow-hidden hover:border-white/25 hover:bg-[#111113] transition-all duration-200 active:scale-[0.98] cursor-pointer"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      {/* Ambient glow */}
                      <div
                        className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-opacity duration-300 opacity-60 group-hover:opacity-100 ${
                          isOwed ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                        }`}
                      />

                      {/* Direction chip */}
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mb-3 border ${
                        isOwed
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {isOwed
                          ? <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                          : <TrendingDown className="h-3 w-3" strokeWidth={2.5} />}
                        {isOwed ? 'Owes you' : 'You owe'}
                      </div>

                      {/* Name */}
                      <p className="text-white font-bold text-[16px] leading-tight mb-0.5 truncate pr-5">
                        {person.display_name}
                      </p>

                      {/* Amount */}
                      <p className={`text-[22px] font-display font-black tracking-tight ${isOwed ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {fmt(person.amount)}
                      </p>

                      {/* Deep-link arrow */}
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all duration-200" />
                    </button>
                  );
                })}
          </div>
        </div>
      )}

      {/* Spend This Month — only if data exists */}
      {!loading && insights.spentThisMonth > 0 && (
        <div className="mb-8 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Spent This Month</h3>
              <p className="text-2xl font-display font-bold text-white">{fmt(insights.spentThisMonth)}</p>
            </div>
            <div className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-cyan-400" strokeWidth={2} />
            </div>
          </div>
        </div>
      )}

      {/* Onboarding / Empty State */}
      {renderOnboardingState()}
    </div>
  );
};
