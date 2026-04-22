import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, PieChart as PieChartIcon, TrendingUp, Users, Target, Activity, DollarSign, Download, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { toast } from '../../../shared/store/useToastStore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';

export const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await apiClient.get('/analytics/personal/export?format=csv', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'personal_expenses.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export downloaded successfully!');
    } catch (err) {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    apiClient.get('/analytics/personal')
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        toast.error('Failed to load analytics');
        console.error(err);
      })
      .finally(() => setLoading(false));

    apiClient.post('/analytics/insights')
      .then(res => {
        setInsights(res.data.insights || []);
      })
      .catch(err => {
        console.error('Failed to load AI insights:', err);
      })
      .finally(() => setLoadingInsights(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!data) return null;

  const COLORS = ['#06b6d4', '#6366f1', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6'];

  const settleRatePercent = data.settleRate.total > 0 
    ? Math.round((data.settleRate.settled / data.settleRate.total) * 100) 
    : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* HEADER */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between z-10 sticky top-0 bg-black/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/profile')} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-500" />
              Personal Analytics
            </h2>
            <span className="text-xs text-zinc-500 font-medium tracking-wide uppercase">Your financial intelligence</span>
          </div>
        </div>
        <button 
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* AI INSIGHTS */}
          <div className="bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/5 border border-indigo-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px]" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">AI Spending Insights</h3>
                <p className="text-[11px] text-zinc-400">Personalized intelligence based on your habits</p>
              </div>
            </div>
            <div className="relative z-10">
              {loadingInsights ? (
                <div className="flex items-center gap-3 text-zinc-400 text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your financial patterns...
                </div>
              ) : insights.length > 0 ? (
                <ul className="space-y-3">
                  {insights.map((insight, idx) => (
                    <li key={idx} className="flex gap-3 items-start p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                      <p className="text-white text-sm leading-relaxed">{insight}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-500 text-sm">Not enough data to generate insights yet.</p>
              )}
            </div>
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Settle Rate</h3>
              </div>
              <p className="text-3xl font-black text-white">{settleRatePercent}%</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1">{data.settleRate.settled} of {data.settleRate.total} expenses settled</p>
            </div>

            <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Avg Expense</h3>
              </div>
              <p className="text-3xl font-black text-white">₹{Math.round(data.averageExpense)}</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1">Per transaction average</p>
            </div>

            <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all" />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Biggest Expense</h3>
              </div>
              <p className="text-3xl font-black text-white">₹{data.biggestExpense ? data.biggestExpense.my_share : 0}</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1 truncate" title={data.biggestExpense?.description}>
                {data.biggestExpense ? data.biggestExpense.description : 'No expenses yet'}
              </p>
            </div>

            <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Longest Streak</h3>
              </div>
              <p className="text-3xl font-black text-white">{data.longestStreak} days</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1">Max interaction streak</p>
            </div>
          </div>

          {/* CHARTS ROW 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><TrendingUp className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">Monthly Spend Trend</h3>
                  <p className="text-[11px] text-zinc-500">Your total expenses over the last 12 months</p>
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                {data.monthlySpend.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthlySpend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="month" stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 11 }} tickMargin={10} axisLine={false} />
                      <YAxis stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => `₹${value}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: any) => [`₹${value}`, 'Total Spend']}
                      />
                      <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><PieChartIcon className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">Category Breakdown</h3>
                  <p className="text-[11px] text-zinc-500">Where your money goes</p>
                </div>
              </div>

              <div className="h-[300px] w-full flex flex-col justify-center relative">
                {data.categoryBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.categoryBreakdown}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.categoryBreakdown.map((_entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                        formatter={(value: any) => [`₹${value}`, 'Amount']}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* CHARTS ROW 2 */}
          <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Users className="w-5 h-5" /></div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Top Expense Partners</h3>
                <p className="text-[11px] text-zinc-500">People you share expenses with the most</p>
              </div>
            </div>

            <div className="h-[300px] w-full">
              {data.topPartners.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topPartners} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                    <XAxis type="number" stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="display_name" type="category" stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip 
                      cursor={{ fill: '#ffffff05' }}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                      formatter={(value: any) => [`₹${value}`, 'Shared Amount']}
                    />
                    <Bar dataKey="amount" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={30}>
                      {data.topPartners.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
