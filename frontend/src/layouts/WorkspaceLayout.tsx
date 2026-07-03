import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/workspace/TopBar';
import { Ribbon } from '@/components/workspace/Ribbon';
import { WorkspaceTabs } from '@/components/workspace/WorkspaceTabs';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';

export function WorkspaceLayout() {
  const { tabs, activeTabId } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();
  useGlobalShortcuts();

  // Keep tabs list in sync when the browser URL pathname changes directly (clicks, page loads)
  useEffect(() => {
    const currentPath = location.pathname;

    // Skip sync for non-workspace paths
    if (
      currentPath.startsWith('/auth') || 
      currentPath.startsWith('/platform') || 
      currentPath === '/' || 
      currentPath === '/unauthorized'
    ) {
      return;
    }

    const state = useWorkspaceStore.getState();

    const existingTab = state.tabs.find(t => {
      const expected = t.path.startsWith('/app/') ? t.path.replace('/app', '') : t.path;
      return expected === currentPath;
    });

    if (existingTab) {
      if (existingTab.id !== state.activeTabId) {
        state.setActiveTab(existingTab.id);
      }
    } else {
      // Auto-register a new tab for direct navigation/link clicks
      const segments = currentPath.split('/').filter(Boolean);
      let title = 'Document';
      if (currentPath === '/invoices/new') {
        title = 'New Invoice';
      } else if (segments.length > 0) {
        title = segments[segments.length - 1].replace(/-/g, ' ');
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }

      state.openTab({
        id: currentPath,
        title,
        path: currentPath,
      });
    }
  }, [location.pathname]);

  // Keep browser URL pathname in sync when activeTabId changes (e.g. clicking a tab or closing one)
  useEffect(() => {
    const state = useWorkspaceStore.getState();
    // ALWAYS use the latest state.activeTabId, as the first effect might have just updated it synchronously.
    // Using the activeTabId from the dependency array closure can be stale in this specific render cycle,
    // leading to a ping-pong navigation loop between routes.
    const currentActiveTabId = state.activeTabId;
    const activeTab = state.tabs.find(t => t.id === currentActiveTabId);
    if (activeTab) {
      const expectedPath = activeTab.path.startsWith('/app/') ? activeTab.path.replace('/app', '') : activeTab.path;
      if (expectedPath !== location.pathname) {
        navigate(expectedPath);
      }
    }
  }, [activeTabId, location.pathname, navigate]);

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden font-sans">
      <TopBar />
      <Ribbon />
      
      {tabs.length > 0 && <WorkspaceTabs />}
      
      <main className="flex-1 overflow-auto relative">
        <div className="absolute inset-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}