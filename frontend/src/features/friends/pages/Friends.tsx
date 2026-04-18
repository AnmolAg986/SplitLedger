import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { UserPlus, Search, Trophy, Flame, Coins, Loader2, Receipt } from 'lucide-react';
import { CreateExpenseModal } from '../../../shared/components/CreateExpenseModal';
import { useAuthStore } from '../../../app/store/useAuthStore';

export const Friends = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);
  
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [addIdentifier, setAddIdentifier] = useState('');

  const fetchFriends = async () => {
    try {
      const [friendsRes, insightsRes, pendingRes] = await Promise.all([
        apiClient.get('/friends'),
        apiClient.get('/friends/insights'),
        apiClient.get('/friends/pending')
      ]);
      setFriends(friendsRes.data);
      setInsights(insightsRes.data);
      setPendingRequests(pendingRes.data);
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
    try {
      await apiClient.post('/friends/add', { identifier: addIdentifier });
      setAddIdentifier('');
      setShowAddModal(false);
      fetchFriends();
    } catch (err) {
      console.error(err);
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
    f.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      
      {/* 1. LEFT COLUMN: Friends List */}
      <div className="w-[300px] border-r border-white/10 flex flex-col bg-black/20">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white font-semibold">Friends</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors group"
            title="Add Friend"
          >
            <UserPlus className="w-4 h-4 text-zinc-400 group-hover:text-white" />
          </button>
        </div>
        
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search friends..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-[13px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
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
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] text-white font-medium truncate group-hover:text-amber-500 transition-colors">{f.display_name}</h4>
                        <div className="flex flex-col mt-0.5">
                          {f.spending_streak > 0 && (
                            <div className="flex items-center gap-1 mb-1">
                              <Flame className="w-3 h-3 text-rose-500" />
                              <span className="text-[10px] font-bold text-rose-500 tracking-wide">{f.spending_streak} day streak</span>
                            </div>
                          )}
                          {f.balance.netBalance === 0 ? (
                            <span className="text-[12px] text-zinc-500">Settled up</span>
                          ) : f.balance.netBalance > 0 ? (
                            <span className="text-[12px] text-emerald-400 font-medium truncate">
                              Owes you ₹{f.balance.netBalance}
                            </span>
                          ) : (
                            <span className="text-[12px] text-rose-400 font-medium truncate">
                              You owe ₹{Math.abs(f.balance.netBalance)}
                            </span>
                          )}
                        </div>
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

        {/* CENTER COLUMN (Placeholder for Chat/Welcome) */}
        <div className="flex-1 border-r border-white/5 flex flex-col items-center justify-center z-10 relative px-6">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
              <span className="text-2xl">👋</span>
            </div>
            <h1 className="text-2xl text-white font-bold mb-2">Friend Zone</h1>
            <p className="text-zinc-400 text-sm max-w-sm text-center leading-relaxed mb-6">
              Select a friend from the sidebar to chat, view shared expenses, and dive into your mutual balances.
            </p>
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" /> Add Global Expense
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
                 <div className="text-[13px] text-zinc-400 mt-1">Paid ₹{insights.mostGenerous.total_paid_for_you} for you directly</div>
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
                 <div className="text-[13px] text-zinc-400 mt-1">With {insights.streaks[0].display_name}</div>
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
          availableUsers={friends.map(f => ({ id: f.id, display_name: f.display_name }))}
        />
      )}
    </div>
  );
};
