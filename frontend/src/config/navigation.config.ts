import { ROUTES } from './routes.config';

// Define navigation config

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  roles?: string[]; // Array of roles allowed to see this item
}

export interface NavModule {
  id: string;
  label: string;
  items: NavItem[];
  roles?: string[];
}

export const ERP_NAVIGATION: NavModule[] = [
  {
    id: 'home',
    label: 'Home',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
      { id: 'profile', label: 'My Profile', path: ROUTES.PROFILE, icon: 'User' },
    ]
  },
  {
    id: 'hr-payroll',
    label: 'HR & Payroll',
    items: [
      { id: 'employees', label: 'Employees', path: ROUTES.HR.EMPLOYEES, icon: 'Users' },
      { id: 'attendance', label: 'Attendance', path: ROUTES.HR.ATTENDANCE, icon: 'Calendar' },
      { id: 'departments', label: 'Departments', path: ROUTES.HR.DEPARTMENTS, icon: 'Building2' },
      { id: 'designations', label: 'Designations', path: ROUTES.HR.DESIGNATIONS, icon: 'Tag' },
      { id: 'shifts', label: 'Shifts', path: ROUTES.HR.SHIFTS, icon: 'Calendar' },
      { id: 'leaves', label: 'Leave Management', path: ROUTES.HR.LEAVES, icon: 'DoorOpen' },
      { id: 'holidays', label: 'Holiday Calendar', path: ROUTES.HR.HOLIDAYS, icon: 'Calendar' },
      { id: 'payroll', label: 'Payroll', path: ROUTES.HR.PAYROLL, icon: 'DollarSign' },
      { id: 'salary-structure', label: 'Salary Structure', path: ROUTES.HR.SALARY_STRUCTURE, icon: 'FileText' },
      { id: 'payroll-processing', label: 'Payroll Processing', path: ROUTES.HR.PAYROLL_PROCESSING, icon: 'RefreshCw' },
      { id: 'salary-slips', label: 'Payslips', path: ROUTES.HR.PAYSLIPS, icon: 'Receipt' },
      { id: 'reports-attendance', label: 'Attendance Reports', path: ROUTES.HR.REPORTS_ATTENDANCE, icon: 'BarChart3' },
      { id: 'reports-payroll', label: 'Payroll Reports', path: ROUTES.HR.REPORTS_PAYROLL, icon: 'BarChart3' },
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { id: 'products', label: 'Products', path: ROUTES.INVENTORY.PRODUCTS, icon: 'Box' },
      { id: 'categories', label: 'Categories', path: ROUTES.INVENTORY.CATEGORIES, icon: 'Tag' },
      { id: 'brands', label: 'Brands', path: ROUTES.INVENTORY.BRANDS, icon: 'Tag' },
      { id: 'units', label: 'Units', path: ROUTES.INVENTORY.UNITS, icon: 'Binary' },
      { id: 'warehouses', label: 'Warehouses', path: ROUTES.INVENTORY.WAREHOUSES, icon: 'Building2' },
      { id: 'inventory-adjustments', label: 'Stock Adjustment', path: ROUTES.INVENTORY.ADJUSTMENTS, icon: 'Wrench' },
      { id: 'stock-transfer', label: 'Stock Transfer', path: ROUTES.INVENTORY.STOCK_TRANSFER, icon: 'Truck' },
      { id: 'report-inventory', label: 'Inventory Reports', path: ROUTES.INVENTORY.REPORTS, icon: 'BarChart3' },
    ]
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { id: 'customers', label: 'Customers', path: ROUTES.SALES.CUSTOMERS, icon: 'Users' },
      { id: 'customer-segments', label: 'Customer Segments', path: ROUTES.SALES.CUSTOMER_SEGMENTS, icon: 'PieChart' },
      { id: 'customer-departments', label: 'Customer Departments', path: ROUTES.SALES.CUSTOMER_DEPARTMENTS, icon: 'Building2' },
      { id: 'quotations', label: 'Quotations', path: ROUTES.SALES.QUOTATIONS, icon: 'MessageSquare' },
      { id: 'sales-orders', label: 'Sales Orders', path: ROUTES.SALES.ORDERS, icon: 'FileSpreadsheet' },
      { id: 'invoices', label: 'Invoices', path: ROUTES.SALES.INVOICES, icon: 'FileText' },
      { id: 'receipts', label: 'Receipts', path: ROUTES.SALES.RECEIPTS, icon: 'Receipt' },
      { id: 'credit-notes', label: 'Credit Notes', path: ROUTES.SALES.CREDIT_NOTES, icon: 'CreditCard' },
      { id: 'customer-ageing', label: 'Outstanding Receivables', path: ROUTES.SALES.CUSTOMER_AGEING, icon: 'Clock' },
      { id: 'report-sales', label: 'Sales Reports', path: ROUTES.SALES.REPORTS, icon: 'BarChart3' },
    ]
  },
  {
    id: 'purchases',
    label: 'Purchases',
    items: [
      { id: 'vendors', label: 'Vendors', path: ROUTES.PURCHASES.VENDORS, icon: 'Users' },
      { id: 'purchase-orders', label: 'Purchase Orders', path: ROUTES.PURCHASES.ORDERS, icon: 'FileSpreadsheet' },
      { id: 'bills', label: 'Purchase Bills', path: ROUTES.PURCHASES.BILLS, icon: 'Receipt' },
      { id: 'vendor-payments', label: 'Payments', path: ROUTES.PURCHASES.PAYMENTS, icon: 'DollarSign' },
      { id: 'debit-notes', label: 'Debit Notes', path: ROUTES.PURCHASES.DEBIT_NOTES, icon: 'CreditCard' },
      { id: 'report-purchases', label: 'Purchase Reports', path: ROUTES.PURCHASES.REPORTS, icon: 'BarChart3' },
    ]
  },
  {
    id: 'accounting',
    label: 'Accounting',
    items: [
      { id: 'coa', label: 'Chart of Accounts', path: ROUTES.ACCOUNTING.COA, icon: 'BookOpen' },
      { id: 'general-ledger', label: 'Ledgers', path: ROUTES.ACCOUNTING.LEDGER, icon: 'BookOpen' },
      { id: 'journals', label: 'Journal Entries', path: ROUTES.ACCOUNTING.JOURNALS, icon: 'BookOpen' },
      { id: 'receipt-voucher', label: 'Receipt Voucher', path: ROUTES.ACCOUNTING.RECEIPT_VOUCHER, icon: 'PlusCircle' },
      { id: 'payment-voucher', label: 'Payment Voucher', path: ROUTES.ACCOUNTING.PAYMENT_VOUCHER, icon: 'PlusCircle' },
      { id: 'contra-voucher', label: 'Contra Voucher', path: ROUTES.ACCOUNTING.CONTRA_VOUCHER, icon: 'RefreshCw' },
      { id: 'bank-reconciliation', label: 'Bank Reconciliation', path: ROUTES.ACCOUNTING.BANK_RECONCILIATION, icon: 'RefreshCw' },
      { id: 'trial-balance', label: 'Trial Balance', path: ROUTES.ACCOUNTING.TRIAL_BALANCE, icon: 'BarChart3' },
      { id: 'profit-loss', label: 'Profit & Loss', path: ROUTES.ACCOUNTING.PROFIT_LOSS, icon: 'TrendingUp' },
      { id: 'balance-sheet', label: 'Balance Sheet', path: ROUTES.ACCOUNTING.BALANCE_SHEET, icon: 'Building2' },
      { id: 'cash-flow', label: 'Cash Flow', path: ROUTES.ACCOUNTING.CASH_FLOW, icon: 'DollarSign' },
    ]
  },
  {
    id: 'gst',
    label: 'GST',
    items: [
      { id: 'gst-dashboard', label: 'GST Dashboard', path: ROUTES.GST.DASHBOARD, icon: 'LayoutDashboard' },
      { id: 'gstr-1', label: 'GSTR-1', path: ROUTES.GST.GSTR1, icon: 'FileText' },
      { id: 'gstr-3b', label: 'GSTR-3B', path: ROUTES.GST.GSTR3B, icon: 'FileText' },
      { id: 'sales-register', label: 'Sales Register', path: ROUTES.GST.SALES_REGISTER, icon: 'BookOpen' },
      { id: 'purchase-register', label: 'Purchase Register', path: ROUTES.GST.PURCHASE_REGISTER, icon: 'BookOpen' },
      { id: 'hsn-summary', label: 'HSN Summary', path: ROUTES.GST.HSN_SUMMARY, icon: 'Tag' },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { id: 'settings-company', label: 'Company', path: ROUTES.SETTINGS.COMPANY, icon: 'Building2' },
      { id: 'financial-year', label: 'Financial Year', path: ROUTES.SETTINGS.FINANCIAL_YEAR, icon: 'Calendar' },
      { id: 'branches', label: 'Branches', path: ROUTES.SETTINGS.BRANCHES, icon: 'Building2' },
      { id: 'settings-users', label: 'Users', path: ROUTES.SETTINGS.USERS, icon: 'User' },
      { id: 'roles', label: 'Roles', path: ROUTES.SETTINGS.ROLES, icon: 'Users' },
      { id: 'permissions', label: 'Permissions', path: ROUTES.SETTINGS.PERMISSIONS, icon: 'Landmark' },
      { id: 'taxes', label: 'Taxes', path: ROUTES.SETTINGS.TAXES, icon: 'Percent' },
      { id: 'sequences', label: 'Number Series', path: ROUTES.SETTINGS.SEQUENCES, icon: 'Binary' },
      { id: 'currencies', label: 'Currencies', path: ROUTES.SETTINGS.CURRENCIES, icon: 'DollarSign' },
      { id: 'settings-backup', label: 'Backup', path: ROUTES.SETTINGS.BACKUP, icon: 'Database' },
      { id: 'integrations', label: 'Integrations', path: ROUTES.SETTINGS.INTEGRATIONS, icon: 'Layers' },
    ]
  }
];
