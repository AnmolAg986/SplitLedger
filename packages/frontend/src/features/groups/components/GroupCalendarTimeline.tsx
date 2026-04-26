import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';

interface GroupCalendarTimelineProps {
  expenses: any[];
  onDateClick?: (dateString: string) => void;
}

export const GroupCalendarTimeline: React.FC<GroupCalendarTimelineProps> = ({ expenses, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const days = daysInMonth(month, year);
  const startDay = firstDayOfMonth(month, year);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map expenses to days
  const expensesByDay: Record<number, any[]> = {};
  expenses.forEach(e => {
    const d = new Date(e.created_at || e.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!expensesByDay[day]) expensesByDay[day] = [];
      expensesByDay[day].push(e);
    }
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date();

  return (
    <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-4 shadow-xl mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5 text-indigo-400" /> Timeline
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white whitespace-nowrap">{monthNames[month]} {year}</span>
          <div className="flex gap-0.5">
            <button onClick={prevMonth} className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="bg-[#121214] py-1.5 text-center text-[9px] font-bold text-zinc-600 uppercase">
            {d}
          </div>
        ))}
        
        {Array.from({ length: 42 }).map((_, i) => {
          const dayNumber = i - startDay + 1;
          const isCurrentMonth = dayNumber > 0 && dayNumber <= days;
          const dayExpenses = isCurrentMonth ? (expensesByDay[dayNumber] || []) : [];
          const totalAmount = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
          const isToday = dayNumber === today.getDate() && month === today.getMonth() && year === today.getFullYear();

          return (
            <div 
              key={i} 
              onClick={() => {
                if (isCurrentMonth && dayExpenses.length > 0 && onDateClick) {
                  // Use local time precisely instead of UTC mapping
                  const d = new Date(year, month, dayNumber);
                  onDateClick(d.toISOString());
                }
              }}
              className={`min-h-[44px] bg-[#0c0c0e] p-1 relative transition-colors ${isCurrentMonth ? (dayExpenses.length > 0 ? 'hover:bg-white/[0.04] cursor-pointer' : '') : 'opacity-20'}`}
            >
              <span className={`text-[9px] font-bold ${isToday ? 'text-indigo-400' : 'text-zinc-600'}`}>
                {isCurrentMonth ? dayNumber : ''}
              </span>
              
              {dayExpenses.length > 0 && (
                <div className="mt-0.5">
                  <div className="text-[8px] font-black text-white/90 truncate leading-tight">
                    ₹{totalAmount >= 1000 ? `${(totalAmount/1000).toFixed(1)}k` : totalAmount}
                  </div>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {dayExpenses.slice(0, 2).map((e, idx) => (
                      <div 
                        key={idx} 
                        className="w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_3px_rgba(99,102,241,0.6)]" 
                        title={e.description}
                      />
                    ))}
                    {dayExpenses.length > 2 && <div className="text-[7px] text-zinc-600 font-bold">+{dayExpenses.length - 2}</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
