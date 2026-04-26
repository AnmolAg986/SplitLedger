import React, { useState, useEffect } from 'react';
import { Loader2, PieChart as PieChartIcon, TrendingUp, Users, Clock, Activity, BarChart2, Download, FileText } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';
import { toast } from '../../../shared/store/useToastStore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';

export const GroupAnalytics: React.FC<{ groupId: string }> = ({ groupId }) => {
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [data, setData] = useState<any>(null);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      if (format === 'csv') setExportingCsv(true);
      else setExportingPdf(true);

      const res = await apiClient.get(`/analytics/group/${groupId}/export?format=${format}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `group_expenses.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${format.toUpperCase()} downloaded successfully!`);
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      if (format === 'csv') setExportingCsv(false);
      else setExportingPdf(false);
    }
  };

  useEffect(() => {
    apiClient.get(`/analytics/group/${groupId}`)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        toast.error('Failed to load group analytics');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data) return null;

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444'];

  // Prepare monthly spend keys for stacked bar
  const members = new Set<string>();
  data.monthlySpend.forEach((m: any) => {
    Object.keys(m).forEach(k => {
      if (k !== 'month') members.add(k);
    });
  });
  const memberKeys = Array.from(members);

  return (
    <div className="w-full h-full animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Group Analytics</h2>
            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Financial Insights & Trends</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleExport('csv')}
            disabled={exportingCsv || exportingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            {exportingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            CSV
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            disabled={exportingCsv || exportingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Settlement Velocity</h3>
            <p className="text-2xl font-black text-white">{data.settlementVelocityDays} days</p>
            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Average time to settle up</p>
          </div>
        </div>

        <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Cumulative Spend</h3>
            <p className="text-2xl font-black text-white">
              ₹{data.balanceHistory.length > 0 ? data.balanceHistory[data.balanceHistory.length - 1].total.toLocaleString() : 0}
            </p>
            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">All-time group expenses</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" /> Monthly Spend by Member
          </h3>
          <div className="h-[300px] w-full">
            {data.monthlySpend.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlySpend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="month" stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 11 }} tickMargin={10} axisLine={false} />
                  <YAxis stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => `₹${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any, name: any) => [`₹${value}`, name]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  {memberKeys.map((key, idx) => (
                    <Bar key={key} dataKey={key} stackId="a" fill={COLORS[idx % COLORS.length]} radius={idx === memberKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-pink-400" /> Category Distribution
          </h3>
          <div className="h-[300px] w-full flex flex-col justify-center">
            {data.categoryDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.categoryDistribution.map((_entry: any, index: number) => (
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

        <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" /> Member Contribution Ratio
          </h3>
          <div className="h-[300px] w-full">
            {data.contributionRatio.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.contributionRatio} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip 
                    cursor={{ fill: '#ffffff05' }}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any) => [`₹${value}`, 'Paid Upfront']}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24}>
                    {data.contributionRatio.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Cumulative Spend Over Time
          </h3>
          <div className="h-[300px] w-full">
            {data.balanceHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.balanceHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="date" stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 11 }} tickMargin={10} axisLine={false} />
                  <YAxis stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => `₹${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any) => [`₹${value}`, 'Cumulative Spend']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHistory)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
