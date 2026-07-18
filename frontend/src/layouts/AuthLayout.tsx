import React, { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '../features/auth/stores/sessionStore';

export default function AuthLayout() {
  const { isAuthenticated, user } = useSessionStore();
  const location = useLocation();

  useEffect(() => {
    // Force light mode on authentication screens
    document.documentElement.classList.remove('dark');
  }, []);

  if (isAuthenticated && user) {
    // Determine the dashboard based on role
    const defaultDashboard = user.globalRole === 'SUPER_ADMIN' ? '/platform/dashboard' : '/dashboard';
    const from = location.state?.from?.pathname || defaultDashboard;
    return <Navigate to={from} replace />;
  }

  // Lightweight inline SVG pattern for the repeating "WEBZIO" watermark
  // Renders a rotated "WEBZIO" text at 22 degrees with ~2.5% opacity
  const watermarkStyle = {
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='100'><text x='50%' y='50%' fill='%23111827' font-size='28' font-weight='900' font-family='system-ui, -apple-system, sans-serif' opacity='0.05' transform='rotate(-22 120 80)' text-anchor='middle'>WEBZIO</text></svg>")`,
    backgroundRepeat: 'repeat',
  };

  return (
    <div
      style={watermarkStyle}
      className="min-h-screen w-full bg-[#faf9f6] flex flex-col items-center justify-center px-4 py-12 select-none relative"
    >
      {/* Centered Login Card wrapper */}
      <div className="w-full max-w-[440px] bg-white border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/45 p-8 sm:p-10 z-10">
        <Outlet />
      </div>

      {/* Minimal Footer */}
      <footer className="mt-8 text-center space-y-1 text-[10px] tracking-wide text-slate-400 font-mono z-10">
        <div className="flex items-center justify-center gap-2">
          <span>Version v4.0.0-enterprise</span>
          <span>&bull;</span>
          <span>A Product by Webzio</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Bill Aura ERP. All rights reserved.</p>
      </footer>
    </div>
  );
}
