import React, { useState } from 'react';
import { DataTable } from '../../../components/ui/data-table';
import { Button } from '../../../components/ui/Button';
import { Plus, Trash2, Edit } from 'lucide-react';
import { OtherIncomeFormModal } from './OtherIncomeFormModal';
import api from '../../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function OtherIncomesList() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: incomes = [] } = useQuery({
    queryKey: ['other-incomes'],
    queryFn: async () => {
      const { data } = await api.get('/other-incomes');
      return data || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/other-incomes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['other-incomes'] });
    }
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this income record? Associated journal entries will be removed.')) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }: any) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: 'incomeNo',
      header: 'Receipt No.',
      cell: ({ row }: any) => <span className="font-medium text-primary">{row.original.incomeNo}</span>
    },
    {
      accessorKey: 'category.name',
      header: 'Category',
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }: any) => row.original.businessPartner?.name || row.original.walkInCustomer || '-',
    },
    {
      accessorKey: 'grandTotal',
      header: 'Amount',
      cell: ({ row }: any) => <span className="font-semibold">₹{Number(row.original.grandTotal).toFixed(2)}</span>
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Status',
      cell: ({ row }: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {row.original.paymentStatus}
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
        <h3 className="text-lg font-semibold">Service & Other Incomes</h3>
        <Button onClick={() => {
          setEditingId(null);
          setIsModalOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Record Income
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <DataTable 
          columns={columns} 
          data={incomes}
        />
      </div>

      <OtherIncomeFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['other-incomes'] });
        }}
        editingId={editingId}
      />
    </div>
  );
}
