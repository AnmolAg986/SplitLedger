import { useState, useEffect } from 'react';
import { apiClient } from '../../../shared/api/axios';
import { Activity as ActivityIcon, Loader2, Calendar } from 'lucide-react';

interface ActivityItem {
  description: string;
  amount: number;
  currency: string;
  created_at: string;
  paid_by_name: string;
}

export const Activity = () => {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const { data } = await apiClient.get('/dashboard/activity');
        setActivities(data);
      } catch (err) {
        console.error('Failed to load activity:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount / 100);
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="flex justify-between items-center mb-8 relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/30">
               <ActivityIcon className="w-4 h-4" />
             </div>
             Recent Activity
          </h1>
          <p className="text-sm text-zinc-400">Your chronological timeline of expenses</p>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/5">
            <h3 className="text-xl font-bold text-white mb-2">No activity yet</h3>
            <p className="text-zinc-500 text-sm">Create expenses and they will show up here chronologically.</p>
          </div>
        ) : (
          <div className="flex flex-col relative before:absolute before:inset-0 before:ml-[23px] md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-rose-500/50 before:via-white/10 before:to-transparent">
            {activities.map((act, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
                {/* Icon Marker */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-[#0c0c0e] bg-zinc-800 text-zinc-500 group-hover:text-rose-500 group-hover:bg-zinc-700 transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10">
                  <span className="font-bold text-xs">{act.paid_by_name?.charAt(0).toUpperCase()}</span>
                </div>
                
                {/* Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-lg group-hover:border-rose-500/30 transition-colors backdrop-blur-sm relative cursor-default">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-bold">{act.description}</h4>
                    <span className="font-black text-rose-400">{formatCurrency(act.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar className="w-3 h-3" /> {new Date(act.created_at).toLocaleString()}
                  </div>
                  <div className="mt-3 text-xs font-semibold text-zinc-400 bg-white/5 px-2 py-1 rounded inline-block">
                    Added by <span className="text-zinc-300">{act.paid_by_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
