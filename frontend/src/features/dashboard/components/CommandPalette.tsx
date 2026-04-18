import React, { useEffect, useState } from 'react';
import { Search, UserPlus, CreditCard, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset query whenever the palette closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setQuery(''), 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const actions = [
    { 
      id: 'expense', 
      title: 'Add an expense', 
      icon: CreditCard, 
      colorClass: 'text-emerald-400', 
      bgClass: 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20',
      route: '/expenses' 
    },
    { 
      id: 'group', 
      title: 'Create a group', 
      icon: Users, 
      colorClass: 'text-blue-400', 
      bgClass: 'bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20',
      route: '/groups' 
    },
    { 
      id: 'friend', 
      title: 'Add a friend', 
      icon: UserPlus, 
      colorClass: 'text-purple-400', 
      bgClass: 'bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/20',
      route: '/groups' 
    },
  ];

  const filteredActions = actions.filter(action => 
    action.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#050505]/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Palette Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input Area */}
        <div className="flex items-center px-4 py-4 border-b border-white/10 bg-[#0a0a0c]">
          <Search className="h-5 w-5 text-cyan-400 mr-3 shrink-0" strokeWidth={2.5} />
          <input 
            type="text" 
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-zinc-500 text-[15px] font-medium outline-none"
            placeholder="Search or jump to..." 
          />
          <div className="shrink-0 text-[10px] uppercase font-bold tracking-widest text-zinc-500 bg-white/5 px-2 py-1 rounded shadow-inner ml-2">ESC</div>
        </div>

        {/* Action List */}
        <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
          {filteredActions.length > 0 ? (
            <>
              <div className="px-3 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                Quick Actions
              </div>
              
              {filteredActions.map((action) => (
                <button 
                  key={action.id}
                  onClick={() => { setIsOpen(false); navigate(action.route); }} 
                  className="flex items-center justify-between w-full px-3 py-3 rounded-xl hover:bg-white/5 focus:bg-white/5 outline-none transition-all group cursor-pointer text-left mb-1"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${action.bgClass} ${action.colorClass}`}>
                      <action.icon className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <span className="text-[14px] text-zinc-300 group-hover:text-white font-medium transition-colors">
                      {action.title}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" />
                </button>
              ))}
            </>
          ) : (
            <div className="py-14 text-center">
              <Search className="h-8 w-8 text-zinc-600 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
              <p className="text-[14px] font-medium text-zinc-400">
                No results found for <span className="text-white">"{query}"</span>
              </p>
              <p className="text-[12px] text-zinc-600 mt-1">Try searching for "expense" or "group"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
