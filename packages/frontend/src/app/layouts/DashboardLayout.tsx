import { LazyImage } from '../../shared/components/LazyImage';
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Activity, LayoutDashboard, Settings, PanelLeft, PanelLeftClose, LogOut, Users, Receipt, User, Clock, Bell, Moon, Sun, Monitor, Languages } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { CommandPalette } from '../../features/dashboard/components/CommandPalette';
import { useSocket } from '../../shared/hooks/useSocket';
import { toast } from '../../shared/store/useToastStore';
import { useUnreadStore } from '../../shared/store/useUnreadStore';
import { useNotificationStore } from '../../shared/store/useNotificationStore';
import { useSettingsStore } from '../../shared/store/useSettingsStore';
import { useThemeStore } from '../../shared/store/useThemeStore';
import { NotificationCenter } from '../../shared/components/NotificationCenter';
import { ShortcutOverlay } from '../../shared/components/ShortcutOverlay';
import { useHotkeys } from 'react-hotkeys-hook';
import { CreateExpenseModal } from '../../shared/components/CreateExpenseModal';
import { OnboardingModal } from '../../shared/components/OnboardingModal';
import { ChangelogModal } from '../../shared/components/ChangelogModal';
import { apiClient } from '../../shared/api/axios';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DashboardLayout = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isGlobalExpenseOpen, setIsGlobalExpenseOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [changelogData, setChangelogData] = useState<{ version: string; content: string } | null>(null);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const { theme, setTheme } = useThemeStore();

  useHotkeys('ctrl+n, cmd+n', (e) => {
    e.preventDefault();
    setIsGlobalExpenseOpen(true);
    apiClient.get('/friends').then(res => setFriends(res.data)).catch(console.error);
  }, { enableOnFormTags: false });
  const { on, isConnected } = useSocket();
  const { fetchCounts, handleUpdate, getPageCount, getTotalActivityCount } = useUnreadStore();

  React.useEffect(() => {
    if (isConnected) {
      fetchCounts();
    }
  }, [isConnected, fetchCounts]);

  React.useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const res = await apiClient.get('/system/changelog');
        const { latestVersion, content } = res.data;
        setChangelogData({ version: latestVersion, content });

        const lastSeen = localStorage.getItem('splitledger_changelog_version');
        if (lastSeen !== latestVersion) {
          setHasNewUpdate(true);
        }
      } catch (err) {
        console.error('Failed to fetch changelog:', err);
      }
    };
    fetchChangelog();
  }, []);

  React.useEffect(() => {
    const unsub = on('notification', (data: any) => {
      // Add to store if it's a structured notification payload
      if (data.id) {
        useNotificationStore.getState().addNotification(data);
      }
      
      const { isMuted } = useSettingsStore.getState();
      const shouldMute = data.entityType === 'friend' && data.entityId && isMuted(data.entityId);
      
      if (!shouldMute) {
        // Still show toast for immediate feedback
        if (data.type === 'reminder') {
          toast.info(data.message || data.body);
        } else {
          toast.success(data.message || data.body);
        }
      }
    });

    const unsub2 = on('unread_update', (data: any) => {
      handleUpdate(data);
    });

    return () => {
      if (unsub) unsub();
      if (unsub2) unsub2();
    };
  }, [on, handleUpdate]);

  // We will build the full Command Palette logic in the next phase!
  // For now, it will be visually integrated into the sidebar.

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cycleLanguage = () => {
    const nextLang = i18n.language.startsWith('en') ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const cycleTheme = () => {
    if (theme === 'system') setTheme('dark');
    else if (theme === 'dark') setTheme('light');
    else setTheme('system');
  };

  const totalActivityBadge = getTotalActivityCount();
  const friendsBadge = getPageCount('friend');
  const groupsBadge = getPageCount('group');
  const connectionsBadge = friendsBadge + groupsBadge;

  const menuItems = [
    { name: t('nav.dashboard'), icon: LayoutDashboard, path: '/' },
    { name: t('nav.activity'), icon: Clock, path: '/activity', badge: totalActivityBadge > 0 ? (totalActivityBadge > 99 ? '99+' : totalActivityBadge.toString()) : undefined },
    { name: t('nav.connections'), icon: Users, path: '/connections', badge: connectionsBadge > 0 ? (connectionsBadge > 99 ? '99+' : connectionsBadge.toString()) : undefined },
    { name: t('nav.expenses'), icon: Receipt, path: '/expenses' },
    { name: t('nav.profile'), icon: User, path: '/profile' },
  ];

  return (
    <div className="flex h-screen w-screen bg-gray-50 dark:bg-[#050505] text-zinc-900 dark:text-white font-sans overflow-hidden transition-colors duration-300">
      
      {/* Sidebar - Precision Transition */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} border-r border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0c0c0e] flex flex-col justify-between hidden md:flex shadow-2xl relative transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-20`}
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
                      <div className="relative flex items-center justify-center">
                        <Icon className={`h-[20px] w-[20px] shrink-0 ${isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`} />
                        {isCollapsed && item.badge && (
                          <span className="absolute -top-1.5 -right-2 bg-cyan-500 text-black text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#0c0c0e] shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      
                      {!isCollapsed && (
                        <div className="flex items-center justify-between w-full overflow-hidden transition-all duration-300">
                          <span className="text-[14px] whitespace-nowrap">{item.name}</span>
                          {/* Optional Notification Badge */}
                          {item.badge && (
                            <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)]">
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
           <button
              onClick={() => {
                setIsChangelogOpen(true);
                if (changelogData) {
                  localStorage.setItem('splitledger_changelog_version', changelogData.version);
                  setHasNewUpdate(false);
                }
              }}
              className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-4 px-3'} py-3 mb-1 rounded-lg font-medium transition-all duration-200 group relative text-zinc-500 hover:text-zinc-200 hover:bg-white/5`}
              title={isCollapsed ? t('common.whatsNew') : undefined}
            >
                <div className="relative flex items-center justify-center">
                  <Sparkles className={`h-[20px] w-[20px] shrink-0 text-zinc-500 group-hover:text-zinc-300 transition-colors ${hasNewUpdate ? 'text-indigo-400 group-hover:text-indigo-300' : ''}`} />
                  {isCollapsed && hasNewUpdate && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-transparent text-[0px] w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full overflow-hidden transition-all duration-300">
                    <span className={`text-[14px] whitespace-nowrap ${hasNewUpdate ? 'text-indigo-400' : ''}`}>{t('common.whatsNew')}</span>
                    {hasNewUpdate && (
                      <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                )}
            </button>
           <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-4 px-3'} py-3 rounded-lg font-medium transition-all duration-200 group relative ` +
                (isActive 
                  ? `text-white bg-white/10 shadow-sm border border-white/10` 
                  : `text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent`)
              }
              title={isCollapsed ? t('nav.settings') : undefined}
            >
              {({ isActive }) => (
                  <>
                    <Settings className={`h-[20px] w-[20px] shrink-0 ${isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    {!isCollapsed && <span className="text-[14px] whitespace-nowrap">{t('nav.settings')}</span>}
                    {isActive && (
                      <div className="absolute left-0 w-1 h-6 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-r-md shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
                    )}
                  </>
                )}
            </NavLink>
        </div>

        {/* Persistent User Profile & Logout section */}
        <div className={`p-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0a0a0c] flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'gap-3'}`}>
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-white shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              <LazyImage src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.avatarUrl}`} alt={user?.displayName} className="w-full h-full object-cover" />
            ) : (
              user?.displayName?.charAt(0)?.toUpperCase()
            )}
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 flex flex-col whitespace-nowrap overflow-hidden pr-2">
              <span className="text-[13px] font-bold text-zinc-800 dark:text-white leading-tight truncate">
                {user?.displayName || 'Unknown User'}
              </span>
              <span className="text-[11px] font-medium text-zinc-500 truncate max-w-[140px]">
                {user?.email || 'No Email'}
              </span>
            </div>
          )}
          
          <div className={`flex ${isCollapsed ? 'flex-col gap-2' : 'gap-1'}`}>
            <button 
              onClick={cycleLanguage}
              className="p-2 rounded-lg text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
              title={`Language: ${i18n.language.toUpperCase()}`}
              aria-label={`Toggle language (currently ${i18n.language.toUpperCase()})`}
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
            </button>
            <button 
              onClick={cycleTheme}
              className="p-2 rounded-lg text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
              title={`Theme: ${theme}`}
              aria-label={`Toggle theme (currently ${theme})`}
            >
              {theme === 'system' ? <Monitor className="h-4 w-4" aria-hidden="true" /> : theme === 'dark' ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title={t('nav.signOut')}
              aria-label={t('nav.signOut')}
            >
              <LogOut className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Global Modals & Slide-overs */}
      <CommandPalette />
      <NotificationCenter />
      <ShortcutOverlay />

      {user && !user.onboardingCompleted && (
        <OnboardingModal onComplete={() => useAuthStore.setState({ user: { ...user, onboardingCompleted: true } })} />
      )}

      {isGlobalExpenseOpen && user && (
        <CreateExpenseModal 
          onClose={() => setIsGlobalExpenseOpen(false)}
          onSuccess={() => { toast.success('Expense added successfully!'); setIsGlobalExpenseOpen(false); }}
          currentUserId={user.id}
          availableUsers={[
            { id: user.id, display_name: user.displayName || 'You' },
            ...friends.map(f => ({ id: f.id, display_name: f.display_name }))
          ]}
        />
      )}

      {changelogData && (
        <ChangelogModal
          isOpen={isChangelogOpen}
          onClose={() => setIsChangelogOpen(false)}
          markdownContent={changelogData.content}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col pb-[72px] md:pb-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        {/* Top Actions (Floating Topbar) */}
        <NotificationBell />

        <div className="flex-1 overflow-y-auto w-full h-full relative z-10 custom-scrollbar">
            <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-zinc-200 dark:border-white/10 z-50 flex items-center justify-around px-4 pb-[env(safe-area-inset-bottom)]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-colors relative ` +
                (isActive ? 'text-cyan-500' : 'text-zinc-500 dark:text-zinc-400')
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    {item.badge && (
                      <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg ring-2 ring-white dark:ring-[#0c0c0e]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium tracking-wide">
                    {item.name}
                  </span>
                  {isActive && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-cyan-500 rounded-b-full" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

const NotificationBell = () => {
  const unreadCount = useNotificationStore(s => s.unreadCount);
  return (
    <div className="absolute top-4 right-6 z-30 flex items-center gap-3">
      <button 
        onClick={() => useNotificationStore.getState().setIsOpen(true)}
        className="relative p-2.5 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/50 rounded-full text-zinc-400 hover:text-white transition-all backdrop-blur-md shadow-lg"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.4)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
