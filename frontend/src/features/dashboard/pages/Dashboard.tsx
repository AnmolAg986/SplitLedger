import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { apiClient } from '../../../shared/api/axios';
import { ArrowUpRight, Sparkles, Plus, Receipt } from 'lucide-react';
import { SettleUpModal } from '../../../shared/components/SettleUpModal';
import { DashboardWidgets } from '../components/DashboardWidgets';
import { NetPositionSection } from '../components/NetPositionSection';
import { CreateExpenseModal } from '../../../shared/components/CreateExpenseModal';

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
  const [metrics, setMetrics] = useState({ totalBalance: 0, totalOwed: 0, totalOwe: 0, lastMonthNetBalance: 0, lastWeekNetBalance: 0 });
  const [onboarding, setOnboarding] = useState({ hasFriendsOrGroups: false, hasExpenses: false });
  const [insights, setInsights] = useState<Insights>({ topOwe: [], topOwed: [], spentThisMonth: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [focusInsight, setFocusInsight] = useState<any>(null);
  const [advanced, setAdvanced] = useState<any>(null);
  const [friends, setFriends] = useState<{ id: string; display_name: string }[]>([]);
  const [isSettleModalOpen, setSettleModalOpen] = useState(false);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [{ data }, friendsRes] = await Promise.all([
          apiClient.get('/dashboard/summary'),
          apiClient.get('/friends').catch(() => ({ data: [] }))
        ]);
        setMetrics(data.metrics);
        setOnboarding(data.onboarding);
        if (data.insights) setInsights(data.insights);
        if (data.recentActivity) setRecentActivity(data.recentActivity);
        if (data.focusInsight) setFocusInsight(data.focusInsight);
        if (data.advanced) setAdvanced(data.advanced);
        setFriends(friendsRes.data.map((f: any) => ({ id: f.id, display_name: f.display_name })));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const refreshDashboard = async () => {
    const { data } = await apiClient.get('/dashboard/summary');
    setMetrics(data.metrics);
    setAdvanced(data.advanced);
    setInsights(data.insights || { topOwe: [], topOwed: [], spentThisMonth: 0 });
    setRecentActivity(data.recentActivity || []);
    if (data.focusInsight) setFocusInsight(data.focusInsight);
  };

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const hasActivity = (insights.topOwed?.length > 0) || (insights.topOwe?.length > 0) || recentActivity.length > 0 || metrics.totalBalance !== 0;

  // Don't render the main content until we have real data
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 md:p-8 relative z-10 font-sans h-full flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 relative z-10 font-sans h-full flex flex-col overflow-y-auto custom-scrollbar">

      <header className="mb-8 shrink-0">
        <h1 className="text-3xl font-display font-bold text-white mb-2">
          {(user?.loginCount ?? 0) <= 1 ? "Welcome," : "Welcome back,"} {user?.displayName?.split(' ')?.[0] || 'User'}
        </h1>
      </header>



      {/* 1. Net Position Section */}
      <NetPositionSection 
        metrics={metrics} 
        advanced={advanced || { pendingSettlementsCount: 0, overdueCount: 0, oldestDebtDays: 0, totalPendingAmount: 0 }} 
        onAddExpense={() => setExpenseModalOpen(true)}
      />

      {/* 2. Main Content Stacked */}
      <div className="flex flex-col gap-10 items-start w-full">
        
        {/* Quick Insights Section (Top) */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-4 px-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h2 className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest">Quick Insights</h2>
          </div>
          <DashboardWidgets data={{ ...metrics, ...advanced, focusInsight, topOwe: insights.topOwe }} />
        </div>

        {/* Recent Activity Section (Bottom) */}
        <div className="w-full space-y-8">
          {recentActivity.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 mb-4 px-2">
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                <h2 className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest">Recent Activity</h2>
              </div>
              <div className="bg-[#141416]/50 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5 shadow-2xl">
                {recentActivity.map((act) => (
                  <div key={act.id} className="p-5 hover:bg-white/5 transition-colors group cursor-pointer flex justify-between items-center" onClick={() => navigate('/activity')}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white text-[15px] font-semibold truncate group-hover:text-amber-500 transition-colors">{act.description}</p>
                        <span className="text-zinc-700 font-bold text-[10px]">•</span>
                        <p className="text-[12px] text-zinc-500 font-medium truncate">
                          {act.group_name || `with ${act.other_party_name || 'Friend'}`}
                        </p>
                      </div>
                      <p className="text-[11px] text-zinc-600 font-medium">{new Date(act.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-emerald-400 font-display font-bold text-[16px]">+{fmt(act.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[300px] border border-white/5 rounded-3xl p-12 text-center bg-gradient-to-b from-white/5 to-transparent">
               <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-6 shadow-inner">
                 <Sparkles className="text-indigo-400 h-8 w-8" />
               </div>
               {onboarding.hasFriendsOrGroups ? (
                 <>
                   <h3 className="text-white font-bold text-xl mb-2">No expenses yet</h3>
                   <p className="text-zinc-500 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                     Add an expense to start tracking activity.
                   </p>
                 </>
               ) : (
                 <>
                   <h3 className="text-white font-bold text-xl mb-2">Welcome! Let's get started</h3>
                   <p className="text-zinc-500 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                     Add friends, create groups, and start splitting expenses.
                   </p>
                 </>
               )}
             </div>
          )}
        </div>
      </div>



      <SettleUpModal 
        isOpen={isSettleModalOpen} 
        onClose={() => setSettleModalOpen(false)} 
        onSuccess={refreshDashboard}
      />

      {isExpenseModalOpen && user && (
        <CreateExpenseModal 
          onClose={() => setExpenseModalOpen(false)} 
          onSuccess={refreshDashboard}
          currentUserId={user.id}
          availableUsers={[
            { id: user.id, display_name: user.displayName || 'You' },
            ...friends
          ]}
        />
      )}

    </div>
  );
};
