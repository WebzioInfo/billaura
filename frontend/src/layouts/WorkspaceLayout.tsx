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

  // Keep tabs list in sync when the browser URL pathname or search changes directly (clicks, page loads)
  useEffect(() => {
    const currentPath = location.pathname + location.search;

    // Skip sync for non-workspace paths
    if (
      location.pathname.startsWith('/auth') || 
      location.pathname.startsWith('/platform') || 
      location.pathname === '/' || 
      location.pathname === '/unauthorized'
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
      const segments = location.pathname.split('/').filter(Boolean);
      let title = 'Document';
      if (location.pathname === '/invoices/new') {
        title = 'New Invoice';
      } else if (location.pathname === '/other-income') {
        const params = new URLSearchParams(location.search);
        const typeParam = params.get('type');
        title = typeParam || 'Other Income';
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
  }, [location.pathname, location.search]);

  // Keep browser URL pathname & search in sync when activeTabId changes (e.g. clicking a tab or closing one)
  useEffect(() => {
    const state = useWorkspaceStore.getState();
    const currentActiveTabId = state.activeTabId;
    const activeTab = state.tabs.find(t => t.id === currentActiveTabId);
    if (activeTab) {
      const expectedPath = activeTab.path.startsWith('/app/') ? activeTab.path.replace('/app', '') : activeTab.path;
      if (expectedPath !== (location.pathname + location.search)) {
        navigate(expectedPath);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, navigate]);

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