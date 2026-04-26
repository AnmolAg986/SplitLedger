import { LazyImage } from '../../../shared/components/LazyImage';
import { toast } from '../../../shared/store/useToastStore';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ExpenseRowSkeleton, ChatMessageSkeleton, Skeleton } from '../../../shared/components/Skeleton';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { ExpenseComments } from '../../expenses/components/ExpenseComments';
import { ExpenseAttachments } from '../../expenses/components/ExpenseAttachments';
import { useSocket } from '../../../shared/hooks/useSocket';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { useSettingsStore } from '../../../shared/store/useSettingsStore';
import { ArrowLeft, Send, Receipt, Banknote, Edit2, Trash2, Bell, Loader2, MessageSquare, X, Check, CheckCheck, MoreVertical, CornerUpLeft } from 'lucide-react';
import { ExpenseModal } from '../../expenses/components/ExpenseModal';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';
import { ExpenseCharts } from '../../groups/components/ExpenseCharts';
import { useUnreadStore } from '../../../shared/store/useUnreadStore';
import { MessageReactions } from '../../../shared/components/MessageReactions';
import { ReplyQuote } from '../../../shared/components/ReplyQuote';
import { LinkPreview } from '../../../shared/components/LinkPreview';
import { VoiceRecorder } from '../../../shared/components/VoiceRecorder';
import { VoiceMessage } from '../../../shared/components/VoiceMessage';
import { Mic } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';

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
  friend: { id: string; display_name: string; nickname?: string; category?: string; avatar_url?: string };
  balance: { netBalance: number; totalOwed: number; totalOwe: number };
  expenses: FriendExpense[];
  mutualGroups: { id: string; name: string }[];
  stats?: { totalSpentTogether: number; mostCommonCategory: string; mostCommonCategoryPct: number; lastSettled: string | null; avgDaysToSettle: number };
}

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  reactions?: any;
  user_reactions?: string[];
  created_at: string;
  is_edited?: boolean;
  is_deleted_for_everyone?: boolean;
  is_read?: boolean;
  is_delivered?: boolean;
}

export const FriendDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { emit, on, isConnected } = useSocket();
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
  
  const [focusedExpenseIndex, setFocusedExpenseIndex] = useState(-1);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderName: string } | null>(null);

  const { toggleMute, isMuted } = useSettingsStore();
  const [showSettings, setShowSettings] = useState(false);
  const muted = id ? isMuted(id) : false;
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [presence, setPresence] = useState<{ online: boolean; lastSeen: string | null }>({ online: false, lastSeen: null });
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);
  const [visibleLimit, setVisibleLimit] = useState(50);

  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  useEffect(() => {
    if (!isChatOpen || chat.length <= visibleLimit) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleLimit(prev => Math.min(prev + 50, chat.length));
      }
    }, { threshold: 0.1 });

    if (topObserverRef.current) observer.observe(topObserverRef.current);
    return () => observer.disconnect();
  }, [isChatOpen, chat.length, visibleLimit]);

  const visibleChat = useMemo(() => {
    return chat.slice(Math.max(chat.length - visibleLimit, 0));
  }, [chat, visibleLimit]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: detail?.expenses ? detail.expenses.filter(e => expenseTab === 'settled' ? e.is_settled : !e.is_settled).length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 5,
  });

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
    if (id && isConnected) {
      Promise.all([
        apiClient.get(`/friends/${id}`),
        apiClient.get(`/chat/${id}`),
        apiClient.get(`/users/${id}/presence`)
      ]).then(([detailRes, chatRes, presenceRes]) => {
        setDetail({
          ...detailRes.data,
          expenses: detailRes.data.expenses?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        });
        setChat(chatRes.data);
        setPresence(presenceRes.data);
        setNicknameInput(detailRes.data.friend.nickname || '');
      }).catch(console.error);

      emit('join_conversation', id);
      emit('mark_delivered');
      markAsRead('friend', id, 'expenses');
      markAsRead('friend', id, 'payments');
    }
    return () => {
      if (id && isConnected) emit('leave_conversation', id);
    };
  }, [id, emit, isConnected]);

  useEffect(() => {
    if (isChatOpen && id) {
      markAsRead('friend', id, 'chat');
      emit('mark_read', id);
    }
  }, [isChatOpen, id]);

  useEffect(() => {
    const unsub1 = on('new_message', (msg) => {
      const incoming = msg as ChatMessage;
      setChat(prev => {
        if (prev.some(m => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
      if (isChatOpenRef.current && incoming.sender_id === id) {
        emit('mark_read', id);
      }
    });
    const unsub2 = on('user_typing', () => setIsTyping(true));
    const unsub3 = on('user_stop_typing', () => setIsTyping(false));
    const unsub10 = on('user_presence_change', (data: any) => {
      if (data.userId === id) {
        setPresence({ online: data.online, lastSeen: data.lastSeen });
      }
    });
    
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
    const unsub11 = on('message_reaction_update', (data: any) => {
      setChat(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
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
      if (unsub10) unsub10();
      if (unsub11) unsub11();
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
    }, 3000);
  };

  const handleReactDM = (messageId: string, emoji: string) => {
    setChat(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = [...(m.reactions || [])];
        const existing = reactions.find((r: any) => r.emoji === emoji);
        
        if (existing) {
          const hasReacted = existing.users.some((u: any) => u.id === currentUser?.id);
          if (hasReacted) {
             existing.users = existing.users.filter((u: any) => u.id !== currentUser?.id);
             existing.count -= 1;
          } else {
             existing.users.push({ id: currentUser?.id, display_name: currentUser?.displayName || 'You' });
             existing.count += 1;
          }
        } else {
          reactions.push({ emoji, count: 1, users: [{ id: currentUser?.id, display_name: currentUser?.displayName || 'You' }] });
        }
        return { ...m, reactions: reactions.filter((r: any) => r.count > 0) };
      }
      return m;
    }));

    emit('react_message', { messageId, messageType: 'dm', emoji, friendId: id });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emit('stop_typing', id);

    if (editingMessageId) {
      const trimmed = msgInput.trim();
      setChat(prev => prev.map(m =>
        m.id === editingMessageId ? { ...m, content: trimmed, is_edited: true } : m
      ));
      emit('edit_message', { messageId: editingMessageId, friendId: id, content: trimmed });
      setEditingMessageId(null);
      setMsgInput('');
    } else {
      try {
        const trimmed = msgInput.trim();
        setMsgInput('');
        const response = await apiClient.post(`/chat/${id}`, { content: trimmed, replyToId: replyingTo?.id });
        setChat(prev => {
          if (prev.some(m => m.id === response.data.id)) return prev;
          return [...prev, response.data as ChatMessage];
        });
        setReplyingTo(null);
      } catch {
        toast.error('Failed to send message');
      }
    }
  };

  const handleVoiceSend = async (blob: Blob) => {
    setIsRecording(false);
    try {
      const formData = new FormData();
      formData.append('voice', blob, 'voice.webm');
      const response = await apiClient.post('/upload/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const attachmentUrl = response.data.url;
      const attachmentType = response.data.type;
      
      const chatResponse = await apiClient.post(`/chat/${id}`, { content: '', replyToId: replyingTo?.id, attachmentUrl, attachmentType });
      setChat(prev => {
        if (prev.some(m => m.id === chatResponse.data.id)) return prev;
        return [...prev, chatResponse.data as ChatMessage];
      });
      setReplyingTo(null);
    } catch {
      toast.error('Failed to send voice note');
    }
  };

  const startReply = (msg: any) => {
    setReplyingTo({ id: msg.id, content: msg.content, senderName: msg.sender_name || 'Them' });
    setActiveMenuId(null);
    setEditingMessageId(null);
  };

  const cancelReply = () => setReplyingTo(null);

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
          setChat(prev => prev.map(m =>
            m.id === msgId ? { ...m, content: '', is_deleted_for_everyone: true } : m
          ));
          emit('delete_message', { messageId: msgId, friendId: id, forEveryone: true });
        } else {
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
        const previousDetail = detail;
        setDetail(prev => {
          if (!prev) return prev;
          const expenseToSettle = prev.expenses.find((e: any) => e.id === expenseId);
          if (!expenseToSettle) return prev;

          // Rough calculation for optimistic balance:
          // If we owe them, netBalance is negative. Settling it moves it closer to 0.
          // In SplitLedger, balance logic can be complex (shares/splits), but for immediate UX, we can just subtract the total expense amount or leave netBalance unchanged and wait for refresh. Let's just adjust netBalance using a rough estimation.
          // Wait, the easiest way to give feedback is to just update the `is_settled` status immediately and let refreshData handle the precise balance.
          return {
            ...prev,
            expenses: prev.expenses.map((e: any) => e.id === expenseId ? { ...e, is_settled: true } : e)
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

  const handleNudgeOverall = async () => {
    if (!detail || detail.balance.netBalance <= 0) return;
    try {
      await apiClient.post(`/friends/${id}/nudge`, { amount: detail.balance.netBalance });
      toast.success('Reminder sent!');
    } catch {
      toast.error('Failed to send reminder');
    }
  };

  const filteredExpenses = detail?.expenses?.filter((e: any) => expenseTab === 'settled' ? e.is_settled : !e.is_settled) || [];

  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault();
    handleSettleAll();
  }, { enableOnFormTags: false }, [detail]);

  useHotkeys('j', () => {
    setFocusedExpenseIndex(prev => prev < filteredExpenses.length - 1 ? prev + 1 : prev);
  }, { enableOnFormTags: false }, [filteredExpenses.length]);

  useHotkeys('k', () => {
    setFocusedExpenseIndex(prev => prev > 0 ? prev - 1 : prev === -1 && filteredExpenses.length > 0 ? 0 : prev);
  }, { enableOnFormTags: false }, [filteredExpenses.length]);

  useHotkeys('r', () => {
    if (hoveredMessageId) {
      const msg = chat.find((m: any) => m.id === hoveredMessageId);
      if (msg) startReply(msg);
    }
  }, { enableOnFormTags: false }, [hoveredMessageId, chat]);

  useHotkeys('e', () => {
    if (hoveredMessageId) {
      const msg = chat.find((m: any) => m.id === hoveredMessageId);
      if (msg && msg.sender_id === currentUser?.id) {
        startEdit(msg);
        setReplyingTo(null);
      }
    }
  }, { enableOnFormTags: false }, [hoveredMessageId, chat, currentUser]);

  const formatLastSeen = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

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
        <div className="flex flex-col md:flex-row gap-6 w-full h-full">
          <div className="flex-1 flex flex-col gap-4 border-r border-white/5 pr-6">
            <Skeleton className="w-32 h-6 rounded-md mb-2" />
            <ExpenseRowSkeleton />
            <ExpenseRowSkeleton />
            <ExpenseRowSkeleton />
            <ExpenseRowSkeleton />
          </div>
          <div className="flex-1 flex flex-col gap-4 pl-2 justify-end pb-8">
             <ChatMessageSkeleton />
             <ChatMessageSkeleton isOwn />
             <ChatMessageSkeleton />
             <ChatMessageSkeleton isOwn />
          </div>
        </div>
      </div>
    );
  }

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
                     <div className="relative">
                       {detail.friend.avatar_url ? (
                         <LazyImage src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${detail.friend.avatar_url}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                       ) : (
                         <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm">
                           {detail.friend.display_name.charAt(0).toUpperCase()}
                         </div>
                       )}
                       {presence.online && (
                         <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-[#0c0c0e] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                       )}
                     </div>
                     {detail.friend.nickname || detail.friend.display_name}
                     <button onClick={() => setIsEditingNickname(true)} className="p-1 hover:bg-white/10 rounded transition-colors">
                       <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                     </button>
                   </h2>
                 )}
               </div>
               
               <div className="flex items-center gap-3">
                 <span className="text-[11px] text-zinc-500 font-medium">
                   {presence.online ? 'Online' : `Last seen ${formatLastSeen(presence.lastSeen)}`}
                 </span>
                 
                 {detail.friend.nickname && (
                   <span className="text-[11px] text-zinc-500 font-medium ml-2 border-l border-white/10 pl-2">{detail.friend.display_name}</span>
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
            <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#0c0c0e]/90 backdrop-blur-md z-10 py-2">
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
              
              {filteredExpenses.length === 0 ? (
                 <EmptyState
                   variant="expenses"
                   headline={expenseTab === 'settled' ? 'No settled expenses' : 'No shared expenses yet'}
                   subtext={expenseTab === 'settled' ? 'Expenses you settle with this friend will appear here.' : 'Add your first expense together to start tracking balances.'}
                   ctaLabel={expenseTab !== 'settled' ? 'Add First Expense' : undefined}
                   onCta={expenseTab !== 'settled' ? () => setExpenseModalOpen(true) : undefined}
                   compact
                 />
              ) : (
                 <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                   {virtualizer.getVirtualItems().map((virtualRow) => {
                     const e = filteredExpenses[virtualRow.index];
                     const idx = virtualRow.index;
                     return (
                       <div
                         key={virtualRow.key}
                         data-index={virtualRow.index}
                         ref={virtualizer.measureElement}
                         style={{
                           position: 'absolute',
                           top: 0,
                           left: 0,
                           width: '100%',
                           transform: `translateY(${virtualRow.start}px)`,
                           paddingBottom: '12px'
                         }}
                       >
                         <motion.div 
                           drag="x"
                           dragConstraints={{ left: 0, right: 0 }}
                           dragElastic={{ left: 0.2, right: 0 }}
                           onDragEnd={(_event, { offset }) => {
                             if (offset.x < -80 && !e.is_settled) {
                               handleSettleSpecificExpense(e.id, e.description);
                             }
                           }}
                           className={`p-4 rounded-xl border ${e.is_settled ? 'border-emerald-500/20' : 'border-rose-500/20'} ${idx === focusedExpenseIndex ? 'ring-2 ring-amber-500 bg-white/[0.06]' : 'bg-white/[0.02] hover:bg-white/[0.04]'} transition-all group relative overflow-hidden`}
                         >
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
                         </motion.div>
                       </div>
                     );
                   })}
                 </div>
              )}
            </div>
          </div>

         {/* RIGHT: Real-Time Chat */}
         {isChatOpen && (
           <div className="w-full md:w-1/2 absolute right-0 top-0 bottom-0 bg-black/90 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col z-40">
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
                  <>
                    {chat.length > visibleLimit && (
                      <div ref={topObserverRef} className="w-full py-4 flex justify-center">
                        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                      </div>
                    )}
                    {visibleChat.map((msg: any) => {
                      const isMe = msg.sender_id === currentUser?.id;
                      const isDeleted = msg.is_deleted_for_everyone;
                      
                      return (
                        <div 
                          id={`msg-${msg.id}`} 
                          key={msg.id} 
                          onMouseEnter={() => setHoveredMessageId(msg.id)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                          className={`flex flex-col relative ${isMe ? 'items-end' : 'items-start'} group/msg transition-all duration-300 ${hoveredMessageId === msg.id ? 'ring-1 ring-white/10 rounded-2xl p-1' : ''}`}
                        >
                          <motion.div 
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={{ right: 0.2, left: 0 }}
                            onDragEnd={(_e, { offset }) => {
                              if (offset.x > 50 && !isDeleted) {
                                startReply(msg);
                              }
                            }}
                            className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-[14px] flex flex-col relative ${isDeleted ? 'bg-white/5 border border-white/10 text-zinc-500 italic' : isMe ? 'bg-amber-500 text-black rounded-br-sm font-medium shadow-md shadow-amber-500/10' : 'bg-white/10 text-white rounded-bl-sm border border-white/10'}`}
                          >
                            
                            {!isDeleted && msg.reply_to_content && (
                              <ReplyQuote
                                senderName={msg.reply_to_sender_name || 'Unknown'}
                                content={msg.reply_to_content}
                                messageId={msg.reply_to_id}
                                compact
                              />
                            )}       
                          {isDeleted ? (
                              <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5 opacity-50" /> This message was deleted</span>
                          ) : (
                              <div className="flex flex-col">
                                {msg.attachment_type === 'voice' && msg.attachment_url ? (
                                  <VoiceMessage url={msg.attachment_url} />
                                ) : (
                                  <span>{msg.content}</span>
                                )}
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

                          {!isDeleted && msg.link_preview && msg.link_preview.url && (
                            <div className="mt-1 w-full max-w-sm">
                              <LinkPreview preview={msg.link_preview} />
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
                              {isMe && <button onClick={() => startEdit(msg)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2"><Edit2 className="w-3.5 h-3.5" /> Edit</button>}
                              <button onClick={() => startReply(msg)} className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-white/10 flex items-center gap-2"><CornerUpLeft className="w-3.5 h-3.5" /> Reply</button>
                              <button onClick={() => deleteMessage(msg.id, false)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete for me</button>
                              <button onClick={() => deleteMessage(msg.id, true)} className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-white/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete for everyone</button>
                            </div>
                          )}
                          </motion.div>
                          {!isDeleted && (
                            <MessageReactions
                              messageId={msg.id}
                              messageType="dm"
                              reactions={msg.reactions || []}
                              currentUserId={currentUser?.id || ''}
                              onReact={handleReactDM}
                              isMe={isMe}
                            />
                          )}
                        </div>
                      );
                    })}
                  </>
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
               {replyingTo && (
                 <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                   <CornerUpLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                   <div className="flex-1 min-w-0">
                     <span className="text-[10px] font-bold text-amber-400">{replyingTo.senderName}</span>
                     <p className="text-[11px] text-zinc-400 truncate">{replyingTo.content}</p>
                   </div>
                   <button onClick={cancelReply} className="p-1 text-zinc-500 hover:text-white transition-colors">
                     <X className="w-3.5 h-3.5" />
                   </button>
                 </div>
               )}
               {isRecording ? (
                 <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setIsRecording(false)} />
               ) : (
                 <form onSubmit={handleSend} className="relative flex items-center w-full">
                   <input
                     type="text"
                     value={msgInput}
                     onChange={e => handleInput(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-24 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors shadow-inner"
                     placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
                   />
                   <div className="absolute right-2 flex items-center gap-1">
                     {!editingMessageId && !msgInput.trim() && (
                       <button type="button" onClick={() => setIsRecording(true)} className="p-1.5 text-zinc-400 hover:text-white rounded-full transition-colors">
                         <Mic className="w-4 h-4" />
                       </button>
                     )}
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
               )}
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
        onOptimisticSubmit={(newExpense) => {
          setDetail(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              expenses: [newExpense, ...prev.expenses]
            };
          });
        }}
        onRevert={(tempId) => {
          setDetail(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              expenses: prev.expenses.filter((e: any) => e.id !== tempId)
            };
          });
        }}
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
