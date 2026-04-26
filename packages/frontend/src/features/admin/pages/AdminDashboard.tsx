import React, { useEffect, useState } from 'react';
import { Activity, Users, CreditCard, Radio, UserX, UserCheck, Play, TerminalSquare } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';

export const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // We need to inject the admin token manually if it's not set globally
  const adminToken = localStorage.getItem('adminToken');
  const adminApi = apiClient.create({
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        adminApi.get('/admin/stats'),
        adminApi.get(`/admin/users?q=${search}`),
        adminApi.get('/admin/audit-logs?limit=5')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.patch(`/admin/users/${userId}/status`, { isDisabled: !currentStatus });
      fetchData(); // refresh list
    } catch (err) {
      console.error(err);
    }
  };

  const triggerCron = async (job: string) => {
    try {
      await adminApi.post('/admin/cron/trigger', { job });
      alert(`Job ${job} triggered successfully!`);
    } catch (err) {
      alert('Failed to trigger job');
    }
  };

  if (isLoading && !stats) return <div className="text-zinc-500">Loading admin dashboard...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
        <p className="text-zinc-400 text-sm">System-wide metrics and status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-3 text-zinc-400 mb-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium uppercase tracking-wider">Total Users</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</div>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-3 text-zinc-400 mb-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium uppercase tracking-wider">Expenses</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats?.totalExpenses || 0}</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-3 text-zinc-400 mb-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium uppercase tracking-wider">Active Groups</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats?.activeGroups || 0}</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-3 text-zinc-400 mb-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-sm font-medium uppercase tracking-wider">WS Connections</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats?.activeWebsockets || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Management */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">User Management</h2>
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-red-500/50"
            />
          </div>

          <div className="bg-[#0a0a0c] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-zinc-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{u.display_name}</div>
                      <div className="text-xs text-zinc-500">@{u.username || 'unknown'}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      <div>{u.email}</div>
                      <div className="text-xs">{u.phone_number || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_disabled ? (
                        <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider">Disabled</span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => toggleUserStatus(u.id, u.is_disabled)}
                        className={`p-1.5 rounded-lg border transition-colors ${u.is_disabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}
                      >
                        {u.is_disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Logs & Actions */}
        <div className="space-y-8">
          
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Cron Jobs</h2>
            <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-2 space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 group">
                <div>
                  <div className="text-sm font-medium text-white">Send Reminders</div>
                  <div className="text-xs text-zinc-500">Triggers pending expense reminders</div>
                </div>
                <button 
                  onClick={() => triggerCron('sendReminders')}
                  className="p-2 rounded-full bg-cyan-500/10 text-cyan-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-cyan-500/20"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-4">Recent Audit Logs</h2>
            <div className="bg-[#0a0a0c] border border-white/10 rounded-xl overflow-hidden relative">
              <div className="p-4 space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      <TerminalSquare className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div>
                      <div className="text-sm text-white">
                        <span className="text-red-400 font-medium">{log.actor_name || 'System'}</span> performed <span className="font-mono text-xs bg-white/10 px-1 rounded">{log.action}</span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                        <span>•</span>
                        <span>{log.ip_address}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
