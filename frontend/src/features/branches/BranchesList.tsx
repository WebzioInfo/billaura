import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/core/services/NotificationService';
import { 
  Building2, Search, Plus, Edit2, Trash2, 
  MapPin, Phone, Mail, Loader2, Landmark 
} from 'lucide-react';
import { apiClient } from '../../core/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteDialog } from '../../shared/components/ui';

const branchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters'),
  code: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.string().length(0)),
  gstin: z.string().optional(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
});

type BranchFormValues = z.infer<typeof branchSchema>;

interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

export const BranchesList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      gstin: '',
      isActive: true,
      isDefault: false,
    }
  });

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await apiClient.get<Branch[]>('/branches');
      if (response) { return response; }
      return [];
    }
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: BranchFormValues) => {
      if (editingBranch) {
        return apiClient.patch(`/branches/${editingBranch.id}`, values);
      } else {
        return apiClient.post('/branches', values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      notification.success(editingBranch ? 'Branch details updated successfully' : 'New branch registered successfully');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Action failed';
      notification.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      notification.success('Branch removed successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete branch');
    }
  });

  const openAddModal = () => {
    setEditingBranch(null);
    reset({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      gstin: '',
      isActive: true,
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    reset({
      name: branch.name,
      code: branch.code || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      gstin: branch.gstin || '',
      isActive: branch.isActive,
      isDefault: branch.isDefault,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: BranchFormValues) => {
    mutation.mutate(values);
  };

  const [branchToDelete, setBranchToDelete] = useState<any>(null);

  const handleDelete = (id: string) => {
    const branch = branches.find(b => b.id === id);
    setBranchToDelete(branch || { id });
  };

  const confirmDelete = async () => {
    if (!branchToDelete) return;
    deleteMutation.mutate(branchToDelete.id);
    setBranchToDelete(null);
  };

  const isSubmitting = mutation.isPending;

  const filteredBranches = branches.filter(branch => 
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (branch.code && branch.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (branch.gstin && branch.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-accent" />
            Branch Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure multi-location organizational branch offices, GSTIN details, and default billing warehouse points.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Branch Office
        </button>
      </div>

      {/* Query Filter row */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border w-full max-w-md focus-within:border-accent transition-colors">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search by name, branch code, or GSTIN..." 
          className="bg-transparent border-none outline-none w-full text-sm text-foreground placeholder:text-muted-foreground"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Main Table view */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl border border-border animate-pulse space-y-4">
              <div className="h-5 bg-border rounded w-1/3" />
              <div className="h-4 bg-border rounded w-2/3" />
              <div className="h-4 bg-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-border text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-accent-muted text-accent flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No Branches Registered</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Your enterprise has no configured locations yet. Click below to add your primary headquarters or branch.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            Create Primary Branch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => (
            <div 
              key={branch.id} 
              className={`glass-panel p-6 rounded-2xl border transition-all hover-premium flex flex-col justify-between ${
                branch.isDefault ? 'border-accent ring-1 ring-accent' : 'border-border'
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                      {branch.name}
                      {branch.isDefault && (
                        <span className="bg-accent text-white px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase">
                          Default
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Code: {branch.code || 'N/A'}</p>
                  </div>
                  
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    branch.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-4">
                  {branch.gstin && (
                    <p className="flex items-center gap-2">
                      <Landmark className="w-3.5 h-3.5 text-accent" />
                      <span>GSTIN: <span className="font-semibold text-foreground">{branch.gstin}</span></span>
                    </p>
                  )}
                  {branch.address && (
                    <p className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <span className="truncate">{branch.address}</span>
                    </p>
                  )}
                  {branch.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-accent" />
                      <span>{branch.phone}</span>
                    </p>
                  )}
                  {branch.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-accent" />
                      <span>{branch.email}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                <button
                  onClick={() => openEditModal(branch)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
                  title="Edit Branch Settings"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(branch.id)}
                  disabled={branch.isDefault}
                  className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                  title="Remove Branch Office"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Add Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-lg z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">
                {editingBranch ? 'Modify Branch Office' : 'Register New Branch Office'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="e.g. Headquarters, Mumbai Office"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Branch Code / Identifier
                  </label>
                  <input
                    type="text"
                    {...register('code')}
                    placeholder="e.g. HQ, MUM-01"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    {...register('gstin')}
                    placeholder="27AAAAA1111A1Z1"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Physical Address
                  </label>
                  <textarea
                    {...register('address')}
                    placeholder="Complete office postal address"
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="+91 99999 99999"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="text"
                    {...register('email')}
                    placeholder="branch@company.com"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    {...register('isDefault')} 
                    className="rounded border-border text-accent focus:ring-accent/20"
                  />
                  Make this the default billing branch
                </label>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    {...register('isActive')} 
                    className="rounded border-border text-accent focus:ring-accent/20"
                  />
                  Mark branch office as Active
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingBranch ? 'Save Changes' : 'Register Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
      <DeleteDialog isOpen={!!branchToDelete} onClose={() => setBranchToDelete(null)} onConfirm={confirmDelete} entityName="Branch" entityId={branchToDelete?.name} warningText="This action cannot be undone." />
    </>
  );
};
