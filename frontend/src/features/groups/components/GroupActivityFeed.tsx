import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../../../shared/api/axios';
import { EmptyState } from '../../../shared/components/EmptyState';
import { formatDistanceToNow } from 'date-fns';
import {
  Receipt, UserPlus, UserMinus, CheckCircle, Archive,
  PencilLine, Trash2, Loader2, RefreshCw
} from 'lucide-react';

interface ActivityItem {
  id: string;
  group_id: string;
  actor_id: string;
  actor_name: string;
  actor_avatar?: string;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
}

interface Props {
  groupId: string;
  /** Socket-pushed activity items are injected from the parent */
  liveItems?: ActivityItem[];
}

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: (p: Record<string, any>, actor: string) => string }> = {
  expense_added:    { icon: Receipt,     color: 'text-indigo-400 bg-indigo-500/10',   label: (p, a) => `${a} added "${p.description}" · ₹${Number(p.amount).toLocaleString('en-IN')}` },
  expense_edited:   { icon: PencilLine,  color: 'text-amber-400 bg-amber-500/10',     label: (p, a) => `${a} edited "${p.description}"` },
  expense_deleted:  { icon: Trash2,      color: 'text-rose-400 bg-rose-500/10',       label: (p, a) => `${a} deleted "${p.description}"` },
  member_joined:    { icon: UserPlus,    color: 'text-emerald-400 bg-emerald-500/10', label: (_, a) => `${a} joined the group` },
  member_left:      { icon: UserMinus,   color: 'text-zinc-400 bg-zinc-500/10',       label: (_, a) => `${a} left the group` },
  member_approved:  { icon: UserPlus,    color: 'text-emerald-400 bg-emerald-500/10', label: (_, a) => `${a} was approved` },
  member_role_changed: { icon: UserPlus, color: 'text-blue-400 bg-blue-500/10',       label: (p, a) => `${a} was changed to ${p.new_role}` },
  settled:          { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/10', label: (p, a) => `${a} settled ₹${Number(p.amount).toLocaleString('en-IN')}` },
  group_archived:   { icon: Archive,     color: 'text-zinc-400 bg-zinc-500/10',       label: (_, a) => `${a} archived the group` },
  group_updated:    { icon: PencilLine,  color: 'text-blue-400 bg-blue-500/10',       label: (_, a) => `${a} updated group settings` },
};

const Avatar = ({ name, url }: { name: string; url?: string }) => {
  if (url) return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover" />;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300 shrink-0">
      {initials}
    </div>
  );
};

export const GroupActivityFeed = ({ groupId, liveItems = [] }: Props) => {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const seenIds = useRef(new Set<string>());

  const dedupe = (arr: ActivityItem[]) =>
    arr.filter(item => {
      if (seenIds.current.has(item.id)) return false;
      seenIds.current.add(item.id);
      return true;
    });

  const loadPage = useCallback(async (cursorParam?: string) => {
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (cursorParam) params.set('cursor', cursorParam);
      const res = await apiClient.get(`/groups/${groupId}/activity?${params}`);
      const { activities, nextCursor } = res.data;
      const fresh = dedupe(activities);
      setItems(prev => cursorParam ? [...prev, ...fresh] : fresh);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch (err) {
      console.error('[GroupActivityFeed] load error:', err);
    }
  }, [groupId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadPage().finally(() => setLoading(false));
  }, [groupId]);

  // Merge live socket items at the top
  useEffect(() => {
    if (!liveItems.length) return;
    const fresh = liveItems.filter(i => !seenIds.current.has(i.id));
    if (!fresh.length) return;
    fresh.forEach(i => seenIds.current.add(i.id));
    setItems(prev => [...fresh, ...prev]);
  }, [liveItems]);

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    await loadPage(cursor);
    setLoadingMore(false);
  };

  const handleRefresh = async () => {
    seenIds.current.clear();
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setLoading(true);
    await loadPage();
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Recent Activity</p>
        <button
          onClick={handleRefresh}
          className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          variant="generic"
          headline="No activity yet"
          subtext="Actions like adding expenses, settling up, or adding members will appear here."
          compact
        />
      ) : (
        <div className="space-y-1">
          {items.map(item => {
            const cfg = EVENT_CONFIG[item.event_type] ?? {
              icon: Receipt,
              color: 'text-zinc-400 bg-zinc-500/10',
              label: (_: any, a: string) => `${a} performed ${item.event_type}`
            };
            const Icon = cfg.icon;
            const [iconColor, iconBg] = cfg.color.split(' ');

            return (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
                {/* Avatar */}
                <Avatar name={item.actor_name} url={item.actor_avatar} />

                {/* Icon badge */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                  <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-zinc-300 leading-snug">
                    {cfg.label(item.payload, item.actor_name)}
                  </p>
                  {item.payload?.subcategory && (
                    <span className="text-[10px] text-indigo-400 font-medium bg-indigo-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {item.payload.subcategory}
                    </span>
                  )}
                  <p className="text-[11px] text-zinc-600 mt-0.5 font-medium">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-3 text-xs font-medium text-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {loadingMore ? 'Loading...' : 'Load older activity'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
