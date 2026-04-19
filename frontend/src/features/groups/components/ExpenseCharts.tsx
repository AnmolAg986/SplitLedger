import React, { useMemo, useState } from 'react';

interface ExpenseChartsProps {
  expenses: any[];
  totalOwedToMe: number;
  totalIOwe: number;
}

export const ExpenseCharts: React.FC<ExpenseChartsProps> = ({ expenses, totalOwedToMe, totalIOwe }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const categories = useMemo(() => {
    const acc: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + Number(e.amount);
    });
    return acc;
  }, [expenses]);

  const catEntries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const total = catEntries.reduce((sum, [_, amt]) => sum + amt, 0);

  if (total === 0) return null;

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  const summaryBlock = (
    <div className="flex flex-col gap-4 ml-auto pl-6 border-l border-white/5 min-w-[120px]">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest mb-1">Owes You</span>
        <span className="text-xl font-black text-emerald-400">₹{totalOwedToMe.toLocaleString()}</span>
      </div>
      <div className="w-8 h-px bg-white/5" />
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-rose-500/70 uppercase tracking-widest mb-1">You Owe</span>
        <span className="text-xl font-black text-rose-400">₹{totalIOwe.toLocaleString()}</span>
      </div>
    </div>
  );

  if (catEntries.length >= 2) {
    // Pie Chart
    let cumulativePercent = 0;
    
    function getCoordinatesForPercent(percent: number) {
      const x = Math.cos(2 * Math.PI * percent);
      const y = Math.sin(2 * Math.PI * percent);
      return [x, y];
    }

    const paths = catEntries.map(([cat, amt], idx) => {
      const percent = amt / total;
      const startX = getCoordinatesForPercent(cumulativePercent)[0];
      const startY = getCoordinatesForPercent(cumulativePercent)[1];
      cumulativePercent += percent;
      const endX = getCoordinatesForPercent(cumulativePercent)[0];
      const endY = getCoordinatesForPercent(cumulativePercent)[1];
      const largeArcFlag = percent > 0.5 ? 1 : 0;
      
      const pathData = [
        `M startX startY`, 
        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        `L 0 0`
      ].join(' ').replace('startX', startX.toString()).replace('startY', startY.toString());

      const isHovered = hoveredIndex === idx;

      return (
        <path 
          key={cat} 
          d={pathData} 
          fill={colors[idx % colors.length]} 
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
          className="transition-all duration-300 cursor-pointer"
          style={{ 
            opacity: hoveredIndex !== null && !isHovered ? 0.4 : 1,
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            transformOrigin: 'center'
          }}
        />
      );
    });

    const hoveredData = hoveredIndex !== null ? catEntries[hoveredIndex] : null;

    return (
      <div className="mb-6 bg-black/20 p-6 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-700">
         <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Category Breakdown</h4>
         <div className="flex flex-col md:flex-row items-center gap-10">
           <div className="relative w-40 h-40 shrink-0">
             <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full transform -rotate-90 overflow-visible">
               {paths}
               <circle cx="0" cy="0" r="0.65" fill="#121214" />
             </svg>
             
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {hoveredData ? (
                  <>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mb-0.5">
                      {hoveredData[0]}
                    </span>
                    <span className="text-lg font-display font-black text-white">
                      ₹{Number(hoveredData[1]).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mb-0.5">
                      Total
                    </span>
                    <span className="text-lg font-display font-black text-white">
                      ₹{total.toLocaleString()}
                    </span>
                  </>
                )}
             </div>
           </div>

           <div className="flex flex-wrap md:flex-col gap-x-6 gap-y-3 justify-center min-w-0 flex-1">
             {catEntries.map(([cat], idx) => (
               <div 
                 key={cat} 
                 className={`flex items-center gap-2.5 transition-all duration-300 ${hoveredIndex === idx ? 'scale-110 translate-x-1' : ''}`}
                 onMouseEnter={() => setHoveredIndex(idx)}
                 onMouseLeave={() => setHoveredIndex(null)}
               >
                 <div 
                   className="w-3 h-3 rounded-full shadow-lg shrink-0" 
                   style={{ 
                     backgroundColor: colors[idx % colors.length],
                     boxShadow: hoveredIndex === idx ? `0 0 12px ${colors[idx % colors.length]}44` : 'none'
                   }} 
                 />
                 <span className={`text-xs font-bold transition-colors truncate ${hoveredIndex === idx ? 'text-white' : 'text-zinc-500'}`}>
                   {cat}
                 </span>
               </div>
             ))}
           </div>

           {summaryBlock}
         </div>
      </div>
    );
  }

  // Fallback for single category - now includes the summaryBlock
  return (
    <div className="mb-6 bg-black/20 p-6 rounded-2xl border border-white/5 animate-in fade-in duration-500">
      <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Category Breakdown</h4>
      <div className="flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1 w-full space-y-4">
          {catEntries.map(([cat, amt], idx) => (
            <div key={cat} className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">{cat}</span>
                <span className="text-xs font-black text-white">₹{amt.toLocaleString()}</span>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000" 
                  style={{ width: '100%', backgroundColor: colors[idx % colors.length] }} 
                />
              </div>
            </div>
          ))}
        </div>
        {summaryBlock}
      </div>
    </div>
  );
};

