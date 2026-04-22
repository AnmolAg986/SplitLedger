import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X, Check, CheckCheck, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useSocket } from '../../../shared/hooks/useSocket';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { apiClient } from '../../../shared/api/axios';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';
import { toast } from '../../../shared/store/useToastStore';
import { useUnreadStore } from '../../../shared/store/useUnreadStore';

interface GroupChatProps {
  groupId: string;
  members: { id: string; display_name: string }[];
}

export const GroupChat: React.FC<GroupChatProps> = ({ groupId, members }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { emit, on } = useSocket();
  const currentUser = useAuthStore(s => s.user);
  const { getSectionCount, markAsRead } = useUnreadStore();
  
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

  useEffect(() => {
    if (isOpen) {
      emit('join_group_room', groupId);
      emit('mark_group_delivered', groupId);
      markAsRead('group', groupId, 'chat');
      
      apiClient.get(`/chat/group/${groupId}`).then(res => {
        setChat(res.data);
      }).catch(console.error);
    } else {
      emit('leave_group_room', groupId);
    }
    return () => emit('leave_group_room', groupId);
  }, [isOpen, groupId, emit]);

  useEffect(() => {
    if (!isOpen) return;
    
    const unsub1 = on('new_group_message', (msg: any) => {
      setChat(prev => {
        // Replace the optimistic temp message sent by the current user,
        // or deduplicate if the real message is already present.
        const tempIdx = prev.findIndex(
          m => typeof m.id === 'string' && m.id.startsWith('temp_') &&
               m.sender_id === msg.sender_id && m.content === msg.content
        );
        if (tempIdx >= 0) {
          // Swap the temp placeholder for the real server message
          const updated = [...prev];
          updated[tempIdx] = msg;
          return updated;
        }
        if (prev.some(m => m.id === msg.id)) return prev; // already present
        return [...prev, msg];
      });
      emit('mark_group_read', groupId);
    });
    const unsub2 = on('group_user_typing', () => setIsTyping(true));
    const unsub3 = on('group_user_stop_typing', () => setIsTyping(false));
    // Merge (not replace) so fields present only in local state (e.g. sender_name)
    // are preserved after the server confirms the edit.
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
          // Create a new array — never mutate the existing array in React state
          const dt = [...(m.delivered_to || [])];
          if (!dt.includes(data.deliveredTo)) dt.push(data.deliveredTo);
          return { ...m, delivered_to: dt };
        }));
      }
    });
    const unsub8 = on('group_message_read', (data: any) => {
      if (data.groupId === groupId) {
        setChat(prev => prev.map(m => {
          // Create a new array — never mutate the existing array in React state
          const rb = [...(m.read_by || [])];
          if (!rb.includes(data.readBy)) rb.push(data.readBy);
          return { ...m, read_by: rb };
        }));
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
  }, [isOpen, on, emit, groupId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, isTyping]);

  const handleInput = (val: string) => {
    setInput(val);
    emit('group_typing', groupId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emit('group_stop_typing', groupId);
    }, 1500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emit('group_stop_typing', groupId);

    const trimmed = input.trim();

    if (editingMessageId) {
      // Optimistic edit: reflect the change immediately without waiting for server
      setChat(prev => prev.map(m =>
        m.id === editingMessageId ? { ...m, content: trimmed, is_edited: true } : m
      ));
      emit('edit_group_message', { messageId: editingMessageId, groupId, content: trimmed });
      setEditingMessageId(null);
    } else {
      // Optimistic send: create a temp message so the sender sees it instantly.
      // The 'new_group_message' handler replaces it with the real server message.
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
      emit('send_group_message', { groupId, content: trimmed });
    }
    
    setInput('');
  };

  const startEdit = (msg: any) => {
    setEditingMessageId(msg.id);
    setInput(msg.content);
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
          // for the socket round-trip. The server confirms via 'group_message_deleted'.
          setChat(prev => prev.map(m =>
            m.id === msgId ? { ...m, content: '', is_deleted_for_everyone: true } : m
          ));
          emit('delete_group_message', { messageId: msgId, groupId, forEveryone: true });
        } else {
          // Optimistic: remove from local list immediately.
          // The server confirms via 'group_message_deleted_for_me' (no-op if already gone).
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
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 bg-black/40 z-[59]"
        onClick={() => setIsOpen(false)}
      />
      <div className="fixed right-0 top-0 bottom-0 w-1/2 bg-black/90 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col z-[60] overflow-hidden">
        <div className="p-4 border-b border-white/5 flex justify-between items-center shadow-sm z-10 bg-black/50">
          <span className="text-[13px] font-semibold text-zinc-500 uppercase tracking-widest">
            Group Chat
          </span>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
        {chat.length === 0 && (
          <div className="h-full flex flex-col justify-center items-center text-zinc-500">
            <span className="text-2xl mb-3">💬</span>
            <p className="text-sm font-medium">Start the conversation!</p>
          </div>
        )}
        {chat.map(msg => {
          const isMe = msg.sender_id === currentUser?.id;
          const isDeleted = msg.is_deleted_for_everyone;
          
          return (
            <div key={msg.id} className={`flex flex-col relative ${isMe ? 'items-end' : 'items-start'} group/msg`}>
              <div className={`px-4 py-2.5 text-[14px] flex flex-col relative rounded-2xl max-w-[80%] ${isDeleted ? 'bg-white/5 border border-white/10 text-zinc-500 italic' : isMe ? 'bg-indigo-500 text-white rounded-br-sm font-medium shadow-md shadow-indigo-500/10' : 'bg-white/10 text-white rounded-bl-sm border border-white/10'}`}>
                
                {isDeleted ? (
                   <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5 opacity-50" /> This message was deleted</span>
                ) : (
                   <div className="flex flex-col">
                     {!isMe && <span className="block text-[10px] text-zinc-400 mb-0.5">{msg.sender_name}</span>}
                     <span>{msg.content}</span>
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
        })}
        {isTyping && (
           <div className="flex items-center gap-2 mt-2">
             <div className="flex gap-1 animate-pulse">
               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" style={{ animationDelay: '0.2s' }} />
               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" style={{ animationDelay: '0.4s' }} />
             </div>
             <span className="text-xs text-zinc-500 font-medium">Someone is typing...</span>
           </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-sm z-10">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input 
            type="text"
            value={input}
            onChange={e => handleInput(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-14 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors shadow-inner"
            placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
          />
          <div className="absolute right-2 flex items-center gap-1">
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
