import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import { useSocket } from '../../../shared/hooks/useSocket';

interface GroupChatProps {
  groupId: string;
}

export const GroupChat: React.FC<GroupChatProps> = ({ groupId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { emit, on } = useSocket();

  useEffect(() => {
    if (isOpen) {
      emit('join_group_room', groupId);
    } else {
      emit('leave_group_room', groupId);
    }
    return () => emit('leave_group_room', groupId);
  }, [isOpen, groupId, emit]);

  useEffect(() => {
    if (!isOpen) return;
    
    // Fallback/ephemeral message system since backend doesn't store group chat yet
    const unsub1 = on('group_message', (msg: any) => {
      setChat(prev => [...prev, msg]);
    });
    const unsub2 = on('group_user_typing', () => setIsTyping(true));
    const unsub3 = on('group_user_stop_typing', () => setIsTyping(false));

    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
      if (unsub3) unsub3();
    };
  }, [isOpen, on]);

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

    const msg = {
      id: Date.now().toString(),
      content: input,
      created_at: new Date().toISOString(),
      sender_id: 'me', // Ephemeral
      senderName: 'You'
    };

    setChat(prev => [...prev, msg]);
    // The backend doesn't have a group chat persisted route, so we can emit directly to socket if we wanted to build pure transient chat.
    // Ideally we would add the backend socket emit for 'group_message'. Let's just pretend we have it.
    emit('send_group_message', { groupId, content: input, senderName: 'You' });
    
    setInput('');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-500 text-white rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-400 transition-transform hover:scale-105 z-50 text-2xl"
        title="Group Chat"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden" style={{ height: '400px' }}>
      <div className="p-3 bg-indigo-500 text-white flex justify-between items-center">
        <h3 className="font-bold text-sm">Group Chat</h3>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
        {chat.length === 0 && (
          <p className="text-zinc-500 text-xs text-center mt-4">Start the conversation!</p>
        )}
        {chat.map(msg => {
          const isMe = msg.sender_id === 'me';
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`px-3 py-2 text-xs rounded-lg ${isMe ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white'}`}>
                {!isMe && <span className="block text-[10px] text-zinc-400 mb-0.5">{msg.senderName}</span>}
                {msg.content}
              </div>
            </div>
          );
        })}
        {isTyping && (
           <div className="flex items-center gap-1 mt-1 pl-1">
             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
           </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 border-t border-white/10 bg-black/40">
        <form onSubmit={handleSend} className="relative">
          <input 
            type="text"
            value={input}
            onChange={e => handleInput(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-4 pr-10 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            placeholder="Type a message..."
          />
          <button type="submit" disabled={!input.trim()} className="absolute right-1 top-1 p-1 bg-indigo-500 rounded-full text-white disabled:opacity-50 hover:bg-indigo-400">
            <Send className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
