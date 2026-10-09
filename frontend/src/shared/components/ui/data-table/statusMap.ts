export type SemanticStatusType = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'violet';

export interface SemanticStatusConfig {
  type: SemanticStatusType;
  label: string;
  light: {
    bg: string;
    text: string;
    dot: string;
  };
  dark: {
    bg: string;
    text: string;
    dot: string;
  };
}

export const SEMANTIC_PALETTES: Record<SemanticStatusType, { light: SemanticStatusConfig['light']; dark: SemanticStatusConfig['dark'] }> = {
  success: {
    light: { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
    dark: { bg: 'rgba(22, 101, 52, 0.25)', text: '#86EFAC', dot: '#4ADE80' },
  },
  danger: {
    light: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
    dark: { bg: 'rgba(153, 27, 27, 0.25)', text: '#FCA5A5', dot: '#F87171' },
  },
  warning: {
    light: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    dark: { bg: 'rgba(146, 64, 14, 0.25)', text: '#FCD34D', dot: '#FBBF24' },
  },
  info: {
    light: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
    dark: { bg: 'rgba(30, 64, 175, 0.25)', text: '#93C5FD', dot: '#60A5FA' },
  },
  neutral: {
    light: { bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' },
    dark: { bg: 'rgba(75, 85, 99, 0.3)', text: '#D1D5DB', dot: '#9CA3AF' },
  },
  violet: {
    light: { bg: '#F3E8FF', text: '#6B21A8', dot: '#A855F7' },
    dark: { bg: 'rgba(107, 33, 168, 0.25)', text: '#D8B4FE', dot: '#C084FC' },
  },
};

/**
 * Central map of all statuses across modules to semantic groups
 */
export const STATUS_MAP: Record<string, { type: SemanticStatusType; defaultLabel?: string }> = {
  // --- ACCOUNTING CATEGORIES ---
  ASSET: { type: 'info', defaultLabel: 'Asset' },
  LIABILITY: { type: 'warning', defaultLabel: 'Liability' },
  EQUITY: { type: 'violet', defaultLabel: 'Equity' },
  REVENUE: { type: 'success', defaultLabel: 'Revenue' },
  INCOME: { type: 'success', defaultLabel: 'Income' },
  EXPENSE: { type: 'danger', defaultLabel: 'Expense' },
  EXPENSES: { type: 'danger', defaultLabel: 'Expense' },

  // --- INVOICES & BILLS ---
  PAID: { type: 'success', defaultLabel: 'Paid' },
  SETTLED: { type: 'success', defaultLabel: 'Settled' },
  OVERDUE: { type: 'danger', defaultLabel: 'Overdue' },
  PARTIAL: { type: 'warning', defaultLabel: 'Partially Paid' },
  PARTIALLY_PAID: { type: 'warning', defaultLabel: 'Partially Paid' },
  SENT: { type: 'info', defaultLabel: 'Sent' },
  ISSUED: { type: 'info', defaultLabel: 'Issued' },
  POSTED: { type: 'info', defaultLabel: 'Posted' },
  DRAFT: { type: 'neutral', defaultLabel: 'Draft' },
  ARCHIVED: { type: 'neutral', defaultLabel: 'Archived' },
  CANCELLED: { type: 'danger', defaultLabel: 'Cancelled' },
  VOID: { type: 'neutral', defaultLabel: 'Void' },
  UNPAID: { type: 'warning', defaultLabel: 'Unpaid' },

  // --- PAYMENTS & RECEIPTS ---
  COMPLETED: { type: 'success', defaultLabel: 'Completed' },
  SUCCESS: { type: 'success', defaultLabel: 'Success' },
  PENDING: { type: 'warning', defaultLabel: 'Pending' },
  FAILED: { type: 'danger', defaultLabel: 'Failed' },
  REVERSED: { type: 'danger', defaultLabel: 'Reversed' },
  REFUNDED: { type: 'neutral', defaultLabel: 'Refunded' },

  // --- QUOTATIONS & ESTIMATES ---
  ACCEPTED: { type: 'success', defaultLabel: 'Accepted' },
  APPROVED: { type: 'success', defaultLabel: 'Approved' },
  REJECTED: { type: 'danger', defaultLabel: 'Rejected' },
  EXPIRED: { type: 'danger', defaultLabel: 'Expired' },
  ON_HOLD: { type: 'warning', defaultLabel: 'On Hold' },
  DECLINED: { type: 'danger', defaultLabel: 'Declined' },

  // --- ORDERS & SHIPMENTS ---
  DELIVERED: { type: 'success', defaultLabel: 'Delivered' },
  FULFILLED: { type: 'success', defaultLabel: 'Fulfilled' },
  SHIPPED: { type: 'info', defaultLabel: 'Shipped' },
  IN_TRANSIT: { type: 'info', defaultLabel: 'In Transit' },
  PROCESSING: { type: 'info', defaultLabel: 'Processing' },
  OPEN: { type: 'info', defaultLabel: 'Open' },

  // --- INVENTORY & STOCK ---
  IN_STOCK: { type: 'success', defaultLabel: 'In Stock' },
  LOW_STOCK: { type: 'warning', defaultLabel: 'Low Stock' },
  OUT_OF_STOCK: { type: 'danger', defaultLabel: 'Out of Stock' },
  DISCONTINUED: { type: 'neutral', defaultLabel: 'Discontinued' },
  ACTIVE: { type: 'success', defaultLabel: 'Active' },
  INACTIVE: { type: 'neutral', defaultLabel: 'Inactive' },
  BLOCKED: { type: 'danger', defaultLabel: 'Blocked' },

  // --- BANKING & RECONCILIATION ---
  RECONCILED: { type: 'success', defaultLabel: 'Reconciled' },
  MATCHED: { type: 'success', defaultLabel: 'Matched' },
  UNRECONCILED: { type: 'warning', defaultLabel: 'Unreconciled' },
  FLAGGED: { type: 'danger', defaultLabel: 'Flagged' },

  // --- HR & ATTENDANCE ---
  PRESENT: { type: 'success', defaultLabel: 'Present' },
  ABSENT: { type: 'danger', defaultLabel: 'Absent' },
  HALF_DAY: { type: 'warning', defaultLabel: 'Half Day' },
  LEAVE: { type: 'info', defaultLabel: 'On Leave' },
  HOLIDAY: { type: 'neutral', defaultLabel: 'Holiday' },
  WEEK_OFF: { type: 'neutral', defaultLabel: 'Week Off' },
  PROCESSED: { type: 'success', defaultLabel: 'Processed' },
  UNPROCESSED: { type: 'warning', defaultLabel: 'Unprocessed' },
  DISBURSED: { type: 'success', defaultLabel: 'Disbursed' },
  LOCKED: { type: 'neutral', defaultLabel: 'Locked' },
};

/**
 * Resolves any raw status string into semantic styling tokens
 */
export function resolveSemanticStatus(rawStatus?: string): SemanticStatusConfig {
  const normalized = (rawStatus || '').toUpperCase().trim();
  const mapped = STATUS_MAP[normalized];
  const type = mapped ? mapped.type : 'neutral';
  
  // Format fallback label
  const defaultLabel = mapped?.defaultLabel || 
    (rawStatus ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase().replace(/_/g, ' ') : '—');

  const palette = SEMANTIC_PALETTES[type];

  return {
    type,
    label: defaultLabel,
    light: palette.light,
    dark: palette.dark,
  };
}
