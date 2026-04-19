import { toast } from '../../../shared/store/useToastStore';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { useSocket } from '../../../shared/hooks/useSocket';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { ArrowLeft, Send, Receipt, Wallet, Banknote, Edit2, Trash2, Bell, Loader2 } from 'lucide-react';
import { ExpenseModal } from '../../expenses/components/ExpenseModal';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';

interface FriendExpense {
  id: string;
  description: string;
  amount: number;
  paid_by: string;
  paid_by_name: string;
  created_at: string;
  due_date?: string;
  is_settled: boolean;
}

interface FriendDetailData {
  friend: { id: string; display_name: string; nickname?: string };
  balance: { netBalance: number; totalOwed: number; totalOwe: number };
  expenses: FriendExpense[];
  mutualGroups: { id: string; name: string }[];
  stats?: { totalSpentTogether: number; mostCommonCategory: string };
}

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export const FriendDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { emit, on } = useSocket();
  const currentUser = useAuthStore(s => s.user);
  const [detail, setDetail] = useState<FriendDetailData | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<FriendExpense | null>(null);
  const [loadingReminders, setLoadingReminders] = useState<Record<string, boolean>>({});
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
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

  const refreshData = () => {
    if (!id) return;
    apiClient.get(`/friends/${id}`).then((res) => {
      setDetail(res.data);
      setNicknameInput(res.data.friend.nickname || '');
    });
  };

  useEffect(() => {
    if (id) {
      Promise.all([
        apiClient.get(`/friends/${id}`),
        apiClient.get(`/chat/${id}`)
      ]).then(([detailRes, chatRes]) => {
        setDetail({
          ...detailRes.data,
          expenses: detailRes.data.expenses?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        });
        setChat(chatRes.data);
      }).catch(console.error);

      emit('join_conversation', id);
    }
    return () => {
      if (id) emit('leave_conversation', id);
    };
  }, [id, emit]);

  useEffect(() => {
    const unsub1 = on('new_message', (msg) => {
      setChat(prev => [...prev, msg]);
      emit('mark_read', id);
    });
    const unsub2 = on('user_typing', () => setIsTyping(true));
    const unsub3 = on('user_stop_typing', () => setIsTyping(false));
    
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [on, emit, id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleInput = (val: string) => {
    setMsgInput(val);
    emit('typing', id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emit('stop_typing', id);
    }, 1500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    try {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emit('stop_typing', id);
      await apiClient.post(`/chat/${id}`, { content: msgInput });
      setMsgInput('');
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    showConfirm(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      async () => {
        try {
          await apiClient.delete(`/expenses/${expenseId}`);
          toast.success('Expense deleted');
          refreshData();
        } catch (err) {
          toast.error('Failed to delete expense');
        }
      },
      'danger'
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

  const handleUpdateNickname = async () => {
    try {
      await apiClient.post('/friends/nickname', { friendId: id, nickname: nicknameInput || null });
      setIsEditingNickname(false);
      toast.success('Nickname updated');
      refreshData();
    } catch (err) {
      toast.error('Failed to update nickname');
    }
  };

  const handleSettleAll = () => {
    if (!detail) return;
    showConfirm(
      'Settle All Debts',
      `Are you sure you want to settle all debts with ${detail.friend.display_name}? This will record a payment for the entire balance.`,
      async () => {
        try {
          await apiClient.post('/settlements/settle-all-mutual', { friendId: id });
          toast.success('Mutual balance settled!');
          refreshData();
        } catch (err) {
          toast.error('Failed to settle balance');
        }
      },
      'warning'
    );
  };

  const handleSettleSpecificExpense = (expenseId: string, description: string) => {
    showConfirm(
      'Settle Expense',
      `Are you sure you want to settle "${description}"? This will mark it as paid.`,
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

  if (!detail) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-black/40 relative w-full shadow-2xl overflow-hidden backdrop-blur-md">
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
           <div className="w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
       </div>

       {/* HEADER */}
       <div className="p-4 border-b border-white/10 flex items-center justify-between z-10 bg-black/50 backdrop-blur-xl">
         <div className="flex items-center gap-4">
            <button onClick={() => navigate('/friends')} className="text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
             <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 {isEditingNickname ? (
                   <input
                     autoFocus
                     value={nicknameInput}
                     onChange={e => setNicknameInput(e.target.value)}
                     onBlur={handleUpdateNickname}
                     onKeyDown={e => e.key === 'Enter' && handleUpdateNickname()}
                     className="bg-white/5 border border-white/20 rounded px-2 py-0.5 text-white text-lg font-bold focus:outline-none"
                   />
                 ) : (
                   <h2 className="text-lg font-bold text-white flex items-center gap-2">
                     {detail.friend.nickname || detail.friend.display_name}
                     <button onClick={() => setIsEditingNickname(true)} className="p-1 hover:bg-white/10 rounded transition-colors">
                       <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                     </button>
                   </h2>
                 )}
               </div>
               
               <div className="flex items-center gap-3">
                 {detail.friend.nickname && (
                   <span className="text-[11px] text-zinc-500 font-medium">{detail.friend.display_name}</span>
                 )}
                 {detail.mutualGroups?.length > 0 && (
                   <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-3 flex-wrap">
                     <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                       {detail.mutualGroups.length} shared {detail.mutualGroups.length === 1 ? 'group' : 'groups'}:
                     </span>
                     {detail.mutualGroups.map((g: any) => (
                       <div key={g.id} className="text-[10px] font-bold bg-white/5 border border-white/10 text-zinc-400 px-2 py-0.5 rounded-full cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate(`/groups/${g.id}`)}>
                         {g.name}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          </div>
         <div className="flex gap-3">
           <button 
             onClick={() => { setExpenseToEdit(null); setExpenseModalOpen(true); }}
             className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2"
           >
             <Receipt className="w-4 h-4" /> Add Expense
           </button>
            <button 
              onClick={handleSettleAll}
              disabled={detail.balance.netBalance === 0}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                detail.balance.netBalance === 0 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
              }`}
            >
              <Banknote className="w-4 h-4" /> Settle Up
            </button>
         </div>
       </div>

       <div className="flex flex-1 overflow-hidden z-10">
         {/* LEFT: Balance & Expenses */}
         <div className="flex-[2] border-r border-white/5 flex flex-col bg-black/20">
           {/* Balance Card */}
           <div className="p-6 border-b border-white/5">
             <h3 className="text-[13px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Mutual Balance</h3>
             <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden mb-4">
                <Wallet className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white/5 pointer-events-none" />
                <div className="flex flex-col gap-1 relative z-10">
                  {detail.balance.netBalance === 0 ? (
                    <span className="text-2xl font-bold text-white">All settled up!</span>
                  ) : detail.balance.netBalance > 0 ? (
                    <>
                      <span className="text-sm font-medium text-emerald-400/80">Owes you</span>
                      <span className="text-3xl font-black text-emerald-400 tracking-tight">₹{detail.balance.netBalance}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-rose-400/80">You owe</span>
                      <span className="text-3xl font-black text-rose-400 tracking-tight">₹{Math.abs(detail.balance.netBalance)}</span>
                    </>
                  )}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
               <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex flex-col items-center text-center">
                  <span className="text-[11px] text-zinc-500 font-bold uppercase mb-1">Total Spent</span>
                  <span className="text-lg font-black text-white">₹{detail.stats?.totalSpentTogether || 0}</span>
               </div>
               <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex flex-col items-center text-center">
                  <span className="text-[11px] text-zinc-500 font-bold uppercase mb-1">Top Category</span>
                  <span className="text-sm font-bold text-amber-500">
                    {detail.stats?.mostCommonCategory || 'None'}
                  </span>
               </div>
             </div>
           </div>

           {/* Expenses Feed */}
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
             <h3 className="text-[13px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Shared History</h3>
             <div className="flex flex-col gap-3">
               {detail.expenses.length === 0 ? (
                 <p className="text-sm text-zinc-600">No shared expenses found.</p>
               ) : (
                 detail.expenses.map((e: any) => (
                    <div key={e.id} className={`p-4 rounded-xl border ${e.is_settled ? 'border-emerald-500/20' : 'border-white/5'} bg-white/[0.02] hover:bg-white/[0.04] transition-colors group relative overflow-hidden`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${e.is_settled ? 'bg-emerald-500/50' : 'bg-indigo-500/0 group-hover:bg-indigo-500/50'}`} />
                      <div className="flex justify-between items-start mb-2 pl-1">
                        <div className="flex flex-col gap-1 pr-4 flex-1">
                          <h4 className="text-[15px] font-bold text-white leading-tight">{e.description}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${e.is_settled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                               {e.is_settled ? 'Settled Up' : 'Not Settled Up'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 items-center">
                            {!e.is_settled && (
                               <button 
                                 onClick={() => handleSettleSpecificExpense(e.id, e.description)}
                                 className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded hover:bg-emerald-500/40 tracking-wide uppercase" 
                               >
                                 Settle Up
                               </button>
                            )}
                            <button 
                              onClick={() => handleRemindExpense(e.id)}
                              className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/40" 
                            >
                              {loadingReminders[e.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                              onClick={() => { setExpenseToEdit(e); setExpenseModalOpen(true); }}
                              className="p-1.5 bg-white/10 text-zinc-300 rounded hover:bg-white/20" 
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteExpense(e.id)}
                              className="p-1.5 bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/40" 
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                         <span className="text-[15px] font-bold text-white shrink-0 bg-white/10 px-2 py-0.5 rounded-lg">₹{e.amount}</span>
                       </div>
                     </div>
                     <div className="flex justify-between items-center text-[12px] text-zinc-500">
                       <div className="flex flex-col">
                         <span>{new Date(e.created_at).toLocaleDateString()}</span>
                         {e.due_date && <span className="text-amber-500/80 mt-0.5">Due: {new Date(e.due_date).toLocaleDateString()}</span>}
                       </div>
                       <span>Paid by {e.paid_by_name || 'You'}</span>
                     </div>
                   </div>
                 ))
               )}
             </div>
           </div>
         </div>

         {/* RIGHT: Real-Time Chat */}
         <div className="flex-[3] flex flex-col bg-transparent">
           <div className="p-4 border-b border-white/5 text-[13px] font-semibold text-zinc-500 uppercase tracking-widest shadow-sm z-10">
             Direct Messages
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
             {chat.length === 0 ? (
               <div className="h-full flex flex-col justify-center items-center text-zinc-500">
                 <span className="text-2xl mb-3">💬</span>
                 <p className="text-sm font-medium">Say hello!</p>
               </div>
             ) : (
               chat.map((msg: any) => {
                 const isMe = msg.sender_id !== id;
                 return (
                   <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                     <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-[14px] ${isMe ? 'bg-amber-500 text-black rounded-br-sm font-medium shadow-md shadow-amber-500/10' : 'bg-white/10 text-white rounded-bl-sm border border-white/10'}`}>
                       {msg.content}
                     </div>
                     <span className="text-[10px] text-zinc-600 mt-1 font-medium">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   </div>
                 );
               })
             )}
             {isTyping && (
               <div className="flex items-center gap-2 mt-2">
                 <div className="flex gap-1 animate-pulse">
                   <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                   <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" style={{ animationDelay: '0.2s' }} />
                   <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" style={{ animationDelay: '0.4s' }} />
                 </div>
                 <span className="text-xs text-zinc-500 font-medium">Friend is typing...</span>
               </div>
             )}
             <div ref={chatEndRef} />
           </div>

           <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-sm z-10">
             <form onSubmit={handleSend} className="relative flex items-center">
               <input
                 type="text"
                 value={msgInput}
                 onChange={e => handleInput(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-14 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors shadow-inner"
                 placeholder="Type a message..."
               />
               <button type="submit" disabled={!msgInput.trim()} className="absolute right-2 p-1.5 bg-amber-500 text-black rounded-full disabled:opacity-50 hover:bg-amber-400 transition-colors">
                 <Send className="w-4 h-4 ml-[2px]" />
               </button>
             </form>
           </div>
         </div>
       </div>

      <ExpenseModal 
        isOpen={isExpenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        expenseToEdit={expenseToEdit}
        onSuccess={refreshData}
        groupMembers={[
          { id: detail.friend.id, display_name: detail.friend.display_name },
          { id: currentUser?.id, display_name: 'You' }
        ]} 
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
