import React, { useState } from 'react';
import { X, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from './Input';
import { Button } from './Button';
import { SearchableMasterDropdown } from './SearchableMasterDropdown';
import apiClient from '@/core/api';

export interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCategory: any) => void;
}

export const CategoryFormModal = ({ isOpen, onClose, onSuccess }: CategoryFormModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    parentId: '',
    status: 'ACTIVE',
    color: '#000000',
    displayOrder: 0,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const createCategory = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiClient.post('/inventory/categories', data);
      return res.data || res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product_categories'] });
      onSuccess(data);
    },
    onError: (err: any) => {
      setErrors({ form: err.response?.data?.message || err.message || 'Failed to create category' });
    }
  });

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Category Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      createCategory.mutate({
        ...formData,
        name: formData.name.trim(),
        code: formData.code.trim()
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground">Create New Category</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
          <div className="p-6 overflow-y-auto space-y-6">
            
            {errors.form && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                {errors.form}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Category Name *"
                placeholder="e.g. Electronics"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={errors.name}
                autoFocus
              />

              <Input
                label="Category Code"
                placeholder="e.g. ELEC"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              />
            </div>

            <div className="w-full">
              <SearchableMasterDropdown
                label="Parent Category"
                apiPath="/inventory/categories"
                queryKeyPrefix="product_categories"
                value={formData.parentId}
                onChange={(val) => setFormData(prev => ({ ...prev, parentId: val }))}
                mapOption={(opt) => ({ label: opt.categoryName || opt.name, value: opt.id })}
                placeholder="Select parent category..."
              />
            </div>

            <Input
              label="Description"
              placeholder="Brief description of the category..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                   Theme Color
                 </label>
                 <div className="flex items-center gap-3">
                   <input 
                     type="color" 
                     value={formData.color}
                     onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                     className="h-10 w-14 p-1 cursor-pointer bg-background border border-border rounded-lg"
                   />
                   <span className="text-sm font-mono text-muted-foreground">{formData.color}</span>
                 </div>
              </div>

              <Input
                label="Display Order"
                type="number"
                value={formData.displayOrder.toString()}
                onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                 Category Image
               </label>
               <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">Click to upload image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG or SVG up to 2MB</p>
               </div>
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={createCategory.isPending}
              className="min-w-[120px]"
            >
              {createCategory.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Category</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
