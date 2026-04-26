import React from 'react';
import { CornerUpLeft } from 'lucide-react';

interface ReplyQuoteProps {
  senderName: string;
  content: string;
  /** If provided, clicking scrolls to that message */
  messageId?: string;
  /** Compact: inside the message bubble */
  compact?: boolean;
}

export const ReplyQuote: React.FC<ReplyQuoteProps> = ({ senderName, content, messageId, compact = false }) => {
  const scrollTo = () => {
    if (!messageId) return;
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-400/60', 'ring-offset-1');
      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400/60', 'ring-offset-1'), 1500);
    }
  };

  if (compact) {
    return (
      <button
        onClick={scrollTo}
        className="block w-full text-left mb-1.5 pl-2 border-l-2 border-white/30 hover:border-white/60 transition-colors group"
      >
        <span className="text-[10px] font-bold text-white/60 group-hover:text-white/90 transition-colors block truncate">{senderName}</span>
        <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors block truncate max-w-[200px]">{content}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-white/5 rounded-xl border border-white/10 text-xs">
      <CornerUpLeft className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      <div className="min-w-0">
        <span className="font-bold text-zinc-400 block truncate">{senderName}</span>
        <span className="text-zinc-500 truncate block max-w-[280px]">{content}</span>
      </div>
    </div>
  );
};
