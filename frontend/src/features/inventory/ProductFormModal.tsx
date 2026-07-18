import React, { useState, useEffect } from 'react';
import { X, Plus, Package, Tag, Hash, RefreshCw, IndianRupee, ShieldCheck } from 'lucide-react';
import { apiClient as api } from '../../core/api/apiClient';
import notification from '@/core/services/NotificationService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAsyncForm } from '../../shared/hooks/useAsyncForm';
import { handleApiFormError } from '../../shared/utils/error-handler';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../../shared/components/ui/Input';
import { Select } from '../../shared/components/ui/Select';
import { AutoGenerateInput } from '../../shared/components/ui/AutoGenerateInput';
import { FormErrorDisplay } from '../../shared/components/ui/FormErrorDisplay';
import { Controller } from 'react-hook-form';
import { SearchableSelect } from '../../shared/components/ui/SearchableSelect';
import { SearchableMasterDropdown } from '../../shared/components/ui/SearchableMasterDropdown';
import { CategoryFormModal } from '../../shared/components/ui/CategoryFormModal';
import { BrandFormModal } from './BrandFormModal';

const PRODUCT_TYPE_CONFIG: Record<string, any> = {
  INVENTORY: { isInventoryItem: true, isService: false, isAsset: false, isExpense: false, isDigital: false, isTrackStock: true, isPurchasable: true, isSellable: true },
  NON_INVENTORY: { isInventoryItem: false, isService: false, isAsset: false, isExpense: false, isDigital: false, isTrackStock: false, isPurchasable: true, isSellable: true },
  SERVICE: { isInventoryItem: false, isService: true, isAsset: false, isExpense: false, isDigital: false, isTrackStock: false, isPurchasable: true, isSellable: true },
  RAW_MATERIAL: { isInventoryItem: true, isService: false, isAsset: false, isExpense: false, isDigital: false, isTrackStock: true, isPurchasable: true, isSellable: false },
  FINISHED_GOOD: { isInventoryItem: true, isService: false, isAsset: false, isExpense: false, isDigital: false, isTrackStock: true, isPurchasable: false, isSellable: true },
  ASSET: { isInventoryItem: true, isService: false, isAsset: true, isExpense: false, isDigital: false, isTrackStock: true, isPurchasable: true, isSellable: false },
  EXPENSE: { isInventoryItem: false, isService: false, isAsset: false, isExpense: true, isDigital: false, isTrackStock: false, isPurchasable: true, isSellable: false },
  DIGITAL: { isInventoryItem: false, isService: false, isAsset: false, isExpense: false, isDigital: true, isTrackStock: false, isPurchasable: false, isSellable: true },
};
const productSchema = z.object({
  name: z.string().min(1, 'Item Name is required'),
  sku: z.string().optional(),
  alias: z.string().optional(),
  hsnCode: z.string().optional(),
  eInvoiceHsn: z.string().optional(),
  barcode: z.string().optional(),
  itemType: z.string().default('FINISHED_GOOD'),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
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
  isPurchasable: z.boolean().default(true),
  isSellable: z.boolean().default(true),
  isInventoryItem: z.boolean().default(true),
  isTaxable: z.boolean().default(true),
  isTrackStock: z.boolean().default(true),
  isTrackBatch: z.boolean().default(false),
  isTrackSerial: z.boolean().default(false),
  isManufactured: z.boolean().default(false),
  isService: z.boolean().default(false),
  isDigital: z.boolean().default(false),
  isAsset: z.boolean().default(false),
  isExpense: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.isTaxable) {
    if (!data.taxGroupId && (!data.gstRate || data.gstRate === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tax Group is required for taxable items',
        path: ['taxGroupId'],
      });
    }
    if (!data.hsnCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: data.isService ? 'SAC Code is required' : 'HSN Code is required',
        path: ['hsnCode'],
      });
    }
  }
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

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
        itemType: product?.itemType || 'FINISHED_GOOD',
        categoryId: product?.categoryId || product?.category?.id || '',
        brandId: product?.brandId || product?.brand?.id || '',
        unit: product?.unit || 'PCS',
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
        isPurchasable: product?.isPurchasable ?? true,
        isSellable: product?.isSellable ?? true,
        isInventoryItem: product?.isInventoryItem ?? true,
        isTaxable: product?.isTaxable ?? true,
        isTrackStock: product?.isTrackStock ?? true,
        isTrackBatch: product?.isTrackBatch ?? false,
        isTrackSerial: product?.isTrackSerial ?? false,
        isManufactured: product?.isManufactured ?? false,
        isService: product?.isService ?? false,
        isDigital: product?.isDigital ?? false,
        isAsset: product?.isAsset ?? false,
        isExpense: product?.isExpense ?? false,
        isActive: product?.isActive ?? true,
      }
    },
    product,
    (data: any) => ({
      ...data
    })
  );

  const { register, handleFormSubmit, setValue, setError, formState: { errors }, watch, control } = form;

  const watchedTaxGroupId = watch('taxGroupId');
  const isInventoryItem = watch('isInventoryItem');
  const isTaxable = watch('isTaxable');
  const isService = watch('isService');

  const purchasePrice = watch('purchasePrice') || 0;
  const sellingPrice = watch('sellingPrice') || 0;

  useEffect(() => {
    if (watchedTaxGroupId && taxGroupsData.length > 0) {
      const selectedTaxGroup = taxGroupsData.find(t => t.id === watchedTaxGroupId);
      if (selectedTaxGroup && setValue) {
        setValue('gstRate', selectedTaxGroup.totalRate, { shouldValidate: true, shouldDirty: true });
        setValue('taxRate', selectedTaxGroup.totalRate, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedTaxGroupId, taxGroupsData, setValue]);

  const handleItemTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue('itemType', val);
    
    const config = PRODUCT_TYPE_CONFIG[val];
    if (config) {
      Object.entries(config).forEach(([key, value]) => {
        setValue(key as any, value);
      });
    }
  };

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstError = Object.keys(errors)[0];
      const generalFields = ['name', 'sku', 'alias', 'barcode', 'itemType', 'category', 'brand', 'unit'];
      const inventoryFields = ['minStock', 'maxStock', 'reorderLevel', 'valuationMethod', 'salesAccountId', 'purchaseAccountId', 'inventoryAccountId'];
      const ratesFields = ['sellingPrice', 'purchasePrice'];
      const complianceFields = ['hsnCode', 'eInvoiceHsn', 'taxGroupId', 'gstRate', 'taxCategory'];

      if (generalFields.includes(firstError)) setActiveTab('general');
      else if (inventoryFields.includes(firstError) && isInventoryItem) setActiveTab('inventory');
      else if (ratesFields.includes(firstError)) setActiveTab('rates');
      else if (complianceFields.includes(firstError) && isTaxable) setActiveTab('compliance');
    }
  }, [errors, isInventoryItem, isTaxable]);

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
          {['general', 'inventory', 'rates', 'compliance']
            .filter(tab => {
              if (tab === 'inventory' && !isInventoryItem) return false;
              if (tab === 'compliance' && !isTaxable) return false;
              return true;
            })
            .map((tab) => (
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
                  <Select label="Item Type" {...register('itemType')} onChange={handleItemTypeChange} error={errors.itemType?.message as string} options={[
                    { label: 'Inventory Product', value: 'INVENTORY' },
                    { label: 'Non-Inventory Product', value: 'NON_INVENTORY' },
                    { label: 'Service', value: 'SERVICE' },
                    { label: 'Raw Material', value: 'RAW_MATERIAL' },
                    { label: 'Finished Good', value: 'FINISHED_GOOD' },
                    { label: 'Asset', value: 'ASSET' },
                    { label: 'Expense Item', value: 'EXPENSE' },
                    { label: 'Digital Product', value: 'DIGITAL' },
                  ]} />
                </div>
                
                <div className="space-y-4">
                  <div className="bg-muted/30 p-5 rounded-2xl border border-border">
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Tag className="w-4 h-4 text-accent" /> Classification</h3>
                    <Controller
                      control={control}
                      name="categoryId"
                      render={({ field }) => (
                        <SearchableMasterDropdown
                          label="Category (Item Group)"
                          value={field.value || ''}
                          onChange={(val) => field.onChange(val)}
                          error={errors.categoryId?.message as string}
                          apiPath="/inventory/categories"
                          queryKeyPrefix="product_categories"
                          mapOption={(c: any) => ({ label: c.categoryName || c.name, value: c.id })}
                          placeholder="Select Category..."
                          onCreateNew={() => setIsCategoryModalOpen(true)}
                          createNewText="Create New Category"
                        />
                      )}
                    />
                    <div className="mt-4">
                      <Controller
                        control={control}
                        name="brandId"
                        render={({ field }) => (
                          <SearchableMasterDropdown
                            label="Brand"
                            value={field.value || ''}
                            onChange={(val) => field.onChange(val)}
                            error={errors.brandId?.message as string}
                            apiPath="/inventory/brands"
                            queryKeyPrefix="brands"
                            mapOption={(b: any) => ({ label: b.brandName || b.name, value: b.id })}
                            placeholder="Select Brand..."
                            onCreateNew={() => setIsBrandModalOpen(true)}
                            createNewText="Create New Brand"
                          />
                        )}
                      />
                    </div>
                    <div className="mt-4">
                      <Controller
                        control={control}
                        name="unit"
                        render={({ field }) => (
                          <SearchableSelect
                            label="Base Unit"
                            value={field.value || 'PCS'}
                            onChange={(val) => field.onChange(val)}
                            error={errors.unit?.message as string}
                            options={units}
                            mapOption={(u) => ({ label: `${u.name} (${u.code})`, value: u.code })}
                            placeholder="Select Unit..."
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="bg-muted/30 p-5 rounded-2xl border border-border">
                    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-purple-500" /> Configuration</h3>
                    <div className="grid grid-cols-2 gap-3 opacity-70 pointer-events-none">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={watch('isPurchasable')} readOnly className="w-4 h-4 text-accent border-border rounded focus:ring-accent" /> Purchasable
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={watch('isSellable')} readOnly className="w-4 h-4 text-accent border-border rounded focus:ring-accent" /> Sellable
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={watch('isInventoryItem')} readOnly className="w-4 h-4 text-accent border-border rounded focus:ring-accent" /> Inventory Item
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" {...register('isTaxable')} className="w-4 h-4 text-accent border-border rounded focus:ring-accent pointer-events-auto" /> Taxable
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={watch('isTrackStock')} readOnly className="w-4 h-4 text-accent border-border rounded focus:ring-accent" /> Track Stock
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={watch('isService')} readOnly className="w-4 h-4 text-accent border-border rounded focus:ring-accent" /> Service
                      </label>
                    </div>
                  </div>
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
                  <Input type="number" step="0.01" label="Purchase Rate / Cost Price" {...register('purchasePrice')} error={errors.purchasePrice?.message as string} />
                  <Input type="number" step="0.01" label="Sales Rate / Selling Price" {...register('sellingPrice')} error={errors.sellingPrice?.message as string} />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">Margin & Profitability</h3>
                  <div className="bg-muted/30 p-6 rounded-2xl border border-border grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Gross Profit</p>
                      <p className={`text-2xl font-black mt-1 ${sellingPrice - purchasePrice >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ₹{(sellingPrice - purchasePrice).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Margin %</p>
                      <p className={`text-2xl font-black mt-1 ${sellingPrice > 0 ? (sellingPrice - purchasePrice) / sellingPrice * 100 >= 0 ? 'text-green-500' : 'text-red-500' : 'text-foreground'}`}>
                        {sellingPrice > 0 ? ((sellingPrice - purchasePrice) / sellingPrice * 100).toFixed(2) : '0.00'}%
                      </p>
                    </div>
                    <div className="col-span-2 mt-2 pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Markup %</p>
                      <p className="text-lg font-bold mt-1 text-foreground">
                        {purchasePrice > 0 ? ((sellingPrice - purchasePrice) / purchasePrice * 100).toFixed(2) : '0.00'}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500" /> Tax & Compliance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label={isService ? "SAC Code" : "HSN Code"} {...register('hsnCode')} error={errors.hsnCode?.message as string} />
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

      <CategoryFormModal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
        onSuccess={(newCat) => {
          setValue('categoryId', newCat.id, { shouldValidate: true });
          setIsCategoryModalOpen(false);
        }} 
      />
      
      <BrandFormModal 
        isOpen={isBrandModalOpen} 
        onClose={() => setIsBrandModalOpen(false)} 
        brand={null}
        // onSuccess is not directly exposed by BrandFormModal, but it invalidates queries.
        // We'll just rely on the user to re-select it if needed, or we can update BrandFormModal to return onSuccess.
      />
    </div>
  );
}
