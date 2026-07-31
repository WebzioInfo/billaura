export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  
  // Dashboard
  DASHBOARD: '/dashboard',
  PROFILE: '/settings?tab=profile',

  // HR & Payroll
  HR: {
    EMPLOYEES: '/employees',
    ATTENDANCE: '/attendance',
    DEPARTMENTS: '/departments',
    DESIGNATIONS: '/departments?tab=masters&sub=designations',
    SHIFTS: '/departments?tab=masters&sub=shifts',
    LEAVES: '/departments?tab=masters&sub=leave-types',
    HOLIDAYS: '/departments?tab=masters&sub=holidays',
    PAYROLL: '/payroll',
    SALARY_STRUCTURE: '/departments?tab=masters&sub=salary-components',
    PAYROLL_PROCESSING: '/payroll',
    PAYSLIPS: '/salary-slips',
    REPORTS_ATTENDANCE: '/reports/attendance',
    REPORTS_PAYROLL: '/reports/payroll',
  },

  // Inventory
  INVENTORY: {
    PRODUCTS: '/products',
    CATEGORIES: '/categories',
    BRANDS: '/brands',
    UNITS: '/units',
    WAREHOUSES: '/warehouses',
    ADJUSTMENTS: '/inventory',
    STOCK_TRANSFER: '/stock-transfer',
    REPORTS: '/reports/inventory',
  },

  // Sales
  SALES: {
    CUSTOMERS: '/customers',
    QUOTATIONS: '/quotations',
    ORDERS: '/sales-orders',
    INVOICES: '/invoices',
    RECEIPTS: '/receipts',
    CREDIT_NOTES: '/credit-notes',
    REPORTS: '/reports/sales',
  },

  // Purchases
  PURCHASES: {
    VENDORS: '/vendors',
    ORDERS: '/purchase-orders',
    BILLS: '/bills',
    PAYMENTS: '/vendor-payments',
    DEBIT_NOTES: '/debit-notes',
    REPORTS: '/reports/purchases',
  },

  // Accounting
  ACCOUNTING: {
    COA: '/chart-of-accounts',
    LEDGER: '/general-ledger',
    JOURNALS: '/journal-entries',
    RECEIPT_VOUCHER: '/receipts/new',
    PAYMENT_VOUCHER: '/vendor-payments/new',
    CONTRA_VOUCHER: '/contra-voucher',
    BANK_RECONCILIATION: '/reconciliation',
    TRIAL_BALANCE: '/trial-balance',
    PROFIT_LOSS: '/profit-loss',
    BALANCE_SHEET: '/balance-sheet',
    CASH_FLOW: '/cash-flow',
  },

  // GST
  GST: {
    DASHBOARD: '/gst',
    GSTR1: '/gstr-1',
    GSTR3B: '/gstr-3b',
    SALES_REGISTER: '/sales-register',
    PURCHASE_REGISTER: '/purchase-register',
    HSN_SUMMARY: '/hsn-summary',
  },

  // Settings
  SETTINGS: {
    COMPANY: '/settings?tab=profile',
    FINANCIAL_YEAR: '/financial-year',
    BRANCHES: '/settings?tab=branches',
    USERS: '/users',
    ROLES: '/settings?tab=roles',
    PERMISSIONS: '/permissions',
    TAXES: '/taxes',
    SEQUENCES: '/settings?tab=numbering',
    CURRENCIES: '/currencies',
    BACKUP: '/backup-restore',
    INTEGRATIONS: '/integrations',
  }
} as const;
