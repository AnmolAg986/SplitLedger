import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChatMessageSkeleton } from '../../../shared/components/Skeleton';
import { Send, MessageSquare, X, Check, CheckCheck, MoreVertical, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useSocket } from '../../../shared/hooks/useSocket';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { apiClient } from '../../../shared/api/axios';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';
import { toast } from '../../../shared/store/useToastStore';
import { useUnreadStore } from '../../../shared/store/useUnreadStore';
import { PollCard } from './PollCard';
import type { PollData } from './PollCard';
import { PinnedMessagesBanner } from './PinnedMessagesBanner';
import { MessageReactions } from '../../../shared/components/MessageReactions';
import { ReplyQuote } from '../../../shared/components/ReplyQuote';
import { LinkPreview } from '../../../shared/components/LinkPreview';
import { VoiceRecorder } from '../../../shared/components/VoiceRecorder';
import { VoiceMessage } from '../../../shared/components/VoiceMessage';
import { CornerUpLeft, Mic } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';

interface GroupChatProps {
  groupId: string;
  members: { id: string; display_name: string }[];
  /** Whether current user can pin (admin/owner) */
  canPin?: boolean;
}

export const GroupChat: React.FC<GroupChatProps> = ({ groupId, members, canPin = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  
  const [visibleLimit, setVisibleLimit] = useState(50);
  const topObserverRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { emit, on, isConnected } = useSocket();
  const currentUser = useAuthStore(s => s.user);
  const { getSectionCount, markAsRead } = useUnreadStore();
  
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [polls, setPolls] = useState<Record<string, PollData>>({});
  const [livePin, setLivePin] = useState<any>(null);
  const [liveUnpinId, setLiveUnpinId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);


  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
  };

  useEffect(() => {
    if (isOpen && isConnected) {
      emit('join_group_room', groupId);
      emit('mark_group_delivered', groupId);
      markAsRead('group', groupId, 'chat');
      
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingChat(true);
      apiClient.get(`/chat/group/${groupId}`).then(res => {
        setChat(res.data);
      }).catch(console.error).finally(() => setLoadingChat(false));
    } else if (!isOpen && isConnected) {
      emit('leave_group_room', groupId);
    }
    return () => {
      if (isConnected) emit('leave_group_room', groupId);
    }
  }, [isOpen, groupId, emit, isConnected]);

  useEffect(() => {
    if (!isOpen || chat.length <= visibleLimit) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleLimit(prev => Math.min(prev + 50, chat.length));
      }
    }, { threshold: 0.1 });

    if (topObserverRef.current) observer.observe(topObserverRef.current);
    return () => observer.disconnect();
  }, [isOpen, chat.length, visibleLimit]);

  const visibleChat = useMemo(() => {
    return chat.slice(Math.max(chat.length - visibleLimit, 0));
  }, [chat, visibleLimit]);

  useEffect(() => {
    if (!isOpen) return;
    
    const unsub1 = on('new_group_message', (msg: any) => {
      setChat(prev => {
        const tempIdx = prev.findIndex(
          m => typeof m.id === 'string' && m.id.startsWith('temp_') &&
               m.sender_id === msg.sender_id && m.content === msg.content
        );
        if (tempIdx >= 0) {
          const updated = [...prev];
          updated[tempIdx] = msg;
          return updated;
        }
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      emit('mark_group_read', groupId);
    });
    const unsub2 = on('group_user_typing', (...args: unknown[]) => {
      const data = args[0] as { userId: string; displayName: string };
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.set(data.userId, data.displayName);
        return next;
      });
    });
    const unsub3 = on('group_user_stop_typing', (...args: unknown[]) => {
      const data = args[0] as { userId: string };
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });
    const unsub4 = on('group_message_edited', (editedMsg: any) => {
      setChat(prev => prev.map(m => m.id === editedMsg.id ? { ...m, ...editedMsg } : m));
    });
    const unsub5 = on('group_message_deleted', (deletedMsg: any) => {
      setChat(prev => prev.map(m => m.id === deletedMsg.id ? { ...m, ...deletedMsg } : m));
    });
    const unsub6 = on('group_message_deleted_for_me', (data: any) => {
      setChat(prev => prev.filter(m => m.id !== data.messageId));
    });
    const unsub7 = on('group_message_delivered', (data: any) => {
      if (data.groupId === groupId) {
        setChat(prev => prev.map(m => {
          const dt = [...(m.delivered_to || [])];
          if (!dt.includes(data.deliveredTo)) dt.push(data.deliveredTo);
          return { ...m, delivered_to: dt };
        }));
      }
    });
    const unsub8 = on('group_message_read', (data: any) => {
      if (data.groupId === groupId) {
        setChat(prev => prev.map(m => {
          const rb = [...(m.read_by || [])];
          if (!rb.includes(data.readBy)) rb.push(data.readBy);
          return { ...m, read_by: rb };
        }));
      }
    });
    const unsub9 = on('error', (err: any) => {
      toast.error(err.message || 'An error occurred');
    });
    const unsub10 = on('poll_created', (...args: unknown[]) => {
      const poll = args[0] as PollData;
      setPolls(prev => ({ ...prev, [poll.id]: poll }));
    });
    const unsub11 = on('poll_updated', (...args: unknown[]) => {
      const update = args[0] as { poll_id: string; vote_counts: Record<string, number>; total_votes: number };
      setPolls(prev => {
        const existing = prev[update.poll_id];
        if (!existing) return prev;
        return { ...prev, [update.poll_id]: { ...existing, vote_counts: update.vote_counts, total_votes: update.total_votes } };
      });
    });
    const unsub12 = on('message_pinned', (...args: unknown[]) => {
      setLivePin(args[0]);
    });
    const unsub13 = on('message_unpinned', (...args: unknown[]) => {
      const data = args[0] as { messageId: string };
      setLiveUnpinId(data.messageId);
    });
    const unsub14 = on('message_reaction_update', (...args: unknown[]) => {
      const data = args[0] as { messageId: string; reactions: any[] };
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
      if (unsub12) unsub12();
      if (unsub13) unsub13();
      if (unsub14) unsub14();
    };
  }, [isOpen, on, emit, groupId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, typingUsers]);

  const handleInput = (val: string) => {
    setInput(val);
    emit('group_typing', groupId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emit('group_stop_typing', groupId);
    }, 3000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emit('group_stop_typing', groupId);

    const trimmed = input.trim();

    if (trimmed.startsWith('/poll ')) {
      const parts = trimmed.slice(6).split('|').map(s => s.trim()).filter(Boolean);
      const question = parts[0];
      const options = parts.slice(1);
      if (!question || options.length < 2) {
        toast.error('Usage: /poll Question? | Option 1 | Option 2');
        setInput('');
        return;
      }
      try {
        await apiClient.post(`/groups/${groupId}/polls`, { question, options });
        toast.success('Poll created!');
      } catch {
        toast.error('Failed to create poll');
      }
      setInput('');
      return;
    }

    if (editingMessageId) {
      setChat(prev => prev.map(m =>
        m.id === editingMessageId ? { ...m, content: trimmed, is_edited: true } : m
      ));
      emit('edit_group_message', { messageId: editingMessageId, groupId, content: trimmed });
      setEditingMessageId(null);
    } else {
      const tempMsg = {
        id: `temp_${Date.now()}`,
        sender_id: currentUser?.id,
        sender_name: currentUser?.displayName || 'You',
        group_id: groupId,
        content: trimmed,
        created_at: new Date().toISOString(),
        is_edited: false,
        is_deleted_for_everyone: false,
        read_by: [currentUser?.id],
        delivered_to: [currentUser?.id],
      };
      setChat(prev => [...prev, tempMsg]);
      emit('send_group_message', { groupId, content: trimmed, replyToId: replyingTo?.id });
    }
    
    setInput('');
    setReplyingTo(null);
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
      
      emit('send_group_message', { groupId, content: '', replyToId: replyingTo?.id, attachmentUrl, attachmentType });
      setReplyingTo(null);
    } catch {
      toast.error('Failed to send voice note');
    }
  };

  const startReply = (msg: any) => {
    setReplyingTo({ id: msg.id, content: msg.content, senderName: msg.sender_name || 'Unknown' });
    setActiveMenuId(null);
    setEditingMessageId(null);
  };

  const cancelReply = () => setReplyingTo(null);

  const startEdit = (msg: any) => {
    setEditingMessageId(msg.id);
    setInput(msg.content);
    setActiveMenuId(null);
  };

  useHotkeys('r', () => {
    if (hoveredMessageId && isOpen) {
      const msg = chat.find((m: any) => m.id === hoveredMessageId);
      if (msg) startReply(msg);
    }
  }, { enableOnFormTags: false }, [hoveredMessageId, chat, isOpen]);

  useHotkeys('e', () => {
    if (hoveredMessageId && isOpen) {
      const msg = chat.find((m: any) => m.id === hoveredMessageId);
      if (msg && msg.sender_id === currentUser?.id) {
        startEdit(msg);
      }
    }
  }, { enableOnFormTags: false }, [hoveredMessageId, chat, currentUser, isOpen]);

  const handleReact = (messageId: string, emoji: string) => {
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

    emit('react_message', { messageId, messageType: 'group', emoji, groupId });
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
          emit('delete_group_message', { messageId: msgId, groupId, forEveryone: true });
        } else {
          setChat(prev => prev.filter(m => m.id !== msgId));
          emit('delete_group_message', { messageId: msgId, groupId, forEveryone: false });
        }
      },
      'danger'
    );
  };

  if (!isOpen) {
    const unreadCount = getSectionCount('group', groupId, 'chat');
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-500 text-white rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-400 transition-transform hover:scale-105 z-50 text-2xl"
        title="Group Chat"
      >
        <MessageSquare className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.5)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[59]"
        onClick={() => setIsOpen(false)}
      />
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-1/2 bg-black/90 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col z-[60] overflow-hidden">
        <div className="p-4 border-b border-white/5 flex justify-between items-center shadow-sm z-10 bg-black/50">
          <span className="text-[13px] font-semibold text-zinc-500 uppercase tracking-widest">
            Group Chat
          </span>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <PinnedMessagesBanner
          groupId={groupId}
          canPin={canPin}
          livePin={livePin}
          liveUnpinId={liveUnpinId}
          onUnpin={id => setLiveUnpinId(id)}
        />

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
        {loadingChat ? (
          <div className="flex flex-col gap-4 w-full h-full justify-end">
            <ChatMessageSkeleton />
            <ChatMessageSkeleton isOwn />
            <ChatMessageSkeleton />
            <ChatMessageSkeleton isOwn />
            <ChatMessageSkeleton isOwn />
          </div>
        ) : chat.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-zinc-500">
            <span className="text-2xl mb-3">💬</span>
            <p className="text-sm font-medium">Start the conversation!</p>
          </div>
        ) : (
          <>
            {chat.length > visibleLimit && (
              <div ref={topObserverRef} className="w-full py-4 flex justify-center">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
            )}
            {visibleChat.map((msg) => {
              const isMe = msg.sender_id === currentUser?.id;
              const isDeleted = msg.is_deleted_for_everyone;

              if (msg.poll_id && polls[msg.poll_id]) {
                return (
                  <div key={msg.id} className="w-full max-w-sm mx-auto">
                    <PollCard
                      poll={polls[msg.poll_id]}
                      onUpdate={updated => setPolls(prev => ({ ...prev, [updated.id]: updated }))}
                    />
                  </div>
                );
              }
              
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
                className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-[14px] flex flex-col relative ${isDeleted ? 'bg-white/5 border border-white/10 text-zinc-500 italic' : isMe ? 'bg-indigo-500 text-white rounded-br-sm shadow-md shadow-indigo-500/20' : 'bg-white/10 text-white rounded-bl-sm border border-white/10'}`}
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
                     {!isMe && <span className="block text-[10px] text-zinc-400 mb-0.5">{msg.sender_name}</span>}
                     {msg.attachment_type === 'voice' && msg.attachment_url ? (
                       <VoiceMessage url={msg.attachment_url} />
                     ) : (
                       <span>{msg.content}</span>
                     )}
                     <div className="flex justify-end items-center gap-1 mt-1 -mb-1 opacity-70">
                       {msg.is_edited && <span className="text-[9px] font-bold tracking-widest uppercase mr-1">Edited</span>}
                       <span className="text-[9px]">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                       {isMe && (
                         <div className="flex items-center relative group/ticks">
                           {(() => {
                             const actualReaders = (msg.read_by || []).filter((id: string) => id !== msg.sender_id);
                             const readerNames = actualReaders.map((id: string) => members.find(m => m.id === id)?.display_name).filter(Boolean);
                             const totalOtherMembers = Math.max(0, members.length - 1);
                             const isReadByAll = actualReaders.length >= totalOtherMembers && totalOtherMembers > 0;
                             const isDeliveredToAny = (msg.delivered_to || []).filter((id: string) => id !== msg.sender_id).length > 0;
                             
                             return (
                               <>
                                 {isReadByAll ? (
                                   <CheckCheck className="w-3 h-3 text-sky-300" />
                                 ) : actualReaders.length > 0 || isDeliveredToAny ? (
                                   <CheckCheck className="w-3 h-3 text-white/50" />
                                 ) : (
                                   <Check className="w-3 h-3 text-white/50" />
                                 )}
                                 
                                 {actualReaders.length > 0 && (
                                   <div className="absolute bottom-full right-0 mb-1 hidden group-hover/ticks:block w-max max-w-[200px] bg-zinc-900 border border-white/10 text-white text-[10px] p-2 rounded-lg shadow-xl z-50">
                                     <span className="font-bold text-zinc-500 uppercase tracking-widest block mb-1 text-[9px]">Read by</span>
                                     <span className="whitespace-normal leading-relaxed">{readerNames.join(', ')}</span>
                                   </div>
                                 )}
                               </>
                             );
                           })()}
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
                  <div className="absolute top-10 -left-36 w-40 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in duration-200">
                    {isMe && <button onClick={() => startEdit(msg)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2"><Edit2 className="w-3.5 h-3.5" /> Edit</button>}
                    <button onClick={() => startReply(msg)} className="w-full text-left px-4 py-2 text-sm text-indigo-400 hover:bg-white/10 flex items-center gap-2"><CornerUpLeft className="w-3.5 h-3.5" /> Reply</button>
                    {canPin && (
                      <button
                        onClick={async () => {
                          setActiveMenuId(null);
                          try {
                            await apiClient.post(`/groups/${groupId}/messages/${msg.id}/pin`);
                          } catch { /* broadcast handles UI */ }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-white/10 flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L12 22M2 12L22 12" strokeLinecap="round"/><circle cx="12" cy="5" r="2" fill="currentColor"/></svg>
                        Pin message
                      </button>
                    )}
                    <button onClick={() => deleteMessage(msg.id, false)} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete for me</button>
                    <button onClick={() => deleteMessage(msg.id, true)} className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-white/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete for everyone</button>
                  </div>
                )}
              </motion.div>
              {!isDeleted && (
                <MessageReactions
                  messageId={msg.id}
                  messageType="group"
                  reactions={msg.reactions || []}
                  currentUserId={currentUser?.id || ''}
                  onReact={handleReact}
                  isMe={isMe}
                />
              )}
            </div>
          );
        })}
        </>
        )}
        {typingUsers.size > 0 && (() => {
          const names = Array.from(typingUsers.values());
          const label = names.length === 1
            ? `${names[0]} is typing…`
            : names.length === 2
              ? `${names[0]} and ${names[1]} are typing…`
              : `${names[0]}, ${names[1]} and ${names.length - 2} more are typing…`;
          return (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
              <span className="text-xs text-zinc-500 font-medium">{label}</span>
            </div>
          );
        })()}
        <div ref={chatEndRef} className="h-2" />
      </div>

      <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-sm z-10">
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <CornerUpLeft className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-indigo-400">{replyingTo.senderName}</span>
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
              value={input}
              onChange={e => handleInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-24 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
              placeholder={editingMessageId ? "Edit message..." : "Type a message or /poll Question? | Opt1 | Opt2"}
            />
            <div className="absolute right-2 flex items-center gap-1">
              {!editingMessageId && !input.trim() && (
                <button type="button" onClick={() => setIsRecording(true)} className="p-1.5 text-zinc-400 hover:text-white rounded-full transition-colors">
                  <Mic className="w-4 h-4" />
                </button>
              )}
              {editingMessageId && (
                <button type="button" onClick={() => { setEditingMessageId(null); setInput(''); }} className="p-1.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button type="submit" disabled={!input.trim()} className="p-1.5 bg-indigo-500 text-white rounded-full disabled:opacity-50 hover:bg-indigo-400 transition-colors">
                <Send className="w-4 h-4 ml-[2px]" />
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </div>
    </>
  );
};
