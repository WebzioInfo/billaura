import { create } from 'zustand';

interface HelpState {
  isOpen: boolean;
  currentArticleId: string | null;
  searchQuery: string;
  
  openHelp: (articleId?: string) => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  setSearchQuery: (query: string) => void;
}

export const useHelpStore = create<HelpState>((set) => ({
  isOpen: false,
  currentArticleId: null,
  searchQuery: '',

  openHelp: (articleId?: string) => set((state) => ({ 
    isOpen: true, 
    currentArticleId: articleId || state.currentArticleId 
  })),
  
  closeHelp: () => set({ isOpen: false, searchQuery: '' }),
  
  toggleHelp: () => set((state) => ({ isOpen: !state.isOpen })),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
