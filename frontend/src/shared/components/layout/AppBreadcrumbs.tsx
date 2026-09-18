import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS: Record<string, { group: string; label: string }> = {
  '/dashboard': { group: 'Overview', label: 'Executive Dashboard' },
  '/profile': { group: 'Overview', label: 'User Profile' },
  
  // Sales
  '/sales': { group: 'Sales', label: 'Sales Dashboard' },
  '/invoices': { group: 'Sales', label: 'Invoices' },
  '/invoices/new': { group: 'Sales', label: 'New Invoice' },
  '/quotations': { group: 'Sales', label: 'Quotations' },
  '/quotations/new': { group: 'Sales', label: 'New Quotation' },
  '/sales-orders': { group: 'Sales', label: 'Sales Orders' },
  '/sales-orders/new': { group: 'Sales', label: 'New Sales Order' },
  '/delivery-notes': { group: 'Sales', label: 'Delivery Notes' },
  '/delivery-challans': { group: 'Sales', label: 'Delivery Challans' },
  '/receipts': { group: 'Sales', label: 'Payment Receipts' },
  '/receipts/new': { group: 'Sales', label: 'New Receipt' },
  '/credit-notes': { group: 'Sales', label: 'Credit Notes' },
  '/recurring-invoices': { group: 'Sales', label: 'Recurring Invoices' },
  '/customers': { group: 'Sales', label: 'Customers' },
  '/customers/new': { group: 'Sales', label: 'New Customer' },
  '/customer-segments': { group: 'Sales', label: 'Customer Segments' },
  '/customer-departments': { group: 'Sales', label: 'Customer Departments' },

  // Purchases
  '/purchases': { group: 'Purchases', label: 'Purchases Dashboard' },
  '/bills': { group: 'Purchases', label: 'Vendor Bills' },
  '/bills/new': { group: 'Purchases', label: 'New Bill' },
  '/purchase-orders': { group: 'Purchases', label: 'Purchase Orders' },
  '/purchase-orders/new': { group: 'Purchases', label: 'New Purchase Order' },
  '/goods-receipts': { group: 'Purchases', label: 'Goods Receipts' },
  '/debit-notes': { group: 'Purchases', label: 'Debit Notes' },
  '/vendors': { group: 'Purchases', label: 'Vendors' },
  '/vendors/new': { group: 'Purchases', label: 'New Vendor' },

  // Inventory
  '/inventory': { group: 'Inventory', label: 'Inventory Dashboard' },
  '/products': { group: 'Inventory', label: 'Products & Items' },
  '/categories': { group: 'Inventory', label: 'Item Categories' },
  '/brands': { group: 'Inventory', label: 'Brands' },
  '/units': { group: 'Inventory', label: 'Units of Measure' },
  '/warehouses': { group: 'Inventory', label: 'Warehouses' },
  '/batches': { group: 'Inventory', label: 'Batches & Expiry' },
  '/serials': { group: 'Inventory', label: 'Serial Numbers' },
  '/bom': { group: 'Inventory', label: 'Bill of Materials' },
  '/stock-transfer': { group: 'Inventory', label: 'Stock Transfers' },

  // Accounting
  '/accounting': { group: 'Accounting', label: 'Chart of Accounts' },
  '/chart-of-accounts': { group: 'Accounting', label: 'Chart of Accounts' },
  '/accounting/ledger': { group: 'Accounting', label: 'General Ledger' },
  '/journal-entries': { group: 'Accounting', label: 'Journal Entries' },
  '/journal-entries/new': { group: 'Accounting', label: 'New Journal Entry' },
  '/trial-balance': { group: 'Accounting', label: 'Trial Balance' },
  '/balance-sheet': { group: 'Accounting', label: 'Balance Sheet' },
  '/profit-loss': { group: 'Accounting', label: 'Profit & Loss' },
  '/cash-flow': { group: 'Accounting', label: 'Cash Flow' },
  '/day-book': { group: 'Accounting', label: 'Day Book' },
  '/capital': { group: 'Accounting', label: 'Capital Accounts' },

  // Finance & Banking
  '/banking': { group: 'Finance', label: 'Banking Dashboard' },
  '/bank-transactions': { group: 'Finance', label: 'Bank Transactions' },
  '/reconciliation': { group: 'Finance', label: 'Bank Reconciliation' },
  '/expenses': { group: 'Finance', label: 'Expenses' },
  '/other-income': { group: 'Finance', label: 'Other Income' },

  // GST & Taxes
  '/gst': { group: 'Taxes', label: 'GST Overview' },
  '/taxes': { group: 'Taxes', label: 'Tax Configurations' },
  '/gstr-1': { group: 'Taxes', label: 'GSTR-1 Return' },
  '/gstr-3b': { group: 'Taxes', label: 'GSTR-3B Return' },
  '/sales-register': { group: 'Taxes', label: 'Sales Register' },
  '/purchase-register': { group: 'Taxes', label: 'Purchase Register' },
  '/hsn-summary': { group: 'Taxes', label: 'HSN Summary' },

  // HR & Payroll
  '/hr': { group: 'HR & Payroll', label: 'HR Dashboard' },
  '/employees': { group: 'HR & Payroll', label: 'Employees' },
  '/attendance': { group: 'HR & Payroll', label: 'Attendance' },
  '/payroll': { group: 'HR & Payroll', label: 'Payroll' },
  '/salary-slips': { group: 'HR & Payroll', label: 'Payslips' },
  '/departments': { group: 'HR & Payroll', label: 'Departments' },

  // Reports
  '/reports': { group: 'Reports', label: 'Financial Reports' },
  '/reports/sales': { group: 'Reports', label: 'Sales Reports' },
  '/reports/purchases': { group: 'Reports', label: 'Purchases Reports' },
  '/reports/inventory': { group: 'Reports', label: 'Inventory Reports' },
  '/reports/attendance': { group: 'Reports', label: 'Attendance Reports' },
  '/reports/payroll': { group: 'Reports', label: 'Payroll Reports' },
  '/reports/customer-ageing': { group: 'Reports', label: 'Outstanding Receivables' },
  '/customer-statements': { group: 'Reports', label: 'Customer Statements' },

  // Settings
  '/settings': { group: 'Settings', label: 'Settings Center' },
  '/invoice-engine': { group: 'Settings', label: 'Invoice Rules Engine' },
  '/help': { group: 'Settings', label: 'Help & Knowledge Center' },
};

export const AppBreadcrumbs: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const match = ROUTE_LABELS[currentPath];
  const segments = currentPath.split('/').filter(Boolean);

  let groupName = match?.group || (segments.length > 0 ? segments[0].charAt(0).toUpperCase() + segments[0].slice(1) : 'Home');
  let pageName = match?.label;

  if (!pageName && segments.length > 0) {
    const last = segments[segments.length - 1];
    // If it's an ID (e.g. cuid or uuid)
    if (last.length > 20 || /^[0-9a-f-]{36}$/i.test(last)) {
      pageName = 'Details';
    } else {
      pageName = last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground select-none" aria-label="Breadcrumb">
      <Link 
        to="/dashboard" 
        className="flex items-center gap-1 hover:text-foreground transition-colors p-1 rounded-sm"
        title="Go to Dashboard"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {groupName && (
        <>
          <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
          <span className="font-medium text-muted-foreground/80 hover:text-foreground transition-colors">
            {groupName}
          </span>
        </>
      )}

      {pageName && (
        <>
          <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
          <span className="font-semibold text-foreground truncate max-w-[200px]">
            {pageName}
          </span>
        </>
      )}
    </nav>
  );
};
