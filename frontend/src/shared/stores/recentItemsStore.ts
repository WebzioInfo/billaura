import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentItem {
  id: string;
  type: 'Customer' | 'Vendor' | 'Invoice' | 'Ledger' | 'Report' | 'Page';
  title: string;
  path: string;
  timestamp: number;
}

interface RecentItemsState {
  items: RecentItem[];
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void;
  clearRecentItems: () => void;
}

export const useRecentItemsStore = create<RecentItemsState>()(
  persist(
    (set) => ({
      items: [],
      addRecentItem: (item) => set((state) => {
        const filtered = state.items.filter((i) => i.id !== item.id);
        const newItem = { ...item, timestamp: Date.now() };
        return {
          // Keep only the 20 most recent items
          items: [newItem, ...filtered].slice(0, 20),
        };
      }),
      clearRecentItems: () => set({ items: [] }),
    }),
    {
      name: 'billaura-recent-items',
    }
  )
);
