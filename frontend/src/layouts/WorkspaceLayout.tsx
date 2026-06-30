import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/workspace/TopBar';
import { Ribbon } from '@/components/workspace/Ribbon';
import { WorkspaceTabs } from '@/components/workspace/WorkspaceTabs';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';

export function WorkspaceLayout() {
  const { tabs, activeTabId, setActiveTab } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();
  useGlobalShortcuts();

  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      // Fix stale paths from localStorage
      const expectedPath = activeTab.path.startsWith('/app/') ? activeTab.path.replace('/app', '') : activeTab.path;
      if (expectedPath !== location.pathname) {
        navigate(expectedPath, { replace: true });
      }
    }
  }, [activeTabId, navigate, location.pathname, tabs]);

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