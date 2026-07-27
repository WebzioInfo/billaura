import React, { useState, useEffect } from 'react';
import notification from '@/core/services/NotificationService';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { apiClient as api } from '../../../core/api/apiClient';
import { useQuery } from '@tanstack/react-query';

const Label = (props: any) => <label className="block text-sm font-medium mb-1" {...props} />;

interface OtherIncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingId?: string | null;
  defaultCategoryType?: string;
}

export function OtherIncomeFormModal({ isOpen, onClose, onSuccess, editingId, defaultCategoryType }: OtherIncomeFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSetDefaultCategory, setHasSetDefaultCategory] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().substring(0, 10),
    incomeNo: '', // Will generate on backend or submit
    categoryId: '',
    walkInCustomer: '',
    description: '',
    subTotal: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    bankAccountId: '',
    departmentId: '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['income-categories'],
    queryFn: async () => {
      const { data } = await api.get('/income-categories');
      return data || [];
    },
    enabled: isOpen
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data } = await api.get('/bank-accounts');
      return data || [];
    },
    enabled: isOpen
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data } = await api.get('/hr-masters/departments');
      return data || [];
    },
    enabled: isOpen
  });

  const { data: incomeData } = useQuery({
    queryKey: ['other-income', editingId],
    queryFn: async () => {
      if (!editingId) return null;
      const { data } = await api.get(`/other-incomes/${editingId}`);
      return data;
    },
    enabled: isOpen && !!editingId
  });

  // Reset flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasSetDefaultCategory(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (editingId && incomeData) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData({
          ...incomeData,
          date: new Date(incomeData.date).toISOString().substring(0, 10),
          departmentId: incomeData.departmentId || '',
        });
      } else if (!editingId) {
        let initialCategoryId = '';
        if (defaultCategoryType && categories.length > 0) {
          const match = categories.find(
            (c: any) => c.name.toLowerCase() === defaultCategoryType.toLowerCase()
          );
          if (match) {
            initialCategoryId = match.id;
          }
        }

        setFormData({
          date: new Date().toISOString().substring(0, 10),
          incomeNo: 'INC-' + Math.floor(Math.random() * 1000000),
          categoryId: initialCategoryId,
          walkInCustomer: '',
          description: '',
          subTotal: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          bankAccountId: '',
          departmentId: '',
        });

        if (initialCategoryId) {
          setHasSetDefaultCategory(true);
        }
      }
    }
  }, [isOpen, editingId, incomeData]); // Exclude categories/defaultCategoryType to avoid resetting inputs

  useEffect(() => {
    if (isOpen && !editingId && !hasSetDefaultCategory && defaultCategoryType && categories.length > 0) {
      const match = categories.find(
        (c: any) => c.name.toLowerCase() === defaultCategoryType.toLowerCase()
      );
      if (match) {
        setFormData(prev => ({ ...prev, categoryId: match.id }));
        setHasSetDefaultCategory(true);
      }
    }
  }, [isOpen, editingId, categories, defaultCategoryType, hasSetDefaultCategory]);

  const calculateTotal = () => {
    return Number(formData.subTotal) + Number(formData.cgstAmount) + Number(formData.sgstAmount) + Number(formData.igstAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        grandTotal: calculateTotal(),
        taxTotal: Number(formData.cgstAmount) + Number(formData.sgstAmount) + Number(formData.igstAmount),
      };

      if (editingId) {
        await api.patch(`/other-incomes/${editingId}`, payload);
      } else {
        await api.post('/other-incomes', payload);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save income', error);
      notification.error('Failed to save income. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? 'Edit Income' : 'Record New Income'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input 
              type="date"
              required 
              value={formData.date} 
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Receipt Number</Label>
            <Input 
              required 
              value={formData.incomeNo} 
              onChange={(e) => setFormData({ ...formData, incomeNo: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Income Category</Label>
            <select 
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Customer Name (Walk-in)</Label>
            <Input 
              value={formData.walkInCustomer} 
              onChange={(e) => setFormData({ ...formData, walkInCustomer: e.target.value })}
              placeholder="e.g. John Doe"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Segment Department</Label>
          <select 
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
          >
            <option value="">Select Department</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Description / Particulars</Label>
          <Input 
            required
            value={formData.description} 
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g. Server Maintenance for June 2026"
          />
        </div>

        <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg border">
          <div className="space-y-2">
            <Label>Sub Total</Label>
            <Input 
              type="number"
              required 
              min="0"
              step="0.01"
              value={formData.subTotal} 
              onChange={(e) => setFormData({ ...formData, subTotal: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>CGST</Label>
            <Input 
              type="number"
              min="0"
              step="0.01"
              value={formData.cgstAmount} 
              onChange={(e) => setFormData({ ...formData, cgstAmount: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>SGST</Label>
            <Input 
              type="number"
              min="0"
              step="0.01"
              value={formData.sgstAmount} 
              onChange={(e) => setFormData({ ...formData, sgstAmount: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>IGST</Label>
            <Input 
              type="number"
              min="0"
              step="0.01"
              value={formData.igstAmount} 
              onChange={(e) => setFormData({ ...formData, igstAmount: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="flex justify-end items-center mb-4">
          <span className="text-lg font-semibold mr-4">Grand Total:</span>
          <span className="text-2xl font-bold text-primary">₹{calculateTotal().toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t pt-4">
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={formData.paymentStatus}
              onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
            >
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
          {formData.paymentStatus === 'PAID' && (
            <>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              {formData.paymentMethod !== 'CASH' && (
                <div className="space-y-2">
                  <Label>Bank Account</Label>
                  <select 
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={formData.bankAccountId}
                    onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                  >
                    <option value="">Select Bank Account</option>
                    {bankAccounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>{acc.name} - {acc.accountNumber}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save & Post Journal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
