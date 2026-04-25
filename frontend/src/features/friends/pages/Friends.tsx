import { LazyImage } from '../../../shared/components/LazyImage';
import { useState, useEffect, useRef } from 'react';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ListCardSkeleton } from '../../../shared/components/Skeleton';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { UserPlus, Search, Trophy, Flame, Receipt, X, Link, Clock } from 'lucide-react';
import { CreateExpenseModal } from '../../../shared/components/CreateExpenseModal';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { toast } from '../../../shared/store/useToastStore';
import { InviteModal } from '../../../shared/components/InviteModal';
import { useUnreadStore } from '../../../shared/store/useUnreadStore';
import { useSocket } from '../../../shared/hooks/useSocket';

export const Friends = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);
  const getEntityCount = useUnreadStore(state => state.getEntityCount);
  const { on } = useSocket();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [addIdentifier, setAddIdentifier] = useState('');

  const [visibleLimit, setVisibleLimit] = useState(50);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const CATEGORIES = ['all', 'family', 'work', 'roommate', 'travel', 'other'];

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('friendsRecentSearches') || '[]');
    } catch {
      return [];
    }
  });

  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query.trim(), ...recentSearches.filter(s => s.toLowerCase() !== query.trim().toLowerCase())].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('friendsRecentSearches', JSON.stringify(updated));
  };

  const removeSearch = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== query);
    setRecentSearches(updated);
    localStorage.setItem('friendsRecentSearches', JSON.stringify(updated));
  };

  const fetchFriends = async () => {
    try {
      const [friendsRes, insightsRes, pendingRes, suggestionsRes] = await Promise.all([
        apiClient.get('/friends'),
        apiClient.get('/friends/insights'),
        apiClient.get('/friends/pending'),
        apiClient.get('/friends/suggestions')
      ]);
      setFriends(friendsRes.data);
      setInsights(insightsRes.data);
      setPendingRequests(pendingRes.data);
      setSuggestions(suggestionsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFriends();
  }, []);

  useEffect(() => {
    const unsub = on('user_presence_change', (data: any) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        if (data.online) next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    });
    return () => { if (unsub) unsub(); };
  }, [on]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addIdentifier.trim()) return;
    
    try {
      await apiClient.post('/friends/add', { identifier: addIdentifier });
      setAddIdentifier('');
      setShowAddModal(false); // Close instantly
      fetchFriends();
      // Optional: Add success toast here if Toast context exists
    } catch (err) {
      console.error('Failed to add friend:', err);
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      await apiClient.post(`/friends/accept/${id}`);
      fetchFriends();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await apiClient.delete(`/friends/${id}`);
      fetchFriends();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredFriends = friends.filter(f => {
    const matchesSearch = f.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase()) ||
      f.phone_number?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    if (filteredFriends.length <= visibleLimit) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleLimit(prev => Math.min(prev + 50, filteredFriends.length));
      }
    }, { threshold: 0.1 });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [filteredFriends.length, visibleLimit]);

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Friends</h1>
            <p className="text-sm text-zinc-400">Share expenses and track balances together</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto min-h-[44px]">
             {/* Search Bar */}
             <div className="relative flex-1 md:w-64">
               <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
               <input 
                 type="text" 
                 placeholder="Search friends..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 onFocus={() => setIsSearchOpen(true)}
                 onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                 className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-[13px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
               />
               {search && (
                 <button onClick={() => setSearch('')} className="absolute right-2 top-2 p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-500 hover:text-white">
                   <X className="w-4 h-4" />
                 </button>
               )}
               {/* Recent Searches Dropdown */}
               {isSearchOpen && search === '' && recentSearches.length > 0 && (
                 <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                   <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5">
                     Recent Searches
                   </div>
                   {recentSearches.map((s, i) => (
                     <div key={i} className="flex items-center justify-between px-3 py-2.5 hover:bg-white/5 group cursor-pointer border-t border-white/5" onClick={() => setSearch(s)}>
                       <div className="flex items-center gap-2.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-[13px] font-medium text-zinc-300 group-hover:text-white transition-colors">{s}</span>
                       </div>
                       <button onClick={(e) => removeSearch(e, s)} className="p-1 rounded-md text-zinc-600 hover:bg-white/10 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
                         <X className="w-3.5 h-3.5" />
                       </button>
                     </div>
                   ))}
                 </div>
               )}
             </div>
             
             {/* Action Buttons */}
             <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
               <button onClick={() => setShowAddModal(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors group flex items-center gap-2" title="Add Friend">
                 <UserPlus className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                 <span className="text-[12px] font-bold text-zinc-400 group-hover:text-white hidden sm:inline pr-2">Add</span>
               </button>
               <div className="w-px bg-white/10 my-1 mx-1" />
               <button onClick={() => setShowInviteModal(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors group flex items-center gap-2" title="Share Invite Link">
                 <Link className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                 <span className="text-[12px] font-bold text-zinc-400 group-hover:text-white hidden sm:inline pr-2">Invite</span>
               </button>
             </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10 w-full mt-8">
            <ListCardSkeleton />
            <ListCardSkeleton />
            <ListCardSkeleton />
            <ListCardSkeleton />
          </div>
        ) : (
          <div className="flex flex-col gap-8 w-full relative z-10">
            {/* PENDING REQUESTS */}
            {pendingRequests.length > 0 && (
               <div className="z-10 relative">
                 <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Pending Requests</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingRequests.map((req, i) => (
                      <div key={`req-${i}`} className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
                             {req.avatar_url ? (
                               <LazyImage src={`http://localhost:3000${req.avatar_url}`} alt={req.display_name} className="w-full h-full object-cover" />
                             ) : (
                               req.display_name.charAt(0).toUpperCase()
                             )}
                           </div>
                           <div className="flex-1 min-w-0 flex flex-col">
                             <span className="text-white text-[15px] font-medium truncate">{req.display_name}</span>
                             <span className="text-zinc-500 text-[12px] truncate">{req.email || 'Phone hidden'}</span>
                           </div>
                         </div>
                         <div className="flex gap-2">
                           <button onClick={() => handleAcceptRequest(req.id)} className="flex-1 bg-amber-500 text-black text-[13px] font-bold py-2 rounded-xl hover:bg-amber-400 transition-colors">Accept</button>
                           <button onClick={() => handleRejectRequest(req.id)} className="flex-1 bg-white/10 text-white text-[13px] font-bold py-2 rounded-xl hover:bg-white/20 transition-colors">Deny</button>
                         </div>
                      </div>
                    ))}
                 </div>
               </div>
            )}



            {/* INSIGHTS */}
            {(insights?.mostGenerous || (insights?.streaks && insights.streaks.length > 0)) && (
               <div className="z-10 relative">
                 <h3 className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Insights</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {insights?.mostGenerous && (
                      <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-white/[0.02] to-transparent border border-white/10 hover:border-amber-500/30 shadow-xl backdrop-blur-md group transition-all duration-300 hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                            <Trophy className="w-5 h-5 text-black" />
                          </div>
                          <h4 className="text-[12px] text-amber-500 font-bold uppercase tracking-widest">Most Generous</h4>
                        </div>
                        <div className="text-xl text-white font-black group-hover:text-amber-400 transition-colors">{insights.mostGenerous.display_name}</div>
                        <div className="text-[13px] text-zinc-400 mt-2 leading-relaxed font-medium">Paid <span className="text-white font-bold">₹{insights.mostGenerous.total_paid_for_you}</span> for you directly</div>
                      </div>
                    )}
                    {insights?.streaks && insights.streaks.length > 0 && (
                      <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-500/10 via-white/[0.02] to-transparent border border-white/10 hover:border-rose-500/30 shadow-xl backdrop-blur-md group transition-all duration-300 hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                            <Flame className="w-5 h-5 text-white" />
                          </div>
                          <h4 className="text-[12px] text-rose-500 font-bold uppercase tracking-widest">Top Streak</h4>
                        </div>
                        <div className="text-3xl text-white font-black flex items-center gap-2 group-hover:text-rose-400 transition-colors">
                          {insights.streaks[0].spending_streak} <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">days</span>
                        </div>
                        <div className="text-[13px] font-medium text-zinc-400 mt-3">With <span className="font-bold text-white">{insights.streaks[0].display_name}</span></div>
                      </div>
                    )}
                 </div>
               </div>
            )}

            {/* SUGGESTIONS */}
            {suggestions.length > 0 && (
               <div className="z-10 relative">
                 <h3 className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-4">People you may know</h3>
                 <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {suggestions.map((user, i) => (
                      <div key={`sugg-${i}`} className="p-4 w-[180px] rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col items-center text-center gap-3 shrink-0">
                         <div className="w-14 h-14 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xl overflow-hidden">
                           {user.avatar_url ? (
                             <LazyImage src={`http://localhost:3000${user.avatar_url}`} alt={user.display_name} className="w-full h-full object-cover" />
                           ) : (
                             user.display_name.charAt(0).toUpperCase()
                           )}
                         </div>
                         <div className="flex flex-col w-full">
                           <span className="text-white text-[14px] font-bold truncate">{user.display_name}</span>
                           {user.username && <span className="text-zinc-500 text-[11px] truncate">@{user.username}</span>}
                         </div>
                         <button 
                           onClick={async () => {
                             try {
                               await apiClient.post('/friends/add', { identifier: user.username || user.email });
                               toast.success(`Request sent to ${user.display_name}`);
                               fetchFriends();
                             } catch {
                               toast.error('Failed to send request');
                             }
                           }}
                           className="w-full bg-white/10 text-white text-[12px] font-bold py-1.5 rounded-lg hover:bg-white/20 transition-colors mt-auto"
                         >
                           Add Friend
                         </button>
                      </div>
                    ))}
                 </div>
               </div>
            )}

            {/* CATEGORY FILTERS */}
            <div className="z-10 relative mt-2 flex flex-wrap items-center gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    categoryFilter === cat 
                      ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* FRIENDS GRID */}
            <div className="z-10 relative">
              
              {filteredFriends.length === 0 ? (
                <EmptyState
                  variant="friends"
                  headline="No friends found"
                  subtext={search ? "We couldn't find anyone matching your search." : "You haven't added any friends yet. Add someone to start splitting expenses!"}
                  ctaLabel={search ? undefined : "Add your first friend"}
                  onCta={search ? undefined : () => setShowAddModal(true)}
                  compact
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredFriends.slice(0, visibleLimit).map((f, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (search.trim()) saveSearch(search);
                        navigate(`/friends/${f.id}`);
                      }}
                      className="group text-left p-6 rounded-[2rem] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 hover:border-amber-500/30 transition-all duration-300 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col hover:-translate-y-1"
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {getEntityCount('friend', f.id) > 0 && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(244,63,94,0.5)] z-20">
                          {getEntityCount('friend', f.id) > 99 ? '99+' : getEntityCount('friend', f.id)}
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-5 relative z-10 w-full">
                        <div className="relative w-16 h-16">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/30 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(245,158,11,0.15)] overflow-hidden">
                            {f.avatar_url ? (
                              <LazyImage src={`http://localhost:3000${f.avatar_url}`} alt={f.display_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-amber-400 font-black text-2xl">{f.display_name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          {onlineUserIds.has(f.id) && (
                            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0c0c0e] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                          )}
                        </div>
                        {f.spending_streak > 0 && (
                          <div className="flex flex-col items-end">
                             <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                               {f.spending_streak}🔥
                             </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="relative z-10 w-full mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors truncate">{f.nickname || f.display_name}</h3>
                          {f.category && f.category !== 'other' && (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10">
                              {f.category}
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-zinc-500 truncate">{f.email}</div>
                      </div>
                      
                      <div className="mt-auto w-full pt-4 border-t border-white/10 relative z-10">
                        {f.balance?.netBalance === 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-zinc-500" />
                            <span className="text-[13px] text-zinc-400 font-medium">Settled up</span>
                          </div>
                        ) : f.balance?.netBalance > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[14px] font-bold text-emerald-400">
                              Owes you ₹{f.balance.netBalance}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                            <span className="text-[14px] font-bold text-rose-400">
                              You owe ₹{Math.abs(f.balance?.netBalance || 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredFriends.length > visibleLimit && (
                    <div ref={loadMoreRef} className="w-full py-4 flex justify-center">
                      <div className="w-5 h-5 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      {/* Floating Add Expense Button */}
      <button 
        onClick={() => setShowExpenseModal(true)}
        className="fixed bottom-8 right-8 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-full text-black font-black transition-all shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.5)] border border-amber-300/50 flex items-center gap-3 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 z-50 group"
      >
        <Receipt className="w-5 h-5 group-hover:rotate-12 transition-transform" /> 
        <span className="tracking-wide">Add Expense</span>
      </button>

      {/* MODALS */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Add Friend</h3>
            <form onSubmit={handleAddFriend}>
               <input 
                 type="text" 
                 value={addIdentifier}
                 onChange={e => setAddIdentifier(e.target.value)}
                 className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-amber-500 transition-colors mb-6"
                 placeholder="Enter email or phone number"
                 required
                 autoFocus
               />
               <div className="flex justify-end gap-3">
                 <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
                 <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors">Send Request</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseModal && currentUser && (
        <CreateExpenseModal 
          onClose={() => setShowExpenseModal(false)}
          onSuccess={fetchFriends} // refresh balances
          currentUserId={currentUser.id}
          availableUsers={[
            { id: currentUser.id, display_name: currentUser.displayName || 'You' },
            ...friends.map(f => ({ id: f.id, display_name: f.display_name }))
          ]}
        />
      )}

      {currentUser && (
        <InviteModal 
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          targetId={currentUser.id}
          type="friend"
          title="Friends"
        />
      )}
    </div>
  );
};
