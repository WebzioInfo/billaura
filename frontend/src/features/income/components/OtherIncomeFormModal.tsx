import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import api from '../../../services/api';

const Label = (props: any) => <label className="block text-sm font-medium mb-1" {...props} />;

interface OtherIncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingId?: string | null;
}

export function OtherIncomeFormModal({ isOpen, onClose, onSuccess, editingId }: OtherIncomeFormModalProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().substring(0, 10),
    incomeNo: 'INC-' + Math.floor(Math.random() * 1000000), // Temp auto-gen
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
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchBankAccounts();
      if (editingId) {
        fetchIncome();
      } else {
        setFormData({
          date: new Date().toISOString().substring(0, 10),
          incomeNo: 'INC-' + Math.floor(Math.random() * 1000000),
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
        });
      }
    }
  }, [isOpen, editingId]);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/income-categories');
      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data } = await api.get('/bank-accounts');
      setBankAccounts(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchIncome = async () => {
    try {
      const { data } = await api.get(`/other-incomes/${editingId}`);
      setFormData({
        ...data,
        date: new Date(data.date).toISOString().substring(0, 10),
      });
    } catch (error) {
      console.error(error);
    }
  };

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
      alert('Failed to save income. Check console for details.');
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
              {categories.map(cat => (
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
                    {bankAccounts.map(acc => (
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
