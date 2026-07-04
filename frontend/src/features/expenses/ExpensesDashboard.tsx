import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Receipt, Search, Plus, Trash2, Printer, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { PageHeader } from '@/components/ui/PageHeader';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ExpenseReceiptPdf } from './components/ExpenseReceiptPdf';

const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Select a category'),
  bankAccountId: z.string().optional(),
  date: z.string().min(1, 'Select date'),
  amount: z.number().min(0),
  taxAmount: z.number().min(0),
  paymentMethod: z.string().optional(),
  billNumber: z.string().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const ExpensesDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') === 'categories' ? 'categories' : 'claims';
  const setActiveTab = (tab: string) => navigate(`/expenses?tab=${tab}`);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      return res.data || [];
    }
  });
  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : [];

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
      toast.success('Expense deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    }
  });

  const handleEdit = (exp: any) => {
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
    setIsModalOpen(true);
  };

  const filteredExpenses = expenses.filter((e: any) => 
    e.expenseNo?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Expense Claims"
        description="Log overhead costs, reimburse employees, and generate PDF receipts"
        primaryAction={
          activeTab === 'claims' && (
            <button
              onClick={() => {
                setEditingId(null);
                form.reset({
                  categoryId: '', bankAccountId: '', date: new Date().toISOString().split('T')[0],
                  amount: 0, taxAmount: 0, paymentMethod: 'BANK_TRANSFER', billNumber: '', description: '', notes: ''
                });
                setIsModalOpen(true);
              }}
              className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> File Expense Claim
            </button>
          )
        }
      />

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'claims' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Expense Claims
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'categories' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Categories
        </button>
      </div>

      {activeTab === 'claims' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 w-full max-w-md focus-within:border-accent transition-colors mb-4 shadow-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search claims..." 
            className="bg-transparent border-none outline-none w-full text-sm text-gray-900 placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {activeTab === 'claims' ? (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingExpenses ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Loading expenses...</TableCell></TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No expenses found.</TableCell></TableRow>
              ) : (
                filteredExpenses.map((exp: any) => (
                  <TableRow key={exp.id}>
                    <TableCell className="font-medium text-accent">{exp.expenseNo}</TableCell>
                    <TableCell>{new Date(exp.date).toLocaleDateString()}</TableCell>
                    <TableCell>{exp.category?.name || 'N/A'}</TableCell>
                    <TableCell>{exp.description || 'N/A'}</TableCell>
                    <TableCell className="font-semibold">${Number(exp.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${exp.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {exp.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <PDFDownloadLink
                        document={<ExpenseReceiptPdf expense={exp} company={{ name: 'Bill Aura', address: 'HQ' }} />}
                        fileName={`Receipt_${exp.expenseNo}.pdf`}
                        className="text-gray-500 hover:text-accent p-2"
                      >
                        {({ loading }) => (
                          loading ? 'Loading...' : 'PDF'
                        )}
                      </PDFDownloadLink>
                      <button onClick={() => handleEdit(exp)} className="p-2 text-gray-500 hover:text-blue-500 rounded-md hover:bg-gray-100 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if(window.confirm('Delete this expense?')) deleteExpense.mutate(exp.id); }} className="p-2 text-gray-500 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCategories ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-gray-500">Loading categories...</TableCell></TableRow>
              ) : categories.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-gray-500">No categories found.</TableCell></TableRow>
              ) : (
                categories.map((cat: any) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-gray-500">{cat.description || 'N/A'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-lg z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Expense' : 'File Expense Claim'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>
            <form onSubmit={form.handleSubmit((d) => saveExpense.mutate(d))} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Category *</label>
                  <select {...form.register('categoryId')} className="w-full p-2 border rounded-md">
                    <option value="">Select Category</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Date *</label>
                  <input type="date" {...form.register('date')} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Amount *</label>
                  <input type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tax Amount</label>
                  <input type="number" step="0.01" {...form.register('taxAmount', { valueAsNumber: true })} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Payment Method</label>
                  <select {...form.register('paymentMethod')} className="w-full p-2 border rounded-md">
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Source Bank Account</label>
                  <select {...form.register('bankAccountId')} className="w-full p-2 border rounded-md">
                    <option value="">(None)</option>
                    {bankAccounts.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name} (${b.currentBalance})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Description</label>
                  <input type="text" {...form.register('description')} className="w-full p-2 border rounded-md" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saveExpense.isPending} className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 flex items-center gap-2">
                  {saveExpense.isPending ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
