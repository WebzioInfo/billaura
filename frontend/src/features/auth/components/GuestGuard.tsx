import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '../stores/sessionStore';

export const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useSessionStore((state: any) => state.isAuthenticated);
  const location = useLocation();

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
