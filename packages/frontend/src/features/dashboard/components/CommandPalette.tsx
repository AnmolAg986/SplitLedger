import React, { useEffect, useState, useRef } from 'react';
import { Search, UserPlus, CreditCard, Users, ArrowRight, X, TerminalSquare, Navigation, CheckCircle, MessageSquare, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { apiClient } from '../../../shared/api/axios';

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  iconName: string;
  colorClass: string;
  bgClass: string;
  route: string;
  type: 'action' | 'friend' | 'group' | 'page';
}

const iconMap: Record<string, React.ElementType> = {
  TerminalSquare,
  CreditCard,
  UserPlus,
  Users,
  ArrowRight,
  CheckCircle,
  Navigation,
  MessageSquare
};

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('paletteRecentIds') || '[]');
    } catch {
      return [];
    }
  });
  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [backendResults, setBackendResults] = useState<PaletteItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcut to open/close
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

  useEffect(() => {
    if (isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuery('');
      setActiveIndex(0);
      /* eslint-enable react-hooks/set-state-in-effect */
      if (friends.length === 0 || groups.length === 0) {
        Promise.all([
          apiClient.get('/friends').catch(() => ({ data: [] })),
          apiClient.get('/groups').catch(() => ({ data: [] }))
        ]).then(([friendsRes, groupsRes]) => {
          setFriends(friendsRes.data);
          setGroups(groupsRes.data);
        });
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim().length > 0) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const { data } = await apiClient.get(`/search?q=${encodeURIComponent(query.trim())}`);
          const mapped: PaletteItem[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            subtitle: d.subtitle,
            iconName: d.type === 'expense' ? 'CreditCard' : d.type === 'message' ? 'MessageSquare' : d.type === 'group' ? 'Users' : 'UserPlus',
            colorClass: d.type === 'expense' ? 'text-emerald-400' : d.type === 'message' ? 'text-blue-400' : d.type === 'group' ? 'text-indigo-400' : 'text-amber-400',
            bgClass: 'bg-white/5 border-white/10 group-hover:bg-white/10',
            route: d.route,
            type: d.type
          }));
          setBackendResults(mapped);
        } catch (err) {
          console.error('Search failed', err);
          setBackendResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setBackendResults([]);
      setIsSearching(false);
    }
  }, [query]);

  if (!isOpen) return null;
  const items: PaletteItem[] = [
    { id: 'p-dash', title: 'Dashboard', subtitle: 'Go to home', iconName: 'TerminalSquare', colorClass: 'text-zinc-400', bgClass: 'bg-zinc-500/10 border-zinc-500/20 group-hover:bg-zinc-500/20', route: '/', type: 'page' },
    { id: 'p-exp', title: 'Expenses', subtitle: 'View all expenses', iconName: 'CreditCard', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20', route: '/expenses', type: 'page' },
    { id: 'a-add-friend', title: 'Add a friend', subtitle: 'Connections', iconName: 'UserPlus', colorClass: 'text-purple-400', bgClass: 'bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/20', route: '/connections?tab=friends', type: 'action' },
    { id: 'a-add-group', title: 'Create a group', subtitle: 'Connections', iconName: 'Users', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20', route: '/connections?tab=groups', type: 'action' },
  ];

  friends.forEach(f => {
    const name = f.nickname || f.display_name;
    items.push({ id: `f-${f.id}`, title: `Jump to ${name}`, subtitle: 'Friend', iconName: 'Navigation', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/20', route: `/friends/${f.id}`, type: 'friend' });
    items.push({ id: `fe-${f.id}`, title: `Add expense with ${name}`, subtitle: 'Quick Action', iconName: 'CreditCard', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20', route: `/expenses?friendId=${f.id}&action=add`, type: 'action' });
    items.push({ id: `fs-${f.id}`, title: `Settle up with ${name}`, subtitle: 'Quick Action', iconName: 'CheckCircle', colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500/20', route: `/expenses?friendId=${f.id}&action=settle`, type: 'action' });
  });

  groups.forEach(g => {
    items.push({ id: `g-${g.id}`, title: `Jump to ${g.name}`, subtitle: 'Group', iconName: 'Navigation', colorClass: 'text-indigo-400', bgClass: 'bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/20', route: `/groups/${g.id}`, type: 'group' });
  });

  const fuse = new Fuse(items, {
    keys: ['title', 'subtitle', 'type'],
    threshold: 0.3, // strict enough but allows typos
  });

  const filteredLocalItems = query.trim() ? fuse.search(query).map(r => r.item) : [];
  
  // Combine local filtered items with backend results (avoiding duplicates if any)
  const allFiltered = [...filteredLocalItems];
  backendResults.forEach(br => {
    if (!allFiltered.find(i => i.id === br.id)) {
      allFiltered.push(br);
    }
  });

  const displayList = query.trim() 
    ? allFiltered 
    : (recentIds.map(id => items.find(i => i.id === id)).filter(Boolean) as PaletteItem[]);

  if (displayList.length === 0 && !query.trim()) {
    displayList.push(...items.slice(0, 5));
  }

  const saveRecent = (id: string) => {
    const updated = [id, ...recentIds.filter(i => i !== id)].slice(0, 5);
    setRecentIds(updated);
    localStorage.setItem('paletteRecentIds', JSON.stringify(updated));
  };

  const removeRecent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recentIds.filter(i => i !== id);
    setRecentIds(updated);
    localStorage.setItem('paletteRecentIds', JSON.stringify(updated));
  };

  const handleSelect = (item: PaletteItem) => {
    saveRecent(item.id);
    setIsOpen(false);
    navigate(item.route);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < displayList.length - 1 ? prev + 1 : prev));
      scrollIntoView(activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
      scrollIntoView(activeIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayList[activeIndex]) {
        handleSelect(displayList[activeIndex]);
      }
    }
  };

  const scrollIntoView = (index: number) => {
    if (listRef.current) {
      const el = listRef.current.children[index] as HTMLElement;
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  };

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
          {isSearching ? (
            <Loader2 className="h-5 w-5 text-cyan-400 mr-3 shrink-0 animate-spin" strokeWidth={2.5} />
          ) : (
            <Search className="h-5 w-5 text-cyan-400 mr-3 shrink-0" strokeWidth={2.5} />
          )}
          <input 
            ref={inputRef}
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white placeholder-zinc-500 text-[15px] font-medium outline-none"
            placeholder="Search commands, friends, or groups... (e.g. 'Settle up')" 
          />
          <div className="shrink-0 text-[10px] uppercase font-bold tracking-widest text-zinc-500 bg-white/5 px-2 py-1 rounded shadow-inner ml-2">ESC</div>
        </div>

        {/* Action List */}
        <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col">
          {!query.trim() && (
            <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {recentIds.length > 0 ? 'Recent' : 'Suggested'}
            </div>
          )}

          {displayList.length > 0 ? (
            <div ref={listRef}>
              {displayList.map((action, idx) => {
                const Icon = iconMap[action.iconName] || ArrowRight;
                const isActive = idx === activeIndex;
                const isRecent = !query.trim() && recentIds.includes(action.id);
                
                return (
                  <button 
                    key={action.id}
                    onClick={() => handleSelect(action)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex items-center justify-between w-full px-3 py-3 rounded-xl outline-none transition-all group cursor-pointer text-left mb-1 ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${action.bgClass} ${action.colorClass}`}>
                        <Icon className="h-4 w-4" strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[14px] font-medium transition-colors ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                          {action.title}
                        </span>
                        {action.subtitle && (
                          <span className="text-[11px] text-zinc-500">
                            {action.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isRecent && (
                        <div 
                          onClick={(e) => removeRecent(e, action.id)}
                          className="p-1 rounded-md text-zinc-600 hover:bg-white/10 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 mr-2"
                          title="Remove from recents"
                        >
                          <X className="h-4 w-4" />
                        </div>
                      )}
                      {isActive && (
                        <ArrowRight className="h-4 w-4 text-cyan-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-14 text-center">
              <Search className="h-8 w-8 text-zinc-600 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
              <p className="text-[14px] font-medium text-zinc-400">
                No results found for <span className="text-white">"{query}"</span>
              </p>
            </div>
          )}
        </div>
        
        {/* Footer shortcuts hint */}
        <div className="border-t border-white/5 px-4 py-2.5 bg-[#0a0a0c] flex items-center justify-between text-zinc-500 text-[11px] font-medium">
           <div className="flex items-center gap-4">
             <span className="flex items-center gap-1"><span className="bg-white/10 px-1 rounded text-white font-mono shadow-inner text-[10px]">↑</span> <span className="bg-white/10 px-1 rounded text-white font-mono shadow-inner text-[10px]">↓</span> to navigate</span>
             <span className="flex items-center gap-1"><span className="bg-white/10 px-1 rounded text-white font-mono shadow-inner text-[10px]">↵</span> to select</span>
           </div>
           <span>Powered by Fuse.js</span>
        </div>
      </div>
    </div>
  );
};
