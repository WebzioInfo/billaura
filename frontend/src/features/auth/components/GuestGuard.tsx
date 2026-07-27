import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';

export const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useSessionStore();
  const location = useLocation();

  if (isAuthenticated) {
    const defaultDashboard = user?.globalRole === 'SUPER_ADMIN' ? '/platform/dashboard' : '/dashboard';
    const from = location.state?.from?.pathname || defaultDashboard;
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
