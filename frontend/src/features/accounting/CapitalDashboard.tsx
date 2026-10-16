import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient as api } from '@/core/api/apiClient';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { SearchableSelect } from '@/shared/components/ui';
import {
  Info,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  HelpCircle,
} from 'lucide-react';

interface CapitalTransaction {
  id: string;
  date: string;
  type: 'INTRODUCED' | 'DRAWING';
  typeLabel?: string;
  reference: string;
  bankAccount: string;
  notes: string;
  amount: number;
}

interface CapitalOverviewData {
  summary: {
    totalIntroduced: number;
    totalDrawings: number;
    netEquity: number;
  };
  recentTransactions: CapitalTransaction[];
}

const formatCurrency = (val: number | string | undefined | null): string => {
  const num = Number(val || 0);
  if (Math.abs(num) < 0.005) return '—';
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export const CapitalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form State
  const [formData, setFormData] = useState({
    type: 'INTRODUCED' as 'INTRODUCED' | 'DRAWING',
    amount: '',
    bankAccountId: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  // Inline Validation Errors
  const [errors, setErrors] = useState<{
    amount?: string;
    bankAccountId?: string;
    date?: string;
  }>({});

  // 1. Fetch Bank Accounts
  const { data: bankAccountsData, isLoading: bankLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get('/bank-accounts');
      return res.data;
    },
  });

  const bankAccounts = useMemo(() => {
    if (Array.isArray(bankAccountsData?.data?.items)) return bankAccountsData.data.items;
    if (Array.isArray(bankAccountsData?.data)) return bankAccountsData.data;
    if (Array.isArray(bankAccountsData)) return bankAccountsData;
    return [];
  }, [bankAccountsData]);

  // Selected bank details
  const selectedBank = useMemo(() => {
    return bankAccounts.find((b: any) => b.id === formData.bankAccountId);
  }, [bankAccounts, formData.bankAccountId]);

  // Overdraft warning for Drawings
  const overdraftWarning = useMemo(() => {
    if (formData.type !== 'DRAWING' || !selectedBank || !formData.amount) return null;
    const amountNum = parseFloat(formData.amount);
    const balanceNum = Number(selectedBank.currentBalance || 0);
    if (!isNaN(amountNum) && amountNum > balanceNum) {
      return `Amount exceeds selected account balance (${formatCurrency(balanceNum)})`;
    }
    return null;
  }, [formData.type, selectedBank, formData.amount]);

  // 2. Fetch Capital Overview (Summary + History)
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<CapitalOverviewData>({
    queryKey: ['capital', 'overview'],
    queryFn: async () => {
      const res = await api.get('/capital');
      return res.data;
    },
  });

  // 3. Fallback to Chart of Accounts for Equity balances if needed
  const { data: coaAccounts = [] } = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: async () => {
      const res = await api.get('/accounting/accounts');
      return Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    },
    enabled: !overviewData?.summary,
  });

  const computedSummary = useMemo(() => {
    if (overviewData?.summary) {
      return overviewData.summary;
    }
    // Calculate client-side fallback from Chart of Accounts
    let intro = 0;
    let draw = 0;
    coaAccounts.forEach((acc: any) => {
      const name = (acc.name || '').toLowerCase();
      if (name.includes('capital') || name === 'owners capital') {
        intro += Math.abs(Number(acc.balance || 0));
      } else if (name.includes('drawing') || name === 'drawings') {
        draw += Math.abs(Number(acc.balance || 0));
      }
    });
    return {
      totalIntroduced: intro,
      totalDrawings: draw,
      netEquity: intro - draw,
    };
  }, [overviewData, coaAccounts]);

  const recentTransactions = useMemo(() => {
    return overviewData?.recentTransactions || [];
  }, [overviewData]);

  // 4. Mutation to Record Transaction
  const mutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return api.post('/capital', {
        ...payload,
        amount: parseFloat(payload.amount),
      });
    },
    onSuccess: async () => {
      const isIntro = formData.type === 'INTRODUCED';
      notification.success(
        isIntro
          ? `Capital Introduced of ${formatCurrency(formData.amount)} successfully posted to ledger.`
          : `Owner's Drawing of ${formatCurrency(formData.amount)} successfully posted to ledger.`
      );

      // Invalidate queries to refresh summary, history, and bank balances without page reload
      await erpInvalidate.bankTransaction(queryClient, {
        accountId: formData.bankAccountId || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['capital'] });
      await queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      await refetchOverview();

      // Reset form (retaining type and date as per A5)
      setFormData(prev => ({
        ...prev,
        amount: '',
        reference: '',
        notes: '',
      }));
      setErrors({});
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to record capital transaction';
      notification.error(msg);
    },
  });

  // Client-side Validation (A3)
  const validateForm = () => {
    const newErrors: { amount?: string; bankAccountId?: string; date?: string } = {};

    const amountNum = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Please enter an amount greater than 0';
    } else {
      const decimals = formData.amount.split('.')[1];
      if (decimals && decimals.length > 2) {
        newErrors.amount = 'Amount cannot have more than 2 decimal places';
      }
    }

    if (!formData.bankAccountId) {
      newErrors.bankAccountId = 'Bank / Cash account is required';
    }

    if (!formData.date || formData.date.trim() === '') {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    mutation.mutate(formData);
  };

  const handleClear = () => {
    setFormData({
      type: 'INTRODUCED',
      amount: '',
      bankAccountId: '',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
    });
    setErrors({});
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-white text-[#333333] font-sans antialiased select-text">
      {/* 1. Header Block (Fixed compact pattern ~56px) */}
      <header className="shrink-0 flex items-center justify-between px-6 h-14 border-b border-[#e5e7eb] bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <h1 className="text-[20px] font-semibold text-[#333333] tracking-tight">
            Owner's Capital
          </h1>
          <div
            className="text-[#6c7380] hover:text-[#333333] cursor-help p-1"
            title="Record capital introduced and owner's drawings"
          >
            <Info className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/general-ledger"
            className="inline-flex items-center gap-1 text-[13px] text-[#408dfb] hover:underline font-medium"
          >
            <span>General Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* 2. Summary Strip (B2) */}
        <div className="border border-[#e5e7eb] rounded bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#e5e7eb] p-4">
            {/* Block 1: Capital Introduced */}
            <div className="sm:px-4 py-2 sm:py-0 first:pl-0">
              <div className="text-[12px] font-medium text-[#6c7380]">Capital Introduced</div>
              <div className="text-[18px] font-semibold text-[#333333] tabular-nums mt-0.5">
                {overviewLoading ? '...' : formatCurrency(computedSummary.totalIntroduced)}
              </div>
              <div className="text-[11px] text-[#999999] mt-0.5">This financial year</div>
            </div>

            {/* Block 2: Owner's Drawings */}
            <div className="sm:px-4 py-2 sm:py-0">
              <div className="text-[12px] font-medium text-[#6c7380]">Owner's Drawings</div>
              <div className="text-[18px] font-semibold text-[#333333] tabular-nums mt-0.5">
                {overviewLoading ? '...' : formatCurrency(computedSummary.totalDrawings)}
              </div>
              <div className="text-[11px] text-[#999999] mt-0.5">This financial year</div>
            </div>

            {/* Block 3: Net Owner's Equity */}
            <div className="sm:px-4 py-2 sm:py-0 last:pr-0">
              <div className="text-[12px] font-medium text-[#6c7380]">Net Owner's Equity</div>
              <div className="text-[18px] font-semibold text-[#333333] tabular-nums mt-0.5">
                {overviewLoading ? '...' : formatCurrency(computedSummary.netEquity)}
              </div>
              <div className="text-[11px] text-[#999999] mt-0.5">Capital minus drawings</div>
            </div>
          </div>
        </div>

        {/* 3. Record Transaction Form (B3 - Left aligned, max-w-640px) */}
        <div className="max-w-[640px]">
          <h2 className="text-[14px] font-semibold text-[#333333] mb-4">
            Record Transaction
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selector Toggle */}
            <div className="flex items-center gap-0 w-[320px] h-8 bg-white border border-[#d9dce3] rounded overflow-hidden p-0.5">
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, type: 'INTRODUCED' }));
                  setErrors(prev => ({ ...prev, amount: undefined }));
                }}
                className={`flex-1 h-full text-[13px] font-medium rounded transition-colors ${
                  formData.type === 'INTRODUCED'
                    ? 'bg-[#eef4ff] text-[#408dfb] font-semibold'
                    : 'text-[#6c7380] hover:text-[#333333]'
                }`}
              >
                Capital Introduced
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, type: 'DRAWING' }));
                  setErrors(prev => ({ ...prev, amount: undefined }));
                }}
                className={`flex-1 h-full text-[13px] font-medium rounded transition-colors ${
                  formData.type === 'DRAWING'
                    ? 'bg-[#eef4ff] text-[#408dfb] font-semibold'
                    : 'text-[#6c7380] hover:text-[#333333]'
                }`}
              >
                Owner's Drawing
              </button>
            </div>

            {/* Field 1: Amount */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <label className="w-[160px] text-[13px] text-[#333333] pt-2 shrink-0">
                Amount <span className="text-[#e54545]">*</span>
              </label>
              <div className="w-full max-w-[420px]">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#6c7380] pointer-events-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, amount: e.target.value }));
                      if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }));
                    }}
                    placeholder="0.00"
                    className={`w-full h-9 pl-7 pr-3 text-right text-[13px] tabular-nums text-[#333333] bg-white border rounded focus:outline-none focus:border-[#408dfb] ${
                      errors.amount ? 'border-[#e54545]' : 'border-[#d9dce3]'
                    }`}
                  />
                </div>
                {errors.amount && (
                  <p className="text-[12px] text-[#e54545] mt-1">{errors.amount}</p>
                )}
                {overdraftWarning && (
                  <div className="flex items-center gap-1.5 text-[12px] text-[#d97706] mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{overdraftWarning}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Field 2: Date */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <label className="w-[160px] text-[13px] text-[#333333] pt-2 shrink-0">
                Date <span className="text-[#e54545]">*</span>
              </label>
              <div className="w-full max-w-[420px]">
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, date: e.target.value }));
                    if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
                  }}
                  className={`w-full h-9 px-3 text-[13px] text-[#333333] bg-white border rounded focus:outline-none focus:border-[#408dfb] ${
                    errors.date ? 'border-[#e54545]' : 'border-[#d9dce3]'
                  }`}
                />
                {errors.date && (
                  <p className="text-[12px] text-[#e54545] mt-1">{errors.date}</p>
                )}
              </div>
            </div>

            {/* Field 3: Bank / Cash Account */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <label className="w-[160px] text-[13px] text-[#333333] pt-2 shrink-0">
                Bank / Cash Account <span className="text-[#e54545]">*</span>
              </label>
              <div className="w-full max-w-[420px]">
                <SearchableSelect
                  value={formData.bankAccountId}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, bankAccountId: val }));
                    if (errors.bankAccountId) setErrors(prev => ({ ...prev, bankAccountId: undefined }));
                  }}
                  options={bankAccounts}
                  mapOption={(b: any) => ({
                    value: b.id,
                    label: b.name,
                    subLabel: b.currentBalance !== undefined ? `Bal: ${formatCurrency(b.currentBalance)}` : undefined,
                    searchKeywords: [b.accountNumber, b.bankName].filter(Boolean),
                  })}
                  placeholder="Select Bank / Cash Account"
                  searchPlaceholder="Search bank accounts..."
                  clearable
                />
                {errors.bankAccountId && (
                  <p className="text-[12px] text-[#e54545] mt-1">{errors.bankAccountId}</p>
                )}
              </div>
            </div>

            {/* Field 4: Reference# */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <label className="w-[160px] text-[13px] text-[#333333] pt-2 shrink-0">
                Reference#
              </label>
              <div className="w-full max-w-[420px]">
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder=""
                  className="w-full h-9 px-3 text-[13px] text-[#333333] bg-white border border-[#d9dce3] rounded focus:outline-none focus:border-[#408dfb]"
                />
              </div>
            </div>

            {/* Field 5: Notes */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <label className="w-[160px] text-[13px] text-[#333333] pt-2 shrink-0">
                Notes
              </label>
              <div className="w-full max-w-[420px]">
                <textarea
                  rows={3}
                  value={formData.notes}
                  maxLength={500}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional description or details..."
                  className="w-full p-2.5 text-[13px] text-[#333333] bg-white border border-[#d9dce3] rounded focus:outline-none focus:border-[#408dfb] resize-none"
                />
                <div className="text-[11px] text-[#999999] text-right mt-0.5">
                  {formData.notes.length}/500
                </div>
              </div>
            </div>

            {/* Live Accounting Preview Line */}
            <div className="sm:ml-[176px] text-[12px] text-[#6c7380] bg-[#f9f9fb] px-3 py-2 rounded border border-[#e5e7eb] max-w-[420px]">
              {formData.type === 'INTRODUCED' ? (
                <span>
                  <strong>Debit:</strong> {selectedBank?.name || 'Selected Bank Account'} &nbsp;|&nbsp;{' '}
                  <strong>Credit:</strong> Owner's Capital
                </span>
              ) : (
                <span>
                  <strong>Debit:</strong> Owner's Drawings &nbsp;|&nbsp;{' '}
                  <strong>Credit:</strong> {selectedBank?.name || 'Selected Bank Account'}
                </span>
              )}
            </div>

            {/* Form Actions (Buttons in row, left aligned) */}
            <div className="sm:ml-[176px] flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex items-center justify-center gap-1.5 h-8 px-4 text-[13px] font-medium text-white bg-[#408dfb] rounded hover:bg-[#3478d8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <span>Post to Ledger</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={mutation.isPending}
                className="h-8 px-4 text-[13px] font-medium text-[#333333] bg-white border border-[#d9dce3] rounded hover:bg-[#f9f9fb] transition-colors"
              >
                Cancel / Clear
              </button>
            </div>
          </form>

          {/* Help Note (B4) */}
          <div className="sm:ml-[176px] mt-4 text-[12px] text-[#6c7380]">
            Capital Introduced increases owner's equity. Owner's Drawing reduces it.
          </div>
        </div>

        {/* 4. Transaction History (B5) */}
        <div className="pt-4 border-t border-[#e5e7eb]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-[#333333]">
              Recent Capital & Drawing Transactions
            </h2>
            <Link
              to="/general-ledger"
              className="text-[12px] text-[#408dfb] hover:underline font-medium"
            >
              View all in General Ledger →
            </Link>
          </div>

          <div className="border border-[#e5e7eb] rounded overflow-hidden bg-white">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-[#f9f9fb] border-b border-[#e5e7eb]">
                <tr className="h-10 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                  <th className="pl-6 pr-3 py-2 w-[120px]">Date</th>
                  <th className="px-3 py-2 w-[160px]">Type</th>
                  <th className="px-3 py-2 w-[140px]">Reference</th>
                  <th className="px-3 py-2 w-[180px]">Bank Account</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="pr-6 pl-3 py-2 w-[130px] text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0f4]">
                {overviewLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="h-10 animate-pulse">
                      <td className="pl-6 pr-3"><div className="h-3 w-16 bg-[#eef0f4] rounded" /></td>
                      <td className="px-3"><div className="h-3 w-28 bg-[#eef0f4] rounded" /></td>
                      <td className="px-3"><div className="h-3 w-20 bg-[#eef0f4] rounded" /></td>
                      <td className="px-3"><div className="h-3 w-32 bg-[#eef0f4] rounded" /></td>
                      <td className="px-3"><div className="h-3 w-40 bg-[#eef0f4] rounded" /></td>
                      <td className="pr-6 pl-3 text-right"><div className="h-3 w-16 bg-[#eef0f4] rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[13px] text-[#6c7380]">
                      No capital transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => {
                    const isDraw = tx.type === 'DRAWING';
                    return (
                      <tr key={tx.id} className="h-10 hover:bg-[#f7f9ff] transition-colors">
                        <td className="pl-6 pr-3 py-2 whitespace-nowrap text-[#333333]">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isDraw ? (
                            <span className="text-[#d9822b] font-medium text-[12px]">
                              Owner's Drawing
                            </span>
                          ) : (
                            <span className="text-[#2e7d32] font-medium text-[12px]">
                              Capital Introduced
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[#6c7380] text-[12px]">
                          {tx.reference}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-[#333333]">
                          {tx.bankAccount}
                        </td>
                        <td className="px-3 py-2 truncate max-w-[280px] text-[#6c7380]" title={tx.notes}>
                          {tx.notes || '—'}
                        </td>
                        <td
                          className={`pr-6 pl-3 py-2 text-right tabular-nums whitespace-nowrap ${
                            isDraw ? 'text-[#d9822b]' : 'text-[#333333]'
                          }`}
                        >
                          {isDraw ? `-${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
