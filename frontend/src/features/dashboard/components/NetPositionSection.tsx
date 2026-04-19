import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Receipt, TrendingUp } from 'lucide-react';

interface NetPositionProps {
  metrics: {
    totalBalance: number;
    totalOwed: number;
    totalOwe: number;
    lastMonthNetBalance: number;
    lastWeekNetBalance: number;
    settledThisMonth?: number;
    lastSettledAt?: string | null;
    bestMonth?: { name: string; amount: number };
    balanceTrend?: { month: string; balance: number }[];
    sevenDayTrend?: { day: string; balance: number }[];
  };
  advanced: {
    pendingSettlementsCount?: number;
    overdueCount: number;
    oldestDebtDays: number;
    totalPendingAmount: number;
    largestPendingAmount?: number;
    pendingFriendsNames?: string[];
    actionRequiredDebts?: { userId: string; name: string; netAmount: number; daysAgo: number }[];
    upcomingDues?: { description: string; due_date: string; amount: number }[];
  };
  onAddExpense?: () => void;
}


export const NetPositionSection: React.FC<NetPositionProps> = ({ metrics, advanced, onAddExpense }) => {
  const navigate = useNavigate();
  
  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);

  const hasHistory = (metrics.settledThisMonth ?? 0) > 0 || !!metrics.lastSettledAt || (metrics.balanceTrend?.some(b => b.balance !== 0) ?? false);
  const hasActiveDues = 
    metrics.totalBalance !== 0 || 
    metrics.totalOwed !== 0 || 
    metrics.totalOwe !== 0 || 
    (advanced.actionRequiredDebts?.length ?? 0) > 0 ||
    (advanced.upcomingDues?.length ?? 0) > 0;
  
  const isScenario1 = !hasHistory && !hasActiveDues;
  const isScenario2 = hasHistory && !hasActiveDues;
  const isScenario3 = hasActiveDues;

  // Render Logic
  return (
    <div className="w-full mb-10">
      <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">
        Net Position
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD 1: FINANCIAL POSITION */}
        <div className="bg-[#141416]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-1 transition-all duration-300">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-16 h-16 rotate-12" />
           </div>
           
           <div className="relative z-10 flex flex-col h-full">
              <p className="text-zinc-400 text-[12px] font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                Financial Position
              </p>

              {isScenario1 ? (
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2 leading-tight">Nothing to show yet</h3>
                  <p className="text-sm text-zinc-500 mb-6">Add friends and log your first expense to see your balance here.</p>
                  <button 
                    onClick={() => navigate('/friends')}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10"
                  >
                    Add a friend <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : isScenario2 ? (
                <div className="flex-1">
                   <h3 className="text-3xl font-bold text-emerald-400 mb-2">All settled</h3>
                   <p className="text-sm text-zinc-500 mb-6">You have no outstanding balances right now.</p>
                   <div className="space-y-3 pt-6 border-t border-white/5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Settled this month</span>
                        <span className="text-emerald-400 font-bold">{fmt(metrics.settledThisMonth || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Last settled</span>
                        <span className="text-white font-bold">{metrics.lastSettledAt ? new Date(metrics.lastSettledAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Never'}</span>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="mb-6">
                    <h3 className={`text-4xl font-display font-bold ${metrics.totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {metrics.totalBalance >= 0 ? '+' : ''}{fmt(metrics.totalBalance)}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-tighter mt-1 opacity-70">Net balance across all friends and groups</p>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">You are owed</p>
                        <p className="text-lg font-bold text-emerald-500/80">{fmt(metrics.totalOwed)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">You owe</p>
                        <p className="text-lg font-bold text-rose-500/80">{fmt(metrics.totalOwe)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
           </div>
        </div>

        {/* CARD 2: ACTION REQUIRED */}
        <div className="bg-[#141416]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-1 transition-all duration-300">
           <div className="relative z-10 flex flex-col h-full">
              <p className="text-zinc-400 text-[12px] font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                Action Required
              </p>

              {isScenario1 ? (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2 leading-tight">No actions needed</h3>
                    <p className="text-sm text-zinc-500 mb-6 font-medium">Once you split expenses, pending settlements will appear here.</p>
                  </div>
                  <button 
                    onClick={() => {
                       if (onAddExpense) onAddExpense();
                    }}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Log an expense <Receipt className="w-4 h-4" />
                  </button>
                </div>
              ) : isScenario2 ? (
                <div className="flex-1 flex flex-col">
                   <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2 leading-tight">You're all caught up</h3>
                      <p className="text-sm text-zinc-500 mb-6 font-medium leading-relaxed">
                        No pending payments. Good work keeping your ledger clean!
                      </p>
                   </div>
                   <button 
                    onClick={() => navigate('/activity')}
                    className="flex items-center justify-between w-full bg-white/5 hover:bg-white/10 active:scale-95 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all border border-white/10 group/btn"
                  >
                    View history <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                   <div className="flex-1">
                      {(() => {
                         const debts = advanced.actionRequiredDebts || [];
                         const count = debts.length;
                         if (count === 1) {
                            const d = debts[0];
                            const amountText = d.netAmount > 0 ? `${d.name} owes you ${fmt(d.netAmount)}` : `You owe ${d.name} ${fmt(Math.abs(d.netAmount))}`;
                            return (
                               <>
                                  <h3 className="text-3xl font-bold text-white mb-1">1 unsettled</h3>
                                  <p className="text-sm text-zinc-400 mb-6 font-medium">{amountText}</p>
                                  <div className="flex flex-col gap-4 py-4 border-t border-white/5">
                                    <div className="flex items-center justify-between group/row cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors" onClick={() => navigate(`/friends/${d.userId}`)}>
                                       <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-[11px] font-bold flex items-center justify-center border border-blue-200">
                                             {d.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                                          </div>
                                          <div>
                                             <p className="text-sm text-white font-bold">{d.name}</p>
                                             <p className={`text-[11px] font-medium ${d.daysAgo >= 7 ? 'text-rose-500' : 'text-zinc-500'}`}>
                                                {d.daysAgo >= 7 ? `${d.daysAgo} days — overdue` : `${d.daysAgo} days ago`}
                                             </p>
                                          </div>
                                       </div>
                                       <p className={`text-sm font-bold ${d.netAmount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {fmt(Math.abs(d.netAmount))}
                                       </p>
                                    </div>
                                  </div>
                               </>
                            );
                         } else {
                            const totalAmt = debts.reduce((acc: number, d: any) => acc + d.netAmount, 0);
                            const amountText = totalAmt > 0 ? `${fmt(totalAmt)} owed to you in total` : `You owe ${fmt(Math.abs(totalAmt))} in total`;
                            const visibleDebts = debts.slice(0, 3);
                            const overflowDebts = debts.slice(3);
                            const overflowAmt = overflowDebts.reduce((acc: number, d: any) => acc + Math.abs(d.netAmount), 0);
                            const colors = ['bg-blue-100 text-blue-600 border-blue-200', 'bg-orange-100 text-orange-600 border-orange-200', 'bg-purple-100 text-purple-600 border-purple-200'];
                            return (
                               <>
                                  <h3 className="text-3xl font-bold text-white mb-1">{count} unsettled</h3>
                                  <p className="text-sm text-zinc-400 mb-6 font-medium">{amountText}</p>
                                  <div className="flex flex-col gap-4 py-4 border-t border-white/5">
                                    {visibleDebts.map((d: any, i: number) => (
                                      <div key={d.userId} className="flex items-center justify-between group/row cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors" onClick={() => navigate(`/friends/${d.userId}`)}>
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center border ${colors[i % 3]}`}>
                                             {d.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                                          </div>
                                          <div>
                                             <p className="text-sm text-white font-bold">{d.name}</p>
                                             <p className={`text-[11px] font-medium ${d.daysAgo >= 7 ? 'text-rose-500' : 'text-zinc-500'}`}>
                                                {d.daysAgo >= 7 ? `${d.daysAgo} days — overdue` : `${d.daysAgo} days ago`}
                                             </p>
                                          </div>
                                        </div>
                                        <p className={`text-sm font-bold ${d.netAmount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                           {fmt(Math.abs(d.netAmount))}
                                        </p>
                                      </div>
                                    ))}
                                    {overflowDebts.length > 0 && (
                                      <div className="flex items-center justify-between mt-2 pt-2">
                                         <div>
                                            <p className="text-[12px] font-medium text-zinc-400">+ {overflowDebts.length} more •</p>
                                            <p className="text-[12px] font-bold text-white">{fmt(overflowAmt)}</p>
                                         </div>
                                         <button onClick={() => navigate('/friends')} className="text-white text-[11px] font-bold border border-white/10 rounded-lg px-4 py-2 hover:bg-white/5 flex flex-col items-center justify-center">
                                           <span>View all</span>
                                           <ChevronRight className="w-3 h-3 mt-0.5" />
                                         </button>
                                      </div>
                                    )}
                                  </div>
                               </>
                            );
                         }
                      })()}
                   </div>
                   
                   <div className="flex justify-between items-center text-xs font-bold pt-4 border-t border-white/5 mt-auto">
                      <span className="text-zinc-500">Overdue 7d+</span>
                      <span className="text-white">{advanced.overdueCount === 0 ? 'None' : advanced.overdueCount === 1 ? '1 friend' : `${advanced.overdueCount} friends`}</span>
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* CARD 3: BALANCE TREND */}
        <div className="bg-[#141416]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-1 transition-all duration-300">
           <div className="relative z-10 flex flex-col h-full">
              <p className="text-zinc-400 text-[12px] font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                Balance Trend
              </p>

              {isScenario1 ? (
                <div className="flex-1">
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    Your trend insights will appear once you add friends and log expenses.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                   <div className="flex-1 flex flex-col justify-center pb-6">
                      {metrics.sevenDayTrend && metrics.sevenDayTrend.some((d) => d.balance !== 0) ? (
                        <div className="flex-1 flex flex-col justify-center gap-4 py-2">
                          <div className="h-16 relative">
                            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                              <defs>
                                <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              {(() => {
                                const data = metrics.sevenDayTrend!.map((d) => d.balance);
                                const min = Math.min(...data);
                                const max = Math.max(...data);
                                const range = Math.max(1, max - min);
                                const points = data.map((val: number, i: number) => {
                                  const x = (i / (data.length - 1)) * 100;
                                  const y = 35 - ((val - min) / range) * 30;
                                  return `${x},${y}`;
                                }).join(' ');
                                const areaPoints = `0,40 ${points} 100,40`;
                                return (
                                  <>
                                    <path d={`M ${areaPoints} Z`} fill="url(#sparkGradient)" className="transition-all duration-1000" />
                                    <polyline
                                      fill="none"
                                      stroke="#10b981"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      points={points}
                                      className="transition-all duration-1000 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                    />
                                    <circle
                                      cx="100"
                                      cy={35 - ((data[6] - min) / range) * 30}
                                      r="3"
                                      fill="#10b981"
                                      className="animate-pulse"
                                    />
                                  </>
                                );
                              })()}
                            </svg>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-0.5">
                             <span>7 Days Ago</span>
                             <span className="text-zinc-400">Trend Insights</span>
                             <span className="text-emerald-500">Today</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                          {isScenario2 ? (
                            "Everything cleared this month! Great job keeping your ledger clean."
                          ) : (
                            <>Your net balance has moved by <span className="text-white font-bold">{fmt(Math.abs(metrics.totalBalance - metrics.lastMonthNetBalance))}</span> from last month.</>
                          )}
                        </p>
                      )}
                   </div>

                   <div className="pt-6 border-t border-white/5 space-y-3 mt-auto">
                      {isScenario3 && metrics.bestMonth && (
                        <div className="flex justify-between text-xs font-bold">
                           <span className="text-zinc-500">Best month</span>
                           <span className="text-emerald-400">{metrics.bestMonth.name} (+{fmt(metrics.bestMonth.amount)})</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-bold">
                         <span className="text-zinc-500">Oldest debt</span>
                         <span className={`${advanced.oldestDebtDays > 7 ? 'text-rose-400' : 'text-zinc-300'}`}>
                           {advanced.oldestDebtDays > 0 ? `${advanced.oldestDebtDays} days` : 'None right now'}
                         </span>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};
