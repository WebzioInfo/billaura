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

// Registry of all application menus, reports, forms and setting paths
const STATIC_PAGES: Omit<SearchItem, 'score'>[] = [
  // Home
  { id: 'dashboard', title: 'Dashboard', category: 'Home', breadcrumb: 'Home > Dashboard', icon: 'LayoutDashboard', path: '/dashboard', type: 'page' },
  { id: 'profile', title: 'My Profile', category: 'Home', breadcrumb: 'Home > My Profile', icon: 'User', path: '/profile', type: 'page' },

  // Sales Module
  { id: 'customers', title: 'Customers', category: 'Sales', breadcrumb: 'Sales > Customers', icon: 'Users', path: '/customers', type: 'page' },
  { id: 'leads', title: 'Leads', category: 'Sales', breadcrumb: 'Sales > Leads', icon: 'Target', path: '/leads', type: 'page' },
  { id: 'quotations', title: 'Quotations', category: 'Sales', breadcrumb: 'Sales > Quotations', icon: 'MessageSquare', path: '/quotations', type: 'page' },
  { id: 'sales-orders', title: 'Sales Orders', category: 'Sales', breadcrumb: 'Sales > Sales Orders', icon: 'FileSpreadsheet', path: '/sales-orders', type: 'page' },
  { id: 'delivery-notes', title: 'Delivery Notes', category: 'Sales', breadcrumb: 'Sales > Delivery Notes', icon: 'Truck', path: '/delivery-notes', type: 'page' },
  { id: 'invoices', title: 'Invoices', category: 'Sales', breadcrumb: 'Sales > Invoices', icon: 'FileText', path: '/invoices', type: 'page' },
  { id: 'payments', title: 'Payments Received', category: 'Sales', breadcrumb: 'Sales > Payments', icon: 'DollarSign', path: '/payments', type: 'page' },
  { id: 'credit-notes', title: 'Credit Notes', category: 'Sales', breadcrumb: 'Sales > Credit Notes', icon: 'CreditCard', path: '/credit-notes', type: 'page' },
  { id: 'sales-returns', title: 'Sales Returns', category: 'Sales', breadcrumb: 'Sales > Returns', icon: 'RefreshCw', path: '/sales-returns', type: 'page' },
  { id: 'receipts', title: 'Receipts', category: 'Sales', breadcrumb: 'Sales > Receipts', icon: 'Receipt', path: '/receipts', type: 'page' },
  { id: 'customer-statements', title: 'Customer Statements', category: 'Sales', breadcrumb: 'Sales > Statements', icon: 'BarChart3', path: '/customer-statements', type: 'page' },

  // Income Module
  { id: 'other-income', title: 'Other Income', category: 'Income', breadcrumb: 'Income > Other Income', icon: 'Coins', path: '/other-income?type=Other Income', type: 'page' },
  { id: 'service-income', title: 'Service Income', category: 'Income', breadcrumb: 'Income > Service Income', icon: 'Wrench', path: '/other-income?type=Service Income', type: 'page' },
  { id: 'rental-income', title: 'Rental Income', category: 'Income', breadcrumb: 'Income > Rental Income', icon: 'Building2', path: '/other-income?type=Rental Income', type: 'page' },
  { id: 'interest-income', title: 'Interest Income', category: 'Income', breadcrumb: 'Income > Interest Income', icon: 'TrendingUp', path: '/other-income?type=Interest Income', type: 'page' },
  { id: 'recurring-income', title: 'Recurring Income', category: 'Income', breadcrumb: 'Income > Recurring Income', icon: 'RefreshCw', path: '/other-income?type=Recurring Income', type: 'page' },
  { id: 'income-categories', title: 'Income Categories', category: 'Income', breadcrumb: 'Income > Categories', icon: 'Tag', path: '/other-income?tab=categories', type: 'page' },

  // Purchases Module
  { id: 'vendors', title: 'Vendors', category: 'Purchases', breadcrumb: 'Purchases > Vendors', icon: 'Users', path: '/vendors', type: 'page' },
  { id: 'purchase-orders', title: 'Purchase Orders', category: 'Purchases', breadcrumb: 'Purchases > Purchase Orders', icon: 'FileSpreadsheet', path: '/purchase-orders', type: 'page' },
  { id: 'goods-receipts', title: 'Goods Receipts', category: 'Purchases', breadcrumb: 'Purchases > Goods Receipts', icon: 'Truck', path: '/goods-receipts', type: 'page' },
  { id: 'bills', title: 'Bills', category: 'Purchases', breadcrumb: 'Purchases > Bills', icon: 'Receipt', path: '/bills', type: 'page' },
  { id: 'vendor-payments', title: 'Vendor Payments', category: 'Purchases', breadcrumb: 'Purchases > Vendor Payments', icon: 'DollarSign', path: '/vendor-payments', type: 'page' },
  { id: 'debit-notes', title: 'Debit Notes', category: 'Purchases', breadcrumb: 'Purchases > Debit Notes', icon: 'CreditCard', path: '/debit-notes', type: 'page' },
  { id: 'purchase-returns', title: 'Purchase Returns', category: 'Purchases', breadcrumb: 'Purchases > Returns', icon: 'RefreshCw', path: '/purchase-returns', type: 'page' },
  { id: 'vendor-statements', title: 'Vendor Statements', category: 'Purchases', breadcrumb: 'Purchases > Statements', icon: 'BarChart3', path: '/vendor-statements', type: 'page' },

  // Inventory Module
  { id: 'products', title: 'Products', category: 'Inventory', breadcrumb: 'Inventory > Products', icon: 'Box', path: '/products', type: 'page' },
  { id: 'services', title: 'Services', category: 'Inventory', breadcrumb: 'Inventory > Services', icon: 'Wrench', path: '/services', type: 'page' },
  { id: 'categories', title: 'Categories', category: 'Inventory', breadcrumb: 'Inventory > Categories', icon: 'Tag', path: '/categories', type: 'page' },
  { id: 'brands', title: 'Brands', category: 'Inventory', breadcrumb: 'Inventory > Brands', icon: 'Tag', path: '/brands', type: 'page' },
  { id: 'warehouses', title: 'Warehouses', category: 'Inventory', breadcrumb: 'Inventory > Warehouses', icon: 'Building2', path: '/warehouses', type: 'page' },
  { id: 'batches', title: 'Inventory Batches', category: 'Inventory', breadcrumb: 'Inventory > Batches', icon: 'Binary', path: '/batches', type: 'page' },
  { id: 'serials', title: 'Serial Numbers', category: 'Inventory', breadcrumb: 'Inventory > Serial Numbers', icon: 'Tag', path: '/serials', type: 'page' },
  { id: 'bom', title: 'BOM (Bill of Materials)', category: 'Inventory', breadcrumb: 'Inventory > BOM', icon: 'Layers', path: '/bom', type: 'page' },
  { id: 'inventory-adjustments', title: 'Inventory Adjustments', category: 'Inventory', breadcrumb: 'Inventory > Adjustments', icon: 'Wrench', path: '/inventory', type: 'page' },

  // Accounting Module
  { id: 'coa', title: 'Chart of Accounts', category: 'Accounting', breadcrumb: 'Accounting > Chart of Accounts', icon: 'BookOpen', path: '/chart-of-accounts', type: 'page' },
  { id: 'journals', title: 'Journal Entries', category: 'Accounting', breadcrumb: 'Accounting > Journal Entries', icon: 'BookOpen', path: '/journal-entries', type: 'page' },
  { id: 'expenses', title: 'Expenses Claims Dashboard', category: 'Accounting', breadcrumb: 'Accounting > Expenses', icon: 'Receipt', path: '/expenses', type: 'page' },
  { id: 'banking', title: 'Banking Dashboard', category: 'Accounting', breadcrumb: 'Accounting > Banking', icon: 'Landmark', path: '/banking', type: 'page' },
  { id: 'bank-transactions', title: 'Bank Transactions', category: 'Accounting', breadcrumb: 'Accounting > Transactions', icon: 'CreditCard', path: '/bank-transactions', type: 'page' },
  { id: 'reconciliation', title: 'Reconciliation Center', category: 'Accounting', breadcrumb: 'Accounting > Reconciliation', icon: 'RefreshCw', path: '/reconciliation', type: 'page' },
  { id: 'general-ledger', title: 'General Ledger', category: 'Accounting', breadcrumb: 'Accounting > General Ledger', icon: 'BookOpen', path: '/general-ledger', type: 'page' },
  { id: 'trial-balance', title: 'Trial Balance', category: 'Accounting', breadcrumb: 'Accounting > Trial Balance', icon: 'BarChart3', path: '/trial-balance', type: 'page' },
  { id: 'profit-loss', title: 'Profit & Loss Statement', category: 'Accounting', breadcrumb: 'Accounting > Profit & Loss', icon: 'TrendingUp', path: '/profit-loss', type: 'page' },
  { id: 'balance-sheet', title: 'Balance Sheet', category: 'Accounting', breadcrumb: 'Accounting > Balance Sheet', icon: 'Building2', path: '/balance-sheet', type: 'page' },
  { id: 'cash-flow', title: 'Cash Flow Statement', category: 'Accounting', breadcrumb: 'Accounting > Cash Flow', icon: 'DollarSign', path: '/cash-flow', type: 'page' },
  { id: 'budgets', title: 'Budgets', category: 'Accounting', breadcrumb: 'Accounting > Budgets', icon: 'Coins', path: '/budgets', type: 'page' },
  { id: 'cost-centres', title: 'Cost Centres', category: 'Accounting', breadcrumb: 'Accounting > Cost Centres', icon: 'Target', path: '/cost-centres', type: 'page' },

  // Banking Module
  { id: 'bank-accounts', title: 'Bank Accounts', category: 'Banking', breadcrumb: 'Banking > Bank Accounts', icon: 'Landmark', path: '/banking', type: 'page' },
  { id: 'bank-reconciliation', title: 'Bank Reconciliation', category: 'Banking', breadcrumb: 'Banking > Bank Reconciliation', icon: 'RefreshCw', path: '/bank-reconciliation', type: 'page' },

  // GST Module
  { id: 'gstr-1', title: 'GSTR-1 Return Filing', category: 'GST', breadcrumb: 'GST > GSTR-1', icon: 'FileText', path: '/gstr-1', type: 'page' },
  { id: 'gstr-2b', title: 'GSTR-2B Input Credit', category: 'GST', breadcrumb: 'GST > GSTR-2B', icon: 'FileText', path: '/gstr-2b', type: 'page' },
  { id: 'gstr-3b', title: 'GSTR-3B Monthly Return', category: 'GST', breadcrumb: 'GST > GSTR-3B', icon: 'FileText', path: '/gstr-3b', type: 'page' },
  { id: 'taxes', title: 'Tax Rates & GST Settings', category: 'GST', breadcrumb: 'GST > Tax Rates', icon: 'Percent', path: '/taxes', type: 'page' },

  // HR & Payroll Module
  { id: 'employees', title: 'Employees', category: 'HR & Payroll', breadcrumb: 'HR > Employees', icon: 'Users', path: '/employees', type: 'page' },
  { id: 'departments', title: 'Departments', category: 'HR & Payroll', breadcrumb: 'HR > Departments', icon: 'Building2', path: '/departments', type: 'page' },
  { id: 'payroll', title: 'Payroll Dashboard', category: 'HR & Payroll', breadcrumb: 'HR > Payroll', icon: 'DollarSign', path: '/payroll', type: 'page' },
  { id: 'attendance', title: 'Attendance Logs', category: 'HR & Payroll', breadcrumb: 'HR > Attendance', icon: 'Calendar', path: '/attendance', type: 'page' },
  { id: 'leaves', title: 'Leave Applications', category: 'HR & Payroll', breadcrumb: 'HR > Leave Applications', icon: 'DoorOpen', path: '/leaves', type: 'page' },
  { id: 'salary-slips', title: 'Salary Slips', category: 'HR & Payroll', breadcrumb: 'HR > Salary Slips', icon: 'Receipt', path: '/salary-slips', type: 'page' },

  // Assets & Projects
  { id: 'fixed-assets', title: 'Fixed Assets Ledger', category: 'Assets & Projects', breadcrumb: 'Assets > Fixed Assets', icon: 'Building2', path: '/fixed-assets', type: 'page' },
  { id: 'projects', title: 'Project Accounting', category: 'Assets & Projects', breadcrumb: 'Projects > Project Accounting', icon: 'Folder', path: '/projects', type: 'page' },

  // Reports
  { id: 'report-sales', title: 'Sales Reports Summary', category: 'Reports', breadcrumb: 'Reports > Sales', icon: 'BarChart3', path: '/reports/sales', type: 'page' },
  { id: 'report-purchases', title: 'Purchase Reports Summary', category: 'Reports', breadcrumb: 'Reports > Purchases', icon: 'BarChart3', path: '/reports/purchases', type: 'page' },
  { id: 'report-gst', title: 'GST Reports Summary', category: 'Reports', breadcrumb: 'Reports > GST', icon: 'BarChart3', path: '/reports/gst', type: 'page' },
  { id: 'report-inventory', title: 'Inventory Reports Summary', category: 'Reports', breadcrumb: 'Reports > Inventory', icon: 'BarChart3', path: '/reports/inventory', type: 'page' },
  { id: 'report-financial', title: 'Financial Reports Summary', category: 'Reports', breadcrumb: 'Reports > Financial', icon: 'BarChart3', path: '/reports/financial', type: 'page' },
  { id: 'report-payroll', title: 'Payroll Reports Summary', category: 'Reports', breadcrumb: 'Reports > Payroll', icon: 'BarChart3', path: '/reports/payroll', type: 'page' },

  // Settings
  { id: 'settings-company', title: 'Company Settings Profile', category: 'Settings', breadcrumb: 'Settings > Company Profile', icon: 'Building2', path: '/company', type: 'page' },
  { id: 'settings-users', title: 'Users & Roles Management', category: 'Settings', breadcrumb: 'Settings > Users & Roles', icon: 'Users', path: '/users', type: 'page' },
  { id: 'settings-sequences', title: 'Document Sequence Settings', category: 'Settings', breadcrumb: 'Settings > Document Sequences', icon: 'Binary', path: '/sequences', type: 'page' },
  { id: 'settings-backup', title: 'Backup & Restore Center', category: 'Settings', breadcrumb: 'Settings > Backup & Restore', icon: 'Database', path: '/backup-restore', type: 'page' },

  // Action Shortcuts / Creation Forms
  { id: 'new-invoice', title: 'Create New Invoice', category: 'Actions', breadcrumb: 'Actions > New Invoice', icon: 'PlusCircle', path: '/invoices/new', type: 'action' },
  { id: 'new-bill', title: 'Record New Vendor Bill', category: 'Actions', breadcrumb: 'Actions > New Bill', icon: 'PlusCircle', path: '/bills/new', type: 'action' },
];

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

import apiClient from '@/services/api';

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
