import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import notification from '@/core/services/NotificationService';
import { 
  Package, Search, Plus, Edit2, Trash2, Warehouse as WarehouseIcon, 
  Tag, Loader2, RefreshCw, AlertTriangle, History, 
  Filter, Layers, ArrowUpDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { apiClient as api } from '../../core/api/apiClient';
import ProductFormModal from './ProductFormModal';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useApiList } from '../../shared/hooks/useApiList';
import { PageLoader } from '../../shared/components/ui';
import { PageContainer } from '@/shared/components/ui/LayoutComponents';
import { cn } from '@/lib/utils';
import { UpdateStockModal, StockRowData } from './components/UpdateStockModal';
import { StockTransactionsModal } from './components/StockTransactionsModal';

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

type CategoryFormValues = z.infer<typeof categorySchema>;
type BrandFormValues = z.infer<typeof brandSchema>;
type ProductFormValues = z.infer<typeof productSchema>;
type WarehouseFormValues = z.infer<typeof warehouseSchema>;

// --- TYPES ---
interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  unit?: string;
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
  const queryClient = useQueryClient();

  const path = location.pathname;
  let activeTab: 'products' | 'stocks' | 'warehouses' | 'categories' | 'brands' = 'products';
  if (path.includes('/inventory')) activeTab = 'stocks';
  else if (path.includes('/warehouses')) activeTab = 'warehouses';
  else if (path.includes('/categories')) activeTab = 'categories';
  else if (path.includes('/brands')) activeTab = 'brands';
  else activeTab = 'products';

  const setActiveTab = (tab: 'products' | 'stocks' | 'warehouses' | 'categories' | 'brands') => {
    if (tab === 'stocks') navigate('/inventory');
    else if (tab === 'categories') navigate('/categories');
    else if (tab === 'brands') navigate('/brands');
    else navigate('/products');
  };

  const [searchQuery, setSearchQuery] = useState('');

  // Stock table specific filters and state
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockWarehouseFilter, setStockWarehouseFilter] = useState('ALL');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('ALL');
  const [stockPage, setStockPage] = useState(1);
  const [stockLimit, setStockLimit] = useState(25);

  // Modals state for Stock Actions
  const [selectedStockForUpdate, setSelectedStockForUpdate] = useState<StockRowData | null>(null);
  const [selectedStockForTransactions, setSelectedStockForTransactions] = useState<{
    productId: string;
    productName: string;
    sku?: string;
    warehouseName?: string;
  } | null>(null);

  // General Master Queries
  const { data: products = [], isLoading: isLoadingProducts } = useApiList<Product>(['products'], '/products');
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useApiList<Warehouse>(['warehouses'], '/warehouses');
  const { data: categories = [], isLoading: isLoadingCategories } = useApiList<Category>(['categories'], '/inventory/categories');
  const { data: brands = [], isLoading: isLoadingBrands } = useApiList<Brand>(['brands'], '/inventory/brands');

  // Server-side paginated stock query
  const { 
    data: stocksResponse, 
    isLoading: isLoadingStocks, 
    isError: isStocksError, 
    refetch: refetchStocks 
  } = useQuery({
    queryKey: ['stocks', { 
      page: stockPage, 
      limit: stockLimit, 
      search: stockSearchQuery, 
      warehouseId: stockWarehouseFilter, 
      categoryId: stockCategoryFilter 
    }],
    queryFn: async () => {
      const res: any = await api.get('/inventory/stocks', {
        params: {
          page: stockPage,
          limit: stockLimit,
          search: stockSearchQuery.trim() || undefined,
          warehouseId: stockWarehouseFilter !== 'ALL' ? stockWarehouseFilter : undefined,
          categoryId: stockCategoryFilter !== 'ALL' ? stockCategoryFilter : undefined,
        },
      });
      return res.data || res;
    },
    enabled: activeTab === 'stocks',
  });

  const stocks: StockRowData[] = stocksResponse?.data || [];
  const stockMeta = stocksResponse?.meta || { 
    page: stockPage, 
    limit: stockLimit, 
    total: stocks.length, 
    totalPages: Math.max(1, Math.ceil(stocks.length / stockLimit)) 
  };

  const isLoading = (activeTab === 'stocks' && isLoadingStocks) ||
    (activeTab === 'products' && isLoadingProducts) ||
    (activeTab === 'warehouses' && isLoadingWarehouses) ||
    (activeTab === 'categories' && isLoadingCategories) ||
    (activeTab === 'brands' && isLoadingBrands);

  // Master Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Inline Warehouse Modal State
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [warehouseDefault, setWarehouseDefault] = useState(false);
  const [isSubmittingWarehouse, setIsSubmittingWarehouse] = useState(false);

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
      // ProductFormModal handles editing
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
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
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
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
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
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
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
      await api.post('/warehouses', {
        name: warehouseName.trim(),
        location: warehouseLocation.trim(),
        isDefault: warehouseDefault,
      });
      notification.success('Warehouse created successfully');
      
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      
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

  if (isLoading && products.length === 0 && stocks.length === 0 && activeTab !== 'stocks') {
    return (
      <PageContainer maxWidth="full" className="w-full space-y-5 text-left">
        <PageLoader title="Loading Inventory..." description="Fetching stock levels, products, and warehouse locations..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full" className="w-full space-y-5 text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-accent shrink-0" />
            Products & Inventory Catalog
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage goods, track stock levels across multiple warehouses, perform manual stock audits, and check reorder levels.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {activeTab === 'stocks' && (
            <button
              onClick={() => {
                if (stocks.length > 0) {
                  setSelectedStockForUpdate(stocks[0]);
                } else if (products.length > 0 && warehouses.length > 0) {
                  const defaultWh = warehouses.find(w => w.isDefault) || warehouses[0];
                  setSelectedStockForUpdate({
                    id: `virtual-${products[0].id}-${defaultWh.id}`,
                    productId: products[0].id,
                    warehouseId: defaultWh.id,
                    quantity: 0,
                    product: products[0],
                    warehouse: defaultWh,
                  });
                } else {
                  notification.info('Register products and warehouses first to adjust stock.');
                }
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Adjust Stock Balance
            </button>
          )}
          {activeTab !== 'stocks' && (
            <button
              onClick={handleOpenAddModal}
              className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
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
      <div className="flex items-center border-b border-border gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'products', label: 'Product Catalog' },
          { id: 'stocks', label: 'Warehouse Stock Levels' },
          { id: 'categories', label: 'Category Types' },
          { id: 'brands', label: 'Product Brands' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
            className={`pb-3 pt-1 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Panels */}
      {activeTab === 'stocks' ? (
        /* ==================== WAREHOUSE STOCK LEVELS TABLE ==================== */
        <div className="space-y-4">
          {/* Controls Bar: Search + Warehouse Filter + Category Filter + Matching Count */}
          <div className="bg-surface border border-border rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Complete Dataset Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or barcode across all records..."
                  value={stockSearchQuery}
                  onChange={(e) => {
                    setStockSearchQuery(e.target.value);
                    setStockPage(1);
                  }}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
                {stockSearchQuery && (
                  <button
                    onClick={() => {
                      setStockSearchQuery('');
                      setStockPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Warehouse Filter Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <WarehouseIcon className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:inline" />
                <select
                  value={stockWarehouseFilter}
                  onChange={(e) => {
                    setStockWarehouseFilter(e.target.value);
                    setStockPage(1);
                  }}
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-medium cursor-pointer"
                >
                  <option value="ALL">All Warehouses ({warehouses.length})</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} {wh.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:inline" />
                <select
                  value={stockCategoryFilter}
                  onChange={(e) => {
                    setStockCategoryFilter(e.target.value);
                    setStockPage(1);
                  }}
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-medium cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Total Matching Item Count */}
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-muted-foreground shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
              <span className="font-medium">
                Total: <strong className="text-foreground">{stockMeta.total}</strong> records
              </span>
              <button
                onClick={() => refetchStocks()}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Refresh Stock Levels"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          {isLoadingStocks ? (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
              <p className="text-sm font-semibold text-foreground">Loading inventory stock levels...</p>
              <p className="text-xs text-muted-foreground">Calculating warehouse balances and valuations...</p>
            </div>
          ) : isStocksError ? (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Failed to Load Stock Levels</h3>
              <p className="text-xs text-muted-foreground">Unable to fetch warehouse stocks from the server.</p>
              <button
                onClick={() => refetchStocks()}
                className="px-4 py-2 bg-accent text-accent-foreground text-xs font-semibold rounded-xl hover:bg-accent/90 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : stocks.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3 shadow-xs">
              <Package className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="font-bold text-base text-foreground">No Stock Records Found</h3>
              <p className="text-xs text-muted-foreground">
                {stockSearchQuery || stockWarehouseFilter !== 'ALL' || stockCategoryFilter !== 'ALL'
                  ? 'No inventory items match the current search or filter criteria. Try clearing filters.'
                  : 'No inventory products registered yet. Click "Register Product" to get started.'}
              </p>
              {(stockSearchQuery || stockWarehouseFilter !== 'ALL' || stockCategoryFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setStockSearchQuery('');
                    setStockWarehouseFilter('ALL');
                    setStockCategoryFilter('ALL');
                    setStockPage(1);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-2xl shadow-premium overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="py-3.5 px-4 min-w-[200px]">Product</th>
                      <th className="py-3.5 px-4 min-w-[120px]">Category</th>
                      <th className="py-3.5 px-4 min-w-[140px]">Warehouse</th>
                      <th className="py-3.5 px-4 text-right min-w-[110px]">Current Stock</th>
                      <th className="py-3.5 px-4 min-w-[80px]">Unit</th>
                      <th className="py-3.5 px-4 text-right min-w-[110px]">Average Cost</th>
                      <th className="py-3.5 px-4 text-right min-w-[120px]">Stock Value</th>
                      <th className="py-3.5 px-4 text-right min-w-[180px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {stocks.map((row) => {
                      const qty = Number(row.quantity || 0);
                      const isNegative = qty < 0;
                      const isZero = qty === 0;
                      const isPositive = qty > 0;
                      const avgCost = Number(row.averageCost || 0);
                      const stockVal = Number(row.stockValue || 0);

                      return (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                          {/* Product Name & SKU */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground text-xs sm:text-sm truncate max-w-[240px]" title={row.product?.name}>
                              {row.product?.name || 'Unnamed Product'}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground font-mono">
                              <span>SKU: {row.product?.sku || 'N/A'}</span>
                              {row.product?.barcode && <span>• BC: {row.product.barcode}</span>}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium text-[11px] border border-border/40">
                              {row.product?.category?.name || 'Unassigned'}
                            </span>
                          </td>

                          {/* Warehouse */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <WarehouseIcon className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>{row.warehouse?.name || 'General'}</span>
                              {row.warehouse?.isDefault && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-accent/10 text-accent font-bold uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Current Stock */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                            {isNegative ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20" title="Negative stock balance">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {qty}
                              </span>
                            ) : isZero ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border/60">
                                0
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {qty}
                              </span>
                            )}
                          </td>

                          {/* Unit */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                            {row.unit || row.product?.unit || 'PCS'}
                          </td>

                          {/* Average Cost */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-foreground font-medium">
                            {formatCurrency(avgCost)}
                          </td>

                          {/* Stock Value */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-foreground">
                            {formatCurrency(stockVal)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Update Stock Action */}
                              <button
                                onClick={() => setSelectedStockForUpdate(row)}
                                className="px-2.5 py-1.5 bg-accent/10 hover:bg-accent text-accent hover:text-accent-foreground border border-accent/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                title="Adjust or count stock for this item"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Update Stock</span>
                              </button>

                              {/* View Transactions Action */}
                              <button
                                onClick={() => setSelectedStockForTransactions({
                                  productId: row.productId,
                                  productName: row.product?.name || 'Product',
                                  sku: row.product?.sku,
                                  warehouseName: row.warehouse?.name,
                                })}
                                className="p-1.5 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                title="View inventory movement ledger"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Bar */}
              <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground bg-muted/10">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select
                    value={stockLimit}
                    onChange={(e) => {
                      setStockLimit(Number(e.target.value));
                      setStockPage(1);
                    }}
                    className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent font-medium cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>per page</span>
                  <span className="text-border mx-1">|</span>
                  <span>
                    Showing {stockMeta.total > 0 ? ((stockPage - 1) * stockLimit) + 1 : 0} to{' '}
                    {Math.min(stockPage * stockLimit, stockMeta.total)} of {stockMeta.total} records
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                    disabled={stockPage <= 1}
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 font-semibold text-foreground font-mono">
                    Page {stockMeta.page} of {Math.max(1, stockMeta.totalPages)}
                  </span>

                  <button
                    onClick={() => setStockPage((p) => Math.min(stockMeta.totalPages, p + 1))}
                    disabled={stockPage >= stockMeta.totalPages}
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'products' ? (
        /* ==================== PRODUCT CATALOG TAB ==================== */
        products.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg text-foreground">No Products Registered</h3>
            <button onClick={handleOpenAddModal} className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
              Register First Product
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full sm:w-[380px] max-w-full">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface border border-border focus-within:border-accent transition-colors shadow-2xs">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  className="bg-transparent border-none outline-hidden w-full text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

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
                      <button onClick={() => handleOpenEditModal(prod)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer" title="Edit Product">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(prod.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" title="Delete Product">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : activeTab === 'warehouses' ? (
        /* ==================== WAREHOUSES TAB ==================== */
        warehouses.length === 0 ? (
          <div className="bg-surface p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4 shadow-xs">
            <h3 className="font-semibold text-lg text-foreground">No Warehouses Registered</h3>
            <button onClick={handleOpenAddModal} className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer">
              Create Warehouse
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full sm:w-[380px] max-w-full">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface border border-border focus-within:border-accent transition-colors shadow-2xs">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search warehouses..." 
                  className="bg-transparent border-none outline-hidden w-full text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 w-full">
              {warehouses.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase())).map((wh) => (
                <div key={wh.id} className={cn(
                  "bg-surface border rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:border-accent/40 transition-all min-h-[140px]",
                  wh.isDefault ? "border-accent ring-1 ring-accent/30" : "border-border"
                )}>
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2 truncate">
                          {wh.name}
                          {wh.isDefault && (
                            <span className="bg-accent/15 text-accent border border-accent/20 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0">Default</span>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 truncate">Location: <span className="text-foreground">{wh.location || 'Not set'}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 border-t border-border/60 mt-4 pt-3">
                    <button onClick={() => handleOpenEditModal(wh)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors cursor-pointer" title="Edit Warehouse">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(wh.id)} disabled={wh.isDefault} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30" title="Delete Warehouse">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : activeTab === 'categories' ? (
        /* ==================== CATEGORIES TAB ==================== */
        categories.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg text-foreground">No Category Types Registered</h3>
            <button onClick={handleOpenAddModal} className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
              Create Category
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full sm:w-[380px] max-w-full">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface border border-border focus-within:border-accent transition-colors shadow-2xs">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search categories..." 
                  className="bg-transparent border-none outline-hidden w-full text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

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
          </div>
        )
      ) : (
        /* ==================== BRANDS TAB ==================== */
        brands.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-border text-center max-w-xl mx-auto space-y-4">
            <h3 className="font-semibold text-lg text-foreground">No Product Brands Registered</h3>
            <button onClick={handleOpenAddModal} className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
              Create Brand
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full sm:w-[380px] max-w-full">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface border border-border focus-within:border-accent transition-colors shadow-2xs">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search brands..." 
                  className="bg-transparent border-none outline-hidden w-full text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

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
          </div>
        )
      )}

      {/* ==================== STOCK ADJUSTMENT MODAL ==================== */}
      {selectedStockForUpdate && (
        <UpdateStockModal
          stockRow={selectedStockForUpdate}
          onClose={() => setSelectedStockForUpdate(null)}
          onSuccess={() => {
            setSelectedStockForUpdate(null);
            refetchStocks();
          }}
        />
      )}

      {/* ==================== STOCK TRANSACTIONS MODAL ==================== */}
      {selectedStockForTransactions && (
        <StockTransactionsModal
          productId={selectedStockForTransactions.productId}
          productName={selectedStockForTransactions.productName}
          sku={selectedStockForTransactions.sku}
          warehouseName={selectedStockForTransactions.warehouseName}
          onClose={() => setSelectedStockForTransactions(null)}
        />
      )}

      {/* ==================== MASTER MODAL OVERLAYS ==================== */}
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
                  <button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
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
                  <button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
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
                  <button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Brand
                  </button>
                </div>
              </form>
            )}
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
            queryClient.invalidateQueries({ queryKey: ['stocks'] });
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
                    queryClient.invalidateQueries({ queryKey: ['stocks'] });
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
    </PageContainer>
  );
};
