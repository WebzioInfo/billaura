import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Settings,
  Paperclip,
  Calendar,
  HelpCircle,
  Repeat,
  GripVertical,
  Upload,
} from 'lucide-react';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { apiClient as api, ensureArray } from '@/core/api/apiClient';
import { useSessionStore } from '@/features/auth/stores/sessionStore';

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
  description: string;
  contactId?: string;
  debit: number | string;
  credit: number | string;
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
    drExplanation: 'Debit increases expense (cost incurred)',
    crExplanation: 'Credit decreases expense (cost reversed or refunded)',
  },
};

// Educational Templates for Indian Accounting & Zoho parity
const EDUCATIONAL_TEMPLATES = [
  {
    id: 'capital_infusion',
    title: '1. Capital Infusion by Owner / Director',
    description: 'Debit Bank/Cash (Asset increases) and Credit Owner Capital (Equity increases).',
    narration: 'Being capital introduced by proprietor / partner into business account',
    exampleLines: [
      { category: 'ASSET', nameQuery: 'Bank', isDebit: true, amount: 200000 },
      { category: 'EQUITY', nameQuery: 'Capital', isDebit: false, amount: 200000 },
    ],
  },
  {
    id: 'salary_accrual',
    title: '2. Month-End Salary Accrual Entry',
    description: 'Debit Salaries Expense (P&L expense increases) and Credit Salaries Payable (Liability increases).',
    narration: 'Being monthly payroll accrued for staff salaries payable next month',
    exampleLines: [
      { category: 'EXPENSE', nameQuery: 'Salary', isDebit: true, amount: 85000 },
      { category: 'LIABILITY', nameQuery: 'Payable', isDebit: false, amount: 85000 },
    ],
  },
  {
    id: 'prepaid_rent',
    title: '3. Prepaid Rent Amortization',
    description: 'Debit Rent Expense (Expense recognized) and Credit Prepaid Rent (Asset amortization).',
    narration: 'Being adjustment of current month portion of prepaid advance rent',
    exampleLines: [
      { category: 'EXPENSE', nameQuery: 'Rent', isDebit: true, amount: 25000 },
      { category: 'ASSET', nameQuery: 'Prepaid', isDebit: false, amount: 25000 },
    ],
  },
  {
    id: 'bad_debt',
    title: '4. Bad Debt Write-off Entry',
    description: 'Debit Bad Debts Expense (Expense recognized) and Credit Accounts Receivable (Customer asset reduced).',
    narration: 'Being uncollectible receivable balance written off as bad debts',
    exampleLines: [
      { category: 'EXPENSE', nameQuery: 'Bad Debts', isDebit: true, amount: 12000 },
      { category: 'ASSET', nameQuery: 'Receivable', isDebit: false, amount: 12000 },
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

// FLOATING PORTAL ACCOUNT SELECTOR
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
    width: 380,
    isUp: false,
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const popoverHeight = 340;
      const width = Math.max(rect.width, 360);

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

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose, triggerRef]);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.code && a.code.toLowerCase().includes(q)) ||
        CATEGORY_META[a.category]?.label.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const grouped = useMemo(() => {
    const map: Record<string, AccountOption[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    filteredAccounts.forEach((acc) => {
      if (map[acc.category]) {
        map[acc.category].push(acc);
      }
    });
    return map;
  }, [filteredAccounts]);

  const flatVisibleAccounts = useMemo(() => {
    const list: AccountOption[] = [];
    Object.keys(grouped).forEach((cat) => {
      list.push(...grouped[cat]);
    });
    return list;
  }, [grouped]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowDown') {
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

  return createPortal(
    <div
      ref={menuRef}
      role="dialog"
      aria-label="Account selector"
      style={{
        position: 'fixed',
        top: dropdownCoords.top,
        left: dropdownCoords.left,
        width: dropdownCoords.width,
        zIndex: 9999,
      }}
      className="bg-white rounded-[4px] border border-[#CBD5E1] shadow-xl flex flex-col max-h-[340px] text-[13px] animate-in fade-in-50 duration-100"
    >
      <div className="p-2 border-b border-[#E5E7EB] bg-[#F8F9FB]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search accounts by name or code..."
            className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#D1D5DB] rounded focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#408DFB] mb-1" />
            <span className="text-xs">Loading chart of accounts...</span>
          </div>
        ) : flatVisibleAccounts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-gray-500 mb-2">No matching account found for "{search}"</p>
            <button
              type="button"
              onClick={() => onQuickCreate(search)}
              className="text-xs text-[#408DFB] hover:underline font-semibold cursor-pointer"
            >
              + Create "{search}" as a new account
            </button>
          </div>
        ) : (
          Object.keys(grouped).map((catKey) => {
            const list = grouped[catKey];
            if (list.length === 0) return null;
            const meta = CATEGORY_META[catKey];
            return (
              <div key={catKey} className="py-1">
                <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/70">
                  {meta.groupLabel}
                </div>
                {list.map((acc) => {
                  const isSelected = selectedAccountId === acc.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => onSelect(acc)}
                      className={`px-3 py-1.5 cursor-pointer flex items-center justify-between text-xs hover:bg-[#F0F5FF] ${
                        isSelected ? 'bg-blue-50 text-[#408DFB] font-medium' : 'text-[#2B2F36]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span>{acc.name}</span>
                        {acc.code && <span className="text-gray-400 text-[11px] ml-1.5">({acc.code})</span>}
                      </div>
                      <span className="text-[11px] text-gray-400 shrink-0">{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-[#E5E7EB] bg-gray-50 flex items-center justify-between text-xs text-gray-500">
        <button
          type="button"
          onClick={() => onQuickCreate(search)}
          className="text-[#408DFB] hover:underline font-medium flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> + New Account
        </button>
        <span className="text-[11px] text-gray-400">Esc to close</span>
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN JOURNAL FORM COMPONENT (Zoho Books Parity & Multi-Column Grid)
// ─────────────────────────────────────────────────────────────────────────────
export const JournalVoucherForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Mode: Normal Journal vs Recurring Journal
  const [isRecurring, setIsRecurring] = useState<boolean>(searchParams.get('recurring') === 'true');

  // Recurring specific fields
  const [profileName, setProfileName] = useState<string>('');
  const [repeatEvery, setRepeatEvery] = useState<string>('Week');
  const [startsOn, setStartsOn] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endsOn, setEndsOn] = useState<string>('');
  const [neverExpires, setNeverExpires] = useState<boolean>(true);

  // Journal Header Details (Multi-Column Layout)
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reverseDate, setReverseDate] = useState<string>('');
  const [publishReverseOnlyOnDate, setPublishReverseOnlyOnDate] = useState<boolean>(false);
  const [journalNumber, setJournalNumber] = useState<string>('1');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [reportingMethod, setReportingMethod] = useState<'both' | 'accrual' | 'cash'>('both');
  const [currency, setCurrency] = useState<string>('INR');

  // Journal Grid Lines (Exactly 2 blank rows initially, matching Zoho)
  const [lines, setLines] = useState<VoucherLine[]>([
    { id: 'line-1', accountId: '', account: null, description: '', contactId: '', debit: '', credit: '' },
    { id: 'line-2', accountId: '', account: null, description: '', contactId: '', debit: '', credit: '' },
  ]);

  // Account selector popover trigger tracking
  const [activeSelectorIndex, setActiveSelectorIndex] = useState<number | null>(null);
  const [createTargetLineIndex, setCreateTargetLineIndex] = useState<number | null>(null);
  const triggerRefs = useRef<{ [index: number]: HTMLButtonElement | null }>({});
  const createNameInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createAccountName, setCreateAccountName] = useState<string>('');
  const [createAccountCode, setCreateAccountCode] = useState<string>('');
  const [createAccountCategory, setCreateAccountCategory] = useState<string>('EXPENSE');

  // Attachments (up to 5 files, 10MB each)
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill next sequential journal number if not editing draft
  const { data: countData } = useQuery({
    queryKey: ['journal-entries-count'],
    queryFn: async () => {
      const res = await api.get('/journal-entries', { params: { limit: 1 } });
      const total = res.data?.meta?.total ?? res.data?.total ?? 0;
      return Number(total);
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (countData !== undefined && !searchParams.get('draftId')) {
      setJournalNumber(String(countData + 1));
    }
  }, [countData, searchParams]);

  // Restore draft if draftId is in URL
  useEffect(() => {
    const draftId = searchParams.get('draftId');
    if (!draftId) return;

    const companyId = useSessionStore.getState().user?.companyId;
    if (!companyId) return;

    try {
      const raw = localStorage.getItem(`billaura_manual_journal_drafts_${companyId}`);
      if (raw) {
        const drafts = JSON.parse(raw);
        const found = drafts.find((d: any) => d.id === draftId);
        if (found) {
          if (found.date) setVoucherDate(found.date.split('T')[0]);
          if (found.reverseDate) setReverseDate(found.reverseDate.split('T')[0]);
          if (found.publishReverseOnlyOnDate !== undefined) setPublishReverseOnlyOnDate(found.publishReverseOnlyOnDate);
          if (found.journalNo) setJournalNumber(found.journalNo);
          if (found.reference) setReferenceNo(found.reference);
          if (found.notes || found.description) setNotes(found.notes || found.description);
          if (found.reportingMethod) setReportingMethod(found.reportingMethod);
          if (found.currency) setCurrency(found.currency);
          if (Array.isArray(found.lines) && found.lines.length >= 2) {
            setLines(found.lines.map((l: any, idx: number) => ({
              id: l.id || `line-${Date.now()}-${idx}`,
              accountId: l.accountId || '',
              account: l.account || null,
              description: l.description || '',
              contactId: l.contactId || '',
              debit: l.debit !== undefined && l.debit !== 0 ? l.debit : '',
              credit: l.credit !== undefined && l.credit !== 0 ? l.credit : '',
            })));
          }
          notification.info('Draft loaded into manual journal form.');
        }
      }
    } catch (e) {
      console.error('Failed to load draft', e);
    }
  }, [searchParams]);

  // Real Accounts from Chart of Accounts
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

  // Real Customers & Vendors for Contact Dropdown
  const { data: customersData, isLoading: customersLoading } = useQuery<any>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').catch(() => ({ data: [] })),
    staleTime: 5 * 60 * 1000,
  });

  const { data: vendorsData, isLoading: vendorsLoading } = useQuery<any>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors').catch(() => ({ data: [] })),
    staleTime: 5 * 60 * 1000,
  });

  const contactOptions = useMemo(() => {
    const list: { id: string; name: string; type: string }[] = [];
    const custs = Array.isArray(customersData?.data) ? customersData.data : Array.isArray(customersData) ? customersData : [];
    const vends = Array.isArray(vendorsData?.data) ? vendorsData.data : Array.isArray(vendorsData) ? vendorsData : [];

    custs.forEach((c: any) => {
      const name = c.displayName || c.name || c.companyName || 'Customer';
      list.push({ id: c.id, name, type: 'Customer' });
    });
    vends.forEach((v: any) => {
      const name = v.displayName || v.name || v.companyName || 'Vendor';
      list.push({ id: v.id, name, type: 'Vendor' });
    });
    return list;
  }, [customersData, vendorsData]);

  // Decimal-safe calculations using integer paise to avoid float precision drift
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

  // Handle Debit Entry: enforces mutual exclusion (typing debit clears credit)
  const handleDebitChange = (index: number, valStr: string) => {
    const num = parseFloat(valStr);
    const debitVal = isNaN(num) || num < 0 ? '' : num;
    setLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        debit: valStr === '' ? '' : debitVal,
        credit: debitVal !== '' && Number(debitVal) > 0 ? '' : next[index].credit,
      };
      return next;
    });
  };

  // Handle Credit Entry: enforces mutual exclusion (typing credit clears debit)
  const handleCreditChange = (index: number, valStr: string) => {
    const num = parseFloat(valStr);
    const creditVal = isNaN(num) || num < 0 ? '' : num;
    setLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        credit: valStr === '' ? '' : creditVal,
        debit: creditVal !== '' && Number(creditVal) > 0 ? '' : next[index].debit,
      };
      return next;
    });
  };

  // Add Row: immediately appends a usable line
  const handleAddRow = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        accountId: '',
        account: null,
        description: '',
        contactId: '',
        debit: '',
        credit: '',
      },
    ]);
  };

  // Remove Row: enforced minimum 2 rows
  const handleRemoveRow = (index: number) => {
    if (lines.length <= 2) {
      notification.warning('A manual journal must have at least two journal lines.');
      return;
    }
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Select Account from Popover
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

  // Quick Create Account
  const handleOpenQuickCreate = (searchTerm: string) => {
    setCreateTargetLineIndex(activeSelectorIndex);
    setActiveSelectorIndex(null);
    setCreateAccountName(searchTerm);
    setCreateAccountCode('');
    setCreateAccountCategory('EXPENSE');
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateTargetLineIndex(null);
    setCreateAccountName('');
    setCreateAccountCode('');
  };

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
      notification.success(`Created account '${createdAcc.name}'`);
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to create account');
    }
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
        description: '',
        contactId: '',
        debit: ex.isDebit ? ex.amount : '',
        credit: !ex.isDebit ? ex.amount : '',
      });
    });

    setLines(newLines);
    if (!notes) {
      setNotes(tmpl.narration);
    }
    setShowTemplateModal(false);
    notification.success(`Loaded template: ${tmpl.title}`);
  };

  // Attachments Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    if (attachments.length + newFiles.length > 5) {
      notification.warning('You can attach a maximum of 5 files.');
      return;
    }

    for (const f of newFiles) {
      if (f.size > 10 * 1024 * 1024) {
        notification.error(`File "${f.name}" exceeds the 10MB limit.`);
        return;
      }
    }

    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Validation function with clear, actionable toast feedback
  const getValidationError = useCallback((): string | null => {
    if (isRecurring && !profileName.trim()) {
      return 'Profile Name is required for recurring journals.';
    }
    if (!voucherDate) {
      return 'Date is required.';
    }
    if (!notes.trim()) {
      return 'Notes are required.';
    }
    if (notes.length > 500) {
      return 'Notes must be within 500 characters.';
    }
    if (lines.length < 2) {
      return 'At least two journal lines are required.';
    }

    const missingAccIdx = lines.findIndex((l) => !l.accountId);
    if (missingAccIdx !== -1) {
      return `Please select an account for line ${missingAccIdx + 1}.`;
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const dr = Number(l.debit) || 0;
      const cr = Number(l.credit) || 0;
      if (dr <= 0 && cr <= 0) {
        return `Line ${i + 1} has zero debit and credit. Enter a debit or credit amount.`;
      }
      if (dr > 0 && cr > 0) {
        return `Line ${i + 1} cannot have both debit and credit amounts greater than zero.`;
      }
    }

    if (totalDebit <= 0 || totalCredit <= 0) {
      return 'Journal total debits and credits must be greater than zero.';
    }

    if (!isBalanced) {
      return `The journal is out of balance by ${formatINR(difference)}. Total debits must equal total credits.`;
    }

    return null;
  }, [isRecurring, profileName, voucherDate, notes, lines, totalDebit, totalCredit, isBalanced, difference]);

  // Save / Publish Mutation
  const postMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        date: voucherDate,
        reference: referenceNo.trim() || `JN-${journalNumber}`.trim(),
        description: notes.trim(),
        lines: lines.map((l) => {
          const contact = contactOptions.find((c) => c.id === l.contactId);
          const memo = l.description.trim();
          const lineDesc = contact
            ? `[${contact.type}: ${contact.name}] ${memo}`.trim()
            : memo || undefined;

          return {
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: lineDesc,
          };
        }),
      };

      return api.post('/journal-entries', payload);
    },
    onSuccess: async () => {
      const draftId = searchParams.get('draftId');
      const companyId = useSessionStore.getState().user?.companyId;
      if (draftId && companyId) {
        try {
          const storageKey = `billaura_manual_journal_drafts_${companyId}`;
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const list = JSON.parse(raw);
            localStorage.setItem(storageKey, JSON.stringify(list.filter((d: any) => d.id !== draftId)));
          }
        } catch {}
      }

      notification.success('Manual journal published successfully to General Ledger!');
      await erpInvalidate.journalEntry(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts-lookup-full'] });
      navigate('/journal-entries');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to publish manual journal';
      notification.error(msg);
    },
  });

  // Handle Save and Publish vs Save as Draft
  const handleSave = (asDraft = false) => {
    if (asDraft) {
      if (!voucherDate) {
        notification.error('Please enter a date for the draft journal.');
        return;
      }
      const companyId = useSessionStore.getState().user?.companyId;
      if (!companyId) {
        notification.error('Company context is required to save drafts.');
        return;
      }

      const draftId = searchParams.get('draftId') || `draft-${Date.now()}`;
      const draftData = {
        id: draftId,
        status: 'DRAFT',
        date: voucherDate,
        reverseDate,
        publishReverseOnlyOnDate,
        journalNo: journalNumber,
        reference: referenceNo,
        notes: notes.trim(),
        description: notes.trim(),
        reportingMethod,
        currency,
        lines: lines.map((l) => ({
          id: l.id,
          accountId: l.accountId,
          account: l.account ? { id: l.account.id, name: l.account.name, code: l.account.code } : null,
          description: l.description,
          contactId: l.contactId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
        createdAt: new Date().toISOString(),
      };

      try {
        const storageKey = `billaura_manual_journal_drafts_${companyId}`;
        const raw = localStorage.getItem(storageKey);
        const existing = raw ? JSON.parse(raw) : [];
        const filtered = existing.filter((d: any) => d.id !== draftId);
        localStorage.setItem(storageKey, JSON.stringify([draftData, ...filtered]));
        notification.success('Journal saved as draft. General Ledger remains unaffected.');
        navigate('/journal-entries');
      } catch {
        notification.error('Failed to save draft locally.');
      }
      return;
    }

    // Publish flow
    const error = getValidationError();
    if (error) {
      notification.error(error);
      return;
    }
    postMutation.mutate();
  };

  return (
    <div className="h-full w-full bg-white text-[#333] flex flex-col font-sans select-none overflow-hidden">
      {/* 1. Header Bar (Full width, bottom border) */}
      <div className="bg-white border-b border-[#e5e7eb] px-6 py-3 flex items-center justify-between shrink-0 z-10">
        <h1 className="text-xl font-semibold text-[#1e2540] tracking-tight">
          {isRecurring ? 'New Recurring Journal' : 'New Journal'}
        </h1>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="text-xs text-[#408dfb] hover:underline cursor-pointer font-medium flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Choose Template</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/journal-entries')}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body: Left-aligned, no mx-auto, no card wrapper */}
      <div className="flex-1 overflow-y-auto pl-6 pr-6 pt-6 pb-20">
        {/* Recurring Profile Section (if recurring mode) */}
        {isRecurring && (
          <div className="mb-6 p-4 bg-[#f9f9fb] border border-[#e5e7eb] rounded-[4px] max-w-[900px] space-y-4">
            <div className="text-xs font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-2">
              <Repeat className="w-4 h-4 text-[#408dfb]" /> Recurring Profile
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-[#333] mb-1 font-medium">
                  Profile Name <span className="text-[#e54545]">*</span>
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Monthly Rent Accrual"
                  className="w-full h-[36px] px-3 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none"
                />
              </div>
              <div>
                <label className="block text-[#333] mb-1 font-medium">
                  Repeat Every <span className="text-[#e54545]">*</span>
                </label>
                <select
                  value={repeatEvery}
                  onChange={(e) => setRepeatEvery(e.target.value)}
                  className="w-full h-[36px] px-3 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none cursor-pointer"
                >
                  <option value="Week">Week</option>
                  <option value="2 Weeks">2 Weeks</option>
                  <option value="Month">Month</option>
                  <option value="2 Months">2 Months</option>
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="Year">Year</option>
                </select>
              </div>
              <div>
                <label className="block text-[#333] mb-1 font-medium">Starts On</label>
                <input
                  type="date"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                  className="w-full h-[36px] px-3 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#333] font-medium">Ends On</label>
                  <label className="inline-flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={neverExpires}
                      onChange={(e) => setNeverExpires(e.target.checked)}
                      className="rounded text-[#408dfb]"
                    />
                    Never Expires
                  </label>
                </div>
                <input
                  type="date"
                  disabled={neverExpires}
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                  className="w-full h-[36px] px-3 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] disabled:bg-gray-100 disabled:text-gray-400 focus:border-[#408dfb] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2A. Top Fields Section (Stacked, Left-aligned, Label-Left / Input-Right) */}
        <div className="space-y-4 max-w-[660px]">
          {/* 1. Date* */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <label className="w-[160px] shrink-0 text-[13px] text-[#333] font-normal">
              Date <span className="text-[#e54545]">*</span>
            </label>
            <div className="w-full max-w-[480px]">
              <input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="w-full h-[36px] px-3 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none transition-colors"
              />
            </div>
          </div>

          {/* 2. Reverse Journal Date */}
          <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
            <label className="w-[160px] shrink-0 text-[13px] text-[#333] font-normal pt-2">
              Reverse Journal Date
            </label>
            <div className="w-full max-w-[480px] space-y-1.5">
              <input
                type="date"
                value={reverseDate}
                onChange={(e) => setReverseDate(e.target.value)}
                placeholder="dd/MM/yyyy"
                className="w-full h-[36px] px-3 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none transition-colors"
              />
              <label className="flex items-center gap-1.5 text-[12px] text-[#666] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={publishReverseOnlyOnDate}
                  onChange={(e) => setPublishReverseOnlyOnDate(e.target.checked)}
                  className="rounded border-[#d9dce3] text-[#408dfb] focus:ring-0"
                />
                <span>Publish reverse journal only on the reverse journal date</span>
                <span title="The reverse journal will be posted automatically on the specified date">
                  <HelpCircle className="w-3.5 h-3.5 text-[#999]" />
                </span>
              </label>
            </div>
          </div>

          {/* 3. Journal#* */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <label className="w-[160px] shrink-0 text-[13px] text-[#333] font-normal">
              Journal# <span className="text-[#e54545]">*</span>
            </label>
            <div className="w-full max-w-[480px] relative flex items-center">
              <input
                type="text"
                value={journalNumber}
                onChange={(e) => setJournalNumber(e.target.value)}
                className="w-full h-[36px] pl-3 pr-9 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  const val = prompt('Set Journal Number Series / Prefix:', journalNumber);
                  if (val) setJournalNumber(val.trim());
                }}
                className="absolute right-2 text-gray-400 hover:text-[#408dfb] p-1 cursor-pointer"
                title="Configure auto-number series"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4. Reference# */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <label className="w-[160px] shrink-0 text-[13px] text-[#333] font-normal">
              Reference#
            </label>
            <div className="w-full max-w-[480px]">
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full h-[36px] px-3 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none transition-colors"
              />
            </div>
          </div>

          {/* 5. Notes* */}
          <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
            <label className="w-[160px] shrink-0 text-[13px] text-[#333] font-normal pt-2">
              Notes <span className="text-[#e54545]">*</span>
            </label>
            <div className="w-full max-w-[480px] space-y-1">
              <textarea
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Max. 500 characters"
                className="w-full px-3 py-2 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none resize-y transition-colors"
              />
              <div className="text-right text-[11px] text-[#999]">
                {notes.length} / 500 characters
              </div>
            </div>
          </div>

          {/* 6. Reporting Method */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <label className="w-[160px] shrink-0 text-[13px] text-[#333] font-normal flex items-center gap-1">
              <span>Reporting Method</span>
              <span title="Select how this journal impacts accrual vs cash accounting reports">
                <HelpCircle className="w-3.5 h-3.5 text-[#999]" />
              </span>
            </label>
            <div className="w-full max-w-[480px] flex items-center gap-5 text-[13px] text-[#333]">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="reportingMethod"
                  value="both"
                  checked={reportingMethod === 'both'}
                  onChange={() => setReportingMethod('both')}
                  className="text-[#408dfb] focus:ring-0 cursor-pointer"
                />
                <span>Accrual and Cash</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="reportingMethod"
                  value="accrual"
                  checked={reportingMethod === 'accrual'}
                  onChange={() => setReportingMethod('accrual')}
                  className="text-[#408dfb] focus:ring-0 cursor-pointer"
                />
                <span>Accrual Only</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="reportingMethod"
                  value="cash"
                  checked={reportingMethod === 'cash'}
                  onChange={() => setReportingMethod('cash')}
                  className="text-[#408dfb] focus:ring-0 cursor-pointer"
                />
                <span>Cash Only</span>
              </label>
            </div>
          </div>

          {/* 7. Currency */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <label className="w-[160px] shrink-0 text-[13px] text-[#333] font-normal">
              Currency
            </label>
            <div className="w-full max-w-[480px]">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-[36px] px-3 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333] focus:border-[#408dfb] outline-none transition-colors cursor-pointer"
              >
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="AED">AED - UAE Dirham</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2B. Journal Lines Table (Left-aligned, max-w-[900px], mt-8) */}
        <div className="mt-8 max-w-[900px] w-full">
          <div className="overflow-x-auto w-full border-t border-b border-[#e5e7eb]">
            <table className="w-full text-left border-collapse text-[13px] table-fixed">
              <thead className="bg-[#f9f9fb] text-[#666] text-[11px] font-semibold uppercase tracking-wider border-b border-[#e5e7eb]">
                <tr>
                  <th style={{ width: '30%' }} className="py-2.5 px-3 border-r border-[#e5e7eb]">ACCOUNT *</th>
                  <th style={{ width: '28%' }} className="py-2.5 px-3 border-r border-[#e5e7eb]">DESCRIPTION</th>
                  <th style={{ width: '18%' }} className="py-2.5 px-3 border-r border-[#e5e7eb]">CONTACT</th>
                  <th style={{ width: '12%' }} className="py-2.5 px-3 text-right border-r border-[#e5e7eb]">DEBITS</th>
                  <th style={{ width: '12%' }} className="py-2.5 px-3 text-right border-r border-[#e5e7eb]">CREDITS</th>
                  <th style={{ width: '32px' }} className="py-2.5 px-1 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {lines.map((line, idx) => (
                  <tr key={line.id} className="group hover:bg-[#fafafa] transition-colors h-[44px]">
                    {/* Account Selector (30%) */}
                    <td className="p-0 border-r border-[#e5e7eb] relative">
                      <button
                        ref={(el) => {
                          triggerRefs.current[idx] = el;
                        }}
                        type="button"
                        onClick={() => setActiveSelectorIndex(idx)}
                        className={`w-full h-[44px] px-3 text-left text-[13px] flex items-center justify-between cursor-pointer border-0 outline-none ${
                          line.account ? 'text-[#333]' : 'text-gray-400'
                        }`}
                      >
                        <span className="truncate">
                          {line.account ? line.account.name : 'Select an account'}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
                      </button>
                    </td>

                    {/* Description (28%) */}
                    <td className="p-0 border-r border-[#e5e7eb]">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLines((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], description: val };
                            return next;
                          });
                        }}
                        placeholder="Description"
                        className="w-full h-[44px] px-3 bg-transparent border-0 outline-none text-[13px] text-[#333] placeholder:text-gray-400"
                      />
                    </td>

                    {/* Contact Selector (18%) */}
                    <td className="p-0 border-r border-[#e5e7eb]">
                      <select
                        value={line.contactId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLines((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], contactId: val };
                            return next;
                          });
                        }}
                        disabled={customersLoading || vendorsLoading}
                        className="w-full h-[44px] px-3 bg-transparent border-0 outline-none text-[13px] text-[#333] cursor-pointer"
                      >
                        <option value="">Select Contact</option>
                        {contactOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Debits (12%) */}
                    <td className="p-0 border-r border-[#e5e7eb]">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit}
                        onChange={(e) => handleDebitChange(idx, e.target.value)}
                        placeholder=""
                        className="w-full h-[44px] px-3 bg-transparent border-0 outline-none text-[13px] text-right tabular-nums text-[#333]"
                      />
                    </td>

                    {/* Credits (12%) */}
                    <td className="p-0 border-r border-[#e5e7eb]">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit}
                        onChange={(e) => handleCreditChange(idx, e.target.value)}
                        placeholder=""
                        className="w-full h-[44px] px-3 bg-transparent border-0 outline-none text-[13px] text-right tabular-nums text-[#333]"
                      />
                    </td>

                    {/* Delete Row Action (Far right, appears on row hover) */}
                    <td className="p-0 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={lines.length <= 2}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#e54545] disabled:opacity-0 p-1 cursor-pointer transition-opacity"
                        title={lines.length <= 2 ? 'At least two lines required' : 'Delete row'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* "+ Add New Row" Pill Button (Below table, left-aligned) */}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#eef4ff] text-[#408dfb] rounded-[4px] text-[12px] font-medium hover:bg-blue-100/70 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#408dfb]" />
              <span>Add New Row</span>
            </button>
          </div>

          {/* 2C. Totals Box (Aligned to the RIGHT end of the max-w-[900px] table container) */}
          <div className="flex justify-end mt-4">
            <div className="w-[420px] bg-[#f9f9fb] rounded-[6px] px-5 py-4 space-y-2.5 border border-[#e5e7eb]/60">
              {/* Sub Total */}
              <div className="flex justify-between items-center text-[13px] text-[#555]">
                <span className="font-medium">Sub Total</span>
                <div className="flex gap-6 tabular-nums text-[13px] text-[#333]">
                  <span className="w-24 text-right">{formatINR(totalDebit, true)}</span>
                  <span className="w-24 text-right">{formatINR(totalCredit, true)}</span>
                </div>
              </div>

              {/* Total (₹) */}
              <div className="flex justify-between items-center text-[15px] font-bold text-[#1e2540] pt-2 border-t border-[#e5e7eb]">
                <span>Total ({currency === 'INR' ? '₹' : currency})</span>
                <div className="flex gap-6 tabular-nums text-[15px]">
                  <span className="w-24 text-right">{formatINR(totalDebit, true)}</span>
                  <span className="w-24 text-right">{formatINR(totalCredit, true)}</span>
                </div>
              </div>

              {/* Difference */}
              <div className="flex justify-between items-center text-[13px] text-[#e54545] pt-2 border-t border-[#e5e7eb]">
                <span className="font-medium">Difference</span>
                <div className="w-24 text-right tabular-nums text-[13px] font-medium">
                  {difference > 0 ? formatINR(difference, true) : '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* 2D. Attachments (Below table section, left-aligned) */}
          <div className="mt-8">
            <label className="block text-[13px] text-[#333] font-medium mb-2">
              Attachments
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-dashed border-[#cbd5e1] hover:border-[#408dfb] text-[#333] rounded-[4px] text-[12px] font-medium cursor-pointer transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-[#666]" />
              <span>Upload File</span>
              <ChevronDown className="w-3 h-3 text-[#666]" />
            </button>

            <div className="text-[11px] text-[#999] mt-1.5">
              You can upload a maximum of 5 files, 10MB each
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3">
                {attachments.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f9f9fb] border border-[#e5e7eb] rounded-[4px] text-xs text-[#333]"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-[#408dfb]" />
                    <span className="truncate max-w-[180px] font-medium">{file.name}</span>
                    <span className="text-[10px] text-gray-500">
                      ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-gray-400 hover:text-[#e54545] p-0.5 cursor-pointer ml-1"
                      title="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Footer Action Bar (Fixed to bottom, full width, 12px 24px padding) */}
      <div className="bg-white border-t border-[#e5e7eb] px-6 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={postMutation.isPending}
            className="h-[36px] px-5 bg-[#408dfb] hover:bg-[#3078e0] disabled:bg-blue-300 text-white rounded-[4px] text-[13px] font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            {postMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save and Publish</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={postMutation.isPending}
            className="h-[36px] px-5 bg-white border border-[#d9dce3] hover:bg-gray-50 text-[#333] rounded-[4px] text-[13px] font-medium transition-colors cursor-pointer"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => navigate('/journal-entries')}
            disabled={postMutation.isPending}
            className="h-[36px] px-4 bg-white border border-[#d9dce3] hover:bg-gray-50 text-[#333] rounded-[4px] text-[13px] font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsRecurring(!isRecurring)}
            className="text-[13px] text-[#408dfb] hover:underline font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Repeat className="w-4 h-4" />
            <span>{isRecurring ? 'Convert to Normal Journal' : 'Make Recurring'}</span>
          </button>
        </div>
      </div>

      {/* Floating Account Selector Portal */}
      {activeSelectorIndex !== null && triggerRefs.current[activeSelectorIndex] && (
        <FloatingAccountSelector
          isOpen={true}
          onClose={() => setActiveSelectorIndex(null)}
          triggerRef={{ current: triggerRefs.current[activeSelectorIndex] }}
          selectedAccountId={lines[activeSelectorIndex]?.accountId}
          onSelect={(acc) => handleSelectAccount(acc, activeSelectorIndex)}
          accounts={allAccounts}
          isLoading={accountsLoading}
          isError={accountsError}
          onRetry={refetchAccounts}
          onQuickCreate={handleOpenQuickCreate}
        />
      )}

      {/* Educational Templates Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-gray-200 overflow-hidden text-xs">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#408DFB]" />
                <h3 className="font-semibold text-gray-900 text-sm">Choose Standard Journal Template</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {EDUCATIONAL_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="p-3 border border-gray-200 rounded hover:border-[#408DFB] hover:bg-blue-50/30 cursor-pointer transition-all"
                >
                  <div className="font-semibold text-gray-900 mb-1">{tmpl.title}</div>
                  <p className="text-gray-600 text-[11px] mb-2">{tmpl.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded">
                    <span>Default Narration: "{tmpl.narration}"</span>
                    <span className="text-[#408DFB] font-semibold">Apply Template →</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 text-right">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-1.5 text-xs bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form
            onSubmit={handleQuickCreateSubmit}
            className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200 overflow-hidden text-xs"
          >
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm">Create New Account</h3>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={createAccountCategory}
                  onChange={(e) => setCreateAccountCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB] bg-white cursor-pointer"
                >
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="EQUITY">Equity</option>
                  <option value="REVENUE">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={createNameInputRef}
                  type="text"
                  required
                  value={createAccountName}
                  onChange={(e) => setCreateAccountName(e.target.value)}
                  placeholder="e.g. Office Stationery"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Account Code</label>
                <input
                  type="text"
                  value={createAccountCode}
                  onChange={(e) => setCreateAccountCode(e.target.value)}
                  placeholder="e.g. 5010"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#408DFB]"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-[#408DFB] text-white rounded font-semibold hover:bg-blue-600 cursor-pointer"
              >
                Save and Select
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default JournalVoucherForm;
