import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { Users, Loader2, Plus, UsersRound, X, Search } from 'lucide-react';
import type { Group, GroupMember } from '../types/group';
import { toast } from '../../../shared/store/useToastStore';

export const Groups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', type: 'trip', customType: '', defaultDueDay: '' });
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<GroupMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<GroupMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [isArchivedView, setIsArchivedView] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await apiClient.get('/groups');
      setGroups(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [isArchivedView]);

  const refreshData = () => {
    setLoading(true);
    fetchGroups();
  };

  // Search friends to add as group members
  useEffect(() => {
    if (!memberSearch.trim()) {
      Promise.resolve().then(() => setSearchResults([]));
      return; 
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get<GroupMember[]>(`/friends`);
        const friends = res.data.filter((f) =>
          f.display_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          f.email?.toLowerCase().includes(memberSearch.toLowerCase())
        );
        // Filter out already-selected members
        const selectedIds = new Set(selectedMembers.map((m) => m.id));
        setSearchResults(friends.filter((f) => !selectedIds.has(f.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [memberSearch, selectedMembers]);

  const addMember = (user: GroupMember) => {
    setSelectedMembers(prev => [...prev, user]);
    setMemberSearch('');
    setSearchResults([]);
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== userId));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMembers.length === 0) {
      toast.error('Please add at least one other member (friend) to create a group.');
      return;
    }
    try {
      const payloadType = newGroup.type === 'other' && newGroup.customType.trim() !== '' ? newGroup.customType : newGroup.type;
      const res = await apiClient.post<{ id: string }>('/groups', {
        name: newGroup.name,
        type: payloadType,
        memberIds: selectedMembers.map(m => m.id),
        defaultDueDay: newGroup.defaultDueDay ? parseInt(newGroup.defaultDueDay) : null
      });

      setShowCreateModal(false);
      setSelectedMembers([]);
      setNewGroup({ name: '', type: 'trip', customType: '', defaultDueDay: '' });
      navigate(`/groups/${res.data.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to create group');
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setSelectedMembers([]);
    setNewGroup({ name: '', type: 'trip', customType: '', defaultDueDay: '' });
    setMemberSearch('');
    setSearchResults([]);
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Groups</h1>
          <p className="text-sm text-zinc-400">Collaborate and split expenses together</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
           <button 
            onClick={() => setIsArchivedView(false)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!isArchivedView ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-white'}`}
           >
             Active
           </button>
           <button 
            onClick={() => setIsArchivedView(true)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isArchivedView ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-white'}`}
           >
             Archived
           </button>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto min-h-[44px]">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search groups..." 
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-[13px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            {groupSearch && (
              <button 
                onClick={() => setGroupSearch('')}
                className="absolute right-2 top-2 p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-500 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-indigo-500/20 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Create Group</span><span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center z-10 relative">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-4">
            <UsersRound className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No groups yet</h3>
          <p className="text-zinc-500 text-sm max-w-sm">Create a group to start tracking expenses for trips, apartments, or events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {(Array.isArray(groups) ? groups : [])
            .filter(g => Boolean(g.is_archived) === isArchivedView)
            .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
            .map((g) => (
            <button 
              key={g.id}
              onClick={() => navigate(`/groups/${g.id}`)}
              className="group text-left p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all shadow-xl backdrop-blur-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <Users className="w-6 h-6 text-indigo-400" />
                </div>
                <span className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500 bg-white/5 px-2 py-1 rounded border border-white/5">
                  {g.type}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">{g.name}</h3>
              <div className="flex items-center text-zinc-400 text-sm font-medium">
                <UsersRound className="w-4 h-4 mr-2 text-zinc-500" /> {g.member_count} members
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-lg font-bold text-white">Create New Group</h3>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
               <div>
                 <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Group Name</label>
                 <input 
                   type="text" 
                   value={newGroup.name}
                   onChange={e => setNewGroup({...newGroup, name: e.target.value})}
                   className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-indigo-500 transition-colors"
                   placeholder="e.g. Goa Trip 2026"
                   required
                 />
               </div>
               <div>
                 <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Group Type</label>
                 <select 
                   value={newGroup.type}
                   onChange={e => setNewGroup({...newGroup, type: e.target.value})}
                   className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-indigo-500 appearance-none"
                 >
                   <option value="trip">Trip</option>
                   <option value="home">Home / Apartment</option>
                   <option value="rent">Rent</option>
                   <option value="event">Event / Party</option>
                   <option value="subscription">Subscription</option>
                   <option value="other">Other</option>
                 </select>
               </div>
               
               {newGroup.type === 'other' && (
                 <div className="animate-in slide-in-from-top-2 duration-300">
                   <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Specify Type</label>
                   <input 
                     type="text" 
                     value={newGroup.customType}
                     onChange={e => setNewGroup({...newGroup, customType: e.target.value})}
                     className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-indigo-500 transition-colors"
                     placeholder="e.g. Project, Book Club..."
                     required
                   />
                 </div>
               )}

               <div>
                 <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Monthly Due Day (Optional)</label>
                 <input 
                   type="number" 
                   min="1" 
                   max="31"
                   value={newGroup.defaultDueDay}
                   onChange={e => setNewGroup({...newGroup, defaultDueDay: e.target.value})}
                   className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-indigo-500 transition-colors"
                   placeholder="e.g. 5 for the 5th of every month"
                 />
                 <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">Useful for Rent or Subscriptions. This will auto-set the due date for new expenses in this group.</p>
               </div>

               {/* Add Members Section */}
               <div>
                 <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                   Add Members <span className="text-rose-400">*</span>
                 </label>
                 
                 {/* Selected members chips */}
                 {selectedMembers.length > 0 && (
                   <div className="flex flex-wrap gap-2 mb-3">
                     {selectedMembers.map(m => (
                       <span key={m.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-300 font-bold">
                         {m.display_name}
                         <button type="button" onClick={() => removeMember(m.id)} className="hover:text-white transition-colors">
                           <X className="w-3 h-3" />
                         </button>
                       </span>
                     ))}
                   </div>
                 )}

                 {/* Search input */}
                 <div className="relative">
                   <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                   <input
                     type="text"
                     value={memberSearch}
                     onChange={e => setMemberSearch(e.target.value)}
                     className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-[14px] text-white focus:outline-none focus:border-indigo-500 transition-colors"
                     placeholder="Search friends"
                   />
                 </div>

                 {/* Search results dropdown */}
                 {(searchResults.length > 0 || searching) && (
                   <div className="mt-2 bg-black/70 border border-white/10 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                     {searching ? (
                       <div className="p-3 text-center"><Loader2 className="w-4 h-4 animate-spin text-zinc-500 mx-auto" /></div>
                     ) : (
                       searchResults.map(f => (
                         <button
                           key={f.id}
                           type="button"
                           onClick={() => addMember(f)}
                           className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                         >
                           <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                             {f.display_name?.charAt(0)?.toUpperCase()}
                           </div>
                           <div>
                             <p className="text-sm font-medium text-white">{f.display_name}</p>
                             <p className="text-[11px] text-zinc-500">{f.email}</p>
                           </div>
                         </button>
                       ))
                     )}
                   </div>
                 )}

                  {selectedMembers.length === 0 && (
                    <p className="text-[11px] text-zinc-500 mt-2 font-medium italic">You'll be added automatically. Add at least one other friend.</p>
                  )}
                </div>


                <div className="flex justify-end gap-3 pt-2 shrink-0">
                  <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={selectedMembers.length === 0}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-500 text-white hover:bg-indigo-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Create Group
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
