import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, Search, Settings, LogOut, Landmark, User 
} from 'lucide-react';
import { useSessionStore } from '../features/auth/stores/sessionStore';
import { Ribbon } from '@/shared/components/workspace/Ribbon';
import { WorkspaceTabs } from '@/shared/components/workspace/WorkspaceTabs';
import { CommandPalette } from '@/shared/components/workspace/CommandPalette';
import { QuickCreate } from '@/shared/components/workspace/QuickCreate';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { authService } from '../core/api';
import { ROUTES } from '@/config/routes.config';

export default function DashboardLayout() {
  const { user, clearSession } = useSessionStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { tabs, openTab, setActiveTab } = useWorkspaceStore();
  
  // Keep active tab in sync with URL on manual navigation/refresh
  useEffect(() => {
    const currentPath = location.pathname;
    const existingTab = tabs.find(t => t.path === currentPath);
    
    if (existingTab) {
      setActiveTab(existingTab.id);
    } else {
      // Auto-register a new tab if navigated directly
      // Very basic title extraction from path
      const segments = currentPath.split('/').filter(Boolean);
      let title = 'Document';
      if (segments.length > 0) {
        title = segments[segments.length - 1].replace(/-/g, ' ');
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
      
      openTab({
        id: currentPath,
        title,
        path: currentPath,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
    } finally {
      clearSession();
      navigate('/login');
    }
  };

  const userInitials = user?.name 
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
    : 'US';

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <CommandPalette />
      
      {/* 1. Header Area */}
      <header className="h-12 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight mr-4">
            <Landmark className="w-5 h-5 text-primary" />
            <span>Bill <span className="text-primary">Aura</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded-md text-foreground">FY 2026-27</span>
            <span>HQ Branch</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex relative w-64 group">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search (Ctrl+K)..."
              className="h-8 w-full rounded-md border border-input bg-muted/50 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              readOnly
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            />
          </div>

          <QuickCreate />

          <button className="relative p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-background"></span>
          </button>

          <div className="h-4 w-px bg-border mx-1"></div>

          <div className="flex items-center gap-2 group cursor-pointer relative">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              {userInitials}
            </div>
            <div className="absolute right-0 top-full mt-2 w-48 bg-popover rounded-md shadow-md border border-border p-1 hidden group-hover:block z-50">
              <div className="px-2 py-2 border-b border-border mb-1">
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <button onClick={() => navigate(ROUTES.PROFILE)} className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm flex items-center gap-2">
                <User className="w-4 h-4" /> Profile
              </button>
              <button onClick={() => navigate('/settings?tab=preferences')} className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm flex items-center gap-2">
                <Settings className="w-4 h-4" /> Preferences
              </button>
              <button 
                onClick={handleLogout}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-red-500/10 text-red-500 rounded-sm flex items-center gap-2 mt-1 border-t border-border pt-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Top Ribbon */}
      <Ribbon />

      {/* 3. Workspace Tabs */}
      <WorkspaceTabs />

      {/* 4. Main Workspace Area */}
      <main className="flex-1 bg-[#f8f9fa] dark:bg-[#0a0a0a] overflow-auto relative shadow-inner">
        <div className="h-full w-full p-4 md:p-6">
          {/* We use Outlet for the current route. In a more advanced implementation, 
              we could map through all openTabs and render them hidden to preserve state. */}
          <Outlet />
        </div>
      </main>
      
      {/* 5. Status Bar (Optional Footer) */}
      <footer className="h-6 border-t border-border bg-muted/30 flex items-center justify-between px-4 shrink-0 text-[10px] text-muted-foreground">
        <div className="flex gap-4">
          <span>Ready</span>
          <span>Sync: Active</span>
        </div>
        <div>
          <span>Bill Aura Enterprise v1.0</span>
        </div>
      </footer>
    </div>
  );
}
