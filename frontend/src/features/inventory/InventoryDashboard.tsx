import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  Package, Search, Plus, Edit2, Trash2, Warehouse as WarehouseIcon, 
  Tag, Loader2, Landmark, RefreshCw, Barcode, Scale, AlertTriangle 
} from 'lucide-react';
import api from '../../services/api';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Load dependencies
      const [whRes, catRes, brandRes] = await Promise.all([
        api.get<{ success: boolean; data: { items: Warehouse[] } }>('/warehouses'),
        api.get<{ success: boolean; data: { items: Category[] } }>('/categories'),
        api.get<{ success: boolean; data: { items: Brand[] } }>('/brands'),
      ]);
      setWarehouses(whRes.data?.items || []);
      setCategories(catRes.data?.items || []);
      setBrands(brandRes.data?.items || []);

      if (activeTab === 'products') {
        const res = await api.get<{ success: boolean; data: { items: Product[] } }>('/products');
        setProducts(res.data?.items || []);
      } else if (activeTab === 'stocks') {
        const res = await api.get<{ success: boolean; data: { items: Stock[] } }>('/inventory/stocks');
        setStocks(res.data?.items || []);
      } else if (activeTab === 'warehouses') {
        const res = await api.get<{ success: boolean; data: { items: Warehouse[] } }>('/warehouses');
        setWarehouses(res.data?.items || []);
      } else if (activeTab === 'categories') {
        const res = await api.get<{ success: boolean; data: { items: Category[] } }>('/categories');
        setCategories(res.data?.items || []);
      } else if (activeTab === 'brands') {
        const res = await api.get<{ success: boolean; data: { items: Brand[] } }>('/brands');
        setBrands(res.data?.items || []);
      }
    } catch (err) {
      toast.error('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      productForm.reset({
        name: item.name,
        sku: item.sku || '',
        barcode: item.barcode || '',
        categoryId: item.categoryId || '',
        brandId: item.brandId || '',
        hsnCode: item.hsnCode || '',
        purchasePrice: Number(item.purchasePrice || 0),
        sellingPrice: Number(item.sellingPrice || 0),
        reorderLevel: Number(item.reorderLevel || 0),
        taxRate: Number(item.taxRate || 0),
      });
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
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', values);
        toast.success('Product registered successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWarehouseSubmit = async (values: WarehouseFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/warehouses/${editingId}`, values);
        toast.success('Warehouse updated successfully');
      } else {
        await api.post('/warehouses', values);
        toast.success('Warehouse created successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategorySubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/categories/${editingId}`, values);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', values);
        toast.success('Category created successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBrandSubmit = async (values: BrandFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/brands/${editingId}`, values);
        toast.success('Brand updated successfully');
      } else {
        await api.post('/brands', values);
        toast.success('Brand created successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStockSubmit = async (values: AdjustStockFormValues) => {
    setIsSubmitting(true);
    try {
      await api.post('/inventory/adjust', values);
      toast.success('Stock adjusted successfully');
      setIsAdjustModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    try {
      const endpoint = activeTab === 'products' ? '/products' 
                     : activeTab === 'warehouses' ? '/warehouses'
                     : activeTab === 'categories' ? '/categories'
                     : '/brands';
      await api.delete(`${endpoint}/${id}`);
      toast.success('Item deleted successfully');
      fetchData();
    } catch (err) {
      toast.error('Deletion failed');
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Product / Warehouse Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="bg-surface rounded-2xl border border-border shadow-premium w-full max-w-lg z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
              <h2 className="font-bold text-lg text-foreground">
                {editingId ? 'Modify Details' : 'Register New Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
            </div>

            {activeTab === 'products' ? (
              <form onSubmit={productForm.handleSubmit(handleProductSubmit)} className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Product Name *</label>
                    <input type="text" {...productForm.register('name')} placeholder="e.g. Copper Wire Coil" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">SKU / Code</label>
                    <input type="text" {...productForm.register('sku')} placeholder="e.g. ELE-001" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">HSN Code</label>
                    <input type="text" {...productForm.register('hsnCode')} placeholder="e.g. 8544" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Category</label>
                    <select {...productForm.register('categoryId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Brand</label>
                    <select {...productForm.register('brandId')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                      <option value="">Select Brand</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Purchase Price *</label>
                    <input type="number" {...productForm.register('purchasePrice', { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Selling Price *</label>
                    <input type="number" {...productForm.register('sellingPrice', { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reorder Safety Level</label>
                    <input type="number" {...productForm.register('reorderLevel', { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-opacity-90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Product
                  </button>
                </div>
              </form>
            ) : activeTab === 'warehouses' ? (
              <form onSubmit={warehouseForm.handleSubmit(handleWarehouseSubmit)} className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Warehouse Name *</label>
                    <input type="text" {...warehouseForm.register('name')} placeholder="e.g. North Delhi Warehouse" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
 
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location Address</label>
                    <input type="text" {...warehouseForm.register('location')} placeholder="e.g. Industrial Area Phase 1" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                  </div>
 
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input type="checkbox" {...warehouseForm.register('isDefault')} className="rounded border-border text-accent focus:ring-accent/20" />
                      Set as primary default warehouse
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
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Warehouse *</label>
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
    </div>
  );
};
