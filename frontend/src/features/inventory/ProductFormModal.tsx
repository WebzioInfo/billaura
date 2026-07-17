import React, { useState, useEffect } from 'react';
import { X, Plus, Package, Tag, Hash, RefreshCw, IndianRupee, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import notification from '@/services/NotificationService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAsyncForm } from '../../hooks/useAsyncForm';
import { handleApiFormError } from '../../utils/error-handler';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { AutoGenerateInput } from '../../components/ui/AutoGenerateInput';
import { FormErrorDisplay } from '../../components/ui/FormErrorDisplay';
import { Controller } from 'react-hook-form';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

const productSchema = z.object({
  name: z.string().min(1, 'Item Name is required'),
  sku: z.string().optional(),
  alias: z.string().optional(),
  hsnCode: z.string().optional(),
  eInvoiceHsn: z.string().optional(),
  barcode: z.string().optional(),
  itemType: z.string().default('FINISHED_GOOD'),
  category: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().min(1, 'Unit of Measure is required'),
  taxGroupId: z.string().optional(),
  scheduleNo: z.string().optional(),
  weight: z.coerce.number().optional(),
  weightType: z.string().default('kg'),
  taxRate: z.coerce.number().optional(),
  gstRate: z.coerce.number().optional(),
  taxCategory: z.string().default('TAXABLE'),
  isExempt: z.boolean().default(false),
  isNilRated: z.boolean().default(false),
  isNonGst: z.boolean().default(false),
  purchasePrice: z.coerce.number().min(0, 'Purchase Price cannot be negative'),
  sellingPrice: z.coerce.number().min(0, 'Selling Price cannot be negative'),
  minStock: z.coerce.number().optional(),
  maxStock: z.coerce.number().optional(),
  reorderLevel: z.coerce.number().optional(),
  pluNo: z.string().optional(),
  valuationMethod: z.string().default('AVERAGE'),
  salesAccountId: z.string().optional(),
  purchaseAccountId: z.string().optional(),
  inventoryAccountId: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  product?: any;
}

export default function ProductFormModal({ onClose, onSuccess, product }: ProductFormModalProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);

  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<unknown[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/inventory/categories').then(res => res.data || []),
  });

  const { data: brands = [] } = useQuery<unknown[]>({
    queryKey: ['brands'],
    queryFn: () => api.get('/inventory/brands').then(res => res.data || []),
  });

  const { data: units = [] } = useQuery<unknown[]>({
    queryKey: ['units'],
    queryFn: () => api.get('/units').then(res => res.data || []),
  });

  const { data: taxGroupsData = [] } = useQuery<any[]>({
    queryKey: ['tax-groups'],
    queryFn: () => api.get('/tax-groups').then(res => res.data || []),
  });

  const form = useAsyncForm<ProductFormValues>(
    {
      resolver: zodResolver(productSchema) as any,
      defaultValues: {
        name: '',
        sku: '',
        alias: '',
        hsnCode: '',
        eInvoiceHsn: '',
        barcode: '',
        itemType: 'FINISHED_GOOD',
        category: '',
        brand: '',
        unit: 'PCS',
        taxGroupId: '',
        scheduleNo: '',
        weight: 0,
        weightType: 'kg',
        taxRate: 0,
        gstRate: 0,
        taxCategory: 'TAXABLE',
        isExempt: false,
        isNilRated: false,
        isNonGst: false,
        purchasePrice: 0,
        sellingPrice: 0,
        minStock: 0,
        maxStock: 0,
        reorderLevel: 0,
        pluNo: '',
        valuationMethod: 'AVERAGE',
        isActive: true,
      }
    },
    product,
    (data: any) => ({
      ...data
    })
  );

  const { register, handleFormSubmit, setValue, setError, formState: { errors }, watch, control } = form;

  const watchedTaxGroupId = watch('taxGroupId');

  useEffect(() => {
    if (watchedTaxGroupId && taxGroupsData.length > 0) {
      const selectedTaxGroup = taxGroupsData.find(t => t.id === watchedTaxGroupId);
      if (selectedTaxGroup && setValue) {
        setValue('gstRate', selectedTaxGroup.totalRate, { shouldValidate: true, shouldDirty: true });
        setValue('taxRate', selectedTaxGroup.totalRate, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedTaxGroupId, taxGroupsData, setValue]);

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstError = Object.keys(errors)[0];
      const generalFields = ['name', 'sku', 'alias', 'barcode', 'itemType', 'category', 'brand', 'unit'];
      const inventoryFields = ['minStock', 'maxStock', 'reorderLevel', 'valuationMethod', 'salesAccountId', 'purchaseAccountId', 'inventoryAccountId'];
      const ratesFields = ['sellingPrice', 'purchasePrice'];
      const complianceFields = ['hsnCode', 'eInvoiceHsn', 'taxGroupId', 'gstRate', 'taxCategory'];

      if (generalFields.includes(firstError)) setActiveTab('general');
      else if (inventoryFields.includes(firstError)) setActiveTab('inventory');
      else if (ratesFields.includes(firstError)) setActiveTab('rates');
      else if (complianceFields.includes(firstError)) setActiveTab('compliance');
    }
  }, [errors]);

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
      };

      if (product?.id) {
        await api.put(`/products/${product.id}`, payload);
        notification.success('Product updated successfully');
      } else {
        await api.post('/products', payload);
        notification.success('Product created successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onSuccess();
      onClose();
    } catch (err: any) {
      handleApiFormError(err, setError as any);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-foreground">
        <div className="flex justify-between items-center p-6 border-b border-border bg-background bg-opacity-35">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {product ? 'Edit Master Product' : 'New Master Product'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Configure inventory, pricing, and accounting mappings.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-border px-6 mt-4 gap-6">
          {['general', 'inventory', 'rates', 'compliance'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-semibold capitalize transition-colors border-b-2 cursor-pointer ${
                activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="productForm" onSubmit={handleFormSubmit(onSubmit)} noValidate className="space-y-8">
            
            <div className={activeTab === 'general' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Input label="Item Name" required {...register('name')} error={errors.name?.message as string} placeholder="e.g. Potassium" />
                  <Input label="Alias / Print Name" {...register('alias')} error={errors.alias?.message as string} placeholder="Alias name" />
                  <div className="grid grid-cols-2 gap-4">
                    <AutoGenerateInput 
                      label="Item Code (SKU)" 
                      documentType="SKU"
                      onGenerate={(code) => setValue('sku', code, { shouldValidate: true })}
                      {...register('sku')} 
                      error={errors.sku?.message as string} 
                      placeholder="e.g. 0001" 
                    />
                    <Input label="Barcode / PLU" {...register('barcode')} error={errors.barcode?.message as string} placeholder="Scan barcode..." />
                  </div>
                  <Select label="Item Type" {...register('itemType')} error={errors.itemType?.message as string} options={[
                    { label: 'Inventory Item (Finished Good)', value: 'FINISHED_GOOD' },
                    { label: 'Raw Material', value: 'RAW_MATERIAL' },
                    { label: 'Service (Non-Inventory)', value: 'SERVICE' },
                  ]} />
                </div>
                
                <div className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-border">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Tag className="w-4 h-4 text-accent" /> Classification</h3>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <SearchableSelect
                        label="Category (Item Group)"
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        error={errors.category?.message as string}
                        options={categories}
                        mapOption={(c) => ({ label: c.name, value: c.id })}
                        placeholder="Select Category..."
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="brand"
                    render={({ field }) => (
                      <SearchableSelect
                        label="Brand"
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        error={errors.brand?.message as string}
                        options={brands}
                        mapOption={(b) => ({ label: b.name, value: b.id })}
                        placeholder="Select Brand..."
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="unit"
                    render={({ field }) => (
                      <SearchableSelect
                        label="Unit of Measure"
                        required
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        error={errors.unit?.message as string}
                        options={units}
                        mapOption={(u) => ({ label: `${u.name} (${u.abbreviation})`, value: u.id })}
                        placeholder="Select Unit..."
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            <div className={activeTab === 'inventory' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-emerald-500" /> Stock Control</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input type="number" step="0.01" label="Min Stock" {...register('minStock')} error={errors.minStock?.message as string} />
                    <Input type="number" step="0.01" label="Max Stock" {...register('maxStock')} error={errors.maxStock?.message as string} />
                  </div>
                  <Input type="number" step="0.01" label="Reorder Level (Qty)" {...register('reorderLevel')} error={errors.reorderLevel?.message as string} />
                  <Select label="Valuation Method" {...register('valuationMethod')} error={errors.valuationMethod?.message as string} options={[
                    { label: 'Average Cost', value: 'AVERAGE' },
                    { label: 'First In, First Out (FIFO)', value: 'FIFO' },
                  ]} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Hash className="w-4 h-4 text-purple-500" /> Accounting Integration</h3>
                  <Controller
                    control={control}
                    name="salesAccountId"
                    render={({ field }) => (
                      <SearchableSelect
                        label="Sales Account"
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        error={errors.salesAccountId?.message as string}
                        options={[]}
                        mapOption={() => ({ label: '', value: '' })}
                        placeholder="Default (Sales Income)"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="purchaseAccountId"
                    render={({ field }) => (
                      <SearchableSelect
                        label="Purchase Account"
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        error={errors.purchaseAccountId?.message as string}
                        options={[]}
                        mapOption={() => ({ label: '', value: '' })}
                        placeholder="Default (Cost of Goods Sold)"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="inventoryAccountId"
                    render={({ field }) => (
                      <SearchableSelect
                        label="Inventory Asset Account"
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        error={errors.inventoryAccountId?.message as string}
                        options={[]}
                        mapOption={() => ({ label: '', value: '' })}
                        placeholder="Default (Inventory Asset)"
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            <div className={activeTab === 'rates' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-green-500" /> Pricing</h3>
                  <Input type="number" step="0.01" label="Sales Rate / Selling Price" {...register('sellingPrice')} error={errors.sellingPrice?.message as string} />
                  <Input type="number" step="0.01" label="Purchase Rate / Cost Price" {...register('purchasePrice')} error={errors.purchasePrice?.message as string} />
                </div>
              </div>
            </div>

            <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500" /> Tax & Compliance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="HSN / SAC Code" {...register('hsnCode')} error={errors.hsnCode?.message as string} />
                    <Input label="E-Invoice HSN" {...register('eInvoiceHsn')} error={errors.eInvoiceHsn?.message as string} />
                  </div>
                  <Controller
                    control={control}
                    name="taxGroupId"
                    render={({ field }) => (
                      <SearchableSelect
                        label="Tax Group (%)"
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val)}
                        error={errors.taxGroupId?.message as string}
                        options={taxGroupsData}
                        mapOption={(t) => ({ label: `${t.name} (${t.totalRate}%)`, value: t.id })}
                        placeholder="Select Tax Group..."
                      />
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input 
                        type="number" 
                        step="0.01" 
                        label="GST Rate (%)" 
                        {...register('gstRate')} 
                        readOnly 
                        className="bg-muted cursor-not-allowed opacity-70"
                        error={errors.gstRate?.message as string} 
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Automatically derived from Tax Group</p>
                    </div>
                    <Select label="Tax Preference" {...register('taxCategory')} error={errors.taxCategory?.message as string} options={[
                      { label: 'Taxable', value: 'TAXABLE' },
                      { label: 'Non-Taxable', value: 'NON_TAXABLE' },
                      { label: 'Nil Rated', value: 'NIL_RATED' }
                    ]} />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-border bg-muted/10 flex justify-between items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('isActive')} className="w-4 h-4 text-accent border-border rounded focus:ring-accent" />
            <span className="text-sm font-semibold text-foreground">Active Item</span>
          </label>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors cursor-pointer">
              Cancel
            </button>
            <button form="productForm" type="submit" disabled={isLoading} className="px-6 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 flex items-center gap-2 cursor-pointer disabled:opacity-50">
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {product ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
