export interface SearchItem {
  id: string;
  title: string;
  category: string;
  breadcrumb: string;
  icon: string;
  path: string;
  type: 'page' | 'action' | 'entity';
  score?: number;
}

export interface SearchProvider {
  name: string;
  search: (query: string) => Promise<SearchItem[]> | SearchItem[];
}

// Global registry of pluggable search providers
const providers: SearchProvider[] = [];

export function registerSearchProvider(provider: SearchProvider) {
  if (!providers.some(p => p.name === provider.name)) {
    providers.push(provider);
  }
}

// Helper to determine if character sequence matches fuzzily
export function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let qIdx = 0;
  for (let tIdx = 0; tIdx < t.length; tIdx++) {
    if (t[tIdx] === q[qIdx]) {
      qIdx++;
      if (qIdx === q.length) return true;
    }
  }
  return false;
}

// Core ranking scoring algorithm
export function getMatchScore(title: string, query: string): number {
  const t = title.toLowerCase();
  const q = query.toLowerCase();

  if (t === q) return 100; // Exact match
  if (t.startsWith(q)) return 80; // Starts with
  if (t.includes(q)) return 60; // Contains
  if (fuzzyMatch(title, query)) return 40; // Fuzzy sequence match
  return 0; // No match
}

import { ERP_NAVIGATION } from '@/config/navigation.config';

// Base dynamic pages from unified ERP_NAVIGATION config
const dynamicPages: Omit<SearchItem, 'score'>[] = ERP_NAVIGATION.flatMap(module => 
  module.items.map(item => ({
    id: item.id,
    title: item.label,
    category: module.label,
    breadcrumb: `${module.label} > ${item.label}`,
    icon: item.icon || 'Box',
    path: item.path,
    type: 'page' as const
  }))
);

// Action Shortcuts / Creation Forms
const actionShortcuts: Omit<SearchItem, 'score'>[] = [
  { id: 'new-invoice', title: 'Create New Invoice', category: 'Actions', breadcrumb: 'Actions > New Invoice', icon: 'PlusCircle', path: '/invoices/new', type: 'action' },
  { id: 'new-bill', title: 'Record New Vendor Bill', category: 'Actions', breadcrumb: 'Actions > New Bill', icon: 'PlusCircle', path: '/bills/new', type: 'action' },
  { id: 'new-receipt', title: 'Create New Receipt', category: 'Actions', breadcrumb: 'Actions > New Receipt', icon: 'PlusCircle', path: '/receipts/new', type: 'action' },
];

const STATIC_PAGES: Omit<SearchItem, 'score'>[] = [...dynamicPages, ...actionShortcuts];

// Register Default Static Pages Provider
const staticPagesProvider: SearchProvider = {
  name: 'static-pages',
  search: (query: string) => {
    const results: SearchItem[] = [];
    
    for (const page of STATIC_PAGES) {
      const score = getMatchScore(page.title, query);
      if (score > 0) {
        results.push({ ...page, score });
      }
    }
    
    return results;
  }
};

import apiClient from '@/core/api';

registerSearchProvider(staticPagesProvider);

// Dynamic Ledger Accounts Search Provider
const accountsProvider: SearchProvider = {
  name: 'ledger-accounts',
  search: async (query: string) => {
    try {
      const res = await apiClient.get('/accounts/lookup', {
        params: { search: query, limit: 10 }
      });
      const items = res.data?.data || [];
      return items.map((acc: any) => ({
        id: `ledger-${acc.id}`,
        title: `${acc.name}${acc.code ? ` (${acc.code})` : ''}`,
        category: 'Ledger Inquiry',
        breadcrumb: `Accounting > Chart of Accounts > ${acc.name}`,
        icon: 'BookOpen',
        path: `/accounting/ledger/${acc.id}`,
        type: 'entity',
        score: getMatchScore(acc.name, query) + 5
      }));
    } catch {
      return [];
    }
  }
};

registerSearchProvider(accountsProvider);

// Core search method running against all registered search providers
export async function searchAll(query: string): Promise<SearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const list: SearchItem[] = [];

  for (const provider of providers) {
    try {
      const providerResults = await provider.search(trimmed);
      list.push(...providerResults);
    } catch (e) {
      console.error(`Search provider ${provider.name} failed:`, e);
    }
  }

  // Sort: Score descending (Tier 1 -> Tier 2 -> Tier 3 -> Tier 4), then alphabetically
  return list.sort((a, b) => {
    const scoreA = a.score || 0;
    const scoreB = b.score || 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return a.title.localeCompare(b.title);
  });
}
