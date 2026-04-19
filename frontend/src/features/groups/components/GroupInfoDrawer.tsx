import { toast } from '../../../shared/store/useToastStore';
import React, { useState, useEffect } from 'react';
import { X, Crown, UserPlus, LogOut, Trash2, Search, Loader2, Edit2 } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  detail: any;
  onRefresh: () => void;
}

export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({ isOpen, onClose, detail, onRefresh }) => {
  const currentUser = useAuthStore(s => s.user);
  const currentUserId = currentUser?.id;
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: detail.name, description: detail.description || '' });
  const [templates, setTemplates] = useState<any[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, type });
  };

  const myRole = detail?.members?.find((m: any) => m.id === currentUserId)?.role;
  const isAdmin = myRole === 'admin';

  const handleSearchMembers = async (query: string) => {
    setMemberSearch(query);
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await apiClient.get('/friends');
      const existingIds = new Set(detail.members.map((m: any) => m.id));
      const filtered = res.data.filter((f: any) =>
        !existingIds.has(f.id) &&
        (f.display_name?.toLowerCase().includes(query.toLowerCase()) ||
         f.email?.toLowerCase().includes(query.toLowerCase()) ||
         f.phone_number?.toLowerCase().includes(query.toLowerCase()))
      );
      setSearchResults(filtered);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    setActionLoading(userId);
    try {
      await apiClient.post(`/groups/${detail.id}/members`, { userId });
      setMemberSearch('');
      setSearchResults([]);
      setShowAddMember(false);
      toast.success('Member added successfully');
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to add member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = (userId: string, name: string) => {
    showConfirm(
      'Remove Member',
      `Are you sure you want to remove ${name} from this group?`,
      async () => {
        setActionLoading(userId);
        try {
          await apiClient.delete(`/groups/${detail.id}/members/${userId}`);
          toast.success(`${name} removed`);
          onRefresh();
        } catch (err: any) {
          toast.error('Failed to remove member');
        } finally {
          setActionLoading(null);
        }
      },
      'danger'
    );
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    setActionLoading(userId);
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await apiClient.put(`/groups/${detail.id}/members/${userId}/role`, { role: newRole });
      toast.success('Role updated');
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveGroup = () => {
    showConfirm(
      'Leave Group',
      'Are you sure you want to leave this group?',
      async () => {
        setActionLoading('leave');
        try {
          await apiClient.delete(`/groups/${detail.id}/members/${currentUserId}`);
          toast.success('You have left the group');
          window.location.href = '/groups';
        } catch (err: any) {
          toast.error('Failed to leave group');
        } finally {
          setActionLoading(null);
        }
      },
      'warning'
    );
  };

  const handleUpdateGroup = async () => {
    setActionLoading('update');
    try {
      await apiClient.put(`/groups/${detail.id}`, editForm);
      toast.success('Group updated');
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to update group');
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchiveGroup = () => {
    const isArchiving = !detail.is_archived;
    showConfirm(
      isArchiving ? 'Archive Group' : 'Unarchive Group',
      `Are you sure you want to ${isArchiving ? 'archive' : 'unarchive'} this group?`,
      async () => {
        setActionLoading('archive');
        try {
          await apiClient.post(`/groups/${detail.id}/archive`, { isArchived: isArchiving });
          toast.success(isArchiving ? 'Group archived' : 'Group unarchived');
          onRefresh();
        } catch (err: any) {
          toast.error('Failed to update archive status');
        } finally {
          setActionLoading(null);
        }
      }
    );
  };

  const handleDeleteGroup = () => {
    showConfirm(
      'Delete Group',
      'Are you ABSOLUTELY sure? This action is permanent and will delete all group history and expenses.',
      async () => {
        setActionLoading('delete');
        try {
          await apiClient.delete(`/groups/${detail.id}`);
          toast.success('Group deleted permanently');
          window.location.href = '/groups';
        } catch (err: any) {
          toast.error('Failed to delete group');
        } finally {
          setActionLoading(null);
        }
      },
      'danger'
    );
  };

  const fetchTemplates = async () => {
    try {
      const res = await apiClient.get(`/groups/${detail.id}/templates`);
      setTemplates(res.data.filter((t: any) => t.is_active));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    showConfirm(
      'Cancel Recurring',
      'Are you sure you want to cancel this recurring expense?',
      async () => {
        try {
          await apiClient.delete(`/groups/templates/${templateId}`);
          toast.success('Recurring expense canceled');
          fetchTemplates();
        } catch (err) {
          toast.error('Failed to cancel recurring expense');
        }
      },
      'warning'
    );
  };

  useEffect(() => {
    if (isOpen && detail?.id) {
      setEditForm({ name: detail.name, description: detail.description || '' });
      fetchTemplates();
    }
  }, [isOpen, detail?.id, detail?.name, detail?.description]);

  if (!isOpen || !detail) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-sm h-full bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/30">
          <h3 className="text-lg font-bold text-white">Group Info</h3>
          <div className="flex items-center gap-2">
            {isAdmin && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Group Identity */}
          <div className="p-6 border-b border-white/5">
            {isEditing ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-4 mx-auto">
                   <span className="text-2xl font-black text-indigo-400">{editForm.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Name</label>
                  <input 
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Description</label>
                  <textarea 
                    value={editForm.description}
                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                    rows={2}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Short purpose of this group..."
                  />
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                    onClick={handleUpdateGroup}
                    disabled={actionLoading === 'update'}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
                   >
                     Save
                   </button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-4 mx-auto relative group/avatar">
                  <span className="text-2xl font-black text-indigo-400">{detail.name?.charAt(0)?.toUpperCase()}</span>
                  {detail.is_archived && (
                    <div className="absolute -top-1 -right-1 bg-amber-500 text-black p-1 rounded-full border-2 border-zinc-900" title="Archived">
                      <Trash2 className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white text-center mb-1">{detail.name}</h2>
                <p className="text-xs text-zinc-500 text-center font-medium uppercase tracking-widest">{detail.type}</p>
                {detail.description && (
                  <p className="text-[13px] text-zinc-400 text-center mt-3 leading-relaxed">{detail.description}</p>
                )}
                <p className="text-[10px] text-zinc-600 text-center mt-4">
                  Created {new Date(detail.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </>
            )}
          </div>

          {/* Members */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {detail.members?.length} Members
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>

            {/* Add Member Search */}
            {showAddMember && (
              <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={e => handleSearchMembers(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Search friends..."
                    autoFocus
                  />
                </div>
                {searching && <div className="text-center py-2"><Loader2 className="w-4 h-4 animate-spin text-zinc-500 mx-auto" /></div>}
                {searchResults.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleAddMember(f.id)}
                    disabled={actionLoading === f.id}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                      {f.display_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{f.display_name}</p>
                    </div>
                    {actionLoading === f.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Members List */}
            <div className="flex flex-col gap-1">
              {detail.members?.map((m: any) => {
                const isSelf = m.id === currentUserId;
                const memberIsAdmin = m.role === 'admin';
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {m.display_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {m.display_name} {isSelf && <span className="text-zinc-500 font-normal">(You)</span>}
                        </span>
                        {memberIsAdmin && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                            <Crown className="w-2.5 h-2.5" /> Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-600 font-medium">
                        Joined {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    {/* Admin Actions */}
                    {isAdmin && !isSelf && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleToggleRole(m.id, m.role)}
                          disabled={actionLoading === m.id}
                          className="p-1.5 text-indigo-400/60 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-all"
                        >
                          {actionLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleRemoveMember(m.id, m.display_name)}
                          disabled={actionLoading === m.id}
                          className="p-1.5 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                        >
                          {actionLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recurring Expenses */}
          <div className="p-5 border-t border-white/5">
             <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
                Recurring Expenses
             </h4>
             <div className="flex flex-col gap-2">
               {templates.length === 0 ? (
                 <p className="text-[11px] text-zinc-600">No active recurring expenses.</p>
               ) : (
                 templates.map(t => (
                   <div key={t.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between group/tmp">
                     <div className="min-w-0">
                       <p className="text-xs font-bold text-white truncate">{t.template.description}</p>
                       <p className="text-[10px] text-zinc-500">₹{t.template.amount} • {t.frequency}</p>
                     </div>
                     <button 
                       onClick={() => handleDeleteTemplate(t.id)}
                       className="opacity-0 group-hover/tmp:opacity-100 p-1.5 text-zinc-500 hover:text-rose-400 transition-all"
                     >
                        <X className="w-3.5 h-3.5" />
                     </button>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>

        {/* Footer: Leave/Archive Group */}
        <div className="p-4 border-t border-white/5 shrink-0 space-y-2">
          {isAdmin ? (
            <>
              <button
                onClick={handleArchiveGroup}
                disabled={actionLoading !== null}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-colors ${detail.is_archived ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'}`}
              >
                <Trash2 className="w-4 h-4" />
                {detail.is_archived ? 'Unarchive Group' : 'Archive Group'}
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={actionLoading !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold hover:bg-rose-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            </>
          ) : (
            <button
              onClick={handleLeaveGroup}
              disabled={actionLoading !== null}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold hover:bg-rose-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Leave Group
            </button>
          )}
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </div>
  );
};
