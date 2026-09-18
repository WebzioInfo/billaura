import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Sun,
  Moon,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Building2,
  Sparkles,
  Command,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { useThemeStore } from '@/features/theme/themeStore';
import { authService } from '@/core/api';
import { AppBreadcrumbs } from './AppBreadcrumbs';
import { QuickCreate } from '@/shared/components/workspace/QuickCreate';
import { NotificationCenter } from '@/shared/components/ui/NotificationCenter';

interface AppHeaderProps {
  onMobileMenuToggle: () => void;
  onOpenCommandPalette?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onMobileMenuToggle,
  onOpenCommandPalette,
}) => {
  const navigate = useNavigate();
  const user = useSessionStore(state => state.user);
  const clearSession = useSessionStore(state => state.clearSession);
  const { theme, setTheme } = useThemeStore();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [userDropdownOpen]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue cleanup
    } finally {
      clearSession();
      navigate('/login');
    }
  };

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  const userRole = user?.globalRole === 'SUPER_ADMIN' ? 'Super Admin' : (user?.role || 'Admin');
  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="h-14 bg-surface border-b border-border/70 px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 select-none z-30">
      {/* 1. LEFT: Mobile Drawer Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuToggle}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 lg:hidden cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block truncate">
          <AppBreadcrumbs />
        </div>
      </div>

      {/* 2. CENTER: Global Search Trigger Button */}
      <div className="flex-1 max-w-md hidden md:flex items-center justify-center px-2">
        <button
          onClick={() => {
            // Trigger native Ctrl+K event or open modal
            if (onOpenCommandPalette) {
              onOpenCommandPalette();
            } else {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
            }
          }}
          className="w-full h-8 px-3 rounded-xl bg-muted/40 border border-border/70 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/70 transition-all flex items-center justify-between text-xs cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="truncate">Search ERP modules, invoices, ledgers...</span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-background border border-border/80 text-muted-foreground shadow-2xs">
            <span>Ctrl</span>
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* 3. RIGHT: Actions & User Menu */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Quick Create Action */}
        <QuickCreate />

        {/* Notifications Center Bell */}
        <NotificationCenter />

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer border border-transparent hover:border-border/60"
            aria-expanded={userDropdownOpen}
            aria-haspopup="true"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary">
              {userInitials}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-foreground truncate max-w-[100px]">
                {user?.name || 'User'}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                {userRole}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {/* User Popover Menu */}
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-2xl border border-border py-1.5 z-50 animate-slideDown overflow-hidden">
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-border/60">
                <div className="font-bold text-xs text-foreground truncate">
                  {user?.name || 'Authorized User'}
                </div>
                <div className="text-[11px] text-muted-foreground truncate font-mono">
                  {user?.email}
                </div>
                <div className="mt-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {userRole}
                  </span>
                </div>
              </div>

              {/* Links */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-muted/60 flex items-center gap-2.5 text-foreground cursor-pointer transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-muted/60 flex items-center gap-2.5 text-foreground cursor-pointer transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Company Settings</span>
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/help');
                  }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-muted/60 flex items-center gap-2.5 text-foreground cursor-pointer transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Help & Documentation</span>
                </button>
              </div>

              {/* Sign Out */}
              <div className="border-t border-border/60 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-red-500/10 text-red-600 flex items-center gap-2.5 cursor-pointer transition-colors font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
