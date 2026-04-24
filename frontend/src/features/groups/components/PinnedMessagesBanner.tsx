import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../shared/api/axios';
import { Pin, ChevronDown, ChevronUp, X, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PinnedMessage {
  id: string;
  content: string;
  sender_name: string;
  pinned_by_name: string;
  pinned_at: string;
  created_at: string;
}

interface Props {
  groupId: string;
  /** Whether current user has admin/owner role (can unpin) */
  canPin: boolean;
  /** Injected in real-time from GroupChat socket listener */
  livePin?: PinnedMessage | null;
  liveUnpinId?: string | null;
  onUnpin?: (messageId: string) => void;
}

export const PinnedMessagesBanner = ({ groupId, canPin, livePin, liveUnpinId, onUnpin }: Props) => {
  const [pinned, setPinned] = useState<PinnedMessage[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(`/groups/${groupId}/pinned-messages`);
      setPinned(res.data);
    } catch (err) {
      console.error('[PinnedMessagesBanner] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Merge live socket pushes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!livePin) return;
    setPinned(prev => {
      if (prev.some(p => p.id === livePin.id)) return prev;
      return [livePin, ...prev];
    });
  }, [livePin]);

  useEffect(() => {
    if (!liveUnpinId) return;
    setPinned(prev => prev.filter(p => p.id !== liveUnpinId));
  }, [liveUnpinId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleUnpin = async (messageId: string) => {
    try {
      await apiClient.delete(`/groups/${groupId}/messages/${messageId}/pin`);
      setPinned(prev => prev.filter(p => p.id !== messageId));
      onUnpin?.(messageId);
    } catch (err) {
      console.error('[PinnedMessagesBanner] unpin error:', err);
    }
  };

  if (loading || pinned.length === 0) return null;

  // Show only the most recent pin in collapsed state
  const primary = pinned[0];
  const extraCount = pinned.length - 1;

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-500/10 transition-colors text-left group"
      >
        <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center shrink-0">
          <Megaphone className="w-3.5 h-3.5 text-amber-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-amber-300/90 truncate leading-snug">
            {primary.content}
          </p>
          <p className="text-[10px] text-amber-500/70 font-medium">
            Pinned by {primary.pinned_by_name}
            {extraCount > 0 && <span className="ml-2 text-amber-400 font-bold">+{extraCount} more</span>}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-amber-500">
          <Pin className="w-3 h-3" />
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-amber-500/70" />
            : <ChevronDown className="w-3.5 h-3.5 text-amber-500/70" />}
        </div>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {pinned.map((msg, i) => (
            <div
              key={msg.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 group/pin"
            >
              {/* Number badge */}
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-zinc-200 leading-snug">{msg.content}</p>
                <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                  {msg.sender_name} ·{' '}
                  <span className="text-amber-500/70">
                    pinned {formatDistanceToNow(new Date(msg.pinned_at), { addSuffix: true })}
                  </span>
                  {' '}by {msg.pinned_by_name}
                </p>
              </div>

              {/* Unpin button (admins only) */}
              {canPin && (
                <button
                  onClick={() => handleUnpin(msg.id)}
                  title="Unpin"
                  className="opacity-0 group-hover/pin:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
