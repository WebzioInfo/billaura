import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import api from '../../../services/api';
import { LedgerLookup } from '../../../components/ui/LedgerLookup';

import { useQuery } from '@tanstack/react-query';

const Label = (props: any) => <label className="block text-sm font-medium mb-1" {...props} />;

interface IncomeCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingId?: string | null;
}

export function IncomeCategoryFormModal({ isOpen, onClose, onSuccess, editingId }: IncomeCategoryFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    accountId: '',
    isActive: true,
  });
  // Ledger prefetching is removed in favor of LedgerLookup dynamic searching

  const { data: categoryData } = useQuery({
    queryKey: ['income-category', editingId],
    queryFn: async () => {
      if (!editingId) return null;
      const { data } = await api.get(`/income-categories/${editingId}`);
      return data;
    },
    enabled: isOpen && !!editingId
  });

  useEffect(() => {
    if (isOpen) {
      if (editingId && categoryData) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData({
          name: categoryData.name,
          description: categoryData.description || '',
          accountId: categoryData.accountId,
          isActive: categoryData.isActive,
        });
      } else if (!editingId) {
        setFormData({ name: '', description: '', accountId: '', isActive: true });
      }
    }
  }, [isOpen, editingId, categoryData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingId) {
        await api.patch(`/income-categories/${editingId}`, formData);
      } else {
        await api.post('/income-categories', formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save category', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? 'Edit Income Category' : 'New Income Category'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Category Name</Label>
          <Input 
            required 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Consultancy, AMC"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input 
            value={formData.description} 
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <LedgerLookup
            value={formData.accountId}
            onChange={(val) => setFormData({ ...formData, accountId: val })}
            allowedAccountTypes="REVENUE"
            placeholder="Select Account..."
            required
          />
          <p className="text-xs text-muted-foreground">Select the General Ledger account this income should post to.</p>
        </div>

        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
