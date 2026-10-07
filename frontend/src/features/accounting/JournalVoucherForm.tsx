import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Search,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Receipt,
  Building2,
  Wallet,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { apiClient as api, ensureArray } from '@/core/api/apiClient';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/Button';

// Indian Currency Formatter
const formatINR = (val: number, forceDecimals = false) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: forceDecimals || val % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export interface AccountOption {
  id: string;
  name: string;
  code?: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  accountType?: string;
  balance?: number;
  rawBalance?: number;
  parent?: { id: string; name: string; code?: string } | null;
}

export interface VoucherLine {
  id: string;
  accountId: string;
  account?: AccountOption | null;
  debit: number;
  credit: number;
  memo: string;
}

// Category Configuration & Golden Rules
const CATEGORY_META: Record<
  string,
  {
    label: string;
    groupLabel: string;
    normalBalance: 'Dr' | 'Cr';
    drExplanation: string;
    crExplanation: string;
  }
> = {
  ASSET: {
    label: 'Asset',
    groupLabel: 'ASSETS',
    normalBalance: 'Dr',
    drExplanation: 'Debit increases asset balance (acquisition or inflow)',
    crExplanation: 'Credit decreases asset balance (disposal or outflow)',
  },
  LIABILITY: {
    label: 'Liability',
    groupLabel: 'LIABILITIES',
    normalBalance: 'Cr',
    drExplanation: 'Debit decreases liability (settles debt or payment)',
    crExplanation: 'Credit increases liability (records obligation or debt owed)',
  },
  EQUITY: {
    label: 'Equity',
    groupLabel: 'EQUITY',
    normalBalance: 'Cr',
    drExplanation: 'Debit decreases equity (owner drawings or loss)',
    crExplanation: 'Credit increases equity (capital introduced or retained earnings)',
  },
  REVENUE: {
    label: 'Income',
    groupLabel: 'INCOME',
    normalBalance: 'Cr',
    drExplanation: 'Debit decreases revenue (sales return or discount given)',
    crExplanation: 'Credit increases revenue (records income earned)',
  },
  EXPENSE: {
    label: 'Expense',
    groupLabel: 'EXPENSES',
    normalBalance: 'Dr',
    drExplanation: 'Debit increases expense (records expenditure, reduces profit)',
    crExplanation: 'Credit decreases expense (reversal, rebate, or credit note)',
  },
};

// Educational Voucher Templates
const EDUCATIONAL_TEMPLATES = [
  {
    id: 'expense-cash',
    title: '1. Expense Paid via Cash / Bank',
    description: 'Debit the Expense account (e.g. Office Rent) and Credit Cash or Bank.',
    narration: 'Being office expenditure paid through cash / bank account',
    exampleLines: [
      { category: 'EXPENSE', nameQuery: 'Rent', isDebit: true, amount: 10000 },
      { category: 'ASSET', nameQuery: 'Cash', isDebit: false, amount: 10000 },
    ],
  },
  {
    id: 'asset-bank',
    title: '2. Asset Purchased via Bank',
    description: 'Debit Fixed Asset (e.g. Machinery / Equipment) and Credit Bank Account.',
    narration: 'Being computer equipment / machinery purchased for business use via bank transfer',
    exampleLines: [
      { category: 'ASSET', nameQuery: 'Machinery', isDebit: true, amount: 50000 },
      { category: 'ASSET', nameQuery: 'Bank Accounts', isDebit: false, amount: 50000 },
    ],
  },
  {
    id: 'capital-intro',
    title: '3. Capital Introduced by Owner',
    description: 'Debit Cash / Bank (Asset increases) and Credit Owners Capital (Equity increases).',
    narration: 'Being additional capital introduced into the business by proprietor / partner',
    exampleLines: [
      { category: 'ASSET', nameQuery: 'Bank Accounts', isDebit: true, amount: 100000 },
      { category: 'EQUITY', nameQuery: 'Owners Capital', isDebit: false, amount: 100000 },
    ],
  },
  {
    id: 'compound-expense',
    title: '4. Compound Multiple Expenses',
    description: 'Debit multiple expense lines (e.g. Rent & Utilities) against a single Credit to Cash/Bank.',
    narration: 'Being monthly rent and utility dues settled via single consolidated payment',
    exampleLines: [
      { category: 'EXPENSE', nameQuery: 'Rent', isDebit: true, amount: 20000 },
      { category: 'EXPENSE', nameQuery: 'Utilities', isDebit: true, amount: 5000 },
      { category: 'ASSET', nameQuery: 'Cash', isDebit: false, amount: 25000 },
    ],
  },
  {
    id: 'depreciation',
    title: '5. Depreciation Adjustment Entry',
    description: 'Debit Depreciation Expense (non-cash expense) and Credit Fixed Asset / Accumulated Depreciation.',
    narration: 'Being annual depreciation written off on plant and machinery as per accounting standards',
    exampleLines: [
      { category: 'EXPENSE', nameQuery: 'Depreciation', isDebit: true, amount: 15000 },
      { category: 'ASSET', nameQuery: 'Machinery', isDebit: false, amount: 15000 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING PORTAL ACCOUNT SELECTOR (Escapes container clipping completely)
// ─────────────────────────────────────────────────────────────────────────────
interface FloatingAccountSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  selectedAccountId?: string;
  onSelect: (account: AccountOption) => void;
  accounts: AccountOption[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onQuickCreate: (searchTerm: string) => void;
}

const FloatingAccountSelector: React.FC<FloatingAccountSelectorProps> = ({
  isOpen,
  onClose,
  triggerRef,
  selectedAccountId,
  onSelect,
  accounts,
  isLoading,
  isError,
  onRetry,
  onQuickCreate,
}) => {
  const [search, setSearch] = useState('');
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number; isUp: boolean }>({
    top: 0,
    left: 0,
    width: 440,
    isUp: false,
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Position calculation
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popoverHeight = 380;
      const width = Math.max(rect.width, 460);

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const isUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

      let top = isUp ? rect.top - popoverHeight - 4 : rect.bottom + 4;
      let left = rect.left;

      if (left + width > viewportWidth - 12) {
        left = Math.max(12, viewportWidth - width - 12);
      }

      setDropdownCoords({ top, left, width, isUp });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, triggerRef]);

  // Focus input and reset state on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((acc) => {
      return (
        acc.name.toLowerCase().includes(q) ||
        (acc.code && acc.code.toLowerCase().includes(q)) ||
        (acc.parent?.name && acc.parent.name.toLowerCase().includes(q)) ||
        acc.category.toLowerCase().includes(q)
      );
    });
  }, [accounts, search]);

  // Group filtered accounts
  const groupedAccounts = useMemo(() => {
    const groups: { [key: string]: AccountOption[] } = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };

    filteredAccounts.forEach((acc) => {
      if (groups[acc.category]) {
        groups[acc.category].push(acc);
      }
    });

    return groups;
  }, [filteredAccounts]);

  // Flat list for keyboard navigation
  const flatVisibleAccounts = useMemo(() => {
    const list: AccountOption[] = [];
    ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].forEach((cat) => {
      if (groupedAccounts[cat]) {
        list.push(...groupedAccounts[cat]);
      }
    });
    return list;
  }, [groupedAccounts]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flatVisibleAccounts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < flatVisibleAccounts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatVisibleAccounts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatVisibleAccounts.length) {
        onSelect(flatVisibleAccounts[activeIndex]);
      } else if (flatVisibleAccounts.length === 1) {
        onSelect(flatVisibleAccounts[0]);
      }
    }
  };

  if (!isOpen) return null;

  const totalResultsCount = flatVisibleAccounts.length;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${dropdownCoords.top}px`,
        left: `${dropdownCoords.left}px`,
        width: `${dropdownCoords.width}px`,
        maxHeight: '380px',
        zIndex: 99999,
      }}
      className="bg-white dark:bg-[#1E1C26] border border-[#D1D5DB] dark:border-[#374151] rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs font-sans text-foreground animate-in fade-in duration-100"
    >
      {/* Search Header */}
      <div className="p-2.5 border-b border-border/80 bg-muted/20 relative shrink-0">
        <Search className="w-4 h-4 text-muted-foreground absolute left-5 top-1/2 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search account, code or group... (e.g. Cash, 1001, Rent)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-background border border-border/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent"
        />
      </div>

      {/* Grouped Account List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {isError && accounts.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-rose-500 font-medium">
              Unable to load accounts. Please retry.
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg border border-border cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        ) : isLoading && accounts.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <span className="text-xs">Loading accounts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              No ledgers have been configured for this company.
            </p>
            <button
              type="button"
              onClick={() => onQuickCreate('')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Ledger
            </button>
          </div>
        ) : totalResultsCount === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              No matching accounts found for "{search}"
            </p>
            <button
              type="button"
              onClick={() => onQuickCreate(search)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create "{search}"
            </button>
          </div>
        ) : (
          ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((catKey) => {
            const catAccounts = groupedAccounts[catKey];
            if (!catAccounts || catAccounts.length === 0) return null;
            const meta = CATEGORY_META[catKey];

            return (
              <div key={catKey} className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between border-b border-border/40 pb-1">
                  <span>{meta.groupLabel}</span>
                  <span className="font-mono text-[9px] opacity-70">
                    {catAccounts.length}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {catAccounts.map((acc) => {
                    const isSelected = acc.id === selectedAccountId;
                    const isKeyboardActive =
                      flatVisibleAccounts.indexOf(acc) === activeIndex;

                    return (
                      <div
                        key={acc.id}
                        onClick={() => onSelect(acc)}
                        className={`px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-accent/15 text-accent font-bold'
                            : isKeyboardActive
                            ? 'bg-muted text-foreground'
                            : 'hover:bg-muted/60 text-foreground'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs truncate">
                              {acc.name}
                            </span>
                            {acc.code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-muted text-muted-foreground rounded font-medium">
                                {acc.code}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {acc.parent?.name || meta.label} · {meta.label}
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          {acc.balance !== undefined && (
                            <span className="font-mono text-[11px] font-medium text-muted-foreground">
                              {formatINR(Math.abs(acc.balance))}
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-accent" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Strip */}
      <div className="p-2 border-t border-border/80 bg-muted/20 flex items-center justify-between text-[11px] shrink-0">
        <button
          type="button"
          onClick={() => onQuickCreate(search)}
          className="inline-flex items-center gap-1 font-bold text-accent hover:underline cursor-pointer"
        >
          <Plus className="w-3 h-3" /> Create New Ledger
        </button>
        <span className="text-muted-foreground">
          Press <kbd className="px-1 py-0.2 bg-background border border-border rounded text-[9px]">Esc</kbd> to close
        </span>
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN JOURNAL VOUCHER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const JournalVoucherForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Header Details
  const [voucherDate, setVoucherDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [mainNarration, setMainNarration] = useState<string>('');

  // Voucher Grid Lines
  const [lines, setLines] = useState<VoucherLine[]>([
    { id: 'line-1', accountId: '', account: null, debit: 0, credit: 0, memo: '' },
    { id: 'line-2', accountId: '', account: null, debit: 0, credit: 0, memo: '' },
  ]);

  // Account selector popover trigger tracking
  const [activeSelectorIndex, setActiveSelectorIndex] = useState<number | null>(null);
  const [createTargetLineIndex, setCreateTargetLineIndex] = useState<number | null>(null);
  const triggerRefs = useRef<{ [index: number]: HTMLButtonElement | null }>({});
  const createNameInputRef = useRef<HTMLInputElement>(null);

  // Modals & Drawers
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createAccountName, setCreateAccountName] = useState<string>('');
  const [createAccountCode, setCreateAccountCode] = useState<string>('');
  const [createAccountCategory, setCreateAccountCategory] = useState<string>('EXPENSE');

  // Fetch Chart of Accounts
  const {
    data: accountsResponse,
    isLoading: accountsLoading,
    isError: accountsError,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ['accounts-lookup-full'],
    queryFn: async () => {
      const res = await api.get('/accounts/lookup', {
        params: { limit: 200 },
      });
      return ensureArray<AccountOption>(res);
    },
    staleTime: 60000,
  });

  const allAccounts: AccountOption[] = useMemo(() => {
    return Array.isArray(accountsResponse) ? accountsResponse : [];
  }, [accountsResponse]);

  // Calculations for Double Entry using integer paise to avoid float precision drift
  const totalDebit = useMemo(() => {
    const sumPaise = lines.reduce(
      (acc, curr) => acc + Math.round((Number(curr.debit) || 0) * 100),
      0
    );
    return sumPaise / 100;
  }, [lines]);

  const totalCredit = useMemo(() => {
    const sumPaise = lines.reduce(
      (acc, curr) => acc + Math.round((Number(curr.credit) || 0) * 100),
      0
    );
    return sumPaise / 100;
  }, [lines]);

  const difference = useMemo(() => {
    const diffPaise = Math.abs(
      lines.reduce((acc, curr) => acc + Math.round((Number(curr.debit) || 0) * 100), 0) -
      lines.reduce((acc, curr) => acc + Math.round((Number(curr.credit) || 0) * 100), 0)
    );
    return diffPaise / 100;
  }, [lines]);

  const isBalanced = useMemo(() => {
    return difference === 0 && totalDebit > 0;
  }, [difference, totalDebit]);

  // Accounting Impact Telemetry
  const accountingImpact = useMemo(() => {
    let pnlImpact = 0;
    let assetChange = 0;
    let liabilityChange = 0;
    let equityChange = 0;
    let cashBankChange = 0;

    lines.forEach((line) => {
      if (!line.account) return;
      const cat = line.account.category;
      const isDr = (Number(line.debit) || 0) > 0;
      const amt = isDr ? Number(line.debit) : Number(line.credit);

      if (amt <= 0) return;

      const isCashOrBank =
        line.account.name.toLowerCase().includes('cash') ||
        line.account.name.toLowerCase().includes('bank') ||
        line.account.parent?.name.toLowerCase().includes('cash') ||
        line.account.parent?.name.toLowerCase().includes('bank');

      if (cat === 'EXPENSE') {
        pnlImpact += isDr ? -amt : amt;
      } else if (cat === 'REVENUE') {
        pnlImpact += isDr ? -amt : amt;
      } else if (cat === 'ASSET') {
        assetChange += isDr ? amt : -amt;
        if (isCashOrBank) {
          cashBankChange += isDr ? amt : -amt;
        }
      } else if (cat === 'LIABILITY') {
        liabilityChange += isDr ? -amt : amt;
      } else if (cat === 'EQUITY') {
        equityChange += isDr ? -amt : amt;
      }
    });

    const isPureBalanceSheet = lines.some((l) => l.account) && pnlImpact === 0;

    return {
      pnlImpact,
      assetChange,
      liabilityChange,
      equityChange,
      cashBankChange,
      isPureBalanceSheet,
    };
  }, [lines]);

  // Handle Debit Entry
  const handleDebitChange = (index: number, val: number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        debit: val,
        credit: val > 0 ? 0 : next[index].credit,
      };
      return next;
    });
  };

  // Handle Credit Entry
  const handleCreditChange = (index: number, val: number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        credit: val,
        debit: val > 0 ? 0 : next[index].debit,
      };
      return next;
    });
  };

  // Add Line with Smart Tally Balancing
  const handleAddLine = useCallback(() => {
    const curDebit = lines.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
    const curCredit = lines.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0);
    const diff = curDebit - curCredit;

    const newLine: VoucherLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accountId: '',
      account: null,
      debit: diff < 0 ? Math.abs(diff) : 0,
      credit: diff > 0 ? diff : 0,
      memo: '',
    };

    setLines((prev) => [...prev, newLine]);
  }, [lines]);

  // Remove Line
  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      notification.error('A double-entry voucher must contain at least 2 lines.');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Select Account from Popover or Creation
  const handleSelectAccount = (account: AccountOption, targetIndex?: number) => {
    const idx = targetIndex !== undefined ? targetIndex : activeSelectorIndex;
    if (idx === null || idx === undefined) return;
    setLines((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = {
          ...next[idx],
          accountId: account.id,
          account,
        };
      }
      return next;
    });
    setActiveSelectorIndex(null);
  };

  // Open Quick Create Ledger Modal (Closes Dropdown immediately while preserving target row)
  const handleOpenQuickCreate = (searchTerm: string) => {
    setCreateTargetLineIndex(activeSelectorIndex);
    setActiveSelectorIndex(null);
    setCreateAccountName(searchTerm);
    setCreateAccountCode('');
    setCreateAccountCategory('EXPENSE');
    setShowCreateModal(true);
  };

  // Close Quick Create Ledger Modal (Dropdown remains closed)
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateTargetLineIndex(null);
    setCreateAccountName('');
    setCreateAccountCode('');
  };

  // Apply Educational Template
  const handleApplyTemplate = (tmpl: (typeof EDUCATIONAL_TEMPLATES)[0]) => {
    const newLines: VoucherLine[] = [];

    tmpl.exampleLines.forEach((ex, idx) => {
      const matched =
        allAccounts.find(
          (a) =>
            a.category === ex.category &&
            a.name.toLowerCase().includes(ex.nameQuery.toLowerCase())
        ) ||
        allAccounts.find((a) => a.category === ex.category) ||
        null;

      newLines.push({
        id: `line-${Date.now()}-${idx}`,
        accountId: matched ? matched.id : '',
        account: matched,
        debit: ex.isDebit ? ex.amount : 0,
        credit: !ex.isDebit ? ex.amount : 0,
        memo: '',
      });
    });

    setLines(newLines);
    if (!mainNarration) {
      setMainNarration(tmpl.narration);
    }
    setShowTemplateModal(false);
    notification.success(`Loaded template: ${tmpl.title}`);
  };

  // Quick Account Creation
  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAccountName.trim()) return;

    try {
      const res = await api.post('/accounts', {
        name: createAccountName.trim(),
        code: createAccountCode.trim() || undefined,
        category: createAccountCategory,
        isGroup: false,
      });

      await queryClient.invalidateQueries({ queryKey: ['accounts-lookup-full'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });

      const newId = res?.id || res?.data?.id || (res as any)?.account?.id;
      const createdAcc: AccountOption = {
        id: newId,
        name: createAccountName.trim(),
        code: createAccountCode.trim() || undefined,
        category: createAccountCategory as any,
        balance: 0,
      };

      const targetIdx = createTargetLineIndex;
      if (targetIdx !== null && lines[targetIdx]) {
        handleSelectAccount(createdAcc, targetIdx);
      }

      handleCloseCreateModal();
      notification.success(`Created ledger account '${createdAcc.name}'`);
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to create ledger');
    }
  };

  // Auto-focus account name input when Quick Create modal opens
  useEffect(() => {
    let timer: any = null;
    if (showCreateModal) {
      timer = setTimeout(() => {
        createNameInputRef.current?.focus();
      }, 50);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showCreateModal]);

  // Escape key and scroll lock for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showCreateModal) handleCloseCreateModal();
        if (showTemplateModal) setShowTemplateModal(false);
      }
    };

    if (showCreateModal || showTemplateModal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCreateModal, showTemplateModal]);

  // Submit Mutation
  const postMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        date: voucherDate,
        reference: referenceNo.trim() || undefined,
        description: mainNarration.trim(),
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.memo.trim() || undefined,
        })),
      };

      const res = await api.post('/journal-entries', payload);
      return res;
    },
    onSuccess: async () => {
      notification.success('Journal Voucher posted successfully to General Ledger!');
      await erpInvalidate.journalEntry(queryClient);
      navigate('/journal-entries');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to post voucher';
      notification.error(msg);
    },
  });

  // Deterministic validation function returning either null (valid) or the exact error toast message
  const getValidationError = useCallback((): string | null => {
    if (!voucherDate) {
      return 'Voucher date is required.';
    }

    if (lines.length < 2) {
      return 'Add at least two journal lines with valid ledger accounts.';
    }

    // Check if all lines are missing accounts
    const noAccountCount = lines.filter((l) => !l.accountId).length;
    if (noAccountCount === lines.length) {
      return 'Add at least two journal lines with valid ledger accounts.';
    }

    // Check if any specific line is missing an account
    const missingAccIdx = lines.findIndex((l) => !l.accountId);
    if (missingAccIdx !== -1) {
      return 'Select a ledger account for all journal lines.';
    }

    // Validate line amounts
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const d = Number(l.debit);
      const c = Number(l.credit);

      if (isNaN(d) || isNaN(c)) {
        return 'Please enter a valid amount.';
      }
      if (d < 0 || c < 0) {
        return 'Negative amounts are not permitted. Please enter a valid amount.';
      }
      if (d > 0 && c > 0) {
        return `Journal line ${i + 1} cannot have both a debit and a credit amount.`;
      }
      if (d === 0 && c === 0) {
        return `Enter an amount for journal line ${i + 1}.`;
      }
    }

    const hasDebit = lines.some((l) => (Number(l.debit) || 0) > 0);
    const hasCredit = lines.some((l) => (Number(l.credit) || 0) > 0);
    if (!hasDebit || !hasCredit) {
      return 'A journal voucher must have at least one debit entry and one credit entry.';
    }

    // Integer paise comparison for absolute floating precision safety
    const totalDebitPaise = Math.round(lines.reduce((s, l) => s + (Number(l.debit) || 0) * 100, 0));
    const totalCreditPaise = Math.round(lines.reduce((s, l) => s + (Number(l.credit) || 0) * 100, 0));

    if (totalDebitPaise <= 0 || totalCreditPaise <= 0) {
      return 'Voucher must have non-zero debit and credit amounts.';
    }

    if (totalDebitPaise !== totalCreditPaise) {
      const diff = Math.abs(totalDebitPaise - totalCreditPaise) / 100;
      if (totalCreditPaise === 0) {
        return `Voucher is unbalanced by ${formatINR(diff)}. Add the corresponding credit entry before posting.`;
      }
      return `Voucher is unbalanced by ${formatINR(diff)}. Debit and credit must be equal.`;
    }

    if (!mainNarration.trim()) {
      return 'Narration is required.';
    }

    return null;
  }, [voucherDate, lines, mainNarration]);

  const currentValidationError = getValidationError();
  const isFormFullyValid = currentValidationError === null;
  const disabledReason = currentValidationError || '';

  // Unified submission handler used by BOTH Top and Bottom Save & Post buttons
  const handleSaveAndPost = () => {
    // Prevent duplicate submission while mutation in flight
    if (postMutation.isPending) return;

    const errorMsg = getValidationError();
    if (errorMsg) {
      notification.error(errorMsg);
      return;
    }

    postMutation.mutate();
  };

  // Hotkey listener (Alt+A to add row)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleAddLine();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddLine]);

  return (
    <PageLayout className="w-full h-auto space-y-4 pb-12">
      {/* ── STANDARD BILL AURA PAGE HEADER ───────────────────────────── */}
      <PageHeader
        title="Journal Voucher"
        description="Record and post double-entry general journal vouchers"
        backTo="/journal-entries"
        secondaryAction={
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowTemplateModal(true)}
          >
            <BookOpen className="w-4 h-4 mr-1.5" />
            Standard Templates
          </Button>
        }
        primaryAction={
          <Button
            type="button"
            variant="primary"
            disabled={postMutation.isPending}
            title={isFormFullyValid ? 'Save and post double-entry voucher to General Ledger' : disabledReason}
            onClick={handleSaveAndPost}
            className={!isFormFullyValid ? 'opacity-90 hover:opacity-100' : 'shadow-md'}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {postMutation.isPending ? 'Posting...' : 'Save & Post Voucher'}
          </Button>
        }
      />

      {/* ── VOUCHER DETAILS CARD ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1E1C26] border border-border rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Voucher Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Voucher No / Reference
            </label>
            <input
              type="text"
              placeholder="Auto: JV-YYYY-00001"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Voucher Scope
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border border-border/80 rounded-lg text-xs font-medium text-foreground">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>General Journal (Double-Entry Direct Adjustment)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACCOUNT PARTICULARS & JOURNAL GRID (DOMINANT WORKSPACE) ──── */}
      <div className="bg-white dark:bg-[#1E1C26] border border-border rounded-xl shadow-xs w-full h-auto">
        <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/20">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Account Particulars & Entry Lines
          </h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">Alt + A</kbd> to add row
          </span>
        </div>

        <div className="w-full h-auto overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse h-auto">
            <thead>
              <tr className="bg-[#34303F] text-white text-xs select-none">
                <th className="py-2.5 px-3 w-16 text-center font-semibold">By / To</th>
                <th className="py-2.5 px-4 font-semibold w-5/12">Account Particulars (Ledger)</th>
                <th className="py-2.5 px-4 w-44 text-right font-semibold">Debit (Dr ₹)</th>
                <th className="py-2.5 px-4 w-44 text-right font-semibold">Credit (Cr ₹)</th>
                <th className="py-2.5 px-4 font-semibold hidden md:table-cell">Line Memo</th>
                <th className="py-2.5 px-3 w-12 text-center font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs h-auto">
              {lines.map((line, index) => {
                const isDebitSide = (Number(line.debit) || 0) > 0;
                const isCreditSide = (Number(line.credit) || 0) > 0;
                const byToLabel = isDebitSide
                  ? 'By (Dr)'
                  : isCreditSide
                  ? 'To (Cr)'
                  : index === 0
                  ? 'By (Dr)'
                  : 'To (Cr)';
                const categoryMeta = line.account ? CATEGORY_META[line.account.category] : null;

                return (
                  <tr key={line.id} className="hover:bg-muted/20 transition-colors">
                    {/* By / To Column */}
                    <td className="py-3 px-3 text-center align-top">
                      <span
                        className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${
                          isDebitSide
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : isCreditSide
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {byToLabel}
                      </span>
                    </td>

                    {/* Account Particulars Column */}
                    <td className="py-3 px-4 align-top">
                      <button
                        ref={(el) => {
                          triggerRefs.current[index] = el;
                        }}
                        type="button"
                        onClick={() => setActiveSelectorIndex(index)}
                        className={`w-full text-left px-3 py-2 bg-background border rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          line.account
                            ? 'border-border hover:border-accent'
                            : 'border-dashed border-border hover:border-accent text-muted-foreground'
                        }`}
                      >
                        {line.account ? (
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground truncate">
                                {line.account.name}
                              </span>
                              {line.account.code && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-muted text-muted-foreground rounded">
                                  {line.account.code}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate flex items-center gap-2">
                              <span>{line.account.parent?.name || categoryMeta?.label} · {categoryMeta?.label}</span>
                              {line.account.balance !== undefined && (
                                <span>
                                  · Balance: <strong>{formatINR(Math.abs(line.account.balance))}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select Ledger Account...</span>
                        )}
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    </td>

                    {/* Debit Column */}
                    <td className="py-3 px-4 align-top">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={line.debit || ''}
                        onChange={(e) => handleDebitChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-right font-mono font-bold text-xs text-foreground focus:outline-none focus:border-accent"
                      />
                    </td>

                    {/* Credit Column */}
                    <td className="py-3 px-4 align-top">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={line.credit || ''}
                        onChange={(e) => handleCreditChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-right font-mono font-bold text-xs text-foreground focus:outline-none focus:border-accent"
                      />
                    </td>

                    {/* Line Memo Column */}
                    <td className="py-3 px-4 align-top hidden md:table-cell">
                      <input
                        type="text"
                        placeholder="Optional memo..."
                        value={line.memo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLines((prev) => {
                            const next = [...prev];
                            next[index] = { ...next[index], memo: val };
                            return next;
                          });
                        }}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent"
                      />
                    </td>

                    {/* Delete Column */}
                    <td className="py-3 px-3 text-center align-top">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(index)}
                        disabled={lines.length <= 2}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                        title="Delete Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Line Strip */}
        <div className="p-3 border-t border-border flex items-center justify-between bg-muted/10">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddLine}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Journal Line
          </Button>

          <span className="text-xs text-muted-foreground font-medium">
            {lines.length} lines in voucher
          </span>
        </div>

        {/* ── LIVE BALANCE SUMMARY BAR ───────────────────────────────── */}
        <div className="p-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                Total Debit (Dr)
              </span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                {formatINR(totalDebit)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                Total Credit (Cr)
              </span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                {formatINR(totalCredit)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                Difference
              </span>
              <span
                className={`text-sm font-black ${
                  difference === 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {formatINR(difference)}
              </span>
            </div>
          </div>

          <div>
            {isBalanced ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Voucher Balanced ({formatINR(totalDebit)})</span>
              </div>
            ) : totalDebit > 0 || totalCredit > 0 ? (
              <div className="inline-flex flex-col sm:items-end gap-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Unbalanced by {formatINR(difference)}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Debits must equal credits before posting
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground border border-border text-xs font-medium">
                <span>Enter line debit and credit amounts</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NARRATION / PARTICULARS ──────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1E1C26] border border-border rounded-xl p-4 shadow-xs">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Narration / Particulars <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <textarea
            rows={2}
            required
            placeholder="Explain why this transaction was recorded (e.g. Being office furniture purchased for administrative use paid via bank transfer)"
            value={mainNarration}
            onChange={(e) => setMainNarration(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
          />
          {!mainNarration && (
            <button
              type="button"
              onClick={() => setMainNarration('Being ')}
              className="absolute right-3 bottom-3 text-[10px] font-bold text-accent hover:underline bg-background/80 px-2 py-0.5 rounded border border-border cursor-pointer"
            >
              Insert "Being ..."
            </button>
          )}
        </div>
      </div>

      {/* ── COMPACT ACCOUNTING IMPACT STRIP ──────────────────────────── */}
      <div className="bg-white dark:bg-[#1E1C26] border border-border rounded-xl p-4 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <span>Accounting Impact Telemetry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-background border border-border/80 rounded-lg">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
              <span>Profit & Loss</span>
              <Receipt className="w-3.5 h-3.5" />
            </div>
            {accountingImpact.pnlImpact === 0 ? (
              <span className="text-xs font-bold text-muted-foreground">
                ₹0.00 · Pure Balance Sheet Movement
              </span>
            ) : accountingImpact.pnlImpact < 0 ? (
              <span className="text-xs font-bold text-rose-500">
                Reduces Profit by {formatINR(Math.abs(accountingImpact.pnlImpact))}
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-500">
                Increases Profit by {formatINR(accountingImpact.pnlImpact)}
              </span>
            )}
          </div>

          <div className="p-3 bg-background border border-border/80 rounded-lg">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
              <span>Balance Sheet Position</span>
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-foreground">
              Assets: {formatINR(accountingImpact.assetChange)}
            </span>
          </div>

          <div className="p-3 bg-background border border-border/80 rounded-lg">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
              <span>Cash / Bank Liquidity</span>
              <Wallet className="w-3.5 h-3.5" />
            </div>
            {accountingImpact.cashBankChange === 0 ? (
              <span className="text-xs font-bold text-muted-foreground">
                No Cash/Bank Movement
              </span>
            ) : accountingImpact.cashBankChange > 0 ? (
              <span className="text-xs font-bold text-emerald-500">
                +{formatINR(accountingImpact.cashBankChange)} Liquid Inflow
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-500">
                -{formatINR(Math.abs(accountingImpact.cashBankChange))} Liquid Outflow
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ACTIONS ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => {
            setLines([
              { id: 'line-1', accountId: '', account: null, debit: 0, credit: 0, memo: '' },
              { id: 'line-2', accountId: '', account: null, debit: 0, credit: 0, memo: '' },
            ]);
            setMainNarration('');
            setReferenceNo('');
          }}
          className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Voucher</span>
        </button>

        <div className="flex items-center gap-3">
          {!isFormFullyValid && !postMutation.isPending && (
            <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
              {disabledReason}
            </span>
          )}
          <Button
            type="button"
            variant="primary"
            disabled={postMutation.isPending}
            title={isFormFullyValid ? 'Save and post double-entry voucher to General Ledger' : disabledReason}
            onClick={handleSaveAndPost}
            className={!isFormFullyValid ? 'opacity-90 hover:opacity-100' : 'shadow-md'}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {postMutation.isPending ? 'Posting Voucher...' : 'Save & Post Voucher'}
          </Button>
        </div>
      </div>

      {/* ── FLOATING PORTAL ACCOUNT SELECTOR ─────────────────────────── */}
      {activeSelectorIndex !== null && (
        <FloatingAccountSelector
          isOpen={activeSelectorIndex !== null}
          onClose={() => setActiveSelectorIndex(null)}
          triggerRef={{ current: triggerRefs.current[activeSelectorIndex] || null }}
          selectedAccountId={lines[activeSelectorIndex]?.accountId}
          onSelect={handleSelectAccount}
          accounts={allAccounts}
          isLoading={accountsLoading}
          isError={accountsError}
          onRetry={() => refetchAccounts()}
          onQuickCreate={handleOpenQuickCreate}
        />
      )}

      {/* ── EDUCATIONAL TEMPLATES MODAL ──────────────────────────────── */}
      {showTemplateModal &&
        createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in cursor-pointer"
              onClick={() => setShowTemplateModal(false)}
            />
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#1E1C26] border border-border/80 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden text-left z-10 animate-in zoom-in-95 fade-in duration-150">
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-bold text-foreground">
                    Standard Journal Voucher Templates
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3">
                <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-accent block uppercase text-[10px] tracking-wider">
                    The Golden Rules of Accounting
                  </span>
                  <p className="text-foreground text-xs">
                    • <strong>Assets & Expenses:</strong> Debit increases balance; Credit decreases balance.
                  </p>
                  <p className="text-foreground text-xs">
                    • <strong>Liabilities, Equity & Revenues:</strong> Credit increases balance; Debit decreases balance.
                  </p>
                </div>

                <div className="space-y-2">
                  {EDUCATIONAL_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="p-3 bg-background border border-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-foreground">{tmpl.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
                        <p className="text-[11px] text-accent mt-1 italic">"{tmpl.narration}"</p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleApplyTemplate(tmpl)}
                      >
                        Use Template
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── QUICK CREATE ACCOUNT MODAL ───────────────────────────────── */}
      {showCreateModal &&
        createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            {/* Full-viewport backdrop covering sidebar, header, table */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in cursor-pointer"
              onClick={handleCloseCreateModal}
            />

            {/* Centered Modal Dialog */}
            <div
              className="relative w-full max-w-md bg-white dark:bg-[#1E1C26] border border-border/80 rounded-2xl shadow-2xl overflow-hidden text-left z-10 animate-in zoom-in-95 fade-in duration-150"
              role="dialog"
              aria-modal="true"
            >
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">
                  Quick Create Ledger Account
                </h3>
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleQuickCreateSubmit} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={createNameInputRef}
                    type="text"
                    required
                    placeholder="e.g. Office Supplies"
                    value={createAccountName}
                    onChange={(e) => setCreateAccountName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Account Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5201"
                    value={createAccountCode}
                    onChange={(e) => setCreateAccountCode(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Accounting Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createAccountCategory}
                    onChange={(e) => setCreateAccountCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-accent"
                  >
                    <option value="EXPENSE">Expense (Indirect & Direct Costs)</option>
                    <option value="ASSET">Asset (Cash, Bank, Property, Receivable)</option>
                    <option value="LIABILITY">Liability (Debt, Payable, Taxes)</option>
                    <option value="EQUITY">Equity (Owner Capital, Earnings)</option>
                    <option value="REVENUE">Revenue (Sales & Operating Income)</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCloseCreateModal}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Create Ledger
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </PageLayout>
  );
};
