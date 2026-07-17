import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/services/NotificationService';
import { 
  Package, Search, Plus, Edit2, Trash2, Warehouse as WarehouseIcon, 
  Tag, Loader2, Landmark, RefreshCw, Barcode, Scale, AlertTriangle 
} from 'lucide-react';
import api from '../../services/api';
import ProductFormModal from './ProductFormModal';
import { useQueryClient } from '@tanstack/react-query';
import { useApiList } from '../../hooks/useApiList';

// --- SCHEMAS ---
const categorySchema = z.object({
  name: z.string().min(2, 'Category name is too short'),
});

const brandSchema = z.object({
  name: z.string().min(2, 'Brand name is too short'),
});

const productSchema = z.object({
  name: z.string().min(2, 'Product name is too short'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  hsnCode: z.string().optional(),
  purchasePrice: z.number(),
  sellingPrice: z.number(),
  reorderLevel: z.number(),
  taxRate: z.number(),
});

const warehouseSchema = z.object({
  name: z.string().min(2, 'Warehouse name is too short'),
  location: z.string().optional(),
  isDefault: z.boolean(),
});

const adjustStockSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  warehouseId: z.string().min(1, 'Select a warehouse'),
  quantityChange: z.number().min(-100000, 'Invalid quantity change').max(100000),
  notes: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;
type BrandFormValues = z.infer<typeof brandSchema>;
type ProductFormValues = z.infer<typeof productSchema>;
type WarehouseFormValues = z.infer<typeof warehouseSchema>;
type AdjustStockFormValues = z.infer<typeof adjustStockSchema>;

// --- TYPES ---
interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  purchasePrice: number;
  sellingPrice: number;
  reorderLevel: number;
  categoryId?: string;
  brandId?: string;
  category?: { name: string };
  brand?: { name: string };
  stocks?: { quantity: number; warehouseId: string }[];
}

interface Warehouse {
  id: string;
  name: string;
  location?: string;
  isDefault: boolean;
}

interface Stock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  averageCost?: number;
  product: Product;
  warehouse: Warehouse;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

export const InventoryDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  let activeTab: 'products' | 'stocks' | 'warehouses' | 'categories' | 'brands' = 'products';
  if (path.includes('/inventory')) activeTab = 'stocks';
  else if (path.includes('/warehouses')) activeTab = 'warehouses';
  else if (path.includes('/categories')) activeTab = 'categories';
  else if (path.includes('/brands')) activeTab = 'brands';
  else activeTab = 'products';

  const setActiveTab = (tab: 'products' | 'stocks' | 'warehouses' | 'categories' | 'brands') => {
    if (tab === 'stocks') navigate('/inventory');
    else if (tab === 'warehouses') navigate('/warehouses');
    else if (tab === 'categories') navigate('/categories');
    else if (tab === 'brands') navigate('/brands');
    else navigate('/products');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const { data: products = [], isLoading: isLoadingProducts } = useApiList<Product>(['products'], '/products');
  const { data: stocks = [], isLoading: isLoadingStocks } = useApiList<Stock>(['stocks'], '/inventory/stocks');
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useApiList<Warehouse>(['warehouses'], '/warehouses');
  const { data: categories = [], isLoading: isLoadingCategories } = useApiList<Category>(['categories'], '/inventory/categories');
  const { data: brands = [], isLoading: isLoadingBrands } = useApiList<Brand>(['brands'], '/inventory/brands');
  
  const isLoading = isLoadingProducts || isLoadingStocks || isLoadingWarehouses || isLoadingCategories || isLoadingBrands;

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Inline Warehouse Modal State
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [warehouseDefault, setWarehouseDefault] = useState(false);
  const [isSubmittingWarehouse, setIsSubmittingWarehouse] = useState(false);
  const queryClient = useQueryClient();

  // Forms hooks
  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', sku: '', barcode: '', categoryId: '', brandId: '', hsnCode: '', purchasePrice: 0, sellingPrice: 0, reorderLevel: 0, taxRate: 0 }
  });

  const warehouseForm = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { name: '', location: '', isDefault: false }
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' }
  });

  const brandForm = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: '' }
  });

  const adjustStockForm = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: { productId: '', warehouseId: '', quantityChange: 0, notes: '' }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: [activeTab] });
  }, [activeTab]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    productForm.reset();
    warehouseForm.reset();
    categoryForm.reset();
    brandForm.reset();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'products') {
      // The ProductFormModal handles its own state for products, we just set editingId
    } else if (activeTab === 'warehouses') {
      warehouseForm.reset({
        name: item.name,
        location: item.location || '',
        isDefault: item.isDefault,
      });
    } else if (activeTab === 'categories') {
      categoryForm.reset({
        name: item.name,
      });
    } else if (activeTab === 'brands') {
      brandForm.reset({
        name: item.name,
      });
    }
    setIsModalOpen(true);
  };

  const handleProductSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/products/${editingId}`, values);
        notification.success('Product updated successfully');
      } else {
        await api.post('/products', values);
        notification.success('Product registered successfully');
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: [activeTab] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWarehouseSubmit = async (values: WarehouseFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/warehouses/${editingId}`, values);
        notification.success('Warehouse updated successfully');
      } else {
        await api.post('/warehouses', values);
        notification.success('Warehouse created successfully');
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategorySubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/inventory/categories/${editingId}`, values);
        notification.success('Category updated successfully');
      } else {
        await api.post('/inventory/categories', values);
        notification.success('Category created successfully');
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBrandSubmit = async (values: BrandFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/inventory/brands/${editingId}`, values);
        notification.success('Brand updated successfully');
      } else {
        await api.post('/inventory/brands', values);
        notification.success('Brand created successfully');
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseName.trim()) {
      notification.error('Warehouse Name is required');
      return;
    }
    setIsSubmittingWarehouse(true);
    try {
      const res = await api.post('/warehouses', {
        name: warehouseName.trim(),
        location: warehouseLocation.trim(),
        isDefault: warehouseDefault,
      });
      notification.success('Warehouse created successfully');
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      
      // Select it automatically in the adjust stock form
      const newId = res.data?.data?.id || res.data?.id;
      if (newId) {
        adjustStockForm.setValue('warehouseId', newId);
      }
      
      // Refresh local dashboard data
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      
      setIsWarehouseModalOpen(false);
      setWarehouseName('');
      setWarehouseLocation('');
      setWarehouseDefault(false);
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to create warehouse');
    } finally {
      setIsSubmittingWarehouse(false);
    }
  };

  const handleAdjustStockSubmit = async (values: AdjustStockFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/inventory/adjust', values);
      notification.success('Stock adjusted successfully');
      setIsAdjustModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const getProductTotalStock = (p: Product) => {
    if (!p.stocks?.length) return 0;
    return p.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-accent" />
            Products & Inventory Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage goods, track stock levels across multiple warehouses, perform manual stock audits, and check reorder levels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'stocks' && (
            <button
              onClick={() => { adjustStockForm.reset(); setIsAdjustModalOpen(true); }}
              className="bg-accent text-white hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Adjust Inventory Stock
            </button>
          )}
          {activeTab !== 'stocks' && (
            <button
              onClick={handleOpenAddModal}
              className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'products' ? 'Register Product' 
               : activeTab === 'warehouses' ? 'Add Warehouse' 
               : activeTab === 'categories' ? 'Add Category' 
               : 'Add Brand'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveTab('products'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'products' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Product Catalog
        </button>
        <button
          onClick={() => { setActiveTab('stocks'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'stocks' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Warehouse Stock Levels
        </button>
        <button
          onClick={() => { setActiveTab('warehouses'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'warehouses' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Warehouses
        </button>
        <button
          onClick={() => { setActiveTab('categories'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'categories' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Category Types
        </button>
        <button
          onClick={() => { setActiveTab('brands'); setSearchQuery(''); }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'brands' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Product Brands
        </button>
      </div>

      {/* Search Input Filter */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border w-full max-w-md focus-within:border-accent transition-colors">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder={`Search ${activeTab}...`} 
          className="bg-transparent border-none outline-none w-full text-sm text-foreground placeholder:text-muted-foreground"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Main Grid Panels */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-2xl border border-border animate-pulse space-y-4">
              <div className="h-5 bg-border rounded w-1/3" />
              <div className="h-4 bg-border rounded w-2/3" />
              <div className="h-4 bg-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : activeTab === 'products' ? (
        products.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Products Registered</h3>
            <button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Register First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((prod) => {
              const totalStock = getProductTotalStock(prod);
              const reorderAlert = totalStock <= prod.reorderLevel;

              return (
                <div key={prod.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{prod.name}</h3>
                        <p className="text-xs text-muted-foreground">SKU: {prod.sku || 'N/A'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        reorderAlert ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                      }`}>
                        Stock: {totalStock}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                      <p>Category: <span className="text-foreground font-semibold">{prod.category?.name || 'Unassigned'}</span></p>
                      <p>Selling Price: <span className="text-foreground font-semibold">{formatCurrency(prod.sellingPrice)}</span></p>
                      <p>Purchase Price: <span className="text-foreground font-semibold">{formatCurrency(prod.purchasePrice)}</span></p>
                    </div>

                    {reorderAlert && (
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 flex items-center gap-2 text-xs text-amber-500">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Low stock alert. Reorder level: {prod.reorderLevel}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                    <button onClick={() => handleOpenEditModal(prod)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(prod.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'stocks' ? (
        stocks.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No stock mappings recorded</h3>
            <p className="text-sm text-muted-foreground">Perform a stock adjustment to add quantities.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.filter(s => s.product?.name.toLowerCase().includes(searchQuery.toLowerCase())).map((st) => (
              <div key={st.id} className="glass-panel p-6 rounded-2xl border border-border hover-premium flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{st.product?.name}</h3>
                      <p className="text-xs text-muted-foreground">Warehouse: <span className="font-semibold text-foreground">{st.warehouse?.name}</span></p>
                    </div>
                    <span className="bg-primary/10 text-foreground px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      Qty: {Number(st.quantity)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-4">
                    <p>Average Cost: <span className="text-foreground font-semibold">{formatCurrency(Number(st.averageCost || 0))}</span></p>
                    <p>Location: <span className="text-foreground">{st.warehouse?.location || 'N/A'}</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'warehouses' ? (
        warehouses.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Warehouses Registered</h3>
            <button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Create Warehouse
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warehouses.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase())).map((wh) => (
              <div key={wh.id} className={`glass-panel p-6 rounded-2xl border flex flex-col justify-between ${
                wh.isDefault ? 'border-accent ring-1 ring-accent' : 'border-border'
              }`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                        {wh.name}
                        {wh.isDefault && (
                          <span className="bg-accent text-white px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase">Default</span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground">Location: {wh.location || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button onClick={() => handleOpenEditModal(wh)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(wh.id)} disabled={wh.isDefault} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'categories' ? (
        categories.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Category Types Registered</h3>
            <button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Create Category
            </button>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border shadow-premium overflow-hidden max-w-2xl mx-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="py-4 px-6">Category ID</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-background/20 transition-colors">
                    <td className="py-4 px-6 text-xs text-muted-foreground font-mono">{c.id}</td>
                    <td className="py-4 px-6 font-semibold text-foreground">{c.name}</td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button onClick={() => handleOpenEditModal(c)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer inline-flex">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer inline-flex">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        brands.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg">No Product Brands Registered</h3>
            <button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-xs font-semibold">
              Create Brand
            </button>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border shadow-premium overflow-hidden max-w-2xl mx-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="py-4 px-6">Brand ID</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brands.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())).map((b) => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-background/20 transition-colors">
                    <td className="py-4 px-6 text-xs text-muted-foreground font-mono">{b.id}</td>
                    <td className="py-4 px-6 font-semibold text-foreground">{b.name}</td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button onClick={() => handleOpenEditModal(b)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer inline-flex">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer inline-flex">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal Overlays */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-2xl z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">
                {editingId ? 'Edit' : 'Create'} {
                  activeTab === 'warehouses' ? 'Warehouse' : 
                  activeTab === 'categories' ? 'Category' : 'Brand'
                }
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            {activeTab === 'warehouses' ? (
              <form onSubmit={warehouseForm.handleSubmit(handleWarehouseSubmit)} className="p-6 space-y-4 text-left">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Warehouse Name *</label>
                    <input type="text" {...warehouseForm.register('name')} placeholder="e.g. Main Hub, West Wing" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location details</label>
                    <input type="text" {...warehouseForm.register('location')} placeholder="e.g. Sector 4, Ind. Area" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                  <div className="flex items-center gap-2 mt-4 p-3 border border-border rounded-lg bg-background bg-opacity-50">
                    <input type="checkbox" {...warehouseForm.register('isDefault')} className="rounded border-border text-accent focus:ring-accent w-4 h-4" />
                    <label className="text-sm font-semibold text-foreground">
                      Set as default warehouse (Auto-selected for new products)
                    </label>
                  </div>
                </div>
 
                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Warehouse
                  </button>
                </div>
              </form>
            ) : activeTab === 'categories' ? (
              <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="p-6 space-y-4 text-left">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category Name *</label>
                    <input type="text" {...categoryForm.register('name')} placeholder="e.g. Electronics, Raw Materials" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                </div>
 
                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Category
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={brandForm.handleSubmit(handleBrandSubmit)} className="p-6 space-y-4 text-left">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Brand Name *</label>
                    <input type="text" {...brandForm.register('name')} placeholder="e.g. Sony, Tata Steel" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                </div>
 
                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Brand
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Inventory Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAdjustModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-lg z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">Adjust Warehouse Stock</h2>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={adjustStockForm.handleSubmit(handleAdjustStockSubmit)} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Select Product *</label>
                  <select {...adjustStockForm.register('productId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <div className="flex justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warehouse *</label>
                    <button type="button" onClick={() => setIsWarehouseModalOpen(true)} className="text-xs text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> New</button>
                  </div>
                  <select {...adjustStockForm.register('warehouseId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Select warehouse...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Quantity Change * (use negative values to reduce)</label>
                  <input type="number" {...adjustStockForm.register('quantityChange', { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" placeholder="e.g. 50 or -20" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Audit Notes</label>
                  <textarea {...adjustStockForm.register('notes')} placeholder="e.g. Stock audit variance correction" rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && activeTab === 'products' && (
        <ProductFormModal
          product={editingId ? products.find(p => p.id === editingId) : undefined}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: [activeTab] });
          }}
        />
      )}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm z-10 overflow-hidden shadow-2xl text-foreground">
            <div className="p-6 space-y-4">
              <h3 className="font-bold text-lg">Confirm Deletion</h3>
              <p className="text-sm text-muted-foreground">Are you sure you want to delete this item? This action cannot be undone.</p>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 rounded-xl border border-border text-foreground font-semibold hover:bg-muted text-sm cursor-pointer">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  try {
                    const endpoint = activeTab === 'products' ? '/products' 
                                   : activeTab === 'warehouses' ? '/warehouses'
                                   : activeTab === 'categories' ? '/inventory/categories'
                                   : '/inventory/brands';
                    await api.delete(`${endpoint}/${id}`);
                    notification.success('Item deleted successfully');
                    queryClient.invalidateQueries({ queryKey: [activeTab] });
                  } catch (err) {
                    notification.error('Deletion failed');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-650 text-white font-bold hover:bg-red-700 text-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setIsWarehouseModalOpen(false)} />
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md z-10 overflow-hidden shadow-2xl text-foreground">
            <form onSubmit={handleCreateWarehouse}>
              <div className="flex justify-between items-center p-6 border-b border-border bg-background bg-opacity-35">
                <h3 className="font-bold text-lg text-foreground">New Warehouse</h3>
                <button type="button" onClick={() => setIsWarehouseModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
              </div>
              <div className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Warehouse Name *</label>
                  <input
                    type="text"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    placeholder="e.g. Main Warehouse"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location</label>
                  <input
                    type="text"
                    value={warehouseLocation}
                    onChange={(e) => setWarehouseLocation(e.target.value)}
                    placeholder="e.g. Ground Floor, Sector 4"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={warehouseDefault}
                    onChange={(e) => setWarehouseDefault(e.target.checked)}
                    className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                  />
                  <span className="text-sm font-semibold text-foreground">Set as Default Warehouse</span>
                </label>
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                <button type="button" onClick={() => setIsWarehouseModalOpen(false)} className="px-4 py-2 rounded-xl border border-border text-foreground font-semibold hover:bg-muted text-sm cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmittingWarehouse} className="px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 text-sm cursor-pointer shadow-lg shadow-accent/20 flex items-center gap-2">
                  {isSubmittingWarehouse && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
