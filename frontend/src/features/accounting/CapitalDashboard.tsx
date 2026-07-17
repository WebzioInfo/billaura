import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import notification from '@/services/NotificationService';
import api from '../../services/api';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

const Label = (props: any) => <label className="block text-sm font-medium mb-1" {...props} />;

export const CapitalDashboard = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    type: 'INTRODUCED' as 'INTRODUCED' | 'DRAWING',
    amount: '',
    bankAccountId: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get('/bank-accounts');
      return res.data;
    },
  });

  const bankAccounts = bankAccountsData?.data?.items || [];

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/capital', {
        ...data,
        amount: Number(data.amount)
      });
    },
    onSuccess: () => {
      notification.success(formData.type === 'INTRODUCED' ? 'Capital recorded' : 'Drawing recorded');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setFormData(prev => ({
        ...prev,
        amount: '',
        reference: '',
        notes: ''
      }));
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to record transaction');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.bankAccountId) {
      notification.error('Amount and Bank Account are required');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Owner's Capital</h1>
        <p className="text-muted-foreground">Manage capital introduced and drawings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Record Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={formData.type === 'INTRODUCED' ? 'primary' : 'outline'}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  onClick={() => setFormData({ ...formData, type: 'INTRODUCED' })}
                >
                  <ArrowDownToLine className="w-6 h-6" />
                  <span>Capital Introduced</span>
                </Button>
                
                <Button
                  type="button"
                  variant={formData.type === 'DRAWING' ? 'primary' : 'outline'}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  onClick={() => setFormData({ ...formData, type: 'DRAWING' })}
                >
                  <ArrowUpFromLine className="w-6 h-6" />
                  <span>Owner's Drawing</span>
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Bank Account *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.bankAccountId}
                  onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name} (Bal: {b.currentBalance})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference</Label>
                  <Input 
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g. TRF-123"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional description..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Processing...' : 'Post to Ledger'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground border-none">
          <CardHeader>
            <CardTitle>Capital Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm opacity-80">Track total equity invested into the business by the owners.</p>
            
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-wider opacity-80 font-semibold">To view current equity balance:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2 opacity-90">
                <li>Navigate to Chart of Accounts</li>
                <li>Check "Owners Capital" ledger</li>
                <li>Check "Drawings" ledger</li>
                <li>Check "Balance Sheet" -{'>'} Equity</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
