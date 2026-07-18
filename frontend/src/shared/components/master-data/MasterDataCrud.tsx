import React, { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { TableLoader } from '../ui/LoadingSystem';
import { PageContainer, EmptyState } from '../ui/LayoutComponents';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/action-system/ConfirmDialog';
import { apiClient } from '../../../core/api/apiClient';
import notification from '../../../core/services/NotificationService';
import { useDebounce } from '../../../shared/hooks/useDebounce';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

export interface MasterDataCrudProps<T> {
  title: string;
  description: string;
  queryKey: string;
  apiEndpoint: string;
  columns: ColumnDef<T>[];
  FormComponent: React.ComponentType<{ isOpen: boolean; onClose: () => void; item?: T }>;
  renderStats?: (items: T[]) => React.ReactNode;
}

export function MasterDataCrud<T extends { id: string; status?: string }>({
  title,
  description,
  queryKey,
  apiEndpoint,
  columns,
  FormComponent,
  renderStats,
}: MasterDataCrudProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | undefined>(undefined);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      
      const res = await apiClient.get(apiEndpoint, { params });
      return res.data?.data || res.data || { items: [] };
    }
  });

  const items = Array.isArray(data) ? data : data?.items || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`${apiEndpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      notification.success(`${title} deleted successfully`);
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || `Failed to delete ${title.toLowerCase()}`);
      setIsDeleteDialogOpen(false);
    }
  });

  const handleCreate = () => {
    setSelectedItem(undefined);
    setIsFormOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title={title}
        description={description}
        primaryAction={
          <Button onClick={handleCreate} variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New {title}
          </Button>
        }
        secondaryAction={
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />

      {renderStats && renderStats(items)}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col, idx) => (
                  <TableHead key={idx} className={col.className}>{col.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-64 text-center">
                    <TableLoader />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-64 text-center">
                    <EmptyState 
                      title={`No ${title.toLowerCase()} found`} 
                      description={`Create your first ${title.toLowerCase()} to get started.`} 
                      
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: T) => (
                  <TableRow key={item.id}>
                    {columns.map((col, idx) => (
                      <TableCell key={idx} className={col.className}>
                        {col.cell ? col.cell(item) : col.accessorKey ? String(item[col.accessorKey] || '') : null}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <FormComponent isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} item={selectedItem} />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title={`Delete ${title}`}
        message={`Are you sure you want to delete this ${title.toLowerCase()}? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onClose={() => setIsDeleteDialogOpen(false)}
        variant="danger"
      />
    </PageContainer>
  );
}





