import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';

// Eagerly loaded — needed immediately on first render
import { Login } from './features/auth/pages/Login';
import { Signup } from './features/auth/pages/Signup';
import { VerifyEmail } from './features/auth/pages/VerifyEmail';
import { ForgotPassword } from './features/auth/pages/ForgotPassword';
import { ResetPassword } from './features/auth/pages/ResetPassword';
import { ProtectedRoute } from './app/routes/ProtectedRoute';
import { DashboardLayout } from './app/layouts/DashboardLayout';
import { Dashboard } from './features/dashboard/pages/Dashboard';
import { ToastContainer } from './shared/components/ToastContainer';
import { PWAPrompt } from './shared/components/PWAPrompt';
import { CookieConsentBanner } from './shared/components/CookieConsentBanner';
import { useThemeStore } from './shared/store/useThemeStore';

// Lazily loaded — only fetched when the user navigates to these routes (14.7)
const FriendDetail = lazy(() => import('./features/friends/pages/FriendDetail').then(m => ({ default: m.FriendDetail })));
const GroupDetail = lazy(() => import('./features/groups/pages/GroupDetail').then(m => ({ default: m.GroupDetail })));
const JoinGroup = lazy(() => import('./features/groups/pages/JoinGroup').then(m => ({ default: m.JoinGroup })));
const Activity = lazy(() => import('./features/dashboard/pages/Activity').then(m => ({ default: m.Activity })));
const Profile = lazy(() => import('./features/dashboard/pages/Profile').then(m => ({ default: m.Profile })));
const PublicProfile = lazy(() => import('./features/friends/pages/PublicProfile').then(m => ({ default: m.PublicProfile })));
const Connections = lazy(() => import('./features/connections/pages/Connections').then(m => ({ default: m.Connections })));
const NotificationPreferences = lazy(() => import('./features/profile/pages/NotificationPreferences').then(m => ({ default: m.NotificationPreferences })));
const Analytics = lazy(() => import('./features/profile/pages/Analytics').then(m => ({ default: m.Analytics })));

const PageFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
  </div>
);

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
      <CookieConsentBanner />
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </BrowserRouter>
  );
};
