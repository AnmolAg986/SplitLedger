import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { UserPlus, Search, Trophy, Flame, Loader2, Receipt, X } from 'lucide-react';
import { CreateExpenseModal } from '../../../shared/components/CreateExpenseModal';
import { useAuthStore } from '../../../app/store/useAuthStore';

export const Friends = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);
  
  const [friends, setFriends] = useState<any[]>([]);
  const [recentFriends, setRecentFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [addIdentifier, setAddIdentifier] = useState('');

  const fetchFriends = async () => {
    try {
      const [friendsRes, insightsRes, pendingRes, recentRes] = await Promise.all([
        apiClient.get('/friends'),
        apiClient.get('/friends/insights'),
        apiClient.get('/friends/pending'),
        apiClient.get('/friends/recent')
      ]);
      setFriends(friendsRes.data);
      setInsights(insightsRes.data);
      setPendingRequests(pendingRes.data);
      setRecentFriends(recentRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

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

  const filteredFriends = friends.filter(f => 
    f.display_name.toLowerCase().includes(search.toLowerCase()) ||
    f.email.toLowerCase().includes(search.toLowerCase()) ||
    f.phone_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      
      {/* 1. LEFT COLUMN: Friends List */}
      <div className="w-[300px] border-r border-white/10 flex flex-col bg-black/20 shrink-0">
        <div className="p-4 border-b border-white/10 flex items-center justify-between min-h-[64px]">
          {isSearchOpen ? (
            <div className="relative flex-1 animate-in slide-in-from-left-2 duration-200">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search friends..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-[13px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
              />
              <button 
                onClick={() => {
                  setSearch('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2 top-2 p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-white font-semibold">Friends</h2>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                  title="Add Friend"
                >
                  <UserPlus className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 gap-1 flex flex-col custom-scrollbar">
          {loading ? (
             <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
          ) : (
            <>
              {pendingRequests.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Pending Requests</div>
                  {pendingRequests.map((req, i) => (
                    <div key={`req-${i}`} className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/10 mb-2 flex flex-col gap-2">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0">
                           {req.display_name.charAt(0).toUpperCase()}
                         </div>
                         <div className="flex-1 min-w-0 flex flex-col">
                           <span className="text-white text-[14px] font-medium truncate">{req.display_name}</span>
                           <span className="text-zinc-500 text-[11px] truncate">{req.email || 'Phone hidden'}</span>
                         </div>
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => handleAcceptRequest(req.id)} className="flex-1 bg-amber-500 text-black text-[12px] font-bold py-1.5 rounded-lg hover:bg-amber-400 transition-colors">Accept</button>
                         <button onClick={() => handleRejectRequest(req.id)} className="flex-1 bg-white/10 text-white text-[12px] font-bold py-1.5 rounded-lg hover:bg-white/20 transition-colors">Deny</button>
                       </div>
                    </div>
                  ))}
                </div>
              )}
              {filteredFriends.length === 0 && pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-[13px]">No friends found.</div>
              ) : (
                <>
                  {filteredFriends.length > 0 && (
                    <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Your Friends</div>
                  )}
                  {filteredFriends.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/friends/${f.id}`)}
                      className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <span className="text-indigo-400 font-bold text-sm">{f.display_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <h4 className="text-[14px] text-white font-medium truncate group-hover:text-amber-500 transition-colors">{f.display_name}</h4>
                        {f.spending_streak > 0 && (
                          <div className="flex items-center shrink-0 ml-2">
                             <span className="text-[12px] font-bold text-orange-400">{f.spending_streak}🔥</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2 & 3. DUAL-COLUMN CONTENT WRAPPER */}
      <div className="flex-1 flex bg-black/40 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50 overflow-hidden">
           <div className="w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
           <div className="w-[400px] h-[400px] bg-rose-500/10 rounded-full blur-[80px] -ml-40 mt-40" />
        </div>

        {/* CENTER COLUMN (Welcome / Recent Activity) */}
        <div className="flex-1 border-r border-white/5 flex flex-col z-10 relative px-8 py-10">
            {recentFriends.length > 0 ? (
              <div className="w-full max-w-4xl flex flex-col items-start justify-start mb-8">
                 <h2 className="text-2xl text-white font-bold mb-6">Recent Activity</h2>
                 <div className="flex flex-wrap justify-start gap-5 w-full">
                    {recentFriends.map((f) => {
                      const fullFriend = friends.find(fr => fr.id === f.id);
                      return (
                         <button 
                           key={f.id} 
                           onClick={() => navigate(`/friends/${f.id}`)}
                           className="flex flex-col items-center gap-4 w-[180px] p-6 rounded-3xl bg-gradient-to-b from-[#1c1c1e]/80 to-[#141416]/90 backdrop-blur-xl border border-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden group"
                         >
                           {/* Glow effect on hover */}
                           <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                           
                           <div className="relative">
                             <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500/50 flex items-center justify-center mb-1 shadow-[0_0_15px_rgba(99,102,241,0.3)] z-10 relative group-hover:scale-105 transition-transform">
                               <span className="text-indigo-300 font-black text-2xl tracking-tighter">{f.display_name.charAt(0).toUpperCase()}</span>
                             </div>
                           </div>
                           <div className="w-full text-center z-10 relative">
                             <span className="text-[16px] text-white font-bold truncate block mb-1">{f.nickname || f.display_name}</span>
                             {fullFriend && (
                               <div className="flex flex-col items-center mt-1">
                                  {fullFriend.balance.netBalance === 0 ? (
                                    <span className="text-[13px] bg-white/10 text-zinc-300 px-3 py-1 rounded-full font-bold tracking-wide">Settled</span>
                                  ) : fullFriend.balance.netBalance > 0 ? (
                                    <span className="text-[13px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                      Owes ₹{fullFriend.balance.netBalance}
                                    </span>
                                  ) : (
                                    <span className="text-[13px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                                      Owe ₹{Math.abs(fullFriend.balance.netBalance)}
                                    </span>
                                  )}
                               </div>
                             )}
                           </div>
                         </button>
                      );
                    })}
                  </div>
               </div>
            ) : (
              <div className="flex flex-col items-center justify-center mb-8 h-full">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
                  <span className="text-2xl">👋</span>
                </div>
                <h1 className="text-2xl text-white font-bold mb-2">Friend Zone</h1>
                <p className="text-zinc-400 text-sm max-w-sm text-center leading-relaxed">
                  Select a friend from the sidebar to chat, view shared expenses, and dive into your mutual balances.
                </p>
              </div>
            )}
            
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="absolute bottom-8 right-8 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-bold transition-all shadow-2xl shadow-indigo-600/30 border border-indigo-500/50 flex items-center gap-2 transform active:scale-95 z-50"
            >
              <Receipt className="w-5 h-5" /> Add Expense
            </button>
        </div>

        {/* RIGHT COLUMN (Insights) */}
        <div className="w-[320px] p-6 flex flex-col gap-6 z-10 overflow-y-auto custom-scrollbar">
          <h3 className="text-white font-semibold text-[15px] sticky top-0 bg-transparent py-1 backdrop-blur-sm">Insights</h3>
          
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <h4 className="text-[13px] text-amber-500 font-semibold uppercase tracking-wider">Most Generous</h4>
            </div>
            {insights?.mostGenerous ? (
               <div>
                 <div className="text-lg text-white font-bold">{insights.mostGenerous.display_name}</div>
                 <div className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed tracking-wide whitespace-pre-wrap">Paid ₹ {insights.mostGenerous.total_paid_for_you} for you directly</div>
               </div>
            ) : (
               <div className="text-[13px] text-zinc-500">No data yet.</div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-rose-500" />
              </div>
              <h4 className="text-[13px] text-rose-500 font-semibold uppercase tracking-wider">Top Streak</h4>
            </div>
            {insights?.streaks && insights.streaks.length > 0 ? (
               <div>
                 <div className="text-2xl text-white font-bold flex items-center gap-2">
                   {insights.streaks[0].spending_streak} <span className="text-sm font-medium text-zinc-400">days</span>
                 </div>
                 <div className="text-[13px] font-medium text-zinc-400 tracking-wide mt-2 whitespace-pre-wrap">With <span className="font-bold text-white/90">{insights.streaks[0].display_name}</span></div>
               </div>
            ) : (
               <div className="text-[13px] text-zinc-500">No active streaks. Spend sequentially!</div>
            )}
          </div>

        </div>
      </div>

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
    </div>
  );
};
