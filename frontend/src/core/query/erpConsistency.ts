import { QueryClient } from '@tanstack/react-query';

/**
 * BILL AURA ERP — Cross-Module Data Consistency & Live Reflection Engine
 * 
 * Provides centralized, authoritative, and surgical React Query cache invalidation
 * for every financial and inventory lifecycle transaction across the ERP.
 * 
 * Guarantees that mutations in one module immediately propagate to all dependent
 * ledgers, accounts, balances, statements, list/detail views, and dashboards
 * WITHOUT requiring manual page reloads or blunt full-cache flushes.
 */
export const erpInvalidate = {
  /**
   * Called when a Sales Receipt or Payment Received is created, updated, or cancelled
   */
  salesReceipt(
    queryClient: QueryClient,
    meta?: { customerId?: string; invoiceIds?: string[]; accountId?: string }
  ) {
    // 1. Receipts & Payments records
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    queryClient.invalidateQueries({ queryKey: ['receipt'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['payment-receipts'] });
    queryClient.invalidateQueries({ queryKey: ['receipt-master-data'] });

    // 2. Customer receivables, balances & ledger statements
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['customers-list'] });
    queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['customer-statement'] });
    queryClient.invalidateQueries({ queryKey: ['customer-ageing'] });
    if (meta?.customerId) {
      queryClient.invalidateQueries({ queryKey: ['customer', meta.customerId] });
    }

    // 3. Settled/Allocated Invoices
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
    queryClient.invalidateQueries({ queryKey: ['sales-documents'] });
    if (meta?.invoiceIds && meta.invoiceIds.length > 0) {
      meta.invoiceIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: ['invoices', id] });
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      });
    }

    // 4. Bank / Cash Accounts, Ledgers & Balances
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    queryClient.invalidateQueries({ queryKey: ['cash-bank-accounts-all'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['account-lookup'] });
    queryClient.invalidateQueries({ queryKey: ['banking-stats'] });
    queryClient.invalidateQueries({ queryKey: ['banking-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['ledger-search'] });
    queryClient.invalidateQueries({ queryKey: ['ledger-inquiry'] });
    queryClient.invalidateQueries({ queryKey: ['journal-entries-reference'] });

    // 5. Dashboards & Financial Reports
    queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
  },

  /**
   * Called when a Purchase Receipt or Vendor Payout is created, updated, or cancelled
   */
  purchaseReceipt(
    queryClient: QueryClient,
    meta?: { vendorId?: string; purchaseId?: string; accountId?: string }
  ) {
    // 1. Payments & Purchases
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['bills'] });
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
    if (meta?.purchaseId) {
      queryClient.invalidateQueries({ queryKey: ['purchase', meta.purchaseId] });
      queryClient.invalidateQueries({ queryKey: ['bill', meta.purchaseId] });
    }

    // 2. Vendor payables, balances & statements
    queryClient.invalidateQueries({ queryKey: ['vendors'] });
    queryClient.invalidateQueries({ queryKey: ['vendors_lookup'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-purchases'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
    if (meta?.vendorId) {
      queryClient.invalidateQueries({ queryKey: ['vendor', meta.vendorId] });
    }

    // 3. Bank / Cash Accounts & Ledgers
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    queryClient.invalidateQueries({ queryKey: ['cash-bank-accounts-all'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['banking-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['banking-stats'] });
    queryClient.invalidateQueries({ queryKey: ['ledger-inquiry'] });

    // 4. Dashboards & Reports
    queryClient.invalidateQueries({ queryKey: ['purchases-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
  },

  /**
   * Called when an Expense or Expense Receipt is created, updated, approved, or deleted
   */
  expenseReceipt(
    queryClient: QueryClient,
    _meta?: { categoryId?: string; accountId?: string }
  ) {
    // 1. Expenses & Claims
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['expenses-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    queryClient.invalidateQueries({ queryKey: ['expense-categories-lookup'] });
    queryClient.invalidateQueries({ queryKey: ['departmental-report'] });

    // 2. Cash & Bank Accounts & Ledgers
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    queryClient.invalidateQueries({ queryKey: ['cash-bank-accounts-all'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['banking-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['ledger-inquiry'] });

    // 3. Dashboards & Reports
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
  },

  /**
   * Called when an Invoice or Sales Document is created, updated, or cancelled
   */
  invoice(
    queryClient: QueryClient,
    meta?: { invoiceId?: string; customerId?: string; productIds?: string[] }
  ) {
    // 1. Invoices & Sales documents
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
    queryClient.invalidateQueries({ queryKey: ['sales-documents'] });
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
    if (meta?.invoiceId) {
      queryClient.invalidateQueries({ queryKey: ['invoices', meta.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', meta.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries-reference'] });
    }

    // 2. Customer receivables, balances & ledger statements
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['customers-list'] });
    queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['customer-statement'] });
    queryClient.invalidateQueries({ queryKey: ['customer-ageing'] });
    if (meta?.customerId) {
      queryClient.invalidateQueries({ queryKey: ['customer', meta.customerId] });
    }

    // 3. Products & Inventory (physical stock decremented or restored)
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['stocks'] });
    queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });

    // 4. Dashboards & Financial Reports
    queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  },

  /**
   * Called when a Purchase Bill is created, updated, or cancelled
   */
  purchaseBill(
    queryClient: QueryClient,
    meta?: { billId?: string; vendorId?: string; productIds?: string[] }
  ) {
    // 1. Bills & Purchases
    queryClient.invalidateQueries({ queryKey: ['bills'] });
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    if (meta?.billId) {
      queryClient.invalidateQueries({ queryKey: ['purchase', meta.billId] });
      queryClient.invalidateQueries({ queryKey: ['bill', meta.billId] });
    }

    // 2. Vendor payables, balances & statements
    queryClient.invalidateQueries({ queryKey: ['vendors'] });
    queryClient.invalidateQueries({ queryKey: ['vendors_lookup'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-purchases'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
    if (meta?.vendorId) {
      queryClient.invalidateQueries({ queryKey: ['vendor', meta.vendorId] });
    }

    // 3. Products & Inventory (stock incremented or restored)
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['stocks'] });
    queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });

    // 4. Dashboards & Reports
    queryClient.invalidateQueries({ queryKey: ['purchases-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  },

  /**
   * Called when a Purchase Order is created, updated, cancelled, or received
   */
  purchaseOrder(
    queryClient: QueryClient,
    meta?: { poId?: string; vendorId?: string }
  ) {
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
    queryClient.invalidateQueries({ queryKey: ['linked-grns'] });
    if (meta?.poId) {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', meta.poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-audit', meta.poId] });
    }
    if (meta?.vendorId) {
      queryClient.invalidateQueries({ queryKey: ['vendor', meta.vendorId] });
    }
    queryClient.invalidateQueries({ queryKey: ['purchases-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
  },

  /**
   * Called when a Bank / Cash transaction or reconciliation occurs
   */
  bankTransaction(
    queryClient: QueryClient,
    _meta?: { accountId?: string }
  ) {
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    queryClient.invalidateQueries({ queryKey: ['cash-bank-accounts-all'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['account-lookup'] });
    queryClient.invalidateQueries({ queryKey: ['banking-stats'] });
    queryClient.invalidateQueries({ queryKey: ['banking-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
    queryClient.invalidateQueries({ queryKey: ['bank-statement-lines'] });
    queryClient.invalidateQueries({ queryKey: ['capital-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
  },

  /**
   * Called when a manual Journal Entry is created, reversed, or posted
   */
  journalEntry(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['account-lookup'] });
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
    queryClient.invalidateQueries({ queryKey: ['profit-loss'] });
    queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    queryClient.invalidateQueries({ queryKey: ['reports', 'day-book'] });
    queryClient.invalidateQueries({ queryKey: ['reports', 'general-ledger'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['ledger-search'] });
    queryClient.invalidateQueries({ queryKey: ['ledger-inquiry'] });
  },

  /**
   * Called when a Customer master record is created or updated
   */
  customer(queryClient: QueryClient, meta?: { customerId?: string }) {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['customers-list'] });
    queryClient.invalidateQueries({ queryKey: ['customers-search'] });
    if (meta?.customerId) {
      queryClient.invalidateQueries({ queryKey: ['customer', meta.customerId] });
    }
  },

  /**
   * Called when a Vendor master record is created or updated
   */
  vendor(queryClient: QueryClient, meta?: { vendorId?: string }) {
    queryClient.invalidateQueries({ queryKey: ['vendors'] });
    queryClient.invalidateQueries({ queryKey: ['vendors_lookup'] });
    if (meta?.vendorId) {
      queryClient.invalidateQueries({ queryKey: ['vendor', meta.vendorId] });
    }
  },

  /**
   * Called when a Product master record is created, updated, or stock adjusted
   */
  product(queryClient: QueryClient, _meta?: { productId?: string }) {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['stocks'] });
    queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    queryClient.invalidateQueries({ queryKey: ['product_categories'] });
  }
};
