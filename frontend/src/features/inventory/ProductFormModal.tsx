import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Package, Tag, Hash, RefreshCw, IndianRupee, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAsyncForm } from '../../hooks/useAsyncForm';
import { handleApiFormError } from '../../utils/error-handler';

interface ProductFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  product?: any;
}

export default function ProductFormModal({ onClose, onSuccess, product }: ProductFormModalProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);

  // Custom inline modals state
  const [activeInlineModal, setActiveInlineModal] = useState<'category' | 'brand' | 'unit' | 'taxGroup' | null>(null);

  // Category inline state
  const [categoryName, setCategoryName] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryActive, setCategoryActive] = useState(true);

  // Brand inline state
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [brandWebsite, setBrandWebsite] = useState('');

  // Unit inline state
  const [unitName, setUnitName] = useState('');
  const [unitShort, setUnitShort] = useState('');
  const [unitSymbol, setUnitSymbol] = useState('');
  const [unitPrecision, setUnitPrecision] = useState(2);

  // Tax Group inline state
  const [taxGroupName, setTaxGroupName] = useState('');
  const [taxGroupRate, setTaxGroupRate] = useState(0);

  const queryClient = useQueryClient();

  // Load categories list via TanStack Query
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/inventory/categories').then(res => res.data || []),
  });

  // Load brands list via TanStack Query
  const { data: brands = [] } = useQuery<any[]>({
    queryKey: ['brands'],
    queryFn: () => api.get('/inventory/brands').then(res => res.data || []),
  });

  // Load units list via TanStack Query
  const { data: units = [] } = useQuery<any[]>({
    queryKey: ['units'],
    queryFn: () => api.get('/units').then(res => res.data || []),
  });

  // Load tax groups via TanStack Query
  const { data: taxGroupsData = [] } = useQuery<any[]>({
    queryKey: ['tax-groups'],
    queryFn: () => api.get('/tax-groups').then(res => res.data || []),
  });

  const { register, handleSubmit, setValue, reset, setError, formState: { errors } } = useAsyncForm(
    {
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

  useEffect(() => {
    // Set ESC key listener for accessibility
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeInlineModal) setActiveInlineModal(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInlineModal]);

  const handleInlineCreate = (type: string) => {
    if (type === 'Category') {
      setCategoryName('');
      setCategoryCode('');
      setCategoryDesc('');
      setCategoryActive(true);
      setActiveInlineModal('category');
    } else if (type === 'Brand') {
      setBrandName('');
      setBrandDesc('');
      setBrandWebsite('');
      setActiveInlineModal('brand');
    } else if (type === 'Unit') {
      setUnitName('');
      setUnitShort('');
      setUnitSymbol('');
      setUnitPrecision(2);
      setActiveInlineModal('unit');
    } else if (type === 'Tax Group') {
      setTaxGroupName('');
      setTaxGroupRate(0);
      setActiveInlineModal('taxGroup');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.error('Category Name is required');
      return;
    }
    try {
      const res = await api.post('/inventory/categories', { name: categoryName.trim() });
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      const newId = res.data?.data?.id || res.data?.id;
      if (newId) {
        setValue('category', newId);
      }
      setActiveInlineModal(null);
    } catch (err: any) {
      handleApiFormError(err);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      toast.error('Brand Name is required');
      return;
    }
    try {
      const res = await api.post('/inventory/brands', { name: brandName.trim() });
      toast.success('Brand created successfully');
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      const newId = res.data?.data?.id || res.data?.id;
      if (newId) {
        setValue('brand', newId);
      }
      setActiveInlineModal(null);
    } catch (err: any) {
      handleApiFormError(err);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !unitShort.trim()) {
      toast.error('Unit Name and Short Name are required');
      return;
    }
    try {
      const res = await api.post('/units', {
        name: unitName.trim(),
        abbreviation: unitShort.trim(),
        decimals: Number(unitPrecision),
      });
      toast.success('Unit created successfully');
      queryClient.invalidateQueries({ queryKey: ['units'] });
      const newId = res.data?.data?.id || res.data?.id;
      if (newId) {
        setValue('unit', newId);
      }
      setActiveInlineModal(null);
    } catch (err: any) {
      handleApiFormError(err);
    }
  };

  const handleCreateTaxGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxGroupName.trim()) {
      toast.error('Tax Group Name is required');
      return;
    }
    try {
      const res = await api.post('/tax-groups', { name: taxGroupName.trim(), totalRate: Number(taxGroupRate) });
      toast.success('Tax Group created successfully');
      queryClient.invalidateQueries({ queryKey: ['tax-groups'] });
      const newId = res.data?.data?.id || res.data?.id;
      if (newId) {
        setValue('taxGroupId', newId);
      }
      setActiveInlineModal(null);
    } catch (err: any) {
      handleApiFormError(err);
    }
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        weight: Number(data.weight),
        taxRate: Number(data.taxRate),
        gstRate: Number(data.gstRate),
        purchasePrice: Number(data.purchasePrice),
        sellingPrice: Number(data.sellingPrice),
        minStock: Number(data.minStock),
        maxStock: Number(data.maxStock),
        reorderLevel: Number(data.reorderLevel),
      };

      if (product?.id) {
        await api.put(`/products/${product.id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', payload);
        toast.success('Product created successfully');
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
          <form id="productForm" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Item Name *</label>
                    <input {...register('name')} required className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="e.g. Potassium" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Alias / Print Name</label>
                    <input {...register('alias')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" placeholder="Alias name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Item Code (SKU)</label>
                      <input {...register('sku')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" placeholder="e.g. 0001" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Barcode / PLU</label>
                      <input {...register('barcode')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" placeholder="Scan barcode..." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Item Type</label>
                    <select {...register('itemType')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="FINISHED_GOOD">Inventory Item (Finished Good)</option>
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="SERVICE">Service (Non-Inventory)</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-border">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Tag className="w-4 h-4 text-accent" /> Classification</h3>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category (Item Group)</label>
                      <button type="button" onClick={() => handleInlineCreate('Category')} className="text-xs text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> New</button>
                    </div>
                    <select {...register('category')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="">Select Category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand</label>
                      <button type="button" onClick={() => handleInlineCreate('Brand')} className="text-xs text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> New</button>
                    </div>
                    <select {...register('brand')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="">Select Brand...</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit of Measure</label>
                      <button type="button" onClick={() => handleInlineCreate('Unit')} className="text-xs text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> New</button>
                    </div>
                    <select {...register('unit')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="">Select Unit (e.g. kg)</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-emerald-500" /> Stock Control</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Min Stock</label>
                      <input type="number" step="0.01" {...register('minStock')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Max Stock</label>
                      <input type="number" step="0.01" {...register('maxStock')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Reorder Level (Qty)</label>
                    <input type="number" step="0.01" {...register('reorderLevel')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Valuation Method</label>
                    <select {...register('valuationMethod')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="AVERAGE">Average Cost</option>
                      <option value="FIFO">First In, First Out (FIFO)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Hash className="w-4 h-4 text-purple-500" /> Accounting Integration</h3>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Sales Account</label>
                    <select {...register('salesAccountId')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="">Default (Sales Income)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Purchase Account</label>
                    <select {...register('purchaseAccountId')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="">Default (Cost of Goods Sold)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Inventory Asset Account</label>
                    <select {...register('inventoryAccountId')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="">Default (Inventory Asset)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rates' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-green-500" /> Pricing</h3>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Sales Rate / Selling Price</label>
                    <input type="number" step="0.01" {...register('sellingPrice')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Purchase Rate / Cost Price</label>
                    <input type="number" step="0.01" {...register('purchasePrice')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'compliance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500" /> Tax & Compliance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">HSN / SAC Code</label>
                      <input {...register('hsnCode')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">E-Invoice HSN</label>
                      <input {...register('eInvoiceHsn')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tax Group (%)</label>
                      <button type="button" onClick={() => handleInlineCreate('Tax Group')} className="text-xs text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> New</button>
                    </div>
                    <select {...register('taxGroupId')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="">Select Tax Group...</option>
                      {taxGroupsData.map(t => <option key={t.id} value={t.id}>{t.name} ({t.totalRate}%)</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">GST Rate (%)</label>
                      <input type="number" step="0.01" {...register('gstRate')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Tax Preference</label>
                      <select {...register('taxCategory')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                        <option value="TAXABLE">Taxable</option>
                        <option value="NON_TAXABLE">Non-Taxable</option>
                        <option value="NIL_RATED">Nil Rated</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

      {/* Styled Dialog Overlays */}
      {activeInlineModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setActiveInlineModal(null)} />
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md z-10 overflow-hidden shadow-2xl text-foreground">
            {activeInlineModal === 'category' && (
              <form onSubmit={handleCreateCategory}>
                <div className="flex justify-between items-center p-6 border-b border-border bg-background bg-opacity-35">
                  <h3 className="font-bold text-lg text-foreground">New Category</h3>
                  <button type="button" onClick={() => setActiveInlineModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
                </div>
                <div className="p-6 space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category Name *</label>
                    <input
                      type="text"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g. Electronics, Raw Materials"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category Code</label>
                    <input
                      type="text"
                      value={categoryCode}
                      onChange={(e) => setCategoryCode(e.target.value)}
                      placeholder="e.g. CAT001"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      value={categoryDesc}
                      onChange={(e) => setCategoryDesc(e.target.value)}
                      placeholder="Optional details..."
                      rows={2}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent resize-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={categoryActive}
                      onChange={(e) => setCategoryActive(e.target.checked)}
                      className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                    />
                    <span className="text-sm font-semibold text-foreground">Active</span>
                  </label>
                </div>
                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                  <button type="button" onClick={() => setActiveInlineModal(null)} className="px-4 py-2 rounded-xl border border-border text-foreground font-semibold hover:bg-muted text-sm cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 text-sm cursor-pointer shadow-lg shadow-accent/20">
                    Create Category
                  </button>
                </div>
              </form>
            )}

            {activeInlineModal === 'brand' && (
              <form onSubmit={handleCreateBrand}>
                <div className="flex justify-between items-center p-6 border-b border-border bg-background bg-opacity-35">
                  <h3 className="font-bold text-lg text-foreground">New Brand</h3>
                  <button type="button" onClick={() => setActiveInlineModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
                </div>
                <div className="p-6 space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Brand Name *</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. Sony, Tata Steel"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                    <textarea
                      value={brandDesc}
                      onChange={(e) => setBrandDesc(e.target.value)}
                      placeholder="Optional details..."
                      rows={2}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Website</label>
                    <input
                      type="text"
                      value={brandWebsite}
                      onChange={(e) => setBrandWebsite(e.target.value)}
                      placeholder="e.g. https://brand.com"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                  <button type="button" onClick={() => setActiveInlineModal(null)} className="px-4 py-2 rounded-xl border border-border text-foreground font-semibold hover:bg-muted text-sm cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 text-sm cursor-pointer shadow-lg shadow-accent/20">
                    Create Brand
                  </button>
                </div>
              </form>
            )}

            {activeInlineModal === 'unit' && (
              <form onSubmit={handleCreateUnit}>
                <div className="flex justify-between items-center p-6 border-b border-border bg-background bg-opacity-35">
                  <h3 className="font-bold text-lg text-foreground">New Unit</h3>
                  <button type="button" onClick={() => setActiveInlineModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
                </div>
                <div className="p-6 space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Unit Name *</label>
                    <input
                      type="text"
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      placeholder="e.g. Pieces, Kilograms"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Short Name / Symbol *</label>
                    <input
                      type="text"
                      value={unitShort}
                      onChange={(e) => setUnitShort(e.target.value)}
                      placeholder="e.g. PCS, KG"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Symbol</label>
                    <input
                      type="text"
                      value={unitSymbol}
                      onChange={(e) => setUnitSymbol(e.target.value)}
                      placeholder="e.g. pc, kg"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Decimal Precision</label>
                    <input
                      type="number"
                      value={unitPrecision}
                      onChange={(e) => setUnitPrecision(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                      min={0}
                      max={6}
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                  <button type="button" onClick={() => setActiveInlineModal(null)} className="px-4 py-2 rounded-xl border border-border text-foreground font-semibold hover:bg-muted text-sm cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 text-sm cursor-pointer shadow-lg shadow-accent/20">
                    Create Unit
                  </button>
                </div>
              </form>
            )}

            {activeInlineModal === 'taxGroup' && (
              <form onSubmit={handleCreateTaxGroup}>
                <div className="flex justify-between items-center p-6 border-b border-border bg-background bg-opacity-35">
                  <h3 className="font-bold text-lg text-foreground">New Tax Group</h3>
                  <button type="button" onClick={() => setActiveInlineModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
                </div>
                <div className="p-6 space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tax Group Name *</label>
                    <input
                      type="text"
                      value={taxGroupName}
                      onChange={(e) => setTaxGroupName(e.target.value)}
                      placeholder="e.g. GST 18%"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Rate (%) *</label>
                    <input
                      type="number"
                      value={taxGroupRate}
                      onChange={(e) => setTaxGroupRate(Number(e.target.value))}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                      min={0}
                      max={100}
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                  <button type="button" onClick={() => setActiveInlineModal(null)} className="px-4 py-2 rounded-xl border border-border text-foreground font-semibold hover:bg-muted text-sm cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 text-sm cursor-pointer shadow-lg shadow-accent/20">
                    Create Tax Group
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
