import { toast } from '../../../shared/store/useToastStore';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { ArrowLeft, Receipt, Banknote, Edit2, Trash2, Bell, Loader2, Calendar, Trophy } from 'lucide-react';
import { ExpenseModal } from '../../expenses/components/ExpenseModal';
import { ExpenseCharts } from '../components/ExpenseCharts';
import { GroupChat } from '../components/GroupChat';
import { GroupInfoDrawer } from '../components/GroupInfoDrawer';
import { GroupCalendarTimeline } from '../components/GroupCalendarTimeline';
import { InviteModal } from '../../../shared/components/InviteModal';
import { getFirstName, getSplitSummary } from '../../../shared/utils/expenseUtils';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';

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
}

interface GroupBalance {
  owes_name: string;
  paid_by_name: string;
  amount: number;
}

interface LeaderboardEntry {
  id: string;
  display_name: string;
  total_paid: number;
}

export const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<{ 
    id: string; 
    name: string; 
    type: string; 
    is_archived?: boolean;
    description?: string;
    members: { id: string; display_name: string }[]; 
    default_due_day?: number;
    created_at: string;
  } | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [balances, setBalances] = useState<GroupBalance[]>([]);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<GroupExpense | null>(null);
  const [loadingReminders, setLoadingReminders] = useState<Record<string, boolean>>({});
  const [isInfoOpen, setInfoOpen] = useState(false);
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);
  const [timelineFilterDate, setTimelineFilterDate] = useState<string | null>(null);
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

  const totalOwedToMe = balances.filter((b) => b.amount > 0).reduce((sum, b) => sum + parseFloat(String(b.amount)), 0);
  const totalIOwe = Math.abs(balances.filter((b) => b.amount < 0).reduce((sum, b) => sum + parseFloat(String(b.amount)), 0));

  const refreshData = () => {
    if (!id) return;
    Promise.all([
      apiClient.get(`/groups/${id}`),
      apiClient.get(`/groups/${id}/expenses`),
      apiClient.get(`/groups/${id}/leaderboard`),
      apiClient.get(`/groups/${id}/balances`)
    ]).then(([d, e, l, b]) => {
      setDetail(d.data);
      setExpenses(e.data);
      setLeaderboard(l.data);
      setBalances(b.data);
    }).catch(console.error);
  };

  useEffect(() => {
    if (id) refreshData();
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
        } catch (err) {
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
        } catch (err) {
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
        try {
          await apiClient.post(`/expenses/${expenseId}/settle`);
          toast.success('Expense settled!');
          refreshData();
        } catch (err) {
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
    } catch (err) {
      toast.error('Failed to send reminder');
    } finally {
      setLoadingReminders(prev => ({ ...prev, [expenseId]: false }));
    }
  };

  if (!detail) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between z-10 sticky top-0 bg-black/50 backdrop-blur-xl">
         <div className="flex items-center gap-4">
           <button onClick={() => navigate('/groups')} className="text-zinc-400 hover:text-white transition-colors">
             <ArrowLeft className="w-5 h-5" />
           </button>
            <div className="flex flex-col cursor-pointer" onClick={() => setInfoOpen(true)}>
              <h2 className="text-xl font-bold text-white hover:text-indigo-300 transition-colors">{detail.name}</h2>
              <span className="text-xs text-zinc-500 font-medium tracking-wide uppercase">{detail.type} • {detail.members?.length} members</span>
            </div>
         </div>
         <div className="flex gap-3">
           <button 
             onClick={() => setIsTimelineVisible(!isTimelineVisible)}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${
               isTimelineVisible 
                 ? 'bg-white/10 border-white/20 text-white' 
                 : 'bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
             }`}
           >
             <Calendar className="w-4 h-4" /> Timeline
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

      <div className="flex-1 overflow-y-auto custom-scrollbar flex z-10">
         {/* Main Content: Expenses */}
         <div className="flex-1 p-8 border-r border-white/5 flex flex-col gap-8">
            {isTimelineVisible ? (
              <div className="w-full h-full animate-in fade-in duration-300">
                <GroupCalendarTimeline 
                   expenses={expenses} 
                   onDateClick={(dateStr) => {
                     setTimelineFilterDate(dateStr);
                     setIsTimelineVisible(false);
                   }}
                />
              </div>
            ) : (
              <>
                <div className="w-full animate-in fade-in duration-300">
                  <ExpenseCharts expenses={expenses} totalOwedToMe={totalOwedToMe} totalIOwe={totalIOwe} />
                </div>

                <div className="w-full animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">Group Expenses</h3>
                    {timelineFilterDate && (
                      <button 
                        onClick={() => setTimelineFilterDate(null)}
                        className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full transition-colors flex items-center gap-1.5"
                      >
                        Filtered: {new Date(timelineFilterDate).toLocaleDateString()} <Trash2 className="w-3 h-3 ml-1" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {expenses.length === 0 ? (
                      <p className="text-zinc-500 text-sm">No expenses logged yet. Be the first!</p>
                    ) : (
                      expenses
                       .filter(e => {
                         if (!timelineFilterDate) return true;
                         const filterD = new Date(timelineFilterDate);
                         const ed = new Date(e.created_at);
                         return filterD.getDate() === ed.getDate() && filterD.getMonth() === ed.getMonth() && filterD.getFullYear() === ed.getFullYear();
                       })
                       .map((e: GroupExpense) => (
                    <div key={e.id} className={`p-4 rounded-2xl border ${e.is_settled ? 'border-emerald-500/20' : 'border-white/5'} bg-white/[0.02] hover:bg-white/[0.04] transition-colors relative overflow-hidden group`}>
                       <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${e.is_settled ? 'bg-emerald-500/50' : 'bg-indigo-500/0 group-hover:bg-indigo-500/50'}`} />
                       <div className="flex justify-between items-start mb-1">
                         <div className="flex flex-col gap-1 pr-2">
                           <h4 className="text-[14px] font-bold text-white truncate">{e.description}</h4>
                           {e.is_involved && (
                             <div className="flex items-center gap-1.5 mt-0.5">
                               <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${e.is_settled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                                  {e.is_settled ? 'Settled Up' : 'Not Settled Up'}
                               </span>
                             </div>
                           )}
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
                             <button 
                               onClick={() => { setExpenseToEdit(e); setExpenseModalOpen(true); }}
                               className="p-1 bg-white/10 text-zinc-300 rounded hover:bg-white/20" 
                               title="Edit"
                             >
                               <Edit2 className="w-3.5 h-3.5" />
                             </button>
                             <button 
                               onClick={() => handleDeleteExpense(e.id)}
                               className="p-1 bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/40" 
                               title="Delete"
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           </div>
                           <span className="text-[14px] font-black text-white bg-white/10 px-2.5 py-0.5 rounded-full">₹{e.amount}</span>
                         </div>
                       </div>
                       <div className="flex justify-between items-center text-[11px] text-zinc-500 mt-2 font-medium">
                         <span>Paid by <span className="text-indigo-400/90 font-bold">{getFirstName(e.paid_by_name)}</span> <span className="mx-1 opacity-30">•</span>{getSplitSummary(e.participants, detail.members?.length || 0)}</span>
                         <span>{new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                       </div>
                    </div>
                  ))
                )}
                  </div>
                </div>
              </>
            )}
         </div>

         {/* Right Sidebar */}
         <div className="w-[350px] bg-black/20 p-8 flex flex-col gap-8">
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
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                          {l.display_name.charAt(0)}
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
                  <div key={i} className="text-[13px] p-3 rounded-lg border border-white/5 text-zinc-300 font-medium">
                    <span className="text-white font-bold">{b.owes_name}</span> owes <span className="text-white font-bold">{b.paid_by_name}</span> <span className="text-emerald-400 font-bold">₹{b.amount}</span>
                  </div>
                ))}
              </div>
            </div>
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
      />
      
      <GroupChat groupId={id!} />

      <GroupInfoDrawer
        isOpen={isInfoOpen}
        onClose={() => setInfoOpen(false)}
        detail={detail}
        onRefresh={refreshData}
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
