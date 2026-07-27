import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, Button, Input, Select, FormErrorDisplay } from '@/shared/components/ui';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const segmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  segmentType: z.string(),
  color: z.string().optional(),
});

type SegmentFormValues = z.infer<typeof segmentSchema>;

export const CustomerSegmentManager = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const res = await apiClient.get('/customer-segments');
      return res.data?.data || res.data || [];
    }
  });

  const form = useForm<SegmentFormValues>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      name: '',
      description: '',
      segmentType: 'B2B',
      color: 'bg-blue-500',
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SegmentFormValues & { id?: string }) => {
      if (data.id) {
        return apiClient.patch(`/customer-segments/${data.id}`, data);
      }
      return apiClient.post('/customer-segments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      notification.success(isEditing ? 'Segment updated' : 'Segment created');
      setIsEditing(null);
      setIsCreating(false);
      form.reset();
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save segment');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/customer-segments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      notification.success('Segment deleted');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete segment. It might be in use.');
    }
  });

  const handleEdit = (segment: any) => {
    setIsEditing(segment.id);
    setIsCreating(false);
    form.reset({
      name: segment.name,
      description: segment.description || '',
      segmentType: segment.segmentType || 'B2B',
      color: segment.color || 'bg-gray-500',
    });
  };

  const onSubmit = (data: SegmentFormValues) => {
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
        title="Customer Segments"
        description="Manage B2B and B2C customer segmentation categories"
        primaryAction={
          !isCreating && !isEditing && (
            <Button onClick={() => { setIsCreating(true); form.reset(); }} variant="primary" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Segment
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
                <TableHead className="font-bold">Segment Name</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Description</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCreating && (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={4}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-4 gap-4 p-2">
                      <div>
                        <Input placeholder="Segment Name" {...form.register('name')} />
                        <FormErrorDisplay error={form.formState.errors.name} />
                      </div>
                      <div>
                        <Select
                          {...form.register('segmentType')}
                          options={[
                            { value: 'B2B', label: 'B2B' },
                            { value: 'B2C', label: 'B2C' },
                            { value: 'BOTH', label: 'Both' },
                          ]}
                        />
                      </div>
                      <div>
                        <Input placeholder="Color (e.g. bg-blue-500)" {...form.register('color')} />
                      </div>
                      <div className="flex justify-end gap-2 items-center">
                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                        <Button type="submit" variant="primary" size="sm" disabled={saveMutation.isPending}><Save className="w-4 h-4" /></Button>
                      </div>
                    </form>
                  </TableCell>
                </TableRow>
              )}
              {segments.map((s: any) => isEditing === s.id ? (
                <TableRow key={s.id} className="bg-muted/30">
                  <TableCell colSpan={4}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-4 gap-4 p-2">
                      <div>
                        <Input placeholder="Segment Name" {...form.register('name')} />
                        <FormErrorDisplay error={form.formState.errors.name} />
                      </div>
                      <div>
                        <Select
                          {...form.register('segmentType')}
                          options={[
                            { value: 'B2B', label: 'B2B' },
                            { value: 'B2C', label: 'B2C' },
                            { value: 'BOTH', label: 'Both' },
                          ]}
                        />
                      </div>
                      <div>
                        <Input placeholder="Color (e.g. bg-blue-500)" {...form.register('color')} />
                      </div>
                      <div className="flex justify-end gap-2 items-center">
                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                        <Button type="submit" variant="primary" size="sm" disabled={saveMutation.isPending}><Save className="w-4 h-4" /></Button>
                      </div>
                    </form>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={s.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${s.color || 'bg-gray-500'}`} />
                      <span className="font-medium">{s.name}</span>
                      {s.isDefault && <span className="text-[10px] bg-muted px-1.5 rounded text-muted-foreground uppercase">Default</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                      {s.segmentType}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" className="px-2" onClick={() => handleEdit(s)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      {!s.isDefault && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="px-2 text-destructive" 
                          onClick={async () => { 
                            const confirmed = await dialog.confirmDelete('Delete Segment?', 'Are you sure you want to delete this customer segment?');
                            if (confirmed) deleteMutation.mutate(s.id); 
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isCreating && segments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No segments found.
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
