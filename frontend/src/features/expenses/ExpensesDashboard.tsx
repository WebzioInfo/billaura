import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/core/services/NotificationService';
import {
  Plus,
  Trash2,
  Edit2,
  Printer,
  ChevronDown,
  UploadCloud,
  FileText,
  Search,
  Check,
  Building2,
  Tag,
  CreditCard,
  User,
  Inbox,
  Paperclip,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { ensureArray } from '@/core/api';
import { erpInvalidate } from '@/core/query/erpConsistency';
import {
  ZohoListTable,
  ZohoColumn,
  ZohoSplitDetail,
  ZohoSplitListItem,
  ZohoPDFPreview,
  ZohoEmptyState,
} from '@/shared/components/zoho';
import { DeleteDialog } from '@/shared/components/ui';
import { cn } from '@/lib/utils';
import { useTaxEngine } from '@/features/taxes/hooks/useTaxEngine';

const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Please select an expense account'),
  bankAccountId: z.string().min(1, 'Please select a paid through account'),
  date: z.string().min(1, 'Please select an expense date'),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  taxAmount: z.number().min(0).optional(),
  vendorId: z.string().optional(),
  reference: z.string().optional(),
  billNumber: z.string().optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
  paymentMethod: z.string().optional(),
  departmentId: z.string().optional(),
  taxApplicable: z.boolean().optional(),
  gstRate: z.number().optional(),
  taxPreference: z.string().optional(),
  taxMode: z.string().optional(),
  taxType: z.string().optional(),
  taxableAmount: z.number().optional(),
  cgstAmount: z.number().optional(),
  sgstAmount: z.number().optional(),
  igstAmount: z.number().optional(),
  cessAmount: z.number().optional(),
  // Extended fields for billable
  customerName: z.string().optional(),
  isBillable: z.boolean().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  accountId: z.string().min(1, 'General Ledger Mapping is required'),
  defaultTaxApplicable: z.boolean().optional(),
  defaultGstRate: z.number().optional(),
  defaultTaxPreference: z.string().optional(),
  defaultTaxMode: z.string().optional(),
  defaultInputTaxAccountId: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

type ExpenseView = 'all' | 'non_billable' | 'billable' | 'invoiced' | 'categories';

export const ExpensesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeMainTab, setActiveMainTab] = useState<'expenses' | 'inbox'>('expenses');
  const [currentView, setCurrentView] = useState<ExpenseView>(
    searchParams.get('tab') === 'categories' ? 'categories' : 'all'
  );
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [showPdfView, setShowPdfView] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);

  // Receipts Inbox Mock state
  const [receiptFiles, setReceiptFiles] = useState<
    Array<{ id: string; name: string; size: string; date: string; status: string }>
  >([
    { id: '1', name: 'Cab_Receipt_14Apr.pdf', size: '1.2 MB', date: '14/04/2026', status: 'READY' },
    { id: '2', name: 'Stationery_Invoice_07Apr.pdf', size: '850 KB', date: '07/04/2026', status: 'READY' },
  ]);

  // Click outside listener for view menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setIsViewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Forms
  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      categoryId: '',
      bankAccountId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      taxAmount: 0,
      paymentMethod: 'CASH',
      reference: '',
      billNumber: '',
      notes: '',
      description: '',
      vendorId: '',
      departmentId: '',
      taxApplicable: false,
      gstRate: 0,
      taxPreference: 'TAXABLE',
      taxMode: 'EXCLUDING_TAX',
      taxType: 'CGST_SGST',
      customerName: '',
      isBillable: false,
    },
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      accountId: '',
      defaultTaxApplicable: false,
      defaultGstRate: 0,
      defaultTaxPreference: 'TAXABLE',
      defaultTaxMode: 'EXCLUDING_TAX',
      defaultInputTaxAccountId: '',
    },
  });

  // Queries
  const { data: expensesData, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses');
      return ensureArray(res);
    },
  });
  const expenses = Array.isArray(expensesData) ? expensesData : [];

  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses/categories');
      return ensureArray(res);
    },
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await apiClient.get('/bank-accounts');
      return ensureArray(res);
    },
  });
  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : [];

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-purchases'],
    queryFn: async () => {
      const res = await apiClient.get('/parties', { params: { type: 'VENDOR' } });
      return res.data?.data || res.data || [];
    },
  });
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await apiClient.get('/accounts');
      return res.data?.data || res.data || [];
    },
  });
  const accounts = Array.isArray(accountsData) ? accountsData : [];

  // Tax computation hook inside form
  const watchedAmount = expenseForm.watch('amount');
  const watchedGstRate = expenseForm.watch('gstRate');
  const watchedTaxMode = expenseForm.watch('taxMode') as 'EXCLUDING_TAX' | 'INCLUDING_TAX';
  const watchedTaxApplicable = expenseForm.watch('taxApplicable');

  const taxEngineResult = useTaxEngine(
    watchedAmount || 0,
    watchedGstRate || 0,
    watchedTaxMode || 'EXCLUDING_TAX',
    undefined,
    undefined,
    0
  );

  useEffect(() => {
    if (watchedTaxApplicable) {
      expenseForm.setValue('taxAmount', taxEngineResult.taxAmount);
      expenseForm.setValue('taxableAmount', taxEngineResult.taxableAmount);
      expenseForm.setValue('cgstAmount', taxEngineResult.cgstAmount);
      expenseForm.setValue('sgstAmount', taxEngineResult.sgstAmount);
      expenseForm.setValue('igstAmount', taxEngineResult.igstAmount);
    } else {
      expenseForm.setValue('taxAmount', 0);
    }
  }, [taxEngineResult, watchedTaxApplicable, expenseForm]);

  // Mutations
  const saveExpense = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const payload: any = {
        ...values,
        amount: Number(values.amount),
        taxAmount: Number(values.taxAmount || 0),
        categoryId: values.categoryId || undefined,
        bankAccountId: values.bankAccountId || undefined,
        vendorId: values.vendorId || undefined,
        reference: values.reference || values.billNumber || undefined,
        billNumber: values.billNumber || values.reference || undefined,
        description: values.description || values.notes || undefined,
        notes: values.notes || undefined,
        paymentMethod: values.paymentMethod || 'CASH',
        taxApplicable: Boolean(values.taxApplicable),
        gstRate: Number(values.gstRate || 0),
      };
      if (editingExpenseId) {
        return apiClient.put(`/expenses/${editingExpenseId}`, payload);
      }
      return apiClient.post('/expenses', payload);
    },
    onSuccess: async () => {
      notification.success(editingExpenseId ? 'Expense updated successfully' : 'Expense created successfully');
      await erpInvalidate.expenseReceipt(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsExpenseModalOpen(false);
      setEditingExpenseId(null);
      expenseForm.reset();
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || err.message || 'Failed to save expense');
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/expenses/${id}`),
    onSuccess: async () => {
      notification.success('Expense deleted successfully');
      await erpInvalidate.expenseReceipt(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setSelectedExpense(null);
      setExpenseToDelete(null);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete expense');
    },
  });

  // Category Mutations
  const saveCategory = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        accountId: values.accountId || undefined,
        defaultTaxApplicable: values.defaultTaxApplicable,
        defaultGstRate: values.defaultGstRate !== undefined ? Number(values.defaultGstRate) : undefined,
      };
      if (editingCategoryId) {
        return apiClient.put(`/expenses/categories/${editingCategoryId}`, payload);
      }
      return apiClient.post('/expenses/categories', payload);
    },
    onSuccess: () => {
      notification.success(editingCategoryId ? 'Category updated' : 'Category created');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setIsCategoryModalOpen(false);
      setEditingCategoryId(null);
      categoryForm.reset();
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save category');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/expenses/categories/${id}`),
    onSuccess: () => {
      notification.success('Category removed successfully');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setCategoryToDelete(null);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete category');
    },
  });

  const handleOpenNewExpense = () => {
    navigate('/expenses/new');
  };

  const handleEditExpense = (exp: any) => {
    navigate(`/expenses/${exp.id}/edit`);
  };

  const formatCurrency = (val: number | string | null | undefined) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
    } catch {
      return dateStr;
    }
  };

  // Filter expenses based on search and current view
  const filteredExpenses = expenses.filter((e: any) => {
    const matchesSearch =
      (e.expenseNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.category?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.vendor?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.reference || e.billNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (currentView === 'non_billable') return !e.isBillable;
    if (currentView === 'billable') return Boolean(e.isBillable && !e.isInvoiced);
    if (currentView === 'invoiced') return Boolean(e.isInvoiced);
    return true;
  });

  const viewOptions: { id: ExpenseView; label: string }[] = [
    { id: 'all', label: 'All Expenses' },
    { id: 'non_billable', label: 'Non-Billable' },
    { id: 'billable', label: 'Billable' },
    { id: 'invoiced', label: 'Invoiced' },
    { id: 'categories', label: 'Expense Categories' },
  ];

  const currentViewLabel = viewOptions.find((v) => v.id === currentView)?.label || 'All Expenses';

  // Table Columns matching Screenshot 2
  const expenseColumns: ZohoColumn<any>[] = [
    {
      key: 'date',
      label: 'DATE',
      width: '110px',
      render: (exp) => (
        <span className="text-[13px] text-[#1E2540]">{formatDate(exp.date)}</span>
      ),
    },
    {
      key: 'category',
      label: 'EXPENSE ACCOUNT',
      render: (exp) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedExpense(exp);
          }}
          className="text-[13px] font-medium text-[#408DFB] hover:underline text-left cursor-pointer"
        >
          {exp.category?.name || 'General Expense'}
        </button>
      ),
    },
    {
      key: 'reference',
      label: 'REFERENCE#',
      render: (exp) => (
        <span className="text-[13px] text-[#6B7280]">
          {exp.reference || exp.billNumber || '—'}
        </span>
      ),
    },
    {
      key: 'vendor',
      label: 'VENDOR NAME',
      render: (exp) => (
        <span className="text-[13px] text-[#1E2540]">
          {exp.vendor?.name || '—'}
        </span>
      ),
    },
    {
      key: 'paidThrough',
      label: 'PAID THROUGH',
      render: (exp) => {
        const name =
          exp.bankAccount?.name ||
          (exp.paymentMethod === 'CASH' ? 'Petty Cash' : 'Bank Account');
        return <span className="text-[13px] text-[#1E2540]">{name}</span>;
      },
    },
    {
      key: 'customerName',
      label: 'CUSTOMER NAME',
      render: (exp) => (
        <span className="text-[13px] text-[#6B7280]">
          {exp.customerName || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (exp) => {
        const label = exp.isInvoiced
          ? 'INVOICED'
          : exp.isBillable
          ? 'BILLABLE'
          : 'NON-BILLABLE';
        return (
          <span className="text-[11px] font-semibold tracking-wider text-[#6B7280]">
            {label}
          </span>
        );
      },
    },
    {
      key: 'amount',
      label: 'AMOUNT',
      align: 'right',
      render: (exp) => (
        <span className="text-[13px] font-medium text-[#1E2540] tabular-nums">
          {formatCurrency(exp.totalAmount || exp.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden text-[13px] font-sans">
      {/* Top Tabs Band matching Screenshot 2 */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 pt-3 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveMainTab('inbox')}
            className={cn(
              'pb-3 text-[14px] transition-colors border-b-2 cursor-pointer flex items-center gap-1.5',
              activeMainTab === 'inbox'
                ? 'border-[#408DFB] text-[#1E2540] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#1E2540] font-medium'
            )}
          >
            Receipts Inbox
          </button>

          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={() => {
                setActiveMainTab('expenses');
                setIsViewMenuOpen((prev) => !prev);
              }}
              className={cn(
                'pb-3 text-[14px] transition-colors border-b-2 cursor-pointer flex items-center gap-1.5',
                activeMainTab === 'expenses'
                  ? 'border-[#408DFB] text-[#1E2540] font-semibold'
                  : 'border-transparent text-[#6B7280] hover:text-[#1E2540] font-medium'
              )}
            >
              <span>{currentViewLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>

            {isViewMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-md shadow-lg border border-[#E5E7EB] py-1 z-50 animate-in fade-in-50 zoom-in-95">
                {viewOptions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setCurrentView(v.id);
                      setIsViewMenuOpen(false);
                      setActiveMainTab('expenses');
                    }}
                    className={cn(
                      'w-full text-left px-3.5 py-2 text-[13px] flex items-center justify-between hover:bg-[#F3F4F6] transition-colors',
                      currentView === v.id
                        ? 'text-[#408DFB] font-semibold bg-[#F0F7FF]'
                        : 'text-[#1E2540]'
                    )}
                  >
                    {v.label}
                    {currentView === v.id && <Check className="w-3.5 h-3.5 text-[#408DFB]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2 pb-2">
          {currentView === 'categories' ? (
            <button
              onClick={() => {
                setEditingCategoryId(null);
                categoryForm.reset({ name: '', description: '', accountId: '' });
                setIsCategoryModalOpen(true);
              }}
              className="h-8 px-3.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded text-[13px] font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Category
            </button>
          ) : (
            <button
              onClick={handleOpenNewExpense}
              className="h-8 px-3.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded text-[13px] font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          )}

          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs text-[#1E2540] focus-within:border-[#408DFB]">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-transparent border-none outline-hidden w-28 text-[12px] placeholder:text-[#9CA3AF]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden bg-white">
        {/* RECEIPTS INBOX TAB */}
        {activeMainTab === 'inbox' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-8 bg-[#F9FAFB] text-center hover:border-[#408DFB] transition-colors cursor-pointer">
                <UploadCloud className="w-10 h-10 text-[#408DFB] mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-[#1E2540]">
                  Drag and Drop Receipts here
                </h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  Upload PDF, PNG, JPG receipts up to 10MB each. Automatic OCR extracts total & date.
                </p>
                <button
                  onClick={handleOpenNewExpense}
                  className="mt-4 px-4 py-1.5 bg-[#408DFB] text-white text-xs font-medium rounded hover:bg-[#2563EB] transition-colors cursor-pointer"
                >
                  Upload Files
                </button>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded">
                <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#1E2540] uppercase tracking-wider">
                    Receipts Ready for Processing ({receiptFiles.length})
                  </h4>
                </div>
                <div className="divide-y divide-[#E5E7EB]">
                  {receiptFiles.map((file) => (
                    <div
                      key={file.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[#408DFB]" />
                        <div>
                          <p className="text-xs font-medium text-[#1E2540]">{file.name}</p>
                          <p className="text-[11px] text-[#6B7280]">
                            {file.size} • Uploaded on {file.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            handleOpenNewExpense();
                            expenseForm.setValue('notes', `Auto-scanned from ${file.name}`);
                          }}
                          className="px-3 py-1 bg-white border border-[#408DFB] text-[#408DFB] hover:bg-[#F0F7FF] text-xs font-medium rounded transition-colors cursor-pointer"
                        >
                          Convert to Expense
                        </button>
                        <button
                          onClick={() =>
                            setReceiptFiles((prev) => prev.filter((f) => f.id !== file.id))
                          }
                          className="p-1 text-[#9CA3AF] hover:text-[#DC2626] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EXPENSE CATEGORIES VIEW */}
        {activeMainTab === 'expenses' && currentView === 'categories' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#1E2540]">
                    Expense Categories & General Ledger Mappings
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    Define accounts and default tax preferences for automated bookkeeping.
                  </p>
                </div>
              </div>

              <div className="border border-[#E5E7EB] rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#6B7280] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Category Name</th>
                      <th className="py-2.5 px-4">General Ledger Account</th>
                      <th className="py-2.5 px-4">Default Tax Rate</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#9CA3AF]">
                          No expense categories configured. Click &quot;New Category&quot; to add one.
                        </td>
                      </tr>
                    ) : (
                      categories.map((cat: any) => {
                        const glAccount = accounts.find((a: any) => a.id === cat.accountId);
                        return (
                          <tr key={cat.id} className="hover:bg-[#F9FAFB] transition-colors">
                            <td className="py-3 px-4 font-medium text-[#1E2540]">{cat.name}</td>
                            <td className="py-3 px-4 text-[#6B7280]">
                              {glAccount ? `${glAccount.name} (${glAccount.code || 'GL'})` : 'Default Expense GL'}
                            </td>
                            <td className="py-3 px-4 text-[#6B7280]">
                              {cat.defaultTaxApplicable ? `${cat.defaultGstRate || 0}% GST` : 'Non-taxable'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    categoryForm.reset({
                                      name: cat.name,
                                      description: cat.description || '',
                                      accountId: cat.accountId || '',
                                      defaultTaxApplicable: cat.defaultTaxApplicable || false,
                                      defaultGstRate: cat.defaultGstRate || 0,
                                    });
                                    setIsCategoryModalOpen(true);
                                  }}
                                  className="text-[#408DFB] hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setCategoryToDelete(cat)}
                                  className="text-[#DC2626] hover:underline cursor-pointer ml-2"
                                >
                                  Delete
                                </button>
                              </div>
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
        )}

        {/* ALL EXPENSES TABLE & SPLIT DETAIL */}
        {activeMainTab === 'expenses' && currentView !== 'categories' && (
          <>
            {selectedExpense ? (
              <ZohoSplitDetail
                moduleTitle="All Expenses"
                items={filteredExpenses.map((exp: any) => ({
                  id: exp.id,
                  name: exp.category?.name || 'General Expense',
                  amount: `₹${Number(exp.totalAmount || exp.amount || 0).toLocaleString('en-IN')}`,
                  number: exp.expenseNo || `EXP-${exp.id.slice(-5)}`,
                  date: formatDate(exp.date),
                  status: exp.isBillable ? 'BILLABLE' : 'NON-BILLABLE',
                }))}
                selectedId={selectedExpense.id}
                onSelect={(id) => {
                  const exp = expenses.find((e: any) => e.id === id);
                  if (exp) setSelectedExpense(exp);
                }}
                onNew={handleOpenNewExpense}
                onClose={() => setSelectedExpense(null)}
                detailTitle="Expense Details"
                detailActions={
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <input
                        type="checkbox"
                        id="show-pdf-toggle"
                        checked={showPdfView}
                        onChange={(e) => setShowPdfView(e.target.checked)}
                        className="rounded border-[#D1D5DB] text-[#408DFB] focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="show-pdf-toggle" className="cursor-pointer select-none">
                        Show PDF View
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEditExpense(selectedExpense)}
                      className="text-xs font-medium text-[#1E2540] hover:text-[#408DFB] cursor-pointer"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          notification.loading('Downloading receipt...', { id: 'exp-dl' });
                          const res = await apiClient.get(
                            `/documents/expenses/${selectedExpense.id}/export`,
                            { responseType: 'blob' }
                          );
                          const url = URL.createObjectURL(res.data);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `Expense_${selectedExpense.expenseNo}.pdf`;
                          link.click();
                          notification.success('Downloaded successfully', { id: 'exp-dl' });
                        } catch {
                          notification.error('Failed to export PDF receipt', { id: 'exp-dl' });
                        }
                      }}
                      className="text-xs font-medium text-[#1E2540] hover:text-[#408DFB] flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> PDF/Print
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpenseToDelete(selectedExpense)}
                      className="text-xs font-medium text-[#DC2626] hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                }
              >
                {showPdfView ? (
                  <ZohoPDFPreview
                    status={selectedExpense.isBillable ? 'BILLABLE' : 'NON-BILLABLE'}
                    title="EXPENSE RECEIPT"
                  >
                    <div className="p-6 space-y-4 max-w-xl mx-auto bg-white border border-[#CBD5E1] rounded-[4px] text-xs">
                      <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-3">
                        <div>
                          <h3 className="font-bold text-sm text-[#2B2F36]">EXPENSE RECEIPT</h3>
                          <p className="font-mono text-xs text-[#6B7280]">
                            {selectedExpense.expenseNo || 'EXP-0001'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[#6B7280] block text-[11px]">Date</span>
                          <span className="font-semibold">{formatDate(selectedExpense.date)}</span>
                        </div>
                      </div>
                      <div className="py-2 flex justify-between">
                        <div>
                          <span className="text-[#6B7280] block text-[11px]">Expense Account</span>
                          <span className="font-semibold text-[#2B2F36]">
                            {selectedExpense.category?.name || 'General Expense'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#6B7280] block text-[11px]">Total Amount</span>
                          <span className="text-base font-bold text-[#DC2626]">
                            {formatCurrency(selectedExpense.totalAmount || selectedExpense.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </ZohoPDFPreview>
                ) : (
                    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
                      {/* Top Highlight Box matching Prompt 05 specification */}
                      <div className="flex items-start justify-between border-b border-[#E5E7EB] pb-5">
                        <div>
                          <div className="text-2xl font-bold text-[#DC2626] tracking-tight">
                            {formatCurrency(selectedExpense.totalAmount || selectedExpense.amount)}{' '}
                            <span className="text-sm font-normal text-[#6B7280]">
                              on {formatDate(selectedExpense.date)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#F3F4F6] text-[#4B5563] rounded">
                              {selectedExpense.isBillable ? 'BILLABLE' : 'NON-BILLABLE'}
                            </span>
                            <span className="px-2.5 py-0.5 text-xs font-medium bg-[#EEF2F6] text-[#1E2540] rounded">
                              {selectedExpense.category?.name || 'General Expense'}
                            </span>
                          </div>
                        </div>

                        {/* Drop Zone Box */}
                        <div className="w-56 p-3 border border-dashed border-[#D1D5DB] rounded bg-[#F9FAFB] text-center">
                          <Paperclip className="w-4 h-4 text-[#408DFB] mx-auto mb-1" />
                          <p className="text-[11px] font-medium text-[#1E2540]">
                            Drag or Drop Receipts
                          </p>
                          <p className="text-[10px] text-[#6B7280]">max 10MB • Upload File</p>
                        </div>
                      </div>

                      {/* Detail Fields Grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[#6B7280] block mb-0.5">Paid Through</span>
                          <span className="font-medium text-[#1E2540]">
                            {selectedExpense.bankAccount?.name ||
                              (selectedExpense.paymentMethod === 'CASH'
                                ? 'Petty Cash'
                                : 'Bank Account')}
                          </span>
                        </div>

                        <div>
                          <span className="text-[#6B7280] block mb-0.5">GST Treatment</span>
                          <span className="font-medium text-[#1E2540]">
                            {selectedExpense.taxApplicable
                              ? `Taxable (${selectedExpense.gstRate || 0}%)`
                              : 'Out of Scope'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[#6B7280] block mb-0.5">Vendor</span>
                          <span className="font-medium text-[#1E2540]">
                            {selectedExpense.vendor?.name || '—'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[#6B7280] block mb-0.5">Reference# / Invoice#</span>
                          <span className="font-medium text-[#1E2540]">
                            {selectedExpense.reference || selectedExpense.billNumber || '—'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[#6B7280] block mb-0.5">Customer Name</span>
                          <span className="font-medium text-[#1E2540]">
                            {selectedExpense.customerName || '—'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[#6B7280] block mb-0.5">Notes</span>
                          <span className="text-[#1E2540]">
                            {selectedExpense.notes || selectedExpense.description || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Journal Table matching Prompt 05 specification */}
                      <div className="mt-8 pt-4 border-t border-[#E5E7EB]">
                        <h4 className="text-xs font-semibold text-[#1E2540] mb-2 uppercase tracking-wider">
                          Accounting Journal
                        </h4>
                        <div className="border border-[#E5E7EB] rounded overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#6B7280]">
                              <tr>
                                <th className="py-2 px-3 text-left font-medium">Account</th>
                                <th className="py-2 px-3 text-right font-medium">Debit</th>
                                <th className="py-2 px-3 text-right font-medium">Credit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                              <tr>
                                <td className="py-2 px-3 text-[#1E2540]">
                                  {selectedExpense.category?.name || 'Expense Account'}
                                </td>
                                <td className="py-2 px-3 text-right tabular-nums text-[#1E2540]">
                                  {formatCurrency(selectedExpense.amount)}
                                </td>
                                <td className="py-2 px-3 text-right text-[#9CA3AF]">—</td>
                              </tr>
                              {Boolean(selectedExpense.taxAmount && selectedExpense.taxAmount > 0) && (
                                <tr>
                                  <td className="py-2 px-3 text-[#1E2540]">Input GST Tax Ledger</td>
                                  <td className="py-2 px-3 text-right tabular-nums text-[#1E2540]">
                                    {formatCurrency(selectedExpense.taxAmount)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-[#9CA3AF]">—</td>
                                </tr>
                              )}
                              <tr>
                                <td className="py-2 px-3 text-[#1E2540]">
                                  {selectedExpense.bankAccount?.name || 'Petty Cash Ledger'}
                                </td>
                                <td className="py-2 px-3 text-right text-[#9CA3AF]">—</td>
                                <td className="py-2 px-3 text-right tabular-nums text-[#1E2540]">
                                  {formatCurrency(
                                    selectedExpense.totalAmount || selectedExpense.amount
                                  )}
                                </td>
                              </tr>
                            </tbody>
                            <tfoot className="bg-[#F9FAFB] font-semibold border-t border-[#E5E7EB]">
                              <tr>
                                <td className="py-2 px-3 text-[#1E2540]">Total</td>
                                <td className="py-2 px-3 text-right tabular-nums text-[#1E2540]">
                                  {formatCurrency(
                                    selectedExpense.totalAmount || selectedExpense.amount
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right tabular-nums text-[#1E2540]">
                                  {formatCurrency(
                                    selectedExpense.totalAmount || selectedExpense.amount
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </ZohoSplitDetail>
            ) : (
              <div className="w-full h-full flex flex-col">
                <ZohoListTable
                  data={filteredExpenses}
                  columns={expenseColumns}
                  keyField="id"
                  isLoading={loadingExpenses}
                  onRowClick={(exp) => setSelectedExpense(exp)}
                  emptyState={
                    <ZohoEmptyState
                      title="Record and manage your business expenses."
                      description="Keep track of money leaving your business by recording non-billable and billable expenses."
                      createLabel="Create Expense"
                      onCreate={handleOpenNewExpense}
                    />
                  }
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Legacy modal removed in favor of full-page ExpenseForm at /expenses/new */}

      {/* NEW / EDIT CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8F9FB]">
              <h3 className="text-sm font-semibold text-[#1E2540]">
                {editingCategoryId ? 'Edit Category' : 'New Expense Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-[#9CA3AF] hover:text-[#1E2540] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={categoryForm.handleSubmit((d) => saveCategory.mutate(d))}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-[#1E2540] mb-1">
                  Category Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  {...categoryForm.register('name')}
                  placeholder="e.g. Office Supplies, Travel"
                  className="w-full h-8 px-2.5 border border-[#D1D5DB] rounded text-xs text-[#1E2540] outline-hidden focus:border-[#408DFB]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1E2540] mb-1">
                  General Ledger Account <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  {...categoryForm.register('accountId')}
                  className="w-full h-8 px-2.5 border border-[#D1D5DB] rounded text-xs text-[#1E2540] outline-hidden bg-white"
                >
                  <option value="">Select expense GL account</option>
                  {accounts
                    .filter((a: any) => a.category === 'EXPENSE' || !a.category)
                    .map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.code || 'GL'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cat-tax"
                  {...categoryForm.register('defaultTaxApplicable')}
                  className="rounded border-[#D1D5DB] text-[#408DFB]"
                />
                <label htmlFor="cat-tax" className="text-xs text-[#1E2540]">
                  Applicable for GST
                </label>
              </div>

              {categoryForm.watch('defaultTaxApplicable') && (
                <div>
                  <label className="block text-xs font-medium text-[#1E2540] mb-1">
                    Default GST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    {...categoryForm.register('defaultGstRate', { valueAsNumber: true })}
                    placeholder="18"
                    className="w-full h-8 px-2.5 border border-[#D1D5DB] rounded text-xs text-[#1E2540] outline-hidden"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#1E2540] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveCategory.isPending}
                  className="h-8 px-4 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded text-xs font-medium transition-colors cursor-pointer"
                >
                  {saveCategory.isPending ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        isOpen={Boolean(expenseToDelete)}
        entityName={`Expense ${expenseToDelete?.expenseNo || ''}`}
        warningText={`Are you sure you want to delete this expense record (${expenseToDelete?.expenseNo || 'this item'})? This action cannot be undone.`}
        onConfirm={() => expenseToDelete && deleteExpense.mutate(expenseToDelete.id)}
        onClose={() => setExpenseToDelete(null)}
      />

      {/* Delete Category Dialog */}
      <DeleteDialog
        isOpen={Boolean(categoryToDelete)}
        entityName={`Category ${categoryToDelete?.name || ''}`}
        warningText={`Are you sure you want to remove the "${categoryToDelete?.name}" category?`}
        onConfirm={() => categoryToDelete && deleteCategory.mutate(categoryToDelete.id)}
        onClose={() => setCategoryToDelete(null)}
      />
    </div>
  );
};

export default ExpensesDashboard;
