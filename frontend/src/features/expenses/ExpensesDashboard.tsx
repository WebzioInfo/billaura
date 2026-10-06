import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/core/services/NotificationService';
import { Search, Plus, Trash2, Edit2, Download, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/core/api';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { DeleteDialog, AsyncSelect, StatusBadge, CurrencyCell, DateCell, TableLoader, Button, IconButton, SearchableSelect } from '@/shared/components/ui';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { Pagination } from '@/shared/components/ui/Pagination';
import { usePagination } from '@/shared/hooks/usePagination';
import { useTaxEngine } from '@/features/taxes/hooks/useTaxEngine';

const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Select a category'),
  bankAccountId: z.string().min(1, 'Select payment source'),
  date: z.string().min(1, 'Select date'),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  taxAmount: z.number().min(0),
  paymentMethod: z.string().optional(),
  billNumber: z.string().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
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
  departmentId: z.string().min(1, 'Select a department'),
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

export const ExpensesDashboard = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'categories' ? 'categories' : 'claims';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);

  // Category Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);

  // Forms
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      categoryId: '',
      bankAccountId: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      taxAmount: 0,
      paymentMethod: 'BANK_TRANSFER',
      billNumber: '',
      description: '',
      notes: '',
      taxApplicable: false,
      gstRate: 0,
      taxPreference: 'TAXABLE',
      taxMode: 'EXCLUDING_TAX',
      taxType: 'CGST_SGST',
      taxableAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      cessAmount: 0,
      departmentId: '',
    }
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
    }
  });

  const watchedPaymentMethod = form.watch('paymentMethod');
  const prevPaymentMethodRef = React.useRef(watchedPaymentMethod);

  useEffect(() => {
    if (prevPaymentMethodRef.current !== watchedPaymentMethod) {
      form.setValue('bankAccountId', '', { shouldValidate: true });
      prevPaymentMethodRef.current = watchedPaymentMethod;
    }
  }, [watchedPaymentMethod]);

  // Queries
  const { data: expensesData, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses');
      return res.data || [];
    },
    enabled: activeTab === 'claims'
  });
  const expenses = Array.isArray(expensesData) ? expensesData : [];

  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses/categories');
      return res.data || [];
    }
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await apiClient.get('/bank-accounts');
      return res.data?.items || res.data || [];
    }
  });
  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : [];

  const { data: departmentsData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await apiClient.get('/hr-masters/departments');
      const list = res.data || res;
      return Array.isArray(list) ? list : (list?.data || []);
    }
  });
  const departments = Array.isArray(departmentsData) ? departmentsData : [];

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await apiClient.get('/accounts');
      return res.data?.data || res.data || [];
    }
  });
  const accounts = Array.isArray(accountsData) ? accountsData : [];
  const expenseAccounts = accounts.filter((a: any) => a.category === 'EXPENSE');

  const taxApplicable = form.watch('taxApplicable');
  const amount = form.watch('amount');
  const gstRate = form.watch('gstRate');
  const taxPreference = form.watch('taxPreference');
  const taxMode = form.watch('taxMode') as 'EXCLUDING_TAX' | 'INCLUDING_TAX';
  const categoryId = form.watch('categoryId');

  const taxRate = gstRate || 0;

  const taxEngineResult = useTaxEngine(
    amount,
    taxRate,
    taxMode || 'EXCLUDING_TAX',
    undefined,
    undefined,
    0
  );

  useEffect(() => {
    if (taxApplicable) {
      form.setValue('taxableAmount', taxEngineResult.taxableAmount);
      form.setValue('cgstAmount', taxEngineResult.cgstAmount);
      form.setValue('sgstAmount', taxEngineResult.sgstAmount);
      form.setValue('igstAmount', taxEngineResult.igstAmount);
      form.setValue('cessAmount', taxEngineResult.cessAmount);
      form.setValue('taxAmount', taxEngineResult.taxAmount);
      form.setValue('taxType', taxEngineResult.taxType);
    }
  }, [taxEngineResult, taxApplicable, form]);

  useEffect(() => {
    if (categoryId) {
      const cat = categories.find(c => c.id === categoryId);
      if (cat && cat.defaultTaxApplicable !== undefined) {
        form.setValue('taxApplicable', cat.defaultTaxApplicable);
        if (cat.defaultGstRate !== undefined) form.setValue('gstRate', cat.defaultGstRate);
        if (cat.defaultTaxPreference) form.setValue('taxPreference', cat.defaultTaxPreference);
        if (cat.defaultTaxMode) form.setValue('taxMode', cat.defaultTaxMode);
      }
    }
  }, [categoryId, categories, form]);

  // Claim Mutations
  const saveExpense = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      if (editingId) {
        return apiClient.put(`/expenses/${editingId}`, values);
      }
      return apiClient.post('/expenses', values);
    },
    onSuccess: async () => {
      notification.success(editingId ? 'Expense updated successfully' : 'Expense created successfully');
      await erpInvalidate.expenseReceipt(queryClient);
      setIsModalOpen(false);
      setEditingId(null);
      form.reset();
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save expense');
    }
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/expenses/${id}`),
    onSuccess: async () => {
      notification.success('Expense claim cancelled & reversed successfully');
      await erpInvalidate.expenseReceipt(queryClient);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to cancel expense');
    }
  });

  const approveExpense = useMutation({
    mutationFn: async (id: string) => apiClient.put(`/expenses/${id}/approval`, { approvalStatus: 'APPROVED' }),
    onSuccess: async () => {
      notification.success('Expense claim approved & posted successfully');
      await erpInvalidate.expenseReceipt(queryClient);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to approve expense');
    }
  });

  // Category Mutations
  const saveCategory = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        accountId: values.accountId || undefined,
        defaultTaxApplicable: values.defaultTaxApplicable,
        defaultGstRate: values.defaultGstRate !== undefined ? values.defaultGstRate : undefined,
        defaultTaxPreference: values.defaultTaxPreference || undefined,
        defaultTaxMode: values.defaultTaxMode || undefined,
        defaultInputTaxAccountId: values.defaultInputTaxAccountId || undefined,
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
    }
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/expenses/categories/${id}`),
    onSuccess: () => {
      notification.success('Category removed successfully');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete category');
    }
  });

  const handleEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    categoryForm.reset({
      name: cat.name,
      description: cat.description || '',
      accountId: cat.accountId || '',
      defaultTaxApplicable: cat.defaultTaxApplicable || false,
      defaultGstRate: cat.defaultGstRate != null ? Number(cat.defaultGstRate) : 0,
      defaultTaxPreference: cat.defaultTaxPreference || 'TAXABLE',
      defaultTaxMode: cat.defaultTaxMode || 'EXCLUDING_TAX',
      defaultInputTaxAccountId: cat.defaultInputTaxAccountId || '',
    });
    setIsCategoryModalOpen(true);
  };

  const handleEdit = (exp: any) => {
    if (exp.approvalStatus === 'APPROVED') {
      notification.error('Cannot edit an approved expense claim');
      return;
    }
    setEditingId(exp.id);
    form.reset({
      categoryId: exp.categoryId || '',
      bankAccountId: exp.bankAccountId || '',
      date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : '',
      amount: Number(exp.amount),
      taxAmount: Number(exp.taxAmount),
      paymentMethod: exp.paymentMethod || 'BANK_TRANSFER',
      billNumber: exp.billNumber || '',
      description: exp.description || '',
      notes: exp.notes || '',
      taxApplicable: exp.taxApplicable || false,
      gstRate: exp.gstRate != null ? Number(exp.gstRate) : 0,
      taxPreference: exp.taxPreference || 'TAXABLE',
      taxMode: exp.taxMode || 'EXCLUDING_TAX',
      taxType: exp.taxType || 'CGST_SGST',
      taxableAmount: Number(exp.taxableAmount || 0),
      cgstAmount: Number(exp.cgstAmount || 0),
      sgstAmount: Number(exp.sgstAmount || 0),
      igstAmount: Number(exp.igstAmount || 0),
      cessAmount: Number(exp.cessAmount || 0),
      departmentId: exp.departmentId || '',
    });
    prevPaymentMethodRef.current = exp.paymentMethod || 'BANK_TRANSFER';
    setIsModalOpen(true);
  };

  const filteredExpenses = expenses.filter((e: any) => 
    e.expenseNo?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  // TODO: Endpoint /expenses should support server-side pagination (?page=&limit=)
  const {
    page: claimsPage,
    limit: claimsLimit,
    paginatedData: paginatedExpenses,
    totalPages: claimsTotalPages,
    totalItems: claimsTotalItems,
    setPage: setClaimsPage,
    setLimit: setClaimsLimit,
  } = usePagination({
    data: filteredExpenses,
    tableKey: 'expenses_claims',
    defaultLimit: 25,
  });

  // TODO: Endpoint /expenses/categories should support server-side pagination (?page=&limit=)
  const {
    page: catPage,
    limit: catLimit,
    paginatedData: paginatedCategories,
    totalPages: catTotalPages,
    totalItems: catTotalItems,
    setPage: setCatPage,
    setLimit: setCatLimit,
  } = usePagination({
    data: categories,
    tableKey: 'expenses_categories',
    defaultLimit: 25,
  });

  return (
    <>
      <PageLayout>
        <PageHeader
          title={activeTab === 'claims' ? "Expense Claims" : "Expense Categories"}
          count={activeTab === 'claims' ? filteredExpenses.length : categories.length}
          primaryAction={
            activeTab === 'claims' ? (
              <Button
                variant="primary"
                onClick={() => {
                  setEditingId(null);
                  form.reset({
                    categoryId: '', bankAccountId: '', date: new Date().toISOString().split('T')[0],
                    amount: 0, taxAmount: 0, paymentMethod: 'BANK_TRANSFER', billNumber: '', description: '', notes: ''
                  });
                  prevPaymentMethodRef.current = 'BANK_TRANSFER';
                  setIsModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" /> File Expense Claim
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  setEditingCategoryId(null);
                  categoryForm.reset({ name: '', description: '', accountId: '' });
                  setIsCategoryModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Custom Category
              </Button>
            )
          }
        />

        <div className="flex items-center justify-between gap-4 border-b border-border pb-2 shrink-0">
          <div className="flex border-b border-transparent gap-2 select-none">
            <button
              onClick={() => setActiveTab('claims')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'claims' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Claims Register
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'categories' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Category Ledger Mappings
            </button>
          </div>

          {activeTab === 'claims' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border/80 w-full max-w-sm focus-within:border-accent transition-colors">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search claims..." 
                className="bg-transparent border-none outline-none w-full text-xs text-foreground placeholder:text-muted-foreground/60"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        {activeTab === 'claims' ? (
          <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#34303F] hover:bg-[#34303F] text-white border-none">
                    <TableHead className="pl-6 pr-4 text-white font-medium">Claim No</TableHead>
                    <TableHead className="text-white font-medium">Date</TableHead>
                    <TableHead className="text-white font-medium">Category</TableHead>
                    <TableHead className="text-white font-medium">Description</TableHead>
                    <TableHead className="text-white font-medium">Payment Source</TableHead>
                    <TableHead align="right" className="text-white font-medium">Total Amount</TableHead>
                    <TableHead align="center" className="text-white font-medium">Approval</TableHead>
                    <TableHead align="right" className="pr-6 pl-4 text-white font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingExpenses ? (
                    <TableRow><TableCell colSpan={8} className="p-0"><TableLoader rows={claimsLimit} /></TableCell></TableRow>
                  ) : filteredExpenses.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">No expense claims found.</TableCell></TableRow>
                  ) : (
                    paginatedExpenses.map((exp: any) => (
                      <TableRow key={exp.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-6 pr-4 tabular-nums font-medium text-foreground">{exp.expenseNo}</TableCell>
                        <DateCell date={exp.date} />
                        <TableCell className="font-medium text-foreground">{exp.category?.name || 'Uncategorized'}</TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-[200px]">{exp.description || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{exp.bankAccount?.name || 'Cash'}</TableCell>
                        <CurrencyCell amount={Number(exp.totalAmount)} className="tabular-nums font-semibold text-foreground" />
                        <TableCell align="center">
                          <StatusBadge status={exp.approvalStatus} />
                        </TableCell>
                        <TableCell align="right" className="pr-6 pl-4">
                          <div className="flex items-center justify-end gap-1">
                            {exp.approvalStatus === 'PENDING' && (
                              <Button 
                                variant="secondary"
                                size="sm"
                                onClick={() => approveExpense.mutate(exp.id)}
                                className="h-7 text-xs font-medium text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                              >
                                Approve
                              </Button>
                            )}
                            <IconButton
                              icon={Download}
                              aria-label="Download PDF Receipt"
                              tooltip="Download PDF Receipt"
                              size="dense"
                              onClick={async () => {
                                try {
                                  notification.loading('Generating receipt...', { id: 'pdf-gen' });
                                  const res = await apiClient.get(`/documents/expenses/${exp.id}/export`, { responseType: 'blob' });
                                  const url = URL.createObjectURL(res.data);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `Receipt_${exp.expenseNo}.pdf`;
                                  link.click();
                                  notification.success('Receipt downloaded', { id: 'pdf-gen' });
                                } catch (e) {
                                  notification.error('Failed to download receipt', { id: 'pdf-gen' });
                                }
                              }}
                            />
                            {exp.approvalStatus !== 'APPROVED' && (
                              <IconButton 
                                icon={Edit2}
                                aria-label="Edit Claim"
                                tooltip="Edit Claim"
                                size="dense"
                                onClick={() => handleEdit(exp)} 
                              />
                            )}
                            <IconButton 
                              icon={Trash2}
                              aria-label="Delete Claim"
                              tooltip="Delete Claim"
                              size="dense"
                              variant="danger-ghost"
                              onClick={() => setExpenseToDelete(exp)} 
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={claimsPage}
              totalPages={claimsTotalPages}
              totalItems={claimsTotalItems}
              pageSize={claimsLimit}
              onPageChange={setClaimsPage}
              onPageSizeChange={setClaimsLimit}
              itemLabel="expense claims"
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#34303F] hover:bg-[#34303F] text-white border-none">
                    <TableHead className="pl-6 pr-4 text-white font-medium">Category Name</TableHead>
                    <TableHead className="text-white font-medium">Description</TableHead>
                    <TableHead className="text-white font-medium">GL Account Ledger mapping</TableHead>
                    <TableHead align="right" className="pr-6 pl-4 text-white font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCategories ? (
                    <TableRow><TableCell colSpan={4} className="p-0"><TableLoader rows={catLimit} /></TableCell></TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-sm text-muted-foreground">No categories configured.</TableCell></TableRow>
                  ) : (
                    paginatedCategories.map((cat: any) => (
                      <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-6 pr-4 font-medium text-foreground">{cat.name}</TableCell>
                        <TableCell className="text-muted-foreground">{cat.description || '—'}</TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {cat.account ? (
                            <span className="text-foreground font-medium bg-muted/60 px-2 py-0.5 rounded border border-border">{cat.account.name}</span>
                          ) : (
                            <span className="text-muted-foreground italic bg-muted/30 px-2 py-0.5 rounded border border-border/50">Name Matching ({cat.name})</span>
                          )}
                        </TableCell>
                        <TableCell align="right" className="pr-6 pl-4">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton 
                              icon={Edit2}
                              aria-label="Edit Category"
                              tooltip="Edit Category"
                              size="dense"
                              onClick={() => handleEditCategory(cat)} 
                            />
                            {cat.type !== 'SYSTEM' && (
                              <IconButton 
                                icon={Trash2}
                                aria-label="Delete Category"
                                tooltip="Delete Category"
                                size="dense"
                                variant="danger-ghost"
                                onClick={() => setCategoryToDelete(cat)} 
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={catPage}
              totalPages={catTotalPages}
              totalItems={catTotalItems}
              pageSize={catLimit}
              onPageChange={setCatPage}
              onPageSizeChange={setCatLimit}
              itemLabel="categories"
            />
          </div>
        )}

        {/* Claim Form Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="bg-surface rounded-2xl border border-border/80 shadow-premium w-full max-w-lg z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-border bg-muted/10 flex justify-between items-center">
                <h2 className="font-bold text-sm text-foreground">{editingId ? 'Edit Expense Claim' : 'File Expense Claim'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
              </div>
              <form onSubmit={form.handleSubmit((d) => saveExpense.mutate(d))} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <SearchableSelect
                      label="Expense Category"
                      required
                      value={form.watch('categoryId') || ''}
                      onChange={(val) => form.setValue('categoryId', val, { shouldValidate: true })}
                      options={categories}
                      mapOption={(c: any) => ({
                        value: c.id,
                        label: c.name,
                        subLabel: c.description || undefined,
                      })}
                      placeholder="Select Category"
                      searchPlaceholder="Search categories..."
                      clearable
                      quickCreateEntity="expenseCategory"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Department *</label>
                    <SearchableSelect
                      value={form.watch('departmentId') || ''}
                      onChange={(val) => form.setValue('departmentId', val, { shouldValidate: true })}
                      options={departments}
                      mapOption={(d: any) => ({
                        value: d.id,
                        label: d.name,
                        subLabel: d.code || undefined,
                      })}
                      placeholder="Select Department"
                      searchPlaceholder="Search departments..."
                      clearable
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Posting Date *</label>
                    <input type="date" {...form.register('date')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Payment Method</label>
                    <select {...form.register('paymentMethod')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent">
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CASH">Cash</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Base Amount *</label>
                    <input type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent" />
                  </div>
                  <div className="col-span-2 mt-4 pt-4 border-t border-border/40">
                    <h3 className="text-xs font-bold mb-3 flex items-center justify-between">
                      Tax Information
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] text-muted-foreground uppercase">Tax Applicable</span>
                        <input type="checkbox" {...form.register('taxApplicable')} className="rounded border-border text-accent focus:ring-accent" />
                      </label>
                    </h3>
                    
                    {taxApplicable && (
                      <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">GST Rate *</label>
                          <select {...form.register('gstRate', { valueAsNumber: true })} disabled={form.watch('taxPreference') === 'EXEMPT' || form.watch('taxPreference') === 'NIL_RATED' || form.watch('taxPreference') === 'NON_GST'} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent">
                            <option value="0">0%</option>
                            <option value="3">3%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Tax Preference *</label>
                          <select {...form.register('taxPreference')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent">
                            <option value="TAXABLE">Taxable</option>
                            <option value="EXEMPT">Exempt</option>
                            <option value="NIL_RATED">Nil Rated</option>
                            <option value="NON_GST">Non GST</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Tax Mode *</label>
                          <select {...form.register('taxMode')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent">
                            <option value="EXCLUDING_TAX">Amount Excluding Tax (Base + Tax = Total)</option>
                            <option value="INCLUDING_TAX">Amount Including Tax (Reverse Calculated)</option>
                          </select>
                        </div>

                        <div className="col-span-2 grid grid-cols-4 gap-3 pt-3 border-t border-border/40">
                          <div>
                            <label className="block text-[10px] text-muted-foreground uppercase mb-1">Taxable</label>
                            <div className="text-sm font-bold font-mono text-foreground">₹{form.watch('taxableAmount')?.toFixed(2)}</div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-muted-foreground uppercase mb-1">{form.watch('taxType') === 'IGST' ? 'IGST' : 'CGST'}</label>
                            <div className="text-sm font-bold font-mono text-muted-foreground">₹{form.watch('taxType') === 'IGST' ? form.watch('igstAmount')?.toFixed(2) : form.watch('cgstAmount')?.toFixed(2)}</div>
                          </div>
                          <div>
                            <label className="block text-[10px] text-muted-foreground uppercase mb-1">{form.watch('taxType') === 'IGST' ? '-' : 'SGST'}</label>
                            <div className="text-sm font-bold font-mono text-muted-foreground">₹{form.watch('taxType') === 'IGST' ? '0.00' : form.watch('sgstAmount')?.toFixed(2)}</div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-accent uppercase mb-1">Total Paid</label>
                            <div className="text-sm font-black font-mono text-accent">₹{form.watch('taxMode') === 'INCLUDING_TAX' ? Number(form.watch('amount') || 0).toFixed(2) : (Number(form.watch('taxableAmount') || 0) + Number(form.watch('taxAmount') || 0)).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <AsyncSelect
                      label="Source Account Ledger *"
                      apiPath="/bank-accounts"
                      queryKeyPrefix="bank_accounts_lookup"
                      placeholder="Select Ledger"
                      value={form.watch('bankAccountId') || ''}
                      onChange={(val) => {
                        form.setValue('bankAccountId', val, { shouldValidate: true });
                      }}
                      additionalParams={{ type: form.watch('paymentMethod') === 'CASH' ? 'CASH' : 'BANK' }}
                      error={form.formState.errors.bankAccountId?.message}
                      quickCreateEntity="bankAccount"
                      mapOption={(b: any) => {
                        const balance = Number(b.currentBalance || b.balance || 0);
                        const balanceStr = balance > 0
                          ? `₹${Math.abs(balance).toLocaleString('en-IN')} Dr`
                          : balance < 0
                            ? `₹${Math.abs(balance).toLocaleString('en-IN')} Cr`
                            : '₹0';
                        const mask = b.accountNumber ? ` | ****${b.accountNumber.slice(-4)}` : '';
                        return {
                          label: b.name || b.bankName,
                          value: b.id,
                          description: `${balanceStr}${mask}`,
                        };
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Description / Narration</label>
                    <input type="text" {...form.register('description')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border/40">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-border hover:bg-muted/50 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                  <button type="submit" disabled={saveExpense.isPending} className="px-4 py-2 bg-accent text-white hover:bg-opacity-90 rounded-xl text-xs font-bold shadow-md shadow-accent/15 cursor-pointer">
                    {saveExpense.isPending ? 'Filing Claim...' : 'File Claim'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Category Form Modal */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)} />
            <div className="bg-surface rounded-2xl border border-border/80 shadow-premium w-full max-w-lg z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-border bg-muted/10 flex justify-between items-center">
                <h2 className="font-bold text-sm text-foreground">{editingCategoryId ? 'Edit Category mapping' : 'Add Custom Category'}</h2>
                <button onClick={() => setIsCategoryModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
              </div>
              <form onSubmit={categoryForm.handleSubmit((d) => saveCategory.mutate(d))} className="p-6 space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Category Name *</label>
                    <input type="text" {...categoryForm.register('name')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Description</label>
                    <input type="text" {...categoryForm.register('description')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">General Ledger Mapping Account *</label>
                    <SearchableSelect
                      value={categoryForm.watch('accountId') || ''}
                      onChange={(val) => categoryForm.setValue('accountId', val, { shouldValidate: true })}
                      options={expenseAccounts}
                      mapOption={(a: any) => ({
                        value: a.id,
                        label: a.name,
                        subLabel: a.accountCode || a.type || undefined,
                        searchKeywords: [a.accountCode].filter(Boolean),
                      })}
                      placeholder="Select Target Account"
                      searchPlaceholder="Search accounts by name, code..."
                      clearable
                    />
                    {categoryForm.formState.errors.accountId && <span className="text-red-500 text-[10px] mt-1">{categoryForm.formState.errors.accountId.message}</span>}
                    <span className="text-[9px] text-muted-foreground/80 mt-1 block">Specify the general ledger target account to post approved expense debits to.</span>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border/40 space-y-4">
                    <h3 className="text-xs font-bold flex items-center gap-2">
                      <input type="checkbox" {...categoryForm.register('defaultTaxApplicable')} id="cat-tax-app" className="rounded border-border text-accent focus:ring-accent" />
                      <label htmlFor="cat-tax-app" className="cursor-pointer">Default Tax Applicable</label>
                    </h3>

                    {categoryForm.watch('defaultTaxApplicable') && (
                      <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Default GST Rate</label>
                          <select {...categoryForm.register('defaultGstRate', { valueAsNumber: true })} disabled={categoryForm.watch('defaultTaxPreference') === 'EXEMPT' || categoryForm.watch('defaultTaxPreference') === 'NIL_RATED' || categoryForm.watch('defaultTaxPreference') === 'NON_GST'} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent">
                            <option value="0">0%</option>
                            <option value="3">3%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Default Tax Preference</label>
                          <select {...categoryForm.register('defaultTaxPreference')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent">
                            <option value="TAXABLE">Taxable</option>
                            <option value="EXEMPT">Exempt</option>
                            <option value="NIL_RATED">Nil Rated</option>
                            <option value="NON_GST">Non GST</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Default Tax Mode</label>
                          <select {...categoryForm.register('defaultTaxMode')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent">
                            <option value="EXCLUDING_TAX">Amount Excluding Tax</option>
                            <option value="INCLUDING_TAX">Amount Including Tax</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border/40">
                  <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 border border-border hover:bg-muted/50 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                  <button type="submit" disabled={saveCategory.isPending} className="px-4 py-2 bg-accent text-white hover:bg-opacity-90 rounded-xl text-xs font-bold shadow-md shadow-accent/15 cursor-pointer">
                    {saveCategory.isPending ? 'Saving Category...' : 'Save Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageLayout>

      <DeleteDialog 
        isOpen={!!expenseToDelete} 
        onClose={() => setExpenseToDelete(null)} 
        onConfirm={async () => { deleteExpense.mutate(expenseToDelete.id); setExpenseToDelete(null); }} 
        entityName="Expense Claim" 
        entityId={expenseToDelete?.expenseNo} 
        warningText="Cancelling this approved expense claim will trigger reversal journal entry lines and restore cash/bank balances in accounting." 
      />

      <DeleteDialog 
        isOpen={!!categoryToDelete} 
        onClose={() => setCategoryToDelete(null)} 
        onConfirm={async () => { deleteCategory.mutate(categoryToDelete.id); setCategoryToDelete(null); }} 
        entityName="Expense Category" 
        entityId={categoryToDelete?.name} 
        warningText="Deleting this category removes it from selectors in future expense claims." 
      />
    </>
  );
};
