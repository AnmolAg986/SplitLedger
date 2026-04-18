import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Activity, LayoutDashboard, Settings, PanelLeft, PanelLeftClose, LogOut, Users, Receipt, User, Clock, UserCheck, Layers } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { CommandPalette } from '../../features/dashboard/components/CommandPalette';

export const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  // We will build the full Command Palette logic in the next phase!
  // For now, it will be visually integrated into the sidebar.

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Activity', icon: Clock, path: '/activity', badge: '3' },
    { name: 'Friends', icon: UserCheck, path: '/friends' },
    { name: 'Groups', icon: Layers, path: '/groups' },
    { name: 'Expenses', icon: Receipt, path: '/expenses' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-white font-sans overflow-hidden">
      
      {/* Sidebar - Precision Transition */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} border-r border-white/10 bg-[#0c0c0e] flex flex-col justify-between hidden md:flex shadow-2xl relative transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-20`}
      >
        
        {/* Top Branding & Navigation */}
        <div className="flex flex-col h-full">
          {/* Header Block */}
          <div className={`p-5 flex items-center h-20 ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all duration-300`}>
            
            {/* Branding */}
            <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'w-0 opacity-0 absolute' : 'w-auto opacity-100 relative'} transition-all duration-500`}>
              <div className="h-10 w-10 shrink-0 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <h1 className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap">
                SplitLedger
              </h1>
            </div>

            {/* Manual Inline Toggle */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all group relative"
              title="Toggle Sidebar"
            >
              {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 px-3 mt-2 flex-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-4 px-3'} py-3 rounded-lg font-medium transition-all duration-200 group relative ` +
                  (isActive 
                    ? `text-white bg-white/10 shadow-sm border border-white/10` 
                    : `text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent`)
                }
                title={isCollapsed ? item.name : undefined}
              >
                {({ isActive }) => {
                  const Icon = item.icon;
                  return (
                    <>
                      <Icon className={`h-[20px] w-[20px] shrink-0 ${isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`} />
                      
                      {!isCollapsed && (
                        <div className="flex items-center justify-between w-full overflow-hidden transition-all duration-300">
                          <span className="text-[14px] whitespace-nowrap">{item.name}</span>
                          {/* Optional Notification Badge */}
                          {item.badge && (
                            <span className="ml-auto bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Glowing Accent Indicator */}
                      {isActive && (
                        <div className="absolute left-0 w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-r-md shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
                      )}
                    </>
                  );
                }}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Menu Items -> Separated out like Settings */}
        <div className="px-3 pb-4">
           <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-4 px-3'} py-3 rounded-lg font-medium transition-all duration-200 group relative ` +
                (isActive 
                  ? `text-white bg-white/10 shadow-sm border border-white/10` 
                  : `text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent`)
              }
              title={isCollapsed ? 'Settings' : undefined}
            >
              {({ isActive }) => (
                  <>
                    <Settings className={`h-[20px] w-[20px] shrink-0 ${isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    {!isCollapsed && <span className="text-[14px] whitespace-nowrap">Settings</span>}
                    {isActive && (
                      <div className="absolute left-0 w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-r-md shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
                    )}
                  </>
                )}
            </NavLink>
        </div>

        {/* Persistent User Profile & Logout section */}
        <div className={`p-4 border-t border-white/10 bg-[#0a0a0c] flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex flex-col whitespace-nowrap overflow-hidden pr-2">
              <span className="text-[13px] font-bold text-white leading-tight truncate">
                {user?.displayName || 'Unknown User'}
              </span>
              <span className="text-[11px] font-medium text-zinc-500 truncate max-w-[140px]">
                {user?.email || 'No Email'}
              </span>
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </aside>

      {/* Global Modals */}
      <CommandPalette />

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="flex-1 overflow-y-auto w-full h-full relative z-10">
            <Outlet />
        </div>
      </main>
    </div>
  );
};
