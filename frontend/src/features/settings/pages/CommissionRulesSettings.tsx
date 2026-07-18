import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Loader2, Save, X } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { DataTable } from '@/shared/components/ui/data-table/DataTable';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';

export const CommissionRulesSettings = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['commission-rules'],
    queryFn: async () => {
      const res = await apiClient.get('/commissions/rules');
      return res.data?.data || res.data || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        return apiClient.put(`/commissions/rules/${payload.id}`, payload);
      }
      return apiClient.post('/commissions/rules', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      notification.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully');
      setIsModalOpen(false);
      setEditingRule(null);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save commission rule');
    }
  });

  const columns = [
    {
      accessorKey: 'name',
      header: 'Rule Name',
    },
    {
      accessorKey: 'referralSourceType',
      header: 'Source Type',
    },
    {
      accessorKey: 'commissionMethod',
      header: 'Method',
    },
    {
      accessorKey: 'commissionValue',
      header: 'Value',
      cell: ({ row }: any) => {
        const val = row.original.commissionValue;
        const method = row.original.commissionMethod;
        return method === 'FIXED_AMOUNT' ? `₹${val}` : `${val}%`;
      }
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: any) => (
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${row.original.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <Button variant="ghost" size="sm" onClick={() => {
          setEditingRule(row.original);
          setIsModalOpen(true);
        }}>
          <Edit2 className="w-4 h-4" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground">Commission Rules</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure global commission rates for employees and partners.</p>
        </div>
        <Button onClick={() => { setEditingRule(null); setIsModalOpen(true); }} variant="primary">
          <Plus className="w-4 h-4 mr-2" /> New Rule
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={rules}
          />
        )}
      </Card>

      {isModalOpen && (
        <RuleFormModal 
          rule={editingRule} 
          onClose={() => setIsModalOpen(false)} 
          onSave={(data: any) => saveMutation.mutate(data)} 
          isSaving={saveMutation.isPending} 
        />
      )}
    </div>
  );
};

const RuleFormModal = ({ rule, onClose, onSave, isSaving }: any) => {
  const [formData, setFormData] = useState({
    id: rule?.id || '',
    name: rule?.name || '',
    referralSourceType: rule?.referralSourceType || 'EMPLOYEE',
    commissionMethod: rule?.commissionMethod || 'PERCENTAGE_BEFORE_TAX',
    commissionValue: rule?.commissionValue || 0,
    tdsApplicable: rule?.tdsApplicable || false,
    tdsPercent: rule?.tdsPercent || 0,
    isActive: rule?.isActive !== undefined ? rule.isActive : true,
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border bg-background bg-opacity-35">
          <h3 className="font-bold text-foreground">{rule ? 'Edit Rule' : 'New Commission Rule'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rule Name</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referral Source Type</label>
            <select 
              value={formData.referralSourceType} 
              onChange={e => setFormData({ ...formData, referralSourceType: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="BUSINESS_PARTNER">Business Partner / Agent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Commission Method</label>
            <select 
              value={formData.commissionMethod} 
              onChange={e => setFormData({ ...formData, commissionMethod: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="PERCENTAGE_BEFORE_TAX">Percentage (Before Tax)</option>
              <option value="PERCENTAGE_AFTER_TAX">Percentage (After Tax)</option>
              <option value="FIXED_AMOUNT">Fixed Amount</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Commission Value</label>
            <input 
              type="number" 
              value={formData.commissionValue} 
              onChange={e => setFormData({ ...formData, commissionValue: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" 
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={formData.isActive} 
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
            />
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Rule</label>
          </div>
        </div>
        <div className="p-4 border-t border-border bg-background bg-opacity-35 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(formData)} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Rule
          </Button>
        </div>
      </div>
    </div>
  );
};
