import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BellRing, Sparkles, Calendar, Zap, Users, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../../shared/store/useToastStore';
import { apiClient } from '../../../shared/api/axios';

interface WidgetProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  footer?: string;
  priority: number;
  colSpan?: 1 | 2;
  onClick?: () => void;
  color?: string; // injected later
}

const WIDGET_COLORS = [
  'bg-gradient-to-br from-indigo-500/20 to-violet-600/10 border-indigo-500/20 shadow-indigo-500/5',
  'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 shadow-emerald-500/5',
  'bg-gradient-to-br from-amber-500/20 to-orange-600/10 border-amber-500/20 shadow-amber-500/5',
  'bg-gradient-to-br from-rose-500/20 to-pink-600/10 border-rose-500/20 shadow-rose-500/5',
  'bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border-cyan-500/20 shadow-cyan-500/5',
  'bg-gradient-to-br from-purple-600/20 to-indigo-700/10 border-purple-500/20 shadow-purple-500/5',
  'bg-gradient-to-br from-teal-500/20 to-emerald-600/10 border-teal-500/20 shadow-teal-500/5'
];

export const DashboardWidgets: React.FC<{ data: any }> = ({ data }) => {
  const navigate = useNavigate();
  const [dismissedCards, setDismissedCards] = React.useState<string[]>([]);
  
  const allWidgets: WidgetProps[] = useMemo(() => {
    const list: WidgetProps[] = [];

    // 1. TOP BALANCES (Necessary -> Priority 8)
    const allBalances = [
      ...(data.topOwe || []).map((b: any) => ({ ...b, type: 'owe' })),
      ...(data.topOwed || []).map((b: any) => ({ ...b, type: 'owed' }))
    ].sort((a, b) => b.amount - a.amount);

    if (allBalances.length > 0) {
      list.push({
        id: 'top-balances',
        title: 'Top Balances',
        icon: <Users className="w-4 h-4 text-emerald-400" />,
        content: (
          <div className="space-y-2 mt-4 w-full">
            {allBalances.slice(0, 4).map((p: any, idx: number) => (
              <div key={`${p.user_id}-${p.type}-${idx}`} className="flex justify-between items-center bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white/90 truncate">{p.display_name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${p.type === 'owe' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {p.type === 'owe' ? 'You Owe' : 'Owes You'}
                  </span>
                </div>
                <span className={`text-sm font-bold whitespace-nowrap ${p.type === 'owe' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ₹{p.amount}
                </span>
              </div>
            ))}
          </div>
        ),
        priority: 8,
        colSpan: 2, // Always full width
        onClick: () => navigate('/connections?tab=friends')
      });
    }

    // 2. UPCOMING SPLIT (Priority 10)
    if (data.upcomingDues?.length > 0) {
      list.push({
        id: 'upcoming-split',
        title: 'Upcoming Split',
        icon: <Calendar className="w-4 h-4 text-amber-500" />,
        content: (
          <div className="mt-2 flex flex-col h-full">
            <p className="text-2xl font-bold text-white mb-1">₹{data.upcomingDues[0].amount}</p>
            <p className="text-sm text-zinc-400 font-medium leading-relaxed">{data.upcomingDues[0].description}</p>
          </div>
        ),
        footer: 'Click to settle this expense →',
        priority: 10,
        colSpan: 1,
        onClick: () => {
          if (data.upcomingDues[0].group_id) {
            navigate(`/groups/${data.upcomingDues[0].group_id}`);
          } else {
            navigate(`/friends/${data.upcomingDues[0].user_id}`);
          }
        }
      });
    }

    // 3. REMINDERS (RECEIVED) (Priority 9)
    if (data.receivedReminders?.length > 0) {
      list.push({
        id: 'reminders',
        title: 'Settle Payment',
        icon: <BellRing className="w-4 h-4 text-rose-500" />,
        content: (
          <div className="mt-2">
            <p className="text-[14px] text-white/90 leading-relaxed font-medium">
              <span className="font-bold text-white">{data.receivedReminders[0].friend_name}</span> has requested ₹{data.receivedReminders[0].amount}
            </p>
            {data.receivedReminders.length > 1 && (
              <p className="text-xs text-zinc-400 mt-1">+{data.receivedReminders.length - 1} other requests</p>
            )}
          </div>
        ),
        footer: 'Click to settle now →',
        priority: 9,
        colSpan: 1,
        onClick: () => navigate(`/friends/${data.receivedReminders[0].user_id}`)
      });
    }

    // 4. SMART ALERTS (NUDGES) (Priority 0)
    if (data.smartNudge && data.smartNudge.days_ago >= 7) {
      list.push({
        id: 'smart-alert',
        title: 'Smart Alert',
        icon: <Zap className="w-4 h-4 text-cyan-400" />,
        content: (
          <div className="mt-2">
            <p className="text-[14px] text-white/90 leading-relaxed font-medium">
              <span className="font-bold text-white">{data.smartNudge.display_name}</span> hasn't settled ₹{data.smartNudge.amount} since {data.smartNudge.days_ago} days.
            </p>
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await apiClient.post(`/friends/${data.smartNudge.user_id}/nudge`, { amount: data.smartNudge.amount });
                  toast.success('Reminder sent!');
                  setDismissedCards(prev => [...prev, 'smart-alert']);
                } catch (err) {
                  toast.error('Failed to send reminder');
                }
              }}
              className="mt-3 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-xs font-bold w-fit border border-cyan-500/20 transition-colors"
            >
              Send Alert →
            </button>
          </div>
        ),
        priority: 0,
        colSpan: 1,
        onClick: () => navigate(`/friends/${data.smartNudge.user_id}`)
      });
    }

    // 5. COMPLETION PROGRESS (Priority 0)
    if (typeof data.completionProgress === 'number') {
      list.push({
        id: 'progress',
        title: 'Completion Progress',
        icon: <CheckCircle2 className="w-4 h-4 text-indigo-400" />,
        content: (
          <div className="mt-2">
             <p className="text-[15px] text-white/90 leading-relaxed font-medium">
               You've settled <span className="font-bold text-white text-xl">{data.completionProgress}%</span> of your expenses this month
             </p>
          </div>
        ),
        priority: 0,
        colSpan: 1,
        onClick: () => navigate('/activity')
      });
    }

    // 6. SPENDING TREND (Priority 0)
    if (data.spendingTrend >= 2 && data.spendingTrend <= 5) {
      list.push({
        id: 'spending-trend',
        title: 'Spending Trend',
        icon: <TrendingUp className="w-4 h-4 text-rose-500" />,
        content: (
          <p className="text-[15px] text-white/90 mt-2 font-medium leading-relaxed">
            Your spending today is <span className="text-white font-bold">{Math.round(data.spendingTrend)}× higher</span> than usual
          </p>
        ),
        priority: 0,
        colSpan: 1,
        onClick: () => navigate('/activity')
      });
    } else if (data.spendingTrend > 0 && data.spendingTrend <= 0.5 && data.spendingTrend >= 0.2) {
      const lower = Math.round(1 / data.spendingTrend);
      list.push({
        id: 'spending-trend',
        title: 'Spending Trend',
        icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
        content: (
          <p className="text-[15px] text-white/90 mt-2 font-medium leading-relaxed">
            Your spending today is <span className="text-white font-bold">{lower}× lower</span> than usual
          </p>
        ),
        priority: 0,
        colSpan: 1,
        onClick: () => navigate('/activity')
      });
    }

    // Deduplication Rule: Drop Focus Card if it points to the same group/friend as Upcoming Split
    if (data.focusInsight) {
      const isDuplicate = data.upcomingDues?.some((due: any) => 
        (data.focusInsight.type === 'group' && due.group_id === data.focusInsight.id) ||
        (data.focusInsight.type === 'friend' && due.user_id === data.focusInsight.id)
      );

      if (!isDuplicate) {
        list.push({
          id: 'focus-card',
          title: 'Focus Card',
          icon: <Sparkles className="w-4 h-4 text-purple-400" />,
          content: (
            <div className="mt-2 text-[15px] text-white/90 leading-relaxed font-medium">
               Today's focus: Settle Expenses {data.focusInsight.type === 'group' ? 'in' : 'with'} <span className="font-bold text-white">{data.focusInsight.name}</span>
            </div>
          ),
          priority: 0,
          colSpan: 1,
          onClick: () => navigate(data.focusInsight.type === 'group' ? `/groups/${data.focusInsight.id}` : `/friends/${data.focusInsight.id}`)
        });
      }
    }

    return list;
  }, [data, navigate]);

  const displayedWidgets = useMemo(() => {
    const priorities = allWidgets.filter(w => w.priority > 0).sort((a, b) => b.priority - a.priority);
    const nonPriorities = allWidgets.filter(w => w.priority === 0);
    
    // 12-Hour Shuffle logic
    const now = new Date();
    const isPM = now.getHours() >= 12;
    const currentSeed = `${now.toISOString().split('T')[0]}-${isPM ? 'PM' : 'AM'}`;
    
    const storedSeed = localStorage.getItem('daily_card_seed');
    let picks = JSON.parse(localStorage.getItem('daily_card_picks') || '[]');

    if (storedSeed !== currentSeed || picks.length === 0 || !nonPriorities.every(np => picks.includes(np.id) || !picks.includes(np.id))) {
       // Need a reshuffle or initialization
       const shuffledNonPriorities = nonPriorities.sort(() => Math.random() - 0.5);
       picks = shuffledNonPriorities.map(w => w.id);
       localStorage.setItem('daily_card_seed', currentSeed);
       localStorage.setItem('daily_card_picks', JSON.stringify(picks));
    }

    // Reconstruct shuffled nonPriorities based on stored picks
    const orderedNonPriorities = picks.map((id: string) => nonPriorities.find(w => w.id === id)).filter(Boolean) as WidgetProps[];
    
    // Combine and limit exactly to maximum 5 insights
    const combined = [...priorities, ...orderedNonPriorities].slice(0, 5);

    // Assign dynamic colors
    const colorPalette = [...WIDGET_COLORS];
    let seed = Math.floor(Date.now() / (3 * 60 * 60 * 1000));
    for (let i = colorPalette.length - 1; i > 0; i--) {
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        [colorPalette[i], colorPalette[j]] = [colorPalette[j], colorPalette[i]];
    }

    return combined.map((w, i) => ({
      ...w,
      color: colorPalette[i % colorPalette.length]
    })).filter(w => !dismissedCards.includes(w.id));
  }, [allWidgets, dismissedCards]);

  const N = displayedWidgets.length;
  if (N === 0) return null;

  // Determine grid container classes based on N
  const getGridClass = () => {
    switch (N) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 grid-rows-1 md:grid-rows-2'; // 1st element spans 2 rows
      case 4: return 'grid-cols-1 md:grid-cols-2 grid-rows-1 md:grid-rows-2'; // All equal
      case 5: return 'grid-cols-1 md:grid-cols-4 grid-rows-1 md:grid-rows-2'; // 1st element spans 2 cols, 2 rows
      default: return 'grid-cols-2';
    }
  };

  return (
    <div className={`grid gap-4 w-full mt-4 ${getGridClass()}`}>
      {displayedWidgets.map((w, i) => {
        // Compute item spans based on N and index
        let itemClass = '';
        if (N === 3 && i === 0) itemClass = 'md:col-span-1 md:row-span-2';
        else if (N === 3 && i > 0) itemClass = 'md:col-span-1 md:row-span-1';
        else if (N === 5 && i === 0) itemClass = 'md:col-span-2 md:row-span-2';
        else if (N === 5 && i > 0) itemClass = 'md:col-span-1 md:row-span-1';
        
        // Is it a "wide/large" card visually?
        const isLarge = N === 1 || (N === 3 && i === 0) || (N === 5 && i === 0);

        return (
          <motion.button
            key={w.id}
            whileHover={{ scale: 1.02 }}
            onClick={w.onClick}
            className={`
              relative overflow-hidden rounded-[24px] text-left shadow-xl transition-all border border-white/5 flex flex-col
              ${w.color} ${itemClass}
              ${isLarge ? 'p-6 min-h-[180px]' : 'p-6 min-h-[160px]'}
            `}
          >
            <div className="absolute -right-10 -top-10 opacity-10 blur-[20px] w-40 h-40 bg-white rounded-full transition-transform group-hover:scale-110 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full w-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-xl bg-white/10 shrink-0">{w.icon}</div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/70 truncate">{w.title}</h3>
                </div>
                
                <div className="text-white w-full">
                  {w.content}
                </div>
              </div>

              {w.footer && (
                <div className="mt-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  {w.footer}
                </div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

