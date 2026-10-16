import apiClient from '@/core/api';

export type ReportDateMode = 'period' | 'asOf';

export interface ReportDefinition {
  key: string;
  title: string;
  category: string;
  description: string;
  dateMode: ReportDateMode;
  supportsBasis?: boolean; // Accrual vs Cash
  supportsCompare?: boolean; // None, Previous Period, Previous Year
  supportsColumns?: boolean;
  endpoint?: string;
  fetchData: (params: {
    startDate?: string;
    endDate?: string;
    asOfDate?: string;
    basis?: string;
    compareWith?: string;
  }) => Promise<any>;
}

export const REPORT_CATEGORIES = [
  'Business Overview',
  'Sales',
  'Receivables',
  'Payables',
  'Purchases and Expenses',
  'Taxes',
  'Banking',
  'Accountant',
  'Departmental',
] as const;

export const REPORT_CATALOG: ReportDefinition[] = [
  // 1. Business Overview
  {
    key: 'profit-and-loss',
    title: 'Profit and Loss',
    category: 'Business Overview',
    description: 'Statement of revenues, expenses, and net income over a specified accounting period.',
    dateMode: 'period',
    supportsBasis: true,
    supportsCompare: true,
    supportsColumns: true,
    fetchData: async ({ startDate, endDate }) => {
      const res = await apiClient.get('/reports/profit-loss', {
        params: { startDate, endDate },
      });
      return res.data;
    },
  },
  {
    key: 'balance-sheet',
    title: 'Balance Sheet',
    category: 'Business Overview',
    description: 'Snapshot of business assets, liabilities, and equity on a specific date.',
    dateMode: 'asOf',
    supportsBasis: true,
    supportsCompare: true,
    supportsColumns: true,
    fetchData: async ({ asOfDate, basis }) => {
      const res = await apiClient.get('/reports/balance-sheet', {
        params: { asOfDate, basis },
      });
      return res.data;
    },
  },
  {
    key: 'cash-flow-statement',
    title: 'Cash Flow Statement',
    category: 'Business Overview',
    description: 'Analysis of operating, investing, and financing cash inflows and outflows.',
    dateMode: 'period',
    supportsBasis: false,
    supportsCompare: true,
    supportsColumns: true,
    fetchData: async ({ startDate, endDate }) => {
      const res = await apiClient.get('/reports/cash-flow', {
        params: { startDate, endDate },
      });
      return res.data;
    },
  },
  {
    key: 'business-performance-ratios',
    title: 'Business Performance Ratios',
    category: 'Business Overview',
    description: 'Key liquidity, profitability, and operational financial health ratios.',
    dateMode: 'period',
    supportsBasis: true,
    supportsCompare: false,
    supportsColumns: false,
    fetchData: async ({ startDate, endDate }) => {
      // Combines P&L and Balance Sheet to compute real ratios
      const [pnlRes, bsRes] = await Promise.all([
        apiClient.get('/reports/profit-loss', { params: { startDate, endDate } }),
        apiClient.get('/reports/balance-sheet', { params: { asOfDate: endDate } }),
      ]);
      const pnl = pnlRes.data || {};
      const bs = bsRes.data || {};

      const currentAssets = Number(bs.assets?.currentAssets?.total || 0);
      const currentLiabilities = Number(bs.liabilities?.currentLiabilities?.total || 1);
      const inventory = Number(bs.assets?.currentAssets?.otherCurrentAssets?.totalInventory || 0);
      const netProfit = Number(pnl.netProfit || 0);
      const revenue = Number(pnl.netRevenue || pnl.revenue?.grossRevenue || 1);
      const totalEquity = Number(bs.equities?.totalEquities || 1);
      const totalDebt = Number(bs.liabilities?.totalLiabilities || 0);

      const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
      const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
      const netProfitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : 0;
      const roe = totalEquity > 0 ? (netProfit / totalEquity) * 100 : 0;

      return {
        ratios: {
          currentRatio: Number(currentRatio.toFixed(2)),
          quickRatio: Number(quickRatio.toFixed(2)),
          netProfitMargin: Number(netProfitMargin.toFixed(2)),
          debtToEquity: Number(debtToEquity.toFixed(2)),
          roe: Number(roe.toFixed(2)),
        },
        raw: {
          currentAssets,
          currentLiabilities,
          netProfit,
          revenue,
          totalEquity,
          totalDebt,
        },
      };
    },
  },

  // 2. Accountant
  {
    key: 'trial-balance',
    title: 'Trial Balance',
    category: 'Accountant',
    description: 'List of all general ledger accounts with their debit and credit closing balances.',
    dateMode: 'period',
    supportsBasis: false,
    supportsCompare: false,
    supportsColumns: true,
    fetchData: async ({ startDate, endDate }) => {
      const res = await apiClient.get('/reports/trial-balance', {
        params: { startDate, endDate },
      });
      return res.data;
    },
  },
  {
    key: 'general-ledger',
    title: 'General Ledger',
    category: 'Accountant',
    description: 'Detailed chronological transaction register grouped by individual ledger account.',
    dateMode: 'period',
    supportsBasis: true,
    supportsCompare: false,
    supportsColumns: false,
    fetchData: async ({ startDate, endDate }) => {
      const res = await apiClient.get('/reports/general-ledger', {
        params: { startDate, endDate },
      });
      return res.data;
    },
  },
  {
    key: 'day-book',
    title: 'Day Book',
    category: 'Accountant',
    description: 'Chronological day register of all vouchers posted across the organization.',
    dateMode: 'period',
    supportsBasis: false,
    supportsCompare: false,
    supportsColumns: false,
    fetchData: async ({ startDate, endDate }) => {
      const res = await apiClient.get('/reports/day-book', {
        params: { startDate, endDate },
      });
      return res.data;
    },
  },

  // 3. Sales
  {
    key: 'sales-by-customer',
    title: 'Sales by Customer',
    category: 'Sales',
    description: 'Total revenue and tax breakdown generated per customer over the period.',
    dateMode: 'period',
    supportsBasis: false,
    supportsCompare: true,
    supportsColumns: true,
    fetchData: async ({ startDate, endDate }) => {
      const res = await apiClient.get('/reports/sales', {
        params: { startDate, endDate },
      });
      return res.data;
    },
  },

  // 4. Receivables
  {
    key: 'ar-aging-summary',
    title: 'AR Aging Summary',
    category: 'Receivables',
    description: 'Aging distribution of outstanding receivables (0-30, 31-60, 61-90, 90+ days).',
    dateMode: 'asOf',
    supportsBasis: false,
    supportsCompare: false,
    supportsColumns: true,
    fetchData: async ({ asOfDate }) => {
      const res = await apiClient.get('/reports/customer-ageing', {
        params: { asOfDate },
      });
      return res.data;
    },
  },
  {
    key: 'customer-balance-summary',
    title: 'Customer Balance Summary',
    category: 'Receivables',
    description: 'Summary of total invoiced, received, and closing balances for all customers.',
    dateMode: 'period',
    supportsBasis: false,
    supportsCompare: false,
    supportsColumns: true,
    fetchData: async ({ startDate, endDate }) => {
      const res = await apiClient.get('/reports/sales', {
        params: { startDate, endDate },
      });
      return res.data;
    },
  },

  // 5. Purchases and Expenses
  {
    key: 'purchases-by-vendor',
    title: 'Purchases by Vendor',
    category: 'Purchases and Expenses',
    description: 'Total procurement spend and input taxes itemized by vendor.',
    dateMode: 'period',
    supportsBasis: false,
    supportsCompare: true,
    supportsColumns: true,
    fetchData: async ({ startDate, endDate }) => {
      const res = await apiClient.get('/reports/purchases', {
        params: { startDate, endDate },
      });
      return res.data;
    },
  },

  // 6. Payables
  {
    key: 'ap-aging-summary',
    title: 'AP Aging Summary',
    category: 'Payables',
    description: 'Aging analysis of unpaid vendor bills across standard intervals.',
    dateMode: 'asOf',
    supportsBasis: false,
    supportsCompare: false,
    supportsColumns: true,
    fetchData: async ({ asOfDate }) => {
      const res = await apiClient.get('/reports/purchases');
      return res.data;
    },
  },
  {
    key: 'vendor-balance-summary',
    title: 'Vendor Balance Summary',
    category: 'Payables',
    description: 'Summary of total billed, paid, and outstanding balances per vendor.',
    dateMode: 'period',
    supportsBasis: false,
    supportsCompare: false,
    supportsColumns: true,
    fetchData: async ({ startDate, endDate }) => {
      const res = await apiClient.get('/reports/purchases', {
        params: { startDate, endDate },
      });
      return res.data;
    },
  },

  // 7. Taxes
  {
    key: 'tax-summary',
    title: 'GST / Tax Summary',
    category: 'Taxes',
    description: 'Summary of Output CGST/SGST/IGST and Input Tax Credits with net tax payable.',
    dateMode: 'period',
    supportsBasis: false,
    supportsCompare: false,
    supportsColumns: true,
    fetchData: async ({ startDate, endDate }) => {
      const [salesRes, purRes] = await Promise.all([
        apiClient.get('/reports/sales', { params: { startDate, endDate } }),
        apiClient.get('/reports/purchases', { params: { startDate, endDate } }),
      ]);
      const sales = salesRes.data || {};
      const purchases = purRes.data || {};

      const outputTax = Number(sales.totalTax || 0);
      const inputTax = Number(purchases.totalTax || 0);
      const netTaxPayable = outputTax - inputTax;

      return {
        outputTax,
        inputTax,
        netTaxPayable,
        salesCount: sales.invoiceCount || 0,
        purchaseCount: purchases.purchaseCount || 0,
      };
    },
  },

  // 8. Banking
  {
    key: 'bank-summary',
    title: 'Bank & Cash Accounts Summary',
    category: 'Banking',
    description: 'Overview of all bank and cash accounts with opening, movements, and closing balance.',
    dateMode: 'period',
    supportsBasis: false,
    supportsCompare: false,
    supportsColumns: true,
    fetchData: async () => {
      const res = await apiClient.get('/bank-accounts');
      const items = res.data?.data?.items || res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  },

  // 9. Departmental
  {
    key: 'departmental-performance',
    title: 'Departmental Performance',
    category: 'Departmental',
    description: 'Cost center and department level headcount, expenditures, and profitability.',
    dateMode: 'period',
    supportsBasis: false,
    supportsCompare: false,
    supportsColumns: true,
    fetchData: async () => {
      const res = await apiClient.get('/reports/departmental');
      return res.data;
    },
  },
];

export const getReportByKey = (key: string): ReportDefinition | undefined => {
  return REPORT_CATALOG.find((r) => r.key === key);
};
