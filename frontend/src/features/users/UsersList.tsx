import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Users, Search, Plus, Edit2, Trash2, Mail, Loader2, Shield } from 'lucide-react';
import apiClient from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteDialog } from '../../components/ui';

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'CUSTOM']),
  customRoleId: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserData {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
}

interface CustomRole {
  id: string;
  name: string;
}

interface CompanyUser {
  userId: string;
  companyId: string;
  role: string;
  customRoleId: string | null;
  user: UserData;
  customRole: CustomRole | null;
}

export const UsersList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      name: '',
      role: 'USER',
      customRoleId: '',
    }
  });

  const selectedRole = watch('role');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<{data?: CompanyUser[]} | CompanyUser[]>('/users');
      // Handle axios response wrapper
      if (response && 'data' in response && Array.isArray(response.data)) {
        return response.data;
      }
      if (Array.isArray(response)) {
        return response;
      }
      return [];
    }
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/roles');
      if (response && 'data' in response && Array.isArray(response.data)) {
        return response.data;
      }
      if (Array.isArray(response)) return response;
      return [];
    }
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (editingUserId) {
        return apiClient.put(`/users/${editingUserId}/role`, {
          role: values.role,
          customRoleId: values.role === 'CUSTOM' ? values.customRoleId : undefined
        });
      } else {
        return apiClient.post('/users/invite', values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(editingUserId ? 'User role updated successfully' : 'User invited successfully');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Action failed';
      toast.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User removed successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to remove user');
    }
  });

  const openAddModal = () => {
    reset({
      email: '',
      name: '',
      role: 'USER',
      customRoleId: '',
    });
    setEditingUserId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: CompanyUser) => {
    reset({
      email: user.user.email,
      name: user.user.name,
      role: user.role as any,
      customRoleId: user.customRoleId || '',
    });
    setEditingUserId(user.userId);
    setIsModalOpen(true);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      u.user.name?.toLowerCase().includes(searchLower) ||
      u.user.email?.toLowerCase().includes(searchLower) ||
      u.role?.toLowerCase().includes(searchLower)
    );
  });

  const onSubmit = (values: UserFormValues) => {
    mutation.mutate(values);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-muted text-muted-foreground font-semibold">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading users...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No users found</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((item) => (
                <tr key={item.userId} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                        {item.user.name?.charAt(0).toUpperCase()}
                      </div>
                      {item.user.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {item.user.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                      <Shield className="w-3 h-3" />
                      {item.role === 'CUSTOM' ? item.customRole?.name : item.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${item.user.isActive ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {item.user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors"
                        title="Edit Role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.userId)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Remove User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h2 className="text-lg font-semibold text-foreground">
                {editingUserId ? 'Update User Role' : 'Invite User'}
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email Address *</label>
                  <input
                    type="email"
                    {...register('email')}
                    disabled={!!editingUserId} // Cannot change email of existing user here
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
                  />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                  <input
                    type="text"
                    {...register('name')}
                    disabled={!!editingUserId} // Name tied to global user, shouldn't change here easily
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Role *</label>
                  <select
                    {...register('role')}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="USER">User (Standard)</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin (Full Access)</option>
                    <option value="CUSTOM">Custom Role</option>
                  </select>
                </div>

                {selectedRole === 'CUSTOM' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Custom Role *</label>
                    <select
                      {...register('customRoleId')}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      <option value="">-- Select Custom Role --</option>
                      {roles.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    {errors.customRoleId && <p className="text-xs text-destructive mt-1">{errors.customRoleId.message}</p>}
                  </div>
                )}
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="user-form"
                disabled={mutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingUserId ? 'Update Role' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <DeleteDialog
          isOpen={true}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={async () => {
            if (deleteConfirmId) {
              await deleteMutation.mutateAsync(deleteConfirmId);
              setDeleteConfirmId(null);
            }
          }}
          entityName="User"
          warningText="They will lose access to all company data immediately."
        />
      )}
    </div>
  );
};
