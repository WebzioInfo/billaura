import React, { useState } from 'react';
import { DataTable } from '../../../components/ui/data-table';
import { Button } from '../../../components/ui/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { IncomeCategoryFormModal } from './IncomeCategoryFormModal';
import api from '../../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function IncomeCategoriesList() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['income-categories'],
    queryFn: async () => {
      const { data } = await api.get('/income-categories');
      return data || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/income-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
    }
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      accessorKey: 'name',
      header: 'Category Name',
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'account.name',
      header: 'GL Account',
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => {
            setEditingId(row.original.id);
            setIsModalOpen(true);
          }}>
            <Edit className="w-4 h-4 text-blue-600" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)}>
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Income Categories</h3>
        <Button onClick={() => {
          setEditingId(null);
          setIsModalOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <DataTable
          columns={columns}
          data={categories}
        />
      </div>

      <IncomeCategoryFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['income-categories'] });
        }}
        editingId={editingId}
      />
    </div>
  );
}
