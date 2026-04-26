import { LazyImage } from '../../../shared/components/LazyImage';
import { toast } from '../../../shared/store/useToastStore';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ExpenseRowSkeleton, Skeleton } from '../../../shared/components/Skeleton';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { ArrowLeft, Receipt, Banknote, Edit2, Trash2, Bell, Loader2, Calendar, Trophy } from 'lucide-react';
import { ExpenseModal } from '../../expenses/components/ExpenseModal';
import { ExpenseCharts } from '../components/ExpenseCharts';
import { GroupChat } from '../components/GroupChat';
import { GroupInfoDrawer } from '../components/GroupInfoDrawer';
import { GroupCalendarTimeline } from '../components/GroupCalendarTimeline';
import { GroupAnalytics } from '../components/GroupAnalytics';
import { GroupTemplates } from '../components/GroupTemplates';
import { SubcategoryExpenseList } from '../components/SubcategoryExpenseList';
import { GroupActivityFeed } from '../components/GroupActivityFeed';
import { BulkImportModal } from '../components/BulkImportModal';
import { ExpenseComments } from '../../expenses/components/ExpenseComments';
import { ExpenseAttachments } from '../../expenses/components/ExpenseAttachments';
import { InviteModal } from '../../../shared/components/InviteModal';
import { getFirstName, getSplitSummary } from '../../../shared/utils/expenseUtils';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { useUnreadStore } from '../../../shared/store/useUnreadStore';
import { useHotkeys } from 'react-hotkeys-hook';

interface GroupExpense {
  id: string;
  description: string;
  amount: number;
  paid_by: string;
  paid_by_name: string;
  created_at: string;
  is_settled: boolean;
  is_involved: boolean;
  due_date?: string;
  splits?: { user_id: string; display_name: string; amount: number; is_paid: boolean }[];
  participants: { id: string; display_name: string }[];
  tags?: string[];
  is_locked?: boolean;
  category?: string;
  subcategory?: string;
}

interface GroupBalance {
  owes_name: string;
  paid_by_name: string;
  amount: number;
  paid_by: string;
  owes_to: string;
}

interface LeaderboardEntry {
  id: string;
  display_name: string;
  total_paid: number;
}

export const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore(state => state.user);
  const { markAsRead } = useUnreadStore();
  
  const [fetchError, setFetchError] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const [detail, setDetail] = useState<{ 
    id: string; 
    name: string; 
    type: string; 
    is_archived?: boolean;
    description?: string;
    members: { id: string; display_name: string; role?: string }[];
    default_due_day?: number;
    expenses?: any[];
    created_at: string;
  } | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [balances, setBalances] = useState<GroupBalance[]>([]);
  const [simplifications, setSimplifications] = useState<any[]>([]);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isBulkImportOpen, setBulkImportOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<GroupExpense | null>(null);
  const [loadingReminders, setLoadingReminders] = useState<Record<string, boolean>>({});
  const [isInfoOpen, setInfoOpen] = useState(false);
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [activeView, setActiveView] = useState<'expenses' | 'timeline' | 'analytics' | 'activity'>('expenses');
  const [timelineFilterDate, setTimelineFilterDate] = useState<string | null>(null);
  const [expenseTab, setExpenseTab] = useState<'unsettled' | 'settled'>('unsettled');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [focusedExpenseIndex, setFocusedExpenseIndex] = useState(-1);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
  };

  const myBalance = balances.reduce((acc, b) => {
    if (b.paid_by_name === currentUser?.displayName) return acc + parseFloat(String(b.amount));
    if (b.owes_name === currentUser?.displayName) return acc - parseFloat(String(b.amount));
    return acc;
  }, 0);
  
  const totalOwedToMe = myBalance > 0 ? myBalance : 0;
  const totalIOwe = myBalance < 0 ? Math.abs(myBalance) : 0;

  const refreshData = async () => {
    if (!id) return;
    try {
      const [d, e, l, b, s] = await Promise.all([
        apiClient.get(`/groups/${id}`),
        apiClient.get(`/groups/${id}/expenses`),
        apiClient.get(`/groups/${id}/leaderboard`),
        apiClient.get(`/groups/${id}/balances`),
        apiClient.get(`/groups/${id}/simplifications`).catch(() => ({ data: [] }))
      ]);
      setDetail(d.data);
      setExpenses(e.data);
      setLeaderboard(l.data);
      setBalances(b.data);
      setSimplifications(s.data);
      setFetchError(null);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        setFetchError(err.response.status);
      } else {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshData();
      // Mark group sections as read since they are visible on this page
      markAsRead('group', id, 'expenses');
      markAsRead('group', id, 'payments');
    }
  }, [id]);

  const handleDeleteExpense = async (expenseId: string) => {
    showConfirm(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      async () => {
        try {
          await apiClient.delete(`/expenses/${expenseId}`);
          toast.success('Expense deleted successfully');
          refreshData();
        } catch {
          toast.error('Failed to delete expense');
        }
      },
      'danger'
    );
  };

  const handleBulkSettle = async () => {
    showConfirm(
      'Settle All Debts',
      'Are you sure you want to settle all outstanding debts in this group? This will mark everything as paid.',
      async () => {
        try {
          await apiClient.post(`/groups/${id}/settle-all`);
          toast.success('All debts settled!');
          refreshData();
        } catch {
          toast.error('Failed to settle debts');
        }
      },
      'warning'
    );
  };

  const handleSettleSpecificExpense = (expenseId: string, description: string) => {
    showConfirm(
      'Settle Expense',
      `Are you sure you want to settle "${description}"? This will mark your portion as paid.`,
      async () => {
        const previousDetail = detail;
        setDetail(prev => {
          if (!prev) return prev;
          const expenseToSettle = (prev.expenses || []).find((e: any) => e.id === expenseId);
          if (!expenseToSettle) return prev;
          
          return {
            ...prev,
            expenses: (prev.expenses ? prev.expenses.map((e: any) => e.id === expenseId ? { ...e, is_settled: true } : e) : [])
          };
        });

        try {
          await apiClient.post(`/expenses/${expenseId}/settle`);
          toast.success('Expense settled!');
          refreshData();
        } catch {
          setDetail(previousDetail);
          toast.error('Failed to settle expense');
        }
      },
      'warning'
    );
  };

  const handleRemindExpense = async (expenseId: string) => {
    setLoadingReminders(prev => ({ ...prev, [expenseId]: true }));
    try {
      await apiClient.post(`/expenses/${expenseId}/remind`);
      toast.success('Reminder sent!');
    } catch {
      toast.error('Failed to send reminder');
    } finally {
      setLoadingReminders(prev => ({ ...prev, [expenseId]: false }));
    }
  };

  const handleNudgeBalance = async (targetUserId: string, amount: number) => {
    try {
      await apiClient.post(`/groups/${id}/nudge/${targetUserId}`, { amount });
      toast.success('Reminder sent!');
    } catch {
      toast.error('Failed to send reminder');
    }
  };

  const filteredExpenses = expenses
    .filter(e => expenseTab === 'settled' ? e.is_settled : !e.is_settled)
    .filter(e => {
      if (!timelineFilterDate) return true;
      const filterD = new Date(timelineFilterDate);
      const ed = new Date(e.created_at);
      return filterD.getDate() === ed.getDate() && filterD.getMonth() === ed.getMonth() && filterD.getFullYear() === ed.getFullYear();
    })
    .filter(e => !selectedTag || (e.tags && e.tags.includes(selectedTag)));

  useHotkeys('j', () => {
    if (activeView === 'expenses') {
      setFocusedExpenseIndex(prev => prev < filteredExpenses.length - 1 ? prev + 1 : prev);
    }
  }, { enableOnFormTags: false }, [filteredExpenses.length, activeView]);

  useHotkeys('k', () => {
    if (activeView === 'expenses') {
      setFocusedExpenseIndex(prev => prev > 0 ? prev - 1 : prev === -1 && filteredExpenses.length > 0 ? 0 : prev);
    }
  }, { enableOnFormTags: false }, [filteredExpenses.length, activeView]);

  const focusedExpense = focusedExpenseIndex >= 0 ? filteredExpenses[focusedExpenseIndex] : null;

  const initialExpenseId = searchParams.get('expenseId');
  useEffect(() => {
    if (initialExpenseId && expenses.length > 0) {
      const exp = expenses.find(e => e.id === initialExpenseId);
      if (exp && !isExpenseModalOpen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExpenseToEdit(exp);
        setExpenseModalOpen(true);
        // Clear param so it doesn't reopen if closed
        searchParams.delete('expenseId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [initialExpenseId, expenses, searchParams, setSearchParams, isExpenseModalOpen]);

  if (fetchError === 403) {
    return (
      <div className="flex-1 h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center relative z-10 backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Private Group</h2>
          <p className="text-zinc-400 mb-8">You need to be a member of this group to view its details and expenses.</p>
          <button 
            disabled={isJoining}
            onClick={async () => {
              setIsJoining(true);
              try {
                await apiClient.post(`/groups/${id}/join-via-link`);
                toast.success('Joined successfully!');
                setFetchError(null);
                refreshData();
              } catch (err: any) {
                toast.error(err.response?.data?.error || 'Failed to join group');
              } finally {
                setIsJoining(false);
              }
            }}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            {isJoining ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join Group'}
          </button>
        </div>
      </div>
    );
  }

  if (fetchError === 404) {
    return (
      <div className="flex-1 h-screen bg-[#09090b] flex flex-col items-center justify-center">
        <EmptyState 
          illustration={<div className="text-zinc-600"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>}
          headline="Group Not Found"
          subtext="The group you're looking for doesn't exist or was deleted."
          ctaLabel="Go Home"
          onCta={() => navigate('/')}
        />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col h-full bg-black/40 relative w-full shadow-2xl overflow-hidden backdrop-blur-md p-6">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex flex-col gap-2 w-full">
            <Skeleton className="w-48 h-6 rounded-md" />
            <Skeleton className="w-32 h-4 rounded-md" />
          </div>
        </div>
        <div className="flex flex-col gap-4 w-full">
          <Skeleton className="w-40 h-8 rounded-lg mb-2" />
          <div className="grid grid-cols-1 gap-3">
            <ExpenseRowSkeleton />
            <ExpenseRowSkeleton />
            <ExpenseRowSkeleton />
            <ExpenseRowSkeleton />
            <ExpenseRowSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between z-10 sticky top-0 bg-black/50 backdrop-blur-xl">
         <div className="flex items-center gap-4">
           <button onClick={() => navigate('/connections?tab=groups')} className="text-zinc-400 hover:text-white transition-colors">
             <ArrowLeft className="w-5 h-5" />
           </button>
            <div className="flex flex-col cursor-pointer" onClick={() => setInfoOpen(true)}>
              <h2 className="text-xl font-bold text-white hover:text-indigo-300 transition-colors">{detail.name}</h2>
              <span className="text-xs text-zinc-500 font-medium tracking-wide uppercase">{detail.type} • {detail.members?.length} members</span>
            </div>
         </div>
         <div className="flex gap-3 pr-16">
           <button 
             onClick={() => setActiveView(activeView === 'analytics' ? 'expenses' : 'analytics')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${
               activeView === 'analytics' 
                 ? 'bg-white/10 border-white/20 text-white' 
                 : 'bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
             }`}
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg> Analytics
           </button>
           <button 
             onClick={() => setActiveView(activeView === 'timeline' ? 'expenses' : 'timeline')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${
               activeView === 'timeline' 
                 ? 'bg-white/10 border-white/20 text-white' 
                 : 'bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
             }`}
           >
             <Calendar className="w-4 h-4" /> Timeline
           </button>
           <button
             onClick={() => setActiveView(activeView === 'activity' ? 'expenses' : 'activity')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${
               activeView === 'activity'
                 ? 'bg-white/10 border-white/20 text-white'
                 : 'bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
             }`}
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             Activity
           </button>
           <button 
             onClick={() => setBulkImportOpen(true)}
             className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-zinc-300 font-medium transition-colors flex items-center gap-2"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
             Import CSV
           </button>
           <button 
             onClick={() => { setExpenseToEdit(null); setExpenseModalOpen(true); }}
             className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2"
           >
             <Receipt className="w-4 h-4" /> Add Expense
           </button>
           <button 
             onClick={handleBulkSettle}
             disabled={balances.length === 0}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
               balances.length === 0
                 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                 : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20'
             }`}
           >
             <Banknote className="w-4 h-4" /> Settle Up
           </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row z-10">
         {/* Main Content: Expenses */}
         <div className="flex-1 p-4 lg:p-8 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col gap-8">
            {activeView === 'analytics' ? (
              <GroupAnalytics groupId={detail.id} />
            ) : activeView === 'timeline' ? (
              <div className="w-full h-full animate-in fade-in duration-300">
                <GroupCalendarTimeline 
                   expenses={expenses} 
                   onDateClick={(dateStr) => {
                     setTimelineFilterDate(dateStr);
                     setActiveView('expenses');
                   }}
                />
              </div>
            ) : activeView === 'activity' ? (
              <div className="w-full animate-in fade-in duration-300">
                <GroupActivityFeed groupId={detail.id} />
              </div>
            ) : (
              <>
                <div className="w-full animate-in fade-in duration-300">
                  <ExpenseCharts expenses={expenses} totalOwedToMe={totalOwedToMe} totalIOwe={totalIOwe} />
                </div>

                <div className="w-full animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">Group Expenses</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-lg">
                        <button 
                          onClick={() => setExpenseTab('unsettled')}
                          className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-bold transition-colors ${expenseTab === 'unsettled' ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                        >
                          Unsettled
                        </button>
                        <button 
                          onClick={() => setExpenseTab('settled')}
                          className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-bold transition-colors ${expenseTab === 'settled' ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                        >
                          Settled
                        </button>
                      </div>
                      {timelineFilterDate && (
                        <button 
                          onClick={() => setTimelineFilterDate(null)}
                          className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          Filtered: {new Date(timelineFilterDate).toLocaleDateString()} <Trash2 className="w-3 h-3 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Tag filter bar */}
                  {(() => {
                    const allTags = Array.from(new Set(expenses.flatMap(e => e.tags || [])));
                    if (allTags.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-white/5">
                        {allTags.map(tag => (
                          <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${selectedTag === tag ? 'bg-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-500/20' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'}`}
                          >#{tag}</button>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="flex flex-col gap-3">
                    {expenses.length === 0 ? (
                      <EmptyState
                        variant="expenses"
                        headline="No expenses yet"
                        subtext="Add your first expense to start tracking who owes what."
                        ctaLabel="Add First Expense"
                        onCta={() => setExpenseModalOpen(true)}
                        compact
                      />
                    ) : (
                      <SubcategoryExpenseList
                        expenses={filteredExpenses}
                        renderExpense={(e: any) => {
                          const isFocused = focusedExpense?.id === e.id;
                          return (
                          <motion.div 
                            key={e.id} 
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={{ left: 0.2, right: 0 }}
                            onDragEnd={(_event, { offset }) => {
                              if (offset.x < -80 && !e.is_settled && e.is_involved) {
                                handleSettleSpecificExpense(e.id, e.description);
                              }
                            }}
                            className={`p-4 rounded-2xl border ${e.is_settled ? 'border-emerald-500/20' : 'border-rose-500/20'} ${isFocused ? 'ring-2 ring-amber-500 bg-white/[0.06]' : 'bg-white/[0.02] hover:bg-white/[0.04]'} transition-colors relative overflow-hidden group`}
                          >
                             <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${e.is_settled ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} />
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex flex-col gap-1 pr-2">
                                  <h4 className="text-[14px] font-bold text-white truncate flex items-center gap-2">
                                    {e.description}
                                    {e.is_locked && <span title="Locked"><svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></span>}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             {!e.is_settled && e.is_involved && (
                                <button 
                                  onClick={() => handleSettleSpecificExpense(e.id, e.description)}
                                  className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded hover:bg-emerald-500/40 tracking-wide uppercase" 
                                  title="Settle this specific activity"
                                >
                                  Settle Up
                                </button>
                             )}
                             <button 
                               onClick={() => handleRemindExpense(e.id)}
                               className="p-1 bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/40" 
                               title="Send Reminder"
                             >
                               {loadingReminders[e.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                             </button>
                             {(!e.is_locked) && (
                               <button 
                                 onClick={() => { setExpenseToEdit(e); setExpenseModalOpen(true); }}
                                 className="p-1 bg-white/10 text-zinc-300 rounded hover:bg-white/20" 
                                 title="Edit"
                               >
                                 <Edit2 className="w-3.5 h-3.5" />
                               </button>
                             )}
                             {(!e.is_locked) && (
                               <button 
                                 onClick={() => handleDeleteExpense(e.id)}
                                 className="p-1 bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/40" 
                                 title="Delete"
                               >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                             )}
                           </div>
                           <span className="text-[14px] font-black text-white bg-white/10 px-2.5 py-0.5 rounded-full">₹{e.amount}</span>
                         </div>
                       </div>
                       <div className="flex justify-between items-center text-[11px] text-zinc-500 mt-2 font-medium">
                         <span>Paid by <span className="text-indigo-400/90 font-bold">{getFirstName(e.paid_by_name)}</span> <span className="mx-1 opacity-30">•</span>{getSplitSummary(e.participants, detail.members?.length || 0)}</span>
                         <span>{new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                       </div>
                       {e.tags && e.tags.length > 0 && (
                         <div className="flex flex-wrap gap-1.5 mt-2">
                           {e.tags.map((tag: string, idx: number) => (
                             <button key={idx} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                               className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors border ${selectedTag === tag ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'}`}
                             >#{tag}</button>
                           ))}
                         </div>
                       )}
                        <ExpenseComments expenseId={e.id} />
                        <ExpenseAttachments expenseId={e.id} />
                     </motion.div>
                          );
                        }}
                       />
                     )}
                   </div>
                  </div>
              </>
            )}
         </div>

         {/* Right Sidebar */}
         <div className="w-full lg:w-[350px] bg-black/20 p-4 lg:p-8 flex flex-col gap-8">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-500" /> Top Contributors
              </h3>
              <div className="flex flex-col gap-3">
                {leaderboard.length === 0 ? (
                   <p className="text-xs text-zinc-500">No recent contributions.</p>
                ) : (
                  leaderboard.map((l, idx) => (
                    <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-black w-4 ${idx === 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>{idx + 1}</span>
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white overflow-hidden">
                          {(l as any).avatar_url ? (
                            <LazyImage src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${(l as any).avatar_url}`} alt={l.display_name} className="w-full h-full object-cover" />
                          ) : (
                            l.display_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="text-sm font-semibold text-white">{l.display_name}</span>
                      </div>
                      <span className="text-sm text-zinc-400 font-bold">₹{l.total_paid}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Balances</h3>
              <p className="text-[11px] text-zinc-500 mb-4">Track who owes whom</p>
              <div className="flex flex-col gap-2">
                {balances.map((b, i) => (
                  <div key={i} className="text-[13px] p-3 rounded-lg border border-white/5 text-zinc-300 font-medium flex items-center justify-between group/bal hover:border-white/10 transition-colors">
                    <div>
                      {b.owes_to === currentUser?.id ? (
                        <>
                          <span className="text-rose-400 font-bold">You</span> owe <span className="text-white font-bold">{b.paid_by_name}</span> <span className="text-rose-400 font-bold">₹{b.amount}</span>
                        </>
                      ) : b.paid_by === currentUser?.id ? (
                        <>
                          <span className="text-white font-bold">{b.owes_name}</span> owes <span className="text-emerald-400 font-bold">You</span> <span className="text-emerald-400 font-bold">₹{b.amount}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-white font-bold">{b.owes_name}</span> owes <span className="text-white font-bold">{b.paid_by_name}</span> <span className="text-zinc-300 font-bold">₹{b.amount}</span>
                        </>
                      )}
                    </div>
                    {b.paid_by === currentUser?.id && (
                      <button 
                        onClick={() => handleNudgeBalance(b.owes_to, b.amount)}
                        className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-all opacity-0 group-hover/bal:opacity-100"
                        title="Send Reminder"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {balances.length === 0 && (
                   <p className="text-xs text-zinc-500">No pending balances.</p>
                )}
              </div>
            </div>

            {simplifications.length > 0 && simplifications.length < balances.length && (
               <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                    Simplified Debts
                  </h3>
                  <p className="text-[11px] text-zinc-500 mb-4">The easiest way to settle up</p>
                  <div className="flex flex-col gap-2 relative">
                    <div className="absolute left-4 top-4 bottom-4 w-px bg-indigo-500/20" />
                    {simplifications.map((simp, i) => (
                      <div key={i} className="text-[13px] p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-zinc-300 font-medium flex items-center gap-3 relative z-10 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                        <div>
                          {simp.from === currentUser?.id ? (
                            <>
                              <span className="text-rose-400 font-bold">You</span> should pay <span className="text-white font-bold">{simp.to_name}</span> <span className="text-rose-400 font-bold">₹{simp.amount}</span>
                            </>
                          ) : simp.to === currentUser?.id ? (
                            <>
                              <span className="text-white font-bold">{simp.from_name}</span> should pay <span className="text-emerald-400 font-bold">You</span> <span className="text-emerald-400 font-bold">₹{simp.amount}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-white font-bold">{simp.from_name}</span> should pay <span className="text-white font-bold">{simp.to_name}</span> <span className="text-emerald-400 font-bold">₹{simp.amount}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            )}

            <GroupTemplates 
              groupId={id!} 
              onUseTemplate={(t) => {
                setExpenseToEdit({
                  description: t.description || t.name,
                  amount: t.amount,
                  currency: t.currency || 'INR',
                  category: t.category,
                  due_date: '',
                  paid_by: currentUser?.id || '',
                  participants: t.participants
                } as any);
                setExpenseModalOpen(true);
              }} 
            />
         </div>
      </div>
       
      <ExpenseModal 
        isOpen={isExpenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        groupId={id!}
        groupType={detail.type}
        expenseToEdit={expenseToEdit}
        onSuccess={refreshData}
        groupMembers={detail.members}
        defaultDueDay={detail.default_due_day}
        onOptimisticSubmit={(newExpense) => {
          setDetail(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              expenses: [newExpense, ...(prev.expenses || [])]
            };
          });
        }}
        onRevert={(tempId) => {
          setDetail(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              expenses: (prev.expenses || []).filter((e: any) => e.id !== tempId)
            };
          });
        }}
      />
      
      <GroupChat
        groupId={id!}
        members={detail.members || []}
        canPin={['owner', 'admin'].includes(
          detail.members?.find(m => m.id === currentUser?.id)?.role ?? 'member'
        )}
      />

      <GroupInfoDrawer
        isOpen={isInfoOpen}
        onClose={() => setInfoOpen(false)}
        detail={detail}
        onRefresh={refreshData}
        balances={balances}
        onOpenInvite={() => {
          setInfoOpen(false);
          setInviteOpen(true);
        }}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        groupId={id!}
        onSuccess={() => {
          setBulkImportOpen(false);
          refreshData();
        }}
      />

      <InviteModal 
        isOpen={isInviteOpen}
        onClose={() => setInviteOpen(false)}
        targetId={id!}
        type="group"
        title={detail.name}
      />

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </div>
  );
};
