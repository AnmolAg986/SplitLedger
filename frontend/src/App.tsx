import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './features/auth/pages/Login';
import { Signup } from './features/auth/pages/Signup';
import { VerifyEmail } from './features/auth/pages/VerifyEmail';
import { ForgotPassword } from './features/auth/pages/ForgotPassword';
import { ResetPassword } from './features/auth/pages/ResetPassword';
import { ProtectedRoute } from './app/routes/ProtectedRoute';
import { DashboardLayout } from './app/layouts/DashboardLayout';
import { Dashboard } from './features/dashboard/pages/Dashboard';

import { Friends } from './features/friends/pages/Friends';
import { FriendDetail } from './features/friends/pages/FriendDetail';
import { Groups } from './features/groups/pages/Groups';
import { GroupDetail } from './features/groups/pages/GroupDetail';
import { JoinGroup } from './features/groups/pages/JoinGroup';
import { Activity } from './features/dashboard/pages/Activity';
import { ToastContainer } from './shared/components/ToastContainer';

export const App = () => {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected Navigation Shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            
            <Route path="/" element={<Dashboard />} />
            
            <Route path="/friends" element={<Friends />} />
            <Route path="/friends/:id" element={<FriendDetail />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:id" element={<GroupDetail />} />
            <Route path="/join/:token" element={<JoinGroup />} />
            <Route path="/activity" element={<Activity />} />

          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
