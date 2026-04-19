import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BellRing, Sparkles, Calendar, Zap, Users, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  
  const allWidgets: WidgetProps[] = useMemo(() => {
    const list: WidgetProps[] = [];

    // 1. TOP BALANCES (Necessary -> Priority 8)
    if (data.topOwe?.length > 0) {
      list.push({
        id: 'top-balances',
        title: 'Top Balances',
        icon: <Users className="w-4 h-4 text-emerald-400" />,
        content: (
          <div className="space-y-3 mt-4 w-full">
            {data.topOwe.slice(0, 4).map((p: any) => (
              <div key={p.user_id} className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                <span className="text-sm font-medium text-white/90 truncate mr-4">{p.display_name}</span>
                <span className="text-sm font-bold text-white whitespace-nowrap">₹{p.amount}</span>
              </div>
            ))}
          </div>
        ),
        priority: 8,
        colSpan: 2, // Always full width
        onClick: () => navigate('/friends')
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
            <div className="mt-3 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold w-fit border border-cyan-500/20">
              Send Alert →
            </div>
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

    // 7. FOCUS CARD (Priority 0)
    if (data.focusInsight) {
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

    return list;
  }, [data, navigate]);

  const displayedWidgets = useMemo(() => {
    // Separate priorities vs shuffles
    const priorities = allWidgets.filter(w => w.priority > 0).sort((a, b) => b.priority - a.priority);
    const nonPriorities = allWidgets.filter(w => w.priority === 0);
    
    // Shuffle nonPriorities predictably
    const shuffledNonPriorities = nonPriorities.sort((a, b) => Math.random() - 0.5);

    // Combine and limit exactly to maximum 5 insights
    const combined = [...priorities, ...shuffledNonPriorities].slice(0, 5);

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
    }));
  }, [allWidgets]);

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

