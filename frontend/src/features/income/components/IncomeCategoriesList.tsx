import React, { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/data-table';
import { Button } from '../../../components/ui/Button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { IncomeCategoryFormModal } from './IncomeCategoryFormModal';
import api from '../../../services/api';

export function IncomeCategoriesList() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/income-categories');
      setCategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      await api.delete(`/income-categories/${id}`);
      fetchCategories();
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
          fetchCategories();
        }}
        editingId={editingId}
      />
    </div>
  );
}
