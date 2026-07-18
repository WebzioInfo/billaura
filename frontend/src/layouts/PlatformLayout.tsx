import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, LogOut, Menu, X, ChevronDown, User, Bell, Shield,
  CreditCard, LifeBuoy, DollarSign, Activity, FileText, Settings
} from 'lucide-react';
import { useSessionStore } from '../features/auth/stores/sessionStore';
import { authService } from '../core/api';
import { Ribbon } from '@/shared/components/workspace/Ribbon';
import { AiCopilot } from '@/shared/components/workspace/AiCopilot';

export default function PlatformLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearSession } = useSessionStore();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
    } finally {
      clearSession();
      navigate('/login');
    }
  };

  const coreNavItems = [
    { name: 'Dashboard', path: '/platform/dashboard', icon: LayoutDashboard },
    { name: 'Companies', path: '/platform/companies', icon: Users },
    { name: 'Subscriptions', path: '/platform/subscriptions', icon: Shield },
    { name: 'Plans', path: '/platform/plans', icon: CreditCard },
    { name: 'Users', path: '/platform/users', icon: Users },
    { name: 'Support', path: '/platform/support', icon: LifeBuoy },
    { name: 'Revenue', path: '/platform/revenue', icon: DollarSign },
    { name: 'System Monitoring', path: '/platform/monitoring', icon: Activity },
    { name: 'Audit Logs', path: '/platform/logs', icon: FileText },
    { name: 'Settings', path: '/platform/settings', icon: Settings },
    { name: 'Notifications', path: '/platform/notifications', icon: Bell },
    { name: 'Platform Profile', path: '/platform/profile', icon: User },
  ];

  const userInitials = user?.name 
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
    : 'SA';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex transition-colors duration-300">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <img src="/logo2.png" alt="Bill Aura Logo" className="h-8 w-auto object-contain" />
            <span><span className="text-indigo-400 text-xs uppercase tracking-widest ml-1">Platform</span></span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          <div className="space-y-1.5">
            {coreNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4 relative">
            <div className="relative">
              <button 
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {userInitials}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {userDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || 'Super Admin'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-grow overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
      <AiCopilot />
    </div>
  );
}
