import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import { AppSidebar, SIDEBAR_NAVIGATION } from '@/shared/components/layout/AppSidebar';
import { AppHeader } from '@/shared/components/layout/AppHeader';
import { WorkspaceTabs } from '@/shared/components/workspace/WorkspaceTabs';
import { TopProgressBar, PageLoader } from '@/shared/components/ui';
import { CommandPalette } from '@/shared/components/workspace/CommandPalette';
import { useWorkspaceStore } from '@/shared/stores/workspaceStore';
import { useGlobalShortcuts } from '@/shared/hooks/useGlobalShortcuts';
import { cn } from '@/lib/utils';

export function WorkspaceLayout() {
  const hasTabs = useWorkspaceStore(state => state.tabs.length > 0);
  const location = useLocation();
  useGlobalShortcuts();

  const [isNavigating, setIsNavigating] = React.useState(false);
  const isFetching = useIsFetching();

  // Persistent sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('billaura_sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('billaura_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Trigger top progress animation on route transition
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 180);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  // Keep tabs list in sync when the browser URL pathname or search changes directly (clicks, page loads)
  useEffect(() => {
    // Skip sync for non-workspace paths
    if (
      location.pathname.startsWith('/auth') || 
      location.pathname.startsWith('/platform') || 
      location.pathname === '/' || 
      location.pathname === '/unauthorized'
    ) {
      return;
    }

    const currentFullPath = location.pathname + location.search;
    const baseRoute = location.pathname;

    const state = useWorkspaceStore.getState();

    // Normalize route to avoid leading/trailing slash mismatches and duplicate tabs
    const normalizedBase = baseRoute.replace(/^\/app/, '').replace(/^\/+/, '') || 'dashboard';

    // Match existing tab by stable base route or id
    const existingTab = state.tabs.find(t => {
      const tabBase = t.path.split('?')[0].replace(/^\/app/, '').replace(/^\/+/, '') || 'dashboard';
      const cleanId = t.id.replace(/^\/+/, '') || 'dashboard';
      return cleanId === normalizedBase || tabBase === normalizedBase;
    });

    if (existingTab) {
      if (existingTab.id !== state.activeTabId) {
        state.setActiveTab(existingTab.id);
      }
      if (existingTab.path !== currentFullPath) {
        state.updateTabPath(existingTab.id, currentFullPath);
      }
    } else {
      // Auto-register a new tab for direct navigation/link clicks
      const segments = location.pathname.split('/').filter(Boolean);
      let title = 'Document';
      
      // Match against sidebar navigation first
      let matchedSidebarLabel: string | undefined;
      for (const group of SIDEBAR_NAVIGATION) {
        const item = group.items.find(i => i.path === baseRoute);
        if (item) {
          matchedSidebarLabel = item.label;
          break;
        }
      }

      if (matchedSidebarLabel) {
        title = matchedSidebarLabel;
      } else if (location.pathname === '/invoices/new') {
        title = 'New Invoice';
      } else if (location.pathname === '/other-income') {
        const params = new URLSearchParams(location.search);
        const typeParam = params.get('type');
        title = typeParam || 'Other Income';
      } else if (location.pathname.startsWith('/accounting/ledger') && !segments[2]) {
        title = 'Search Ledger';
      } else if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        // Intercept database IDs (e.g., CUIDs starting with 'c' or standard UUIDs or long mongo IDs)
        const isDatabaseId = /^c[a-z0-9]{24}$/i.test(lastSegment) || 
                             /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastSegment) ||
                             /^[0-9a-f]{24}$/i.test(lastSegment);

        if (isDatabaseId) {
          const parentSegment = segments.length > 1 ? segments[segments.length - 2] : '';
          if (parentSegment) {
            // singularize parent segment (e.g., "employees" -> "Employee")
            let entityName = parentSegment.replace(/-/g, ' ');
            if (entityName.endsWith('s')) entityName = entityName.slice(0, -1);
            title = (entityName.charAt(0).toUpperCase() + entityName.slice(1)) + ' Details';
          } else {
            title = 'Loading Details...';
          }
        } else {
          title = lastSegment.replace(/-/g, ' ');
          title = title.charAt(0).toUpperCase() + title.slice(1);
        }
      }

      state.openTab({
        id: normalizedBase,
        title,
        path: currentFullPath,
      });
    }
  }, [location.pathname, location.search]);

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden font-sans text-foreground">
      {/* 1. Left Persistent & Responsive Modern Sidebar */}
      <AppSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* 2. Main Executive Viewport */}
      <div
        className={cn(
          "flex-1 flex flex-col h-full min-w-0 overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? "lg:pl-[68px]" : "lg:pl-[260px]"
        )}
      >
        <TopProgressBar isAnimating={isNavigating || isFetching > 0} />

        {/* Global Executive Header */}
        <AppHeader
          onMobileMenuToggle={() => setIsMobileOpen(true)}
        />

        {/* Workspace Open Tabs */}
        {hasTabs && (
          <div className="bg-background border-b border-border px-[var(--page-gutter)] flex items-center overflow-x-auto shrink-0 select-none">
            <WorkspaceTabs />
          </div>
        )}

        {/* Main Content Area - Primary vertical scroll container for document & form pages */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative bg-background flex flex-col">
          <Suspense
            fallback={
              <div className="flex-1 min-h-[400px] flex items-center justify-center p-8">
                <PageLoader
                  title="Loading View..."
                  description="Preparing workspace view..."
                />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Global Command Palette Trigger */}
      <CommandPalette />
    </div>
  );
}