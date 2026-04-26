import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Shield, Users, Activity, FileText, LogOut } from 'lucide-react';

export const AdminLayout = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  if (!token) {
    // Optionally return null and let a useEffect redirect, but for simplicity:
    return <Outlet />; // AdminLogin will handle itself
  }

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#0a0a0c] border-r border-white/10 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <span className="font-bold tracking-widest text-sm uppercase">Admin Panel</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 text-white cursor-pointer">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-medium text-sm">Dashboard</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white cursor-pointer transition-colors">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-sm">Users</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white cursor-pointer transition-colors">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-sm">Audit Logs</span>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-zinc-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
