import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';

export function useDynamicTitle(title?: string | null) {
  const location = useLocation();
  const updateTabTitle = useWorkspaceStore(state => state.updateTabTitle);

  useEffect(() => {
    if (title) {
      updateTabTitle(location.pathname + location.search, title);
      document.title = `${title} | Bill Aura`;
    }
  }, [title, location.pathname, location.search, updateTabTitle]);
}
