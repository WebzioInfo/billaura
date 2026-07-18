import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input, Button, Select } from '@/shared/components/ui';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';

export interface BrandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand?: any;
}

export const BrandFormModal = ({ isOpen, onClose, brand }: BrandFormModalProps) => {
  const isEditing = !!brand;
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    website: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      if (brand) {
        setFormData({
          name: brand.brandName || '',
          code: brand.brandCode || '',
          description: brand.description || '',
          website: brand.website || '',
          email: brand.email || '',
          phone: brand.phone || '',
          status: brand.status || 'ACTIVE',
        });
      } else {
        setFormData({
          name: '',
          code: '',
          description: '',
          website: '',
          email: '',
          phone: '',
          status: 'ACTIVE',
        });
      }
      setErrors({});
    }
  }, [isOpen, brand]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        code: data.code,
        description: data.description,
        website: data.website,
        email: data.email,
        phone: data.phone,
        status: data.status,
      };
      
      if (isEditing) {
        return apiClient.patch(`/inventory/brands/${brand.id}`, payload);
      } else {
        return apiClient.post('/inventory/brands', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      notification.success(`Brand ${isEditing ? 'updated' : 'created'} successfully`);
      onClose();
    },
    onError: (err: any) => {
      setErrors({ form: err.response?.data?.message || err.message || 'Failed to save brand' });
    }
  });

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Brand Name is required';
    if (!formData.code.trim()) newErrors.code = 'Brand Code is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      saveMutation.mutate(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground">{isEditing ? 'Edit Brand' : 'Create New Brand'}</h2>
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
                label="Brand Name *"
                placeholder="e.g. Apple"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={errors.name}
                autoFocus
              />

              <Input
                label="Brand Code *"
                placeholder="e.g. AAPL"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                error={errors.code}
              />
            </div>

            <Input
              label="Description"
              placeholder="Brief description of the brand..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Website"
                type="url"
                placeholder="https://..."
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Status</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Email Contact"
                type="email"
                placeholder="contact@brand.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
              <Input
                label="Phone Contact"
                type="tel"
                placeholder="+1..."
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                 Brand Logo
               </label>
               <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">Click to upload brand logo</p>
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
              disabled={saveMutation.isPending}
              className="min-w-[120px]"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Brand</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
