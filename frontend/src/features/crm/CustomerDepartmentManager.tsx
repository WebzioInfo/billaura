import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, Button, Input, Select, FormErrorDisplay } from '@/shared/components/ui';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  customerType: z.string(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

export const CustomerDepartmentManager = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['customer-departments'],
    queryFn: async () => {
      const res = await apiClient.get('/customer-departments');
      return res.data?.data || res.data || [];
    }
  });

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
      customerType: 'B2B',
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: DepartmentFormValues & { id?: string }) => {
      if (data.id) {
        return apiClient.patch(`/customer-departments/${data.id}`, data);
      }
      return apiClient.post('/customer-departments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-departments'] });
      notification.success(isEditing ? 'Department updated' : 'Department created');
      setIsEditing(null);
      setIsCreating(false);
      form.reset();
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save department');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/customer-departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-departments'] });
      notification.success('Department deleted');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete department. It might be in use.');
    }
  });

  const handleEdit = (department: any) => {
    setIsEditing(department.id);
    setIsCreating(false);
    form.reset({
      name: department.name,
      description: department.description || '',
      customerType: department.customerType || 'B2B',
    });
  };

  const onSubmit = (data: DepartmentFormValues) => {
    saveMutation.mutate({ ...data, id: isEditing || undefined });
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setIsCreating(false);
    form.reset();
  };

  return (
    <PageContainer maxWidth="5xl">
      <PageHeader
        title="Customer Departments"
        description="Manage organizational departments for B2B and B2C customers"
        primaryAction={
          !isCreating && !isEditing && (
            <Button onClick={() => { setIsCreating(true); form.reset(); }} variant="primary" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Department
            </Button>
          )
        }
      />

      {isLoading ? (
        <TableLoader cols={4} rows={5} className="mt-6" />
      ) : (
        <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-6 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 border-b border-border">
                <TableHead className="font-bold">Department Name</TableHead>
                <TableHead className="font-bold">Applies To</TableHead>
                <TableHead className="font-bold">Description</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCreating && (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={4}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-4 gap-4 p-2">
                      <div className="col-span-1">
                        <Input placeholder="Department Name" {...form.register('name')} />
                        <FormErrorDisplay error={form.formState.errors.name} />
                      </div>
                      <div className="col-span-1">
                        <Select
                          {...form.register('customerType')}
                          options={[
                            { value: 'B2B', label: 'B2B' },
                            { value: 'B2C', label: 'B2C' },
                            { value: 'BOTH', label: 'Both' },
                          ]}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input placeholder="Description (optional)" {...form.register('description')} />
                      </div>
                      <div className="flex justify-end gap-2 items-center">
                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                        <Button type="submit" variant="primary" size="sm" disabled={saveMutation.isPending}><Save className="w-4 h-4" /></Button>
                      </div>
                    </form>
                  </TableCell>
                </TableRow>
              )}
              {departments.map((d: any) => isEditing === d.id ? (
                <TableRow key={d.id} className="bg-muted/30">
                  <TableCell colSpan={4}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-4 gap-4 p-2">
                      <div className="col-span-1">
                        <Input placeholder="Department Name" {...form.register('name')} />
                        <FormErrorDisplay error={form.formState.errors.name} />
                      </div>
                      <div className="col-span-1">
                        <Select
                          {...form.register('customerType')}
                          options={[
                            { value: 'B2B', label: 'B2B' },
                            { value: 'B2C', label: 'B2C' },
                            { value: 'BOTH', label: 'Both' },
                          ]}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input placeholder="Description (optional)" {...form.register('description')} />
                      </div>
                      <div className="flex justify-end gap-2 items-center">
                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                        <Button type="submit" variant="primary" size="sm" disabled={saveMutation.isPending}><Save className="w-4 h-4" /></Button>
                      </div>
                    </form>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={d.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell>
                    <span className="font-medium text-foreground">{d.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                      {d.customerType}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {d.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" className="px-2" onClick={() => handleEdit(d)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="px-2 text-destructive" onClick={() => { if(window.confirm('Delete department?')) deleteMutation.mutate(d.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isCreating && departments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No departments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </PageContainer>
  );
};
