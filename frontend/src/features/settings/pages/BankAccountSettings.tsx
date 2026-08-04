import React, { useState } from 'react';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/apiClient';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export function BankAccountSettings() {
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/finance/bank/accounts');
      return (res as any).data || res;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiClient.post('/finance/bank/accounts', data),
    onSuccess: () => {
      toast.success('Bank account added');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setIsEditing(false);
      reset();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => apiClient.patch(`/finance/bank/accounts/${id}`, data),
    onSuccess: () => {
      toast.success('Bank account updated');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setIsEditing(false);
      reset();
      setCurrentId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/finance/bank/accounts/${id}`),
    onSuccess: () => {
      toast.success('Bank account deleted');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    }
  });

  const onSubmit = (data: any) => {
    if (currentId) updateMutation.mutate({ id: currentId, data });
    else createMutation.mutate(data);
  };

  const handleEdit = (account: any) => {
    setCurrentId(account.id);
    reset(account);
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Building2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Bank Accounts</h2>
            <p className="text-sm text-muted-foreground">Manage your company bank accounts</p>
          </div>
        </div>
        {!isEditing && (
          <button 
            onClick={() => { reset(); setCurrentId(null); setIsEditing(true); }}
            className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-md font-medium text-foreground mb-4">{currentId ? 'Edit' : 'Add'} Bank Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bank Name</label>
              <input {...register('bankName')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Account Name</label>
              <input {...register('accountName')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Account Number</label>
              <input {...register('accountNumber')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">IFSC Code</label>
              <input {...register('ifscCode')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Branch Name</label>
              <input {...register('branchName')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">SWIFT Code</label>
              <input {...register('swiftCode')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">UPI ID</label>
              <input {...register('upiId')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" placeholder="e.g. yourname@bank" />
            </div>
            <div className="flex items-center mt-6">
              <input type="checkbox" {...register('isDefault')} className="mr-2 h-4 w-4 rounded border-border bg-background text-accent" />
              <label className="text-sm font-medium text-foreground">Set as default for invoices</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">Save Account</button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-4">Loading accounts...</p>
          ) : accounts?.length === 0 ? (
            <div className="col-span-full p-8 text-center border border-border rounded-xl bg-card">
              <p className="text-muted-foreground mb-4">No bank accounts added yet.</p>
              <button onClick={() => setIsEditing(true)} className="text-accent text-sm font-medium hover:underline cursor-pointer">Add your first account</button>
            </div>
          ) : (
            accounts?.map((acc: any) => (
              <div key={acc.id} className="border border-border rounded-xl p-5 bg-card shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {acc.bankName} 
                      {acc.isDefault && <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full font-medium">Default</span>}
                    </h3>
                    <p className="text-sm text-muted-foreground">{acc.accountName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(acc)} className="p-1.5 text-muted-foreground hover:text-accent transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { if(confirm('Delete this account?')) deleteMutation.mutate(acc.id); }} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-1 text-sm mt-auto">
                  <div className="flex justify-between"><span className="text-muted-foreground">A/C No:</span> <span className="font-medium">{acc.accountNumber}</span></div>
                  {acc.ifscCode && <div className="flex justify-between"><span className="text-muted-foreground">IFSC:</span> <span>{acc.ifscCode}</span></div>}
                  {acc.upiId && <div className="flex justify-between"><span className="text-muted-foreground">UPI:</span> <span>{acc.upiId}</span></div>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
