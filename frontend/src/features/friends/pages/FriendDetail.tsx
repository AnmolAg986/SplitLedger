import { toast } from '../../../shared/store/useToastStore';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { ExpenseComments } from '../../expenses/components/ExpenseComments';
import { ExpenseAttachments } from '../../expenses/components/ExpenseAttachments';
import { useSocket } from '../../../shared/hooks/useSocket';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { useSettingsStore } from '../../../shared/store/useSettingsStore';
import { ArrowLeft, Send, Receipt, Banknote, Edit2, Trash2, Bell, Loader2, MessageSquare, X, Check, CheckCheck, MoreVertical } from 'lucide-react';
import { ExpenseModal } from '../../expenses/components/ExpenseModal';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';
import { ExpenseCharts } from '../../groups/components/ExpenseCharts';
import { useUnreadStore } from '../../../shared/store/useUnreadStore';

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
  friend: { id: string; display_name: string; nickname?: string; category?: string };
  balance: { netBalance: number; totalOwed: number; totalOwe: number };
  expenses: FriendExpense[];
  mutualGroups: { id: string; name: string }[];
  stats?: { totalSpentTogether: number; mostCommonCategory: string; mostCommonCategoryPct: number; lastSettled: string | null; avgDaysToSettle: number };
}

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_edited?: boolean;
  is_deleted_for_everyone?: boolean;
  is_read?: boolean;
  is_delivered?: boolean;
}

export const FriendDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { emit, on } = useSocket();
  const currentUser = useAuthStore(s => s.user);
  const { getSectionCount, markAsRead } = useUnreadStore();
  const [detail, setDetail] = useState<FriendDetailData | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [expenseTab, setExpenseTab] = useState<'unsettled' | 'settled'>('unsettled');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<FriendExpense | null>(null);
  const [loadingReminders, setLoadingReminders] = useState<Record<string, boolean>>({});
  
  const { toggleMute, isMuted } = useSettingsStore();
  const [showSettings, setShowSettings] = useState(false);
  const muted = id ? isMuted(id) : false;
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Track isChatOpen in a ref so socket callbacks always see the current value
  // without needing to re-register listeners on every open/close toggle.
  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);
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
        setNicknameInput(detailRes.data.friend.nickname || '');
      }).catch(console.error);

      emit('join_conversation', id);
      emit('mark_delivered');
      markAsRead('friend', id, 'expenses');
      markAsRead('friend', id, 'payments');
    }
    return () => {
      if (id) emit('leave_conversation', id);
    };
  }, [id, emit]);

  // Mark chat as read when chat panel is opened
  useEffect(() => {
    if (isChatOpen && id) {
      markAsRead('friend', id, 'chat');
      emit('mark_read', id);
    }
  }, [isChatOpen, id]);

  useEffect(() => {
    const unsub1 = on('new_message', (msg) => {
      const incoming = msg as ChatMessage;
      // Deduplicate: message may already be in state from optimistic HTTP response
      setChat(prev => {
        if (prev.some(m => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
      // Only mark as read when the chat panel is open AND the message is from the friend
      if (isChatOpenRef.current && incoming.sender_id === id) {
        emit('mark_read', id);
      }
    });
    const unsub2 = on('user_typing', () => setIsTyping(true));
    const unsub3 = on('user_stop_typing', () => setIsTyping(false));
    
    // Merge (not replace) so fields present in local state but absent in the
    // raw DB row (e.g. sender_name) are preserved.
    const unsub4 = on('message_edited', (editedMsg: any) => {
      setChat(prev => prev.map(m => m.id === editedMsg.id ? { ...m, ...editedMsg } : m));
    });
    const unsub5 = on('message_deleted', (deletedMsg: any) => {
      setChat(prev => prev.map(m => m.id === deletedMsg.id ? { ...m, ...deletedMsg } : m));
    });
    const unsub6 = on('message_deleted_for_me', (data: any) => {
      setChat(prev => prev.filter(m => m.id !== data.messageId));
    });
    const unsub7 = on('user_online_delivered', (data: any) => {
      if (data.userId === id) {
        setChat(prev => prev.map(m => (m.sender_id === currentUser?.id && !m.is_read) ? { ...m, is_delivered: true } : m));
      }
    });
    const unsub8 = on('messages_read', (data: any) => {
      if (data.readBy === id) {
        setChat(prev => prev.map(m => (m.sender_id === currentUser?.id) ? { ...m, is_read: true } : m));
      }
    });
    const unsub9 = on('error', (err: any) => {
      toast.error(err.message || 'An error occurred');
    });
    
    return () => {
      if (unsub1) unsub1(); 
      if (unsub2) unsub2(); 
      if (unsub3) unsub3(); 
      if (unsub4) unsub4(); 
      if (unsub5) unsub5(); 
      if (unsub6) unsub6(); 
      if (unsub7) unsub7(); 
      if (unsub8) unsub8(); 
      if (unsub9) unsub9();
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
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emit('stop_typing', id);

    if (editingMessageId) {
      // Optimistic edit: update local state immediately so there is no visible delay.
      // The server will confirm via 'message_edited' which merges any server-side fields.
      const trimmed = msgInput.trim();
      setChat(prev => prev.map(m =>
        m.id === editingMessageId ? { ...m, content: trimmed, is_edited: true } : m
      ));
      emit('edit_message', { messageId: editingMessageId, friendId: id, content: trimmed });
      setEditingMessageId(null);
      setMsgInput('');
    } else {
      // Optimistic send: POST to REST; add the returned message object directly
      // to state. The socket 'new_message' will also fire for the other party;
      // the deduplication in the listener handles the sender's side.
      try {
        const trimmed = msgInput.trim();
        setMsgInput('');
        const response = await apiClient.post(`/chat/${id}`, { content: trimmed });
        setChat(prev => {
          if (prev.some(m => m.id === response.data.id)) return prev;
          return [...prev, response.data as ChatMessage];
        });
      } catch {
        toast.error('Failed to send message');
      }
    }
  };

  const startEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setMsgInput(msg.content);
    setActiveMenuId(null);
  };

  const deleteMessage = (msgId: string, forEveryone: boolean) => {
    setActiveMenuId(null);
    showConfirm(
      'Delete Message',
      `Are you sure you want to delete this message ${forEveryone ? 'for everyone' : 'for yourself'}?`,
      () => {
        if (forEveryone) {
          // Optimistic: mark as deleted immediately so the sender doesn't wait
          // for the socket round-trip. The server will confirm via 'message_deleted'.
          setChat(prev => prev.map(m =>
            m.id === msgId ? { ...m, content: '', is_deleted_for_everyone: true } : m
          ));
          emit('delete_message', { messageId: msgId, friendId: id, forEveryone: true });
        } else {
          // Optimistic: remove from local list immediately.
          // The server confirms via 'message_deleted_for_me' (no-op if already gone).
          setChat(prev => prev.filter(m => m.id !== msgId));
          emit('delete_message', { messageId: msgId, friendId: id, forEveryone: false });
        }
      },
      'danger'
    );
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
        } catch {
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
    } catch {
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
    } catch {
      toast.error('Failed to update nickname');
    }
  };

  const handleUpdateCategory = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      await apiClient.put(`/friends/${id}/category`, { category: e.target.value });
      toast.success('Category updated');
      refreshData();
    } catch {
      toast.error('Failed to update category');
    }
  };

  const handleBlockUser = () => {
    showConfirm(
      'Block User',
      'Are you sure you want to block this user? They will no longer be able to message you or add you to groups, and your friendship will be removed.',
      async () => {
        try {
          await apiClient.post(`/blocks/${id}`);
          toast.success('User blocked');
          navigate('/connections');
        } catch {
          toast.error('Failed to block user');
        }
      },
      'danger'
    );
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
        } catch {
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
        } catch {
          toast.error('Failed to settle expense');
        }
      },
      'warning'
    );
  };

  const handleNudgeOverall = async () => {
    if (!detail || detail.balance.netBalance <= 0) return;
    try {
      await apiClient.post(`/friends/${id}/nudge`, { amount: detail.balance.netBalance });
      toast.success('Reminder sent!');
    } catch {
      toast.error('Failed to send reminder');
    }
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
            <button onClick={() => navigate('/connections?tab=friends')} className="text-zinc-400 hover:text-white transition-colors">
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
                 <div className={`flex items-center ${detail.friend.nickname ? 'ml-2 border-l border-white/10 pl-2' : ''}`}>
                   <select 
                     value={detail.friend.category || 'other'}
                     onChange={handleUpdateCategory}
                     className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white cursor-pointer focus:outline-none appearance-none"
                   >
                     <option value="other" className="bg-zinc-900 text-white">Other</option>
                     <option value="family" className="bg-zinc-900 text-white">Family</option>
                     <option value="work" className="bg-zinc-900 text-white">Work</option>
                     <option value="roommate" className="bg-zinc-900 text-white">Roommate</option>
                     <option value="travel" className="bg-zinc-900 text-white">Travel</option>
                   </select>
                 </div>
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
         <div className="flex gap-3 pr-16">
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
             <button 
               onClick={handleNudgeOverall}
               disabled={detail.balance.netBalance === 0}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                 detail.balance.netBalance === 0 
                   ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                   : 'bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-500/10'
               }`}
             >
               <Bell className="w-4 h-4" /> Send Alert
             </button>

             <div className="relative">
               <button 
                 onClick={() => setShowSettings(!showSettings)}
                 className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10 text-zinc-400"
               >
                 <MoreVertical className="w-5 h-5" />
               </button>

               {showSettings && (
                 <div className="absolute right-0 top-12 w-48 bg-[#0c0c0e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                   <button 
                     onClick={() => { toggleMute(id!); setShowSettings(false); toast.success(muted ? 'Notifications unmuted' : 'Notifications muted'); }}
                     className="w-full text-left px-4 py-3 text-xs font-medium text-white hover:bg-white/5 transition-colors border-b border-white/5"
                   >
                     {muted ? 'Unmute Notifications' : 'Mute Notifications'}
                   </button>
                   <button 
                     onClick={() => { setShowSettings(false); handleBlockUser(); }}
                     className="w-full text-left px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                   >
                     Block User
                   </button>
                 </div>
               )}
             </div>
         </div>
       </div>

       <div className="flex flex-1 overflow-hidden z-10">
         {/* LEFT: Balance & Expenses */}
         <div className="flex-1 flex flex-col bg-black/20">
           {/* Balance Card / Charts */}
           <div className="p-6 border-b border-white/5">
             <ExpenseCharts 
               expenses={detail.expenses} 
               totalOwedToMe={detail.balance.netBalance > 0 ? detail.balance.netBalance : 0} 
               totalIOwe={detail.balance.netBalance < 0 ? Math.abs(detail.balance.netBalance) : 0} 
             />

             {/* MUTUAL INSIGHTS */}
             {detail.stats && (
               <div className="mt-8">
                 <h3 className="text-[13px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Mutual Insights</h3>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors">
                     <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Most Spent On</span>
                     <div className="text-sm text-white font-medium">
                       {detail.stats.mostCommonCategory ? `${detail.stats.mostCommonCategory} (${detail.stats.mostCommonCategoryPct}%)` : 'Not enough data'}
                     </div>
                   </div>
                   <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors">
                     <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Transacted</span>
                     <div className="text-sm text-amber-400 font-bold">
                       ₹{detail.stats.totalSpentTogether}
                     </div>
                   </div>
                   <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors">
                     <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Avg. Settle Time</span>
                     <div className="text-sm text-white font-medium">
                       {detail.stats.avgDaysToSettle > 0 ? `${detail.stats.avgDaysToSettle} days` : 'N/A'}
                     </div>
                   </div>
                   <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors">
                     <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Last Settled</span>
                     <div className="text-sm text-emerald-400 font-medium">
                       {detail.stats.lastSettled ? (
                         `${Math.max(0, Math.floor((new Date().getTime() - new Date(detail.stats.lastSettled).getTime()) / 86400000))} days ago`
                       ) : 'Never'}
                     </div>
                   </div>
                 </div>
               </div>
             )}
           </div>

           {/* Expenses Feed */}
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-[13px] font-semibold text-zinc-500 uppercase tracking-widest mb-0">Shared History</h3>
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
             </div>
             <div className="flex flex-col gap-3">
               {detail.expenses.length === 0 ? (
                 <p className="text-sm text-zinc-600">No shared expenses found.</p>
               ) : (
                 detail.expenses.filter((e: any) => expenseTab === 'settled' ? e.is_settled : !e.is_settled).map((e: any) => (
                    <div key={e.id} className={`p-4 rounded-xl border ${e.is_settled ? 'border-emerald-500/20' : 'border-rose-500/20'} bg-white/[0.02] hover:bg-white/[0.04] transition-colors group relative overflow-hidden`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${e.is_settled ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} />
                      <div className="flex justify-between items-start mb-2 pl-1">
                        <div className="flex flex-col gap-1 pr-4 flex-1">
                          <h4 className="text-[15px] font-bold text-white leading-tight">{e.description}</h4>
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
                     <ExpenseComments expenseId={e.id} />
                     <ExpenseAttachments expenseId={e.id} />
                   </div>
                 ))
               )}
             </div>
           </div>
         </div>

         {/* RIGHT: Real-Time Chat */}
         {isChatOpen && (
           <div className="w-1/2 absolute right-0 top-0 bottom-0 bg-black/90 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col z-40">
             <div className="p-4 border-b border-white/5 flex justify-between items-center shadow-sm z-10">
               <span className="text-[13px] font-semibold text-zinc-500 uppercase tracking-widest">
                 Direct Messages
               </span>
               <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                 <X className="w-5 h-5" />
               </button>
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
                   const isDeleted = msg.is_deleted_for_everyone;
                   
                   return (
                     <div key={msg.id} className={`flex flex-col relative ${isMe ? 'items-end' : 'items-start'} group/msg`}>
                       <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-[14px] flex flex-col relative ${isDeleted ? 'bg-white/5 border border-white/10 text-zinc-500 italic' : isMe ? 'bg-amber-500 text-black rounded-br-sm font-medium shadow-md shadow-amber-500/10' : 'bg-white/10 text-white rounded-bl-sm border border-white/10'}`}>
                         
                         {isDeleted ? (
                            <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5 opacity-50" /> This message was deleted</span>
                         ) : (
                            <div className="flex flex-col">
                              <span>{msg.content}</span>
                              <div className="flex justify-end items-center gap-1 mt-1 -mb-1 opacity-70">
                                {msg.is_edited && <span className="text-[9px] font-bold tracking-widest uppercase mr-1">Edited</span>}
                                <span className="text-[9px]">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                {isMe && (
                                  <div className="flex items-center">
                                    {msg.is_read ? <CheckCheck className="w-3 h-3 text-indigo-600" /> : msg.is_delivered ? <CheckCheck className="w-3 h-3 text-black/40" /> : <Check className="w-3 h-3 text-black/40" />}
                                  </div>
                                )}
                              </div>
                            </div>
                         )}

                         {/* Context Menu Toggle */}
                         {isMe && !isDeleted && (
                           <button 
                             onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}
                             className={`absolute top-2 -left-8 p-1 rounded-full bg-white/10 text-white opacity-0 group-hover/msg:opacity-100 transition-opacity ${activeMenuId === msg.id ? 'opacity-100' : ''}`}
                           >
                             <MoreVertical className="w-4 h-4" />
                           </button>
                         )}

                         {/* Context Menu Dropdown */}
                         {activeMenuId === msg.id && (
                           <div className="absolute top-10 -left-32 w-36 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in duration-200">
                             <button onClick={() => startEdit(msg)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                             <button onClick={() => deleteMessage(msg.id, false)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete for me</button>
                             <button onClick={() => deleteMessage(msg.id, true)} className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-white/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete for everyone</button>
                           </div>
                         )}
                       </div>
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
                   placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
                 />
                 <div className="absolute right-2 flex items-center gap-1">
                   {editingMessageId && (
                     <button type="button" onClick={() => { setEditingMessageId(null); setMsgInput(''); }} className="p-1.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors">
                       <X className="w-4 h-4" />
                     </button>
                   )}
                   <button type="submit" disabled={!msgInput.trim()} className="p-1.5 bg-amber-500 text-black rounded-full disabled:opacity-50 hover:bg-amber-400 transition-colors">
                     <Send className="w-4 h-4 ml-[2px]" />
                   </button>
                 </div>
               </form>
             </div>
           </div>
         )}
       </div>

       {!isChatOpen && (() => {
         const unreadCount = getSectionCount('friend', id!, 'chat');
         return (
           <button 
             onClick={() => setIsChatOpen(true)}
             className="absolute bottom-6 right-6 p-4 bg-amber-500 text-black rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:bg-amber-400 transition-transform hover:scale-105 z-50 text-2xl"
             title="Chat"
           >
             <MessageSquare className="w-6 h-6" />
             {unreadCount > 0 && (
               <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                 {unreadCount > 99 ? '99+' : unreadCount}
               </span>
             )}
           </button>
         );
       })()}

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
