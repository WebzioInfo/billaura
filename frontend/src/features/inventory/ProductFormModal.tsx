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
import { isValidHsnOrSac } from '../../shared/utils/business-rules';

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
  scheduleNo: z.string().optional(),
  weight: z.coerce.number().optional(),
  weightType: z.string().default('kg'),
  gstRate: z.coerce.number().optional(),
  taxPreference: z.string().default('TAXABLE'),
  purchasePrice: z.coerce.number().optional().default(0),
  sellingPrice: z.coerce.number().optional().default(0),
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
  if (!data.categoryId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Category is required',
      path: ['categoryId'],
    });
  }

  if (!data.unit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please select a valid Base Unit',
      path: ['unit'],
    });
  }

  if (data.isSellable && (data.sellingPrice === undefined || data.sellingPrice < 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selling Price is required',
      path: ['sellingPrice'],
    });
  }

  if (data.isPurchasable && (data.purchasePrice === undefined || data.purchasePrice < 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Purchase Price is required',
      path: ['purchasePrice'],
    });
  }

  if (data.isTaxable && data.taxPreference === 'TAXABLE') {
    if (data.hsnCode && !isValidHsnOrSac(data.hsnCode, data.isService)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: data.isService ? 'Invalid SAC Code format (e.g. 998311)' : 'Invalid HSN Code format (e.g. 847130)',
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



  const form = useAsyncForm<ProductFormValues>(
    {
      resolver: zodResolver(productSchema) as any,
      defaultValues: {
        name: product?.name || '',
        sku: product?.sku || '',
        alias: product?.alias || '',
        hsnCode: product?.hsnCode || '',
        eInvoiceHsn: product?.eInvoiceHsn || '',
        barcode: product?.barcode || '',
        itemType: product?.itemType || 'FINISHED_GOOD',
        categoryId: product?.categoryId || product?.category?.id || '',
        brandId: product?.brandId || product?.brand?.id || '',
        unit: product?.unit || 'PCS',
        scheduleNo: product?.scheduleNo || '',
        weight: product?.weight != null ? Number(product.weight) : 0,
        weightType: product?.weightType || 'kg',
        gstRate: product?.gstRate != null ? Number(product.gstRate) : 0,
        taxPreference: product?.taxPreference || 'TAXABLE',
        purchasePrice: product?.purchasePrice != null ? Number(product.purchasePrice) : 0,
        sellingPrice: product?.sellingPrice != null ? Number(product.sellingPrice) : 0,
        minStock: product?.minStock != null ? Number(product.minStock) : 0,
        maxStock: product?.maxStock != null ? Number(product.maxStock) : 0,
        reorderLevel: product?.reorderLevel != null ? Number(product.reorderLevel) : 0,
        pluNo: product?.pluNo || '',
        valuationMethod: product?.valuationMethod || 'AVERAGE',
        salesAccountId: product?.salesAccountId || '',
        purchaseAccountId: product?.purchaseAccountId || '',
        inventoryAccountId: product?.inventoryAccountId || '',
        isPurchasable: product?.isPurchasable ?? true,
        isSellable: product?.isSellable ?? true,
        isInventoryItem: product?.isInventoryItem ?? true,
        isTaxable: product?.isTaxable ?? true,
        isTrackStock: product?.isTrackStock ?? true,
        isTrackBatch: Boolean(product?.isTrackBatch),
        isTrackSerial: Boolean(product?.isTrackSerial),
        isManufactured: Boolean(product?.isManufactured),
        isService: Boolean(product?.isService),
        isDigital: Boolean(product?.isDigital),
        isAsset: Boolean(product?.isAsset),
        isExpense: Boolean(product?.isExpense),
        isActive: product?.isActive ?? true,
      }
    },
    product,
    (data: any) => ({
      name: data?.name || '',
      sku: data?.sku || '',
      alias: data?.alias || '',
      hsnCode: data?.hsnCode || '',
      eInvoiceHsn: data?.eInvoiceHsn || '',
      barcode: data?.barcode || '',
      itemType: data?.itemType || 'FINISHED_GOOD',
      categoryId: data?.categoryId || data?.category?.id || '',
      brandId: data?.brandId || data?.brand?.id || '',
      unit: data?.unit || 'PCS',
      scheduleNo: data?.scheduleNo || '',
      weight: data?.weight != null ? Number(data.weight) : 0,
      weightType: data?.weightType || 'kg',
      gstRate: data?.gstRate != null ? Number(data.gstRate) : 0,
      taxPreference: data?.taxPreference || 'TAXABLE',
      purchasePrice: data?.purchasePrice != null ? Number(data.purchasePrice) : 0,
      sellingPrice: data?.sellingPrice != null ? Number(data.sellingPrice) : 0,
      minStock: data?.minStock != null ? Number(data.minStock) : 0,
      maxStock: data?.maxStock != null ? Number(data.maxStock) : 0,
      reorderLevel: data?.reorderLevel != null ? Number(data.reorderLevel) : 0,
      pluNo: data?.pluNo || '',
      valuationMethod: data?.valuationMethod || 'AVERAGE',
      salesAccountId: data?.salesAccountId || '',
      purchaseAccountId: data?.purchaseAccountId || '',
      inventoryAccountId: data?.inventoryAccountId || '',
      isPurchasable: data?.isPurchasable ?? true,
      isSellable: data?.isSellable ?? true,
      isInventoryItem: data?.isInventoryItem ?? true,
      isTaxable: data?.isTaxable ?? true,
      isTrackStock: data?.isTrackStock ?? true,
      isTrackBatch: Boolean(data?.isTrackBatch),
      isTrackSerial: Boolean(data?.isTrackSerial),
      isManufactured: Boolean(data?.isManufactured),
      isService: Boolean(data?.isService),
      isDigital: Boolean(data?.isDigital),
      isAsset: Boolean(data?.isAsset),
      isExpense: Boolean(data?.isExpense),
      isActive: data?.isActive ?? true,
    })
  );

  const { register, handleFormSubmit, setValue, setError, formState: { errors }, watch, control } = form;

  const isPurchasable = watch('isPurchasable');
  const isSellable = watch('isSellable');
  const isInventoryItem = watch('isInventoryItem');
  const isTrackStock = watch('isTrackStock');
  const isTaxable = watch('isTaxable');
  const isService = watch('isService');
  const itemType = watch('itemType');
  const taxPreference = watch('taxPreference');

  const purchasePrice = watch('purchasePrice') || 0;
  const sellingPrice = watch('sellingPrice') || 0;

  useEffect(() => {
    if (!isTaxable) {
      setValue('hsnCode', '', { shouldValidate: true, shouldDirty: true });
      setValue('eInvoiceHsn', '', { shouldValidate: true, shouldDirty: true });
      setValue('gstRate', 0, { shouldValidate: true, shouldDirty: true });
      setValue('taxPreference', 'NON_GST', { shouldValidate: true, shouldDirty: true });
    }
  }, [isTaxable, setValue]);

  useEffect(() => {
    if (taxPreference === 'EXEMPT' || taxPreference === 'NIL_RATED' || taxPreference === 'NON_GST') {
      setValue('gstRate', 0, { shouldValidate: true, shouldDirty: true });
    }
  }, [taxPreference, setValue]);

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
      const generalFields = ['name', 'sku', 'alias', 'barcode', 'itemType', 'categoryId', 'brandId', 'unit'];
      const inventoryFields = ['minStock', 'maxStock', 'reorderLevel', 'valuationMethod', 'salesAccountId', 'purchaseAccountId', 'inventoryAccountId'];
      const ratesFields = ['sellingPrice', 'purchasePrice'];
      const complianceFields = ['hsnCode', 'eInvoiceHsn', 'gstRate', 'taxPreference'];

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
        await api.patch(`/products/${product.id}`, payload);
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

        <form id="productForm" onSubmit={handleFormSubmit(onSubmit)} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
            
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
                            mapOption={(u: any) => {
                              const symbol = u.abbreviation || u.symbol || u.code || u.id;
                              const label = symbol && symbol !== u.name ? `${u.name} (${symbol})` : u.name;
                              return {
                                label: u.category ? `[${u.category}] ${label}` : label,
                                value: u.code || u.id || u.name,
                              };
                            }}
                            placeholder="Select Unit..."
                          />
                        )}
                      />
                    </div>
                  </div>

                  {/* Configuration Section */}
                  <div className="bg-muted/30 p-5 rounded-2xl border border-border space-y-3">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-500" /> Configuration
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex flex-col p-3 bg-card hover:bg-muted/50 border border-border rounded-xl cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!isPurchasable}
                            onChange={(e) => setValue('isPurchasable', e.target.checked)}
                            className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                          />
                          <span className="text-xs font-bold text-foreground">Purchasable</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 ml-6">
                          This product can be purchased from suppliers.
                        </span>
                      </label>

                      <label className="flex flex-col p-3 bg-card hover:bg-muted/50 border border-border rounded-xl cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!isSellable}
                            onChange={(e) => setValue('isSellable', e.target.checked)}
                            className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                          />
                          <span className="text-xs font-bold text-foreground">Sellable</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 ml-6">
                          This product can be sold to customers.
                        </span>
                      </label>

                      <label className="flex flex-col p-3 bg-card hover:bg-muted/50 border border-border rounded-xl cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!isInventoryItem}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setValue('isInventoryItem', checked);
                              if (!checked) {
                                setValue('isTrackStock', false);
                              }
                            }}
                            disabled={isService}
                            className="w-4 h-4 text-accent border-border rounded focus:ring-accent disabled:opacity-50"
                          />
                          <span className="text-xs font-bold text-foreground">Inventory Item</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 ml-6">
                          This product is physically stocked.
                        </span>
                      </label>

                      <label className={`flex flex-col p-3 bg-card hover:bg-muted/50 border border-border rounded-xl cursor-pointer transition-all ${!isInventoryItem ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!isTrackStock && !!isInventoryItem}
                            disabled={!isInventoryItem}
                            onChange={(e) => setValue('isTrackStock', e.target.checked)}
                            className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                          />
                          <span className="text-xs font-bold text-foreground">Track Stock</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 ml-6">
                          Maintain inventory quantity and valuation.
                        </span>
                      </label>

                      <label className="flex flex-col p-3 bg-card hover:bg-muted/50 border border-border rounded-xl cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!isTaxable}
                            onChange={(e) => setValue('isTaxable', e.target.checked)}
                            className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                          />
                          <span className="text-xs font-bold text-foreground">Taxable</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 ml-6">
                          GST / VAT applies to this item.
                        </span>
                      </label>

                      <label className="flex flex-col p-3 bg-card hover:bg-muted/50 border border-border rounded-xl cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!isService}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setValue('isService', checked);
                              if (checked) {
                                setValue('isInventoryItem', false);
                                setValue('isTrackStock', false);
                              }
                            }}
                            className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                          />
                          <span className="text-xs font-bold text-foreground">Service / Non-Stock</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 ml-6">
                          Non-stock service item (Testing, Consulting, Course).
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Tab */}
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

            {/* Rates & Pricing Engine Tab */}
            <div className={activeTab === 'rates' ? 'block' : 'hidden'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Dynamic Pricing Inputs based on Item Type & Configuration */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-green-500" /> 
                    {isService || itemType === 'SERVICE'
                      ? 'Service Pricing'
                      : itemType === 'WATER_TESTING'
                      ? 'Water Testing Charges'
                      : itemType === 'COURSE'
                      ? 'Course Fee Structure'
                      : itemType === 'DIGITAL'
                      ? 'Digital License Pricing'
                      : !isSellable && isPurchasable
                      ? 'Purchase & Supplier Costing'
                      : 'Product Pricing'}
                  </h3>

                  {/* Physical Trading Product / General Product */}
                  {(!isService && itemType !== 'SERVICE' && itemType !== 'WATER_TESTING' && itemType !== 'COURSE' && itemType !== 'DIGITAL') && (
                    <>
                      {isPurchasable && (
                        <Input
                          type="number"
                          step="0.01"
                          label="Purchase Rate / Cost Price (₹)"
                          {...register('purchasePrice')}
                          error={errors.purchasePrice?.message as string}
                        />
                      )}
                      {isSellable && (
                        <Input
                          type="number"
                          step="0.01"
                          label="Sales Rate / Selling Price (₹)"
                          {...register('sellingPrice')}
                          error={errors.sellingPrice?.message as string}
                        />
                      )}
                    </>
                  )}

                  {/* Service Item */}
                  {(isService || itemType === 'SERVICE') && (
                    <>
                      <Input
                        type="number"
                        step="0.01"
                        label="Service Fee / Rate (₹)"
                        {...register('sellingPrice')}
                        error={errors.sellingPrice?.message as string}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        label="Estimated Operational Cost (₹)"
                        {...register('purchasePrice')}
                        error={errors.purchasePrice?.message as string}
                      />
                    </>
                  )}

                  {/* Water Testing */}
                  {itemType === 'WATER_TESTING' && (
                    <>
                      <Input
                        type="number"
                        step="0.01"
                        label="Water Sample Test Charge (₹)"
                        {...register('sellingPrice')}
                        error={errors.sellingPrice?.message as string}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        label="Lab Processing Cost (₹)"
                        {...register('purchasePrice')}
                        error={errors.purchasePrice?.message as string}
                      />
                    </>
                  )}

                  {/* Course / Education */}
                  {itemType === 'COURSE' && (
                    <>
                      <Input
                        type="number"
                        step="0.01"
                        label="Course Fee / Tuition Fee (₹)"
                        {...register('sellingPrice')}
                        error={errors.sellingPrice?.message as string}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        label="Instructor & Material Cost (₹)"
                        {...register('purchasePrice')}
                        error={errors.purchasePrice?.message as string}
                      />
                    </>
                  )}

                  {/* Digital Product */}
                  {itemType === 'DIGITAL' && (
                    <>
                      <Input
                        type="number"
                        step="0.01"
                        label="License / Subscription Price (₹)"
                        {...register('sellingPrice')}
                        error={errors.sellingPrice?.message as string}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        label="Hosting / Licensing Cost (₹)"
                        {...register('purchasePrice')}
                        error={errors.purchasePrice?.message as string}
                      />
                    </>
                  )}
                </div>
                
                {/* Live Margin & Profitability Display */}
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
                  <div className="grid grid-cols-2 gap-4">
                    <Select 
                      label="GST Rate (%)" 
                      {...register('gstRate')} 
                      error={errors.gstRate?.message as string} 
                      disabled={taxPreference === 'EXEMPT' || taxPreference === 'NIL_RATED' || taxPreference === 'NON_GST'}
                      options={[
                        { label: '0%', value: 0 },
                        { label: '3%', value: 3 },
                        { label: '5%', value: 5 },
                        { label: '12%', value: 12 },
                        { label: '18%', value: 18 },
                        { label: '28%', value: 28 },
                      ]} 
                    />
                    <Select label="Tax Preference" {...register('taxPreference')} error={errors.taxPreference?.message as string} options={[
                      { label: 'Taxable', value: 'TAXABLE' },
                      { label: 'Exempt', value: 'EXEMPT' },
                      { label: 'Nil Rated', value: 'NIL_RATED' },
                      { label: 'Non GST', value: 'NON_GST' }
                    ]} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/10 flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('isActive')} className="w-4 h-4 text-accent border-border rounded focus:ring-accent" />
              <span className="text-sm font-semibold text-foreground">Active Item</span>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="px-6 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 flex items-center gap-2 cursor-pointer disabled:opacity-50">
                {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                {product ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </form>
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
