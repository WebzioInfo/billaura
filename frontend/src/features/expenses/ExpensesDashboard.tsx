import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Search, Plus, Trash2, Edit2, Download, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { DeleteDialog, AsyncSelect } from '@/components/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ExpenseReceiptPdf } from './components/ExpenseReceiptPdf';

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
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  accountId: z.string().optional(),
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
    }
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      accountId: '',
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

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await apiClient.get('/accounts');
      return res.data?.data || res.data || [];
    }
  });
  const accounts = Array.isArray(accountsData) ? accountsData : [];
  const expenseAccounts = accounts.filter((a: any) => a.category === 'EXPENSE');

  // Claim Mutations
  const saveExpense = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      if (editingId) {
        return apiClient.put(`/expenses/${editingId}`, values);
      }
      return apiClient.post('/expenses', values);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Expense updated successfully' : 'Expense created successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsModalOpen(false);
      setEditingId(null);
      form.reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    }
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/expenses/${id}`),
    onSuccess: () => {
      toast.success('Expense claim cancelled & reversed successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel expense');
    }
  });

  const approveExpense = useMutation({
    mutationFn: async (id: string) => apiClient.put(`/expenses/${id}/approval`, { approvalStatus: 'APPROVED' }),
    onSuccess: () => {
      toast.success('Expense claim approved & posted successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to approve expense');
    }
  });

  // Category Mutations
  const saveCategory = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        accountId: values.accountId || undefined,
      };
      if (editingCategoryId) {
        return apiClient.put(`/expenses/categories/${editingCategoryId}`, payload);
      }
      return apiClient.post('/expenses/categories', payload);
    },
    onSuccess: () => {
      toast.success(editingCategoryId ? 'Category updated' : 'Category created');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setIsCategoryModalOpen(false);
      setEditingCategoryId(null);
      categoryForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save category');
    }
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/expenses/categories/${id}`),
    onSuccess: () => {
      toast.success('Category removed successfully');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  });

  const handleEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    categoryForm.reset({
      name: cat.name,
      description: cat.description || '',
      accountId: cat.accountId || '',
    });
    setIsCategoryModalOpen(true);
  };

  const handleEdit = (exp: any) => {
    if (exp.approvalStatus === 'APPROVED') {
      toast.error('Cannot edit an approved expense claim');
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

  return (
    <>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <PageHeader
          title={activeTab === 'claims' ? "Expense Claims" : "Expense Categories"}
          description={activeTab === 'claims' ? "Manage overhead disbursements, track employee reimbursements, and inspect GL postings" : "Define expense categories and map them directly to General Ledger accounts"}
          primaryAction={
            activeTab === 'claims' ? (
              <button
                onClick={() => {
                  setEditingId(null);
                  form.reset({
                    categoryId: '', bankAccountId: '', date: new Date().toISOString().split('T')[0],
                    amount: 0, taxAmount: 0, paymentMethod: 'BANK_TRANSFER', billNumber: '', description: '', notes: ''
                  });
                  prevPaymentMethodRef.current = 'BANK_TRANSFER';
                  setIsModalOpen(true);
                }}
                className="bg-accent text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold hover:bg-opacity-90 transition-all shadow-md shadow-accent/15 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> File Expense Claim
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingCategoryId(null);
                  categoryForm.reset({ name: '', description: '', accountId: '' });
                  setIsCategoryModalOpen(true);
                }}
                className="bg-accent text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold hover:bg-opacity-90 transition-all shadow-md shadow-accent/15 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Custom Category
              </button>
            )
          }
        />

        <div className="flex border-b border-border mb-4 select-none">
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'claims' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Claims Register
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'categories' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Category Ledger Mappings
          </button>
        </div>

        {activeTab === 'claims' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface/50 border border-border/80 w-full max-w-md focus-within:border-accent transition-colors shadow-xs">
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

        {activeTab === 'claims' ? (
          <div className="bg-surface border border-border/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment Source</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingExpenses ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">Loading expenses...</TableCell></TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">No expense claims found.</TableCell></TableRow>
                ) : (
                  filteredExpenses.map((exp: any) => (
                    <TableRow key={exp.id} className="h-10 hover:bg-muted/40">
                      <TableCell className="font-mono font-bold text-accent">{exp.expenseNo}</TableCell>
                      <TableCell className="text-xs">{new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                      <TableCell className="text-xs font-semibold">{exp.category?.name || 'Uncategorized'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{exp.description || 'N/A'}</TableCell>
                      <TableCell className="text-xs">{exp.bankAccount?.name || 'Cash'}</TableCell>
                      <TableCell className="text-right text-xs font-black">{formatCurrency(Number(exp.totalAmount))}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold uppercase border ${
                          exp.approvalStatus === 'APPROVED' 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : exp.approvalStatus === 'REJECTED'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {exp.approvalStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-1">
                        {exp.approvalStatus === 'PENDING' && (
                          <button 
                            onClick={() => approveExpense.mutate(exp.id)}
                            className="px-2 py-1 text-[10px] font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        <PDFDownloadLink
                          document={<ExpenseReceiptPdf expense={exp} company={{ name: 'Bill Aura', address: 'Corporate HQ' }} />}
                          fileName={`Receipt_${exp.expenseNo}.pdf`}
                          className="p-1 border border-border hover:bg-muted rounded-lg text-muted-foreground transition-all flex items-center justify-center"
                          title="Download PDF Receipt"
                        >
                          {({ loading }) => (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </PDFDownloadLink>
                        {exp.approvalStatus !== 'APPROVED' && (
                          <button onClick={() => handleEdit(exp)} className="p-1 border border-border hover:bg-muted rounded-lg text-muted-foreground hover:text-blue-500 transition-colors cursor-pointer">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => setExpenseToDelete(exp)} className="p-1 border border-border hover:bg-muted rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="bg-surface border border-border/80 rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>GL Account Ledger mapping</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCategories ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">Loading categories...</TableCell></TableRow>
                ) : categories.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">No categories configured.</TableCell></TableRow>
                ) : (
                  categories.map((cat: any) => (
                    <TableRow key={cat.id} className="h-10 hover:bg-muted/40">
                      <TableCell className="font-semibold text-xs">{cat.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{cat.description || 'N/A'}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {cat.account ? (
                          <span className="text-accent font-bold bg-accent/5 px-2 py-0.5 rounded border border-accent/15">{cat.account.name}</span>
                        ) : (
                          <span className="text-muted-foreground italic bg-muted/50 px-2 py-0.5 rounded border border-border">Name Matching ({cat.name})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-1.5">
                        <button onClick={() => handleEditCategory(cat)} className="p-1 border border-border hover:bg-muted rounded-lg text-muted-foreground hover:text-blue-500 transition-colors cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {cat.type !== 'SYSTEM' && (
                          <button onClick={() => setCategoryToDelete(cat)} className="p-1 border border-border hover:bg-muted rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Expense Category *</label>
                    <select {...form.register('categoryId')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent">
                      <option value="">Select Category</option>
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
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
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Tax Amount</label>
                    <input type="number" step="0.01" {...form.register('taxAmount', { valueAsNumber: true })} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent" />
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
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">General Ledger Mapping Account</label>
                    <select {...categoryForm.register('accountId')} className="w-full p-2 bg-background border border-border/80 rounded-lg text-xs outline-none focus:border-accent">
                      <option value="">Unmapped (Name Matching Fallback)</option>
                      {expenseAccounts.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <span className="text-[9px] text-muted-foreground/80 mt-1 block">Specify the general ledger target account to post approved expense debits to.</span>
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
      </div>

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
