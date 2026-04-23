import React, { useState } from 'react';

export interface ReactionSummary {
  emoji: string;
  count: number;
  users: { id: string; display_name: string }[];
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀'];

interface MessageReactionsProps {
  messageId: string;
  messageType: 'dm' | 'group';
  reactions: ReactionSummary[];
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  isMe?: boolean;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUserId,
  onReact,
  isMe = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  if (!reactions) reactions = [];

  return (
    <div className={`relative flex flex-wrap items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {/* Reaction pills */}
      {reactions.map(r => {
        const reacted = r.users.some(u => u.id === currentUserId);
        const names = r.users.map(u => u.display_name).join(', ');
        return (
          <div key={r.emoji} className="relative group/pill">
            <button
              onClick={() => onReact(messageId, r.emoji)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                reacted
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-white'
                  : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
              }`}
            >
              <span>{r.emoji}</span>
              <span className="text-[11px]">{r.count}</span>
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover/pill:block z-50 pointer-events-none">
              <div className="bg-zinc-900 border border-white/10 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap max-w-[200px] text-center">
                <span className="text-zinc-400">{names}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(p => !p)}
          className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-zinc-500 hover:text-white hover:bg-white/10 transition-all text-xs flex items-center justify-center opacity-0 group-hover/msg:opacity-100"
        >
          +
        </button>
        {showPicker && (
          <div
            className={`absolute bottom-8 z-50 bg-[#141416] border border-white/10 rounded-2xl shadow-2xl p-2 flex gap-1 ${
              isMe ? 'right-0' : 'left-0'
            }`}
            onMouseLeave={() => setShowPicker(false)}
          >
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { onReact(messageId, emoji); setShowPicker(false); }}
                className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors text-lg flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
