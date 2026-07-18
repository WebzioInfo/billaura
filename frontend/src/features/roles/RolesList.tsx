import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/core/services/NotificationService';
import { Shield, Plus, Edit2, Trash2, Search, Loader2, Check, Copy } from 'lucide-react';
import { apiClient } from '../../core/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteDialog } from '../../shared/components/ui';

const roleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional(),
  permissions: z.array(
    z.object({
      resource: z.string(),
      action: z.string(),
    })
  ),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RolePermission {
  id?: string;
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: RolePermission[];
}

const RESOURCES = [
  { value: 'branches', label: 'Branch Offices' },
  { value: 'roles', label: 'Access Control (RBAC)' },
  { value: 'users', label: 'User Directory' },
  { value: 'customers', label: 'CRM & Customers' },
  { value: 'vendors', label: 'Suppliers & Vendors' },
  { value: 'products', label: 'Products Catalog' },
  { value: 'inventory', label: 'Inventory & Warehouses' },
  { value: 'sales', label: 'Sales & Billing Invoices' },
  { value: 'purchases', label: 'Purchase Operations' },
  { value: 'accounting', label: 'Financial General Ledger' },
  { value: 'payroll', label: 'HRMS & Payroll' },
  { value: 'settings', label: 'System Administration' },
];

const ACTIONS = [
  { value: 'create', label: 'Create' },
  { value: 'read', label: 'View (Read)' },
  { value: 'update', label: 'Edit (Update)' },
  { value: 'delete', label: 'Delete' },
];

export const RolesList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Omit<RolePermission, 'id'>[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    }
  });

  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await apiClient.get<Role[]>('/roles');
      return Array.isArray(response) ? response : [];
    }
  });

  const mutation = useMutation({
    mutationFn: async (dataToSend: any) => {
      if (editingRole) {
        return apiClient.patch(`/roles/${editingRole.id}`, dataToSend);
      } else {
        return apiClient.post('/roles', dataToSend);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      notification.success(editingRole ? 'Access role updated successfully' : 'Custom access role configured successfully');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Action failed');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      notification.success('Role removed successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete role');
    }
  });

  const openAddModal = () => {
    setEditingRole(null);
    setSelectedPermissions([]);
    reset({
      name: '',
      description: '',
      permissions: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    const perms = role.permissions.map(p => ({ resource: p.resource, action: p.action }));
    setSelectedPermissions(perms);
    reset({
      name: role.name,
      description: role.description || '',
      permissions: perms,
    });
    setIsModalOpen(true);
  };

  const handleCloneRole = (role: Role) => {
    setEditingRole(null); // Creating a new one
    const perms = role.permissions.map(p => ({ resource: p.resource, action: p.action }));
    setSelectedPermissions(perms);
    reset({
      name: `${role.name} (Clone)`,
      description: role.description || '',
      permissions: perms,
    });
    setIsModalOpen(true);
  };

  const handlePermissionToggle = (resource: string, action: string) => {
    const exists = selectedPermissions.some(
      (p) => p.resource === resource && p.action === action
    );

    let updated: Omit<RolePermission, 'id'>[];
    if (exists) {
      updated = selectedPermissions.filter(
        (p) => !(p.resource === resource && p.action === action)
      );
    } else {
      updated = [...selectedPermissions, { resource, action }];
    }

    setSelectedPermissions(updated);
  };

  const isPermissionChecked = (resource: string, action: string) => {
    return selectedPermissions.some(
      (p) => p.resource === resource && p.action === action
    );
  };

  const onSubmit = async (values: RoleFormValues) => {
    const dataToSend = {
      ...values,
      permissions: selectedPermissions,
    };
    mutation.mutate(dataToSend);
  };

  const [roleToDelete, setRoleToDelete] = useState<any>(null);

  const handleDelete = (id: string) => {
    const role = roles.find(r => r.id === id);
    setRoleToDelete(role || { id });
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    deleteMutation.mutate(roleToDelete.id);
    setRoleToDelete(null);
  };

  const isSubmitting = mutation.isPending;

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent" />
            Roles & Permissions Matrix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define custom authorization profiles, grant resource actions, and build the security access matrix for your company users.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Custom Role
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border w-full max-w-md focus-within:border-accent transition-colors">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search roles..." 
          className="bg-transparent border-none outline-none w-full text-sm text-foreground placeholder:text-muted-foreground"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl border border-border animate-pulse space-y-4">
              <div className="h-5 bg-border rounded w-1/4" />
              <div className="h-4 bg-border rounded w-3/4" />
              <div className="h-4 bg-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-accent-muted text-accent flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-lg">No Custom Roles Configured</h3>
          <button
            onClick={openAddModal}
            className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            Create Custom Role
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <div 
              key={role.id} 
              className={`glass-panel p-6 rounded-2xl border transition-all hover-premium flex flex-col justify-between ${
                role.isSystem ? 'border-border bg-surface bg-opacity-30' : 'border-border'
              }`}
            >
              <div className="space-y-4 text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                      {role.name}
                    </h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      role.isSystem ? 'bg-accent/15 text-accent' : 'bg-primary/10 text-muted-foreground'
                    }`}>
                      {role.isSystem ? 'System Defined' : 'Custom Configured'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {role.description || 'No description provided.'}
                </p>

                <div className="border-t border-border pt-4">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Permissions Granted
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">No access permissions mapped.</span>
                    ) : (
                      role.permissions.map((p, idx) => (
                        <span 
                          key={idx}
                          className="bg-background text-foreground border border-border px-2 py-0.5 rounded text-[10px] font-semibold"
                        >
                          {p.resource}:{p.action}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {!role.isSystem && (
                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button
                    onClick={() => openEditModal(role)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
                    title="Modify Role Permissions"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCloneRole(role)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
                    title="Clone Custom Role"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete Custom Role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Access Control Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-4xl z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35 shrink-0">
              <h2 className="font-bold text-lg text-foreground">
                {editingRole ? 'Modify Custom Role Access' : 'Configure Custom Role'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
              <div className="grid grid-cols-2 gap-4 shrink-0">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Role Profile Name *
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="e.g. Senior Accountant, CRM Agent"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Brief Description
                  </label>
                  <input
                    type="text"
                    {...register('description')}
                    placeholder="e.g. Unrestricted ledger access and billing privileges"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
              </div>

              {/* Permissions Matrix Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Access Permissions Matrix
                </label>
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-background bg-opacity-50 text-xs font-semibold text-muted-foreground uppercase">
                      <tr>
                        <th className="p-3 border-b border-border">Resource Category</th>
                        {ACTIONS.map((action) => (
                          <th key={action.value} className="p-3 text-center border-b border-border">
                            {action.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {RESOURCES.map((res) => (
                        <tr key={res.value} className="hover:bg-background/20 transition-colors">
                          <td className="p-3 font-semibold text-foreground">{res.label}</td>
                          {ACTIONS.map((action) => {
                            const checked = isPermissionChecked(res.value, action.value);
                            return (
                              <td key={action.value} className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handlePermissionToggle(res.value, action.value)}
                                  className={`w-5 h-5 rounded border flex items-center justify-center transition-all mx-auto cursor-pointer ${
                                    checked 
                                      ? 'bg-accent border-accent text-white' 
                                      : 'border-border hover:border-accent'
                                  }`}
                                >
                                  {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-border pt-4">
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
                  {editingRole ? 'Save Matrix Settings' : 'Configure Access Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
      <DeleteDialog isOpen={!!roleToDelete} onClose={() => setRoleToDelete(null)} onConfirm={confirmDelete} entityName="Role" entityId={roleToDelete?.name} warningText="This will revoke access from all mapped users." />
    </>
  );
};
