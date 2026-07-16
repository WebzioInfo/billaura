import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteItem {
  id: string;
  type: 'Customer' | 'Vendor' | 'Invoice' | 'Ledger' | 'Report' | 'Page';
  title: string;
  path: string;
}

interface FavoritesState {
  items: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      addFavorite: (item) => set((state) => {
        if (state.items.some(i => i.id === item.id)) return state;
        return { items: [...state.items, item] };
      }),
      removeFavorite: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      })),
      toggleFavorite: (item) => set((state) => {
        const exists = state.items.some((i) => i.id === item.id);
        if (exists) {
          return { items: state.items.filter((i) => i.id !== item.id) };
        }
        return { items: [...state.items, item] };
      }),
      isFavorite: (id) => get().items.some((i) => i.id === id),
      clearFavorites: () => set({ items: [] }),
    }),
    {
      name: 'billaura-favorites',
    }
  )
);
