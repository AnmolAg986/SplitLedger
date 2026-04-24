import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './features/auth/pages/Login';
import { Signup } from './features/auth/pages/Signup';
import { VerifyEmail } from './features/auth/pages/VerifyEmail';
import { ForgotPassword } from './features/auth/pages/ForgotPassword';
import { ResetPassword } from './features/auth/pages/ResetPassword';
import { ProtectedRoute } from './app/routes/ProtectedRoute';
import { DashboardLayout } from './app/layouts/DashboardLayout';
import { Dashboard } from './features/dashboard/pages/Dashboard';

import { FriendDetail } from './features/friends/pages/FriendDetail';
import { GroupDetail } from './features/groups/pages/GroupDetail';
import { JoinGroup } from './features/groups/pages/JoinGroup';
import { Activity } from './features/dashboard/pages/Activity';
import { Profile } from './features/dashboard/pages/Profile';
import { PublicProfile } from './features/friends/pages/PublicProfile';
import { Connections } from './features/connections/pages/Connections';
import { ToastContainer } from './shared/components/ToastContainer';
import { PWAPrompt } from './shared/components/PWAPrompt';
import { NotificationPreferences } from './features/profile/pages/NotificationPreferences';
import { Analytics } from './features/profile/pages/Analytics';
import { useEffect } from 'react';
import { useThemeStore } from './shared/store/useThemeStore';

const ThemeManager = () => {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return null;
};

export const App = () => {
  return (
    <BrowserRouter>
      <ThemeManager />
      <ToastContainer />
      <PWAPrompt />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Public Routes */}
        <Route path="/u/:username" element={<PublicProfile />} />
        
        {/* Protected Navigation Shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            
            <Route path="/" element={<Dashboard />} />
            
            <Route path="/connections" element={<Connections />} />
            <Route path="/friends/:id" element={<FriendDetail />} />
            <Route path="/groups/:id" element={<GroupDetail />} />
            <Route path="/join/:token" element={<JoinGroup />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/notifications" element={<NotificationPreferences />} />
            <Route path="/profile/analytics" element={<Analytics />} />

            {/* Legacy redirects */}
            <Route path="/friends" element={<Navigate to="/connections?tab=friends" replace />} />
            <Route path="/groups" element={<Navigate to="/connections?tab=groups" replace />} />

          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
