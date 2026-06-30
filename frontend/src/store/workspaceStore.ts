import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tab {
  id: string; // unique identifier (e.g. 'invoices-123', 'profit-loss')
  title: string;
  path: string; // The react-router path to render in this tab
  icon?: string;
  isPinned?: boolean;
}

interface WorkspaceState {
  tabs: Tab[];
  activeTabId: string | null;
  
  // Actions
  openTab: (tab: Omit<Tab, 'isPinned'>) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  reorderTabs: (startIndex: number, endIndex: number) => void;
  closeAll: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      tabs: [{ id: 'dashboard', title: 'Dashboard', path: '/dashboard', isPinned: true }],
      activeTabId: 'dashboard',

      openTab: (newTab) => {
        set((state) => {
          // If tab already exists, just make it active
          if (state.tabs.some(t => t.id === newTab.id)) {
            return { activeTabId: newTab.id };
          }
          // Otherwise add it
          return {
            tabs: [...state.tabs, { ...newTab, isPinned: false }],
            activeTabId: newTab.id,
          };
        });
      },

      closeTab: (id) => {
        set((state) => {
          const tabIndex = state.tabs.findIndex(t => t.id === id);
          if (tabIndex === -1) return state;
          
          const tabToClose = state.tabs[tabIndex];
          if (tabToClose.isPinned) return state; // Don't close pinned tabs easily

          const newTabs = state.tabs.filter(t => t.id !== id);
          let newActiveId = state.activeTabId;

          // If we closed the active tab, switch to the nearest left tab (or right if it was the first)
          if (state.activeTabId === id && newTabs.length > 0) {
            const newIndex = Math.max(0, tabIndex - 1);
            newActiveId = newTabs[newIndex].id;
          } else if (newTabs.length === 0) {
            newActiveId = null;
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveId,
          };
        });
      },

      setActiveTab: (id) => set({ activeTabId: id }),

      pinTab: (id) => set((state) => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, isPinned: true } : t)
      })),

      unpinTab: (id) => set((state) => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, isPinned: false } : t)
      })),

      reorderTabs: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.tabs);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { tabs: result };
      }),
      
      closeAll: () => set((state) => ({
        tabs: state.tabs.filter(t => t.isPinned), // Keep pinned tabs
        activeTabId: state.tabs.find(t => t.isPinned)?.id || null
      }))
    }),
    {
      name: 'billaura-workspace-storage',
    }
  )
);
