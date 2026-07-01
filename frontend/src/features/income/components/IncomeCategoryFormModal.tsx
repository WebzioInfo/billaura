import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import api from '../../../services/api';

const Label = (props: any) => <label className="block text-sm font-medium mb-1" {...props} />;

interface IncomeCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingId?: string | null;
}

export function IncomeCategoryFormModal({ isOpen, onClose, onSuccess, editingId }: IncomeCategoryFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    accountId: '',
    isActive: true,
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      if (editingId) {
        fetchCategory();
      } else {
        setFormData({ name: '', description: '', accountId: '', isActive: true });
      }
    }
  }, [isOpen, editingId]);

  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/accounts?category=REVENUE');
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts', error);
    }
  };

  const fetchCategory = async () => {
    try {
      const { data } = await api.get(`/income-categories/${editingId}`);
      setFormData({
        name: data.name,
        description: data.description || '',
        accountId: data.accountId,
        isActive: data.isActive,
      });
    } catch (error) {
      console.error('Failed to fetch category', error);
    }
  };

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
          <Label>GL Account (Revenue)</Label>
          <select 
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
          >
            <option value="">Select Account</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
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
