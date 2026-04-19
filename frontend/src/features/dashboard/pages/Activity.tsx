import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Receipt } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';

interface ActivityItem {
  id: string;
  description: string;
  amount: number | string;
  paid_by_name: string;
  created_at: string;
  group_name?: string;
}

export const Activity = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      // In a real app, this would be DashboardRepository.getFullActivity
      // For now, we reuse the summary logic if specific activity endpoint isn't fully ready
      const res = await apiClient.get('/dashboard/summary');
      // We assume the backend might return full recent activity here or we'd have a separate endpoint
      setActivities(res.data.recentActivity || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="mb-10">
        <h1 className="text-3xl font-display font-bold text-white mb-2">Activity History</h1>
        <p className="text-zinc-400">Keep track of every split, settlement, and reminder.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center text-zinc-500">
          <Clock className="w-12 h-12 mb-4 opacity-20" />
          <p>No recent activity found.</p>
        </div>
      ) : (
        <div className="max-w-3xl space-y-3">
          {activities.map((act) => (
            <div 
              key={act.id} 
              className="bg-[#141416] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-white font-bold truncate">{act.description}</h4>
                  <span className="text-emerald-400 font-bold ml-4">
                    ₹{Number(act.amount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium">
                  <span className="flex items-center gap-1">
                    Paid by <span className="text-zinc-300">{act.paid_by_name}</span>
                  </span>
                  <span>•</span>
                  <span>{fmtDate(act.created_at)}</span>
                  {act.group_name && (
                    <>
                      <span>•</span>
                      <span className="bg-white/5 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">{act.group_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
