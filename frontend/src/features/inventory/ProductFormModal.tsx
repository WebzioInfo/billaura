import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Package, Box, Tag, Hash, RefreshCw, IndianRupee, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

interface ProductFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  product?: any;
}

export default function ProductFormModal({ onClose, onSuccess, product }: ProductFormModalProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [taxGroups, setTaxGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: product || {
      name: '',
      sku: '',
      alias: '',
      hsnCode: '',
      eInvoiceHsn: '',
      barcode: '',
      itemType: 'FINISHED_GOOD',
      categoryId: '',
      brandId: '',
      unitId: '',
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
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [catRes, brandRes, unitRes, taxRes] = await Promise.all([
        api.get('/inventory/categories'),
        api.get('/inventory/brands'),
        api.get('/units').catch(() => ({ data: [] })),
        api.get('/tax-groups').catch(() => ({ data: [] })),
      ]);
      setCategories(catRes.data?.data || catRes.data || []);
      setBrands(brandRes.data?.data || brandRes.data || []);
      setUnits(unitRes.data?.data || unitRes.data || []);
      setTaxGroups(taxRes.data?.data || taxRes.data || []);
    } catch (err) {
      toast.error('Failed to load master data for product form');
    }
  };

  const handleInlineCreate = async (type: string) => {
    const name = window.prompt(`Enter new ${type} name:`);
    if (!name) return;
    try {
      if (type === 'Category') {
        await api.post('/inventory/categories', { name });
      } else if (type === 'Brand') {
        await api.post('/inventory/brands', { name });
      } else if (type === 'Unit') {
        const abbreviation = window.prompt('Enter abbreviation (e.g., kg, pcs):') || name.substring(0, 3);
        await api.post('/units', { name, abbreviation, decimals: 2 });
      } else if (type === 'Tax Group') {
        await api.post('/tax-groups', { name, totalRate: 0 });
      }
      toast.success(`${type} created successfully`);
      fetchMasterData();
    } catch (err) {
      toast.error(`Failed to create ${type}`);
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
        await api.put(`/inventory/products/${product.id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await api.post('/inventory/products', payload);
        toast.success('Product created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error('Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
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
                    <select {...register('categoryId')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="">Select Category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand</label>
                      <button type="button" onClick={() => handleInlineCreate('Brand')} className="text-xs text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> New</button>
                    </div>
                    <select {...register('brandId')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                      <option value="">Select Brand...</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit of Measure</label>
                      <button type="button" onClick={() => handleInlineCreate('Unit')} className="text-xs text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> New</button>
                    </div>
                    <select {...register('unitId')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
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
                      {taxGroups.map(t => <option key={t.id} value={t.id}>{t.name} ({t.totalRate}%)</option>)}
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
    </div>
  );
}
