import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Filter, Layers, Package, AlertTriangle, TrendingUp, Columns, Eye, ChevronDown, Check, Box, Wrench, Globe, Archive, Server, FileText, Ban } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader } from '@/shared/components/ui';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui';
import ProductFormModal from './ProductFormModal';
import { ProductDetailsDrawer } from './ProductDetailsDrawer';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'sku', label: 'SKU / Code', visible: true },
  { id: 'name', label: 'Product Name', visible: true },
  { id: 'itemType', label: 'Type', visible: true },
  { id: 'category', label: 'Category', visible: true },
  { id: 'brand', label: 'Brand', visible: false },
  { id: 'unit', label: 'Unit', visible: true },
  { id: 'sellingPrice', label: 'Selling Price', visible: true },
  { id: 'purchasePrice', label: 'Purchase Cost', visible: true },
  { id: 'margin', label: 'Margin %', visible: true },
  { id: 'stock', label: 'Stock Level', visible: true },
  { id: 'status', label: 'Status', visible: true },
];

export const ProductsList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [inspectProductId, setInspectProductId] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('product_list_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);

  const { data: productsData = [], isLoading: loading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products');
      const items = res.data?.data?.items || res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.get('/inventory/categories').then(res => res.data?.data || res.data || []),
  });

  const toggleColumn = (colId: string) => {
    setColumns(prev => {
      const updated = prev.map(c => c.id === colId ? { ...c, visible: !c.visible } : c);
      localStorage.setItem('product_list_columns', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      notification.success('Product deleted successfully');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete product');
    }
  });

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const confirmed = await dialog.confirmDelete(
      'Delete Product?',
      `Are you sure you want to delete product "${name}"?`
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const openNewModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  // Filter products logic
  const filteredProducts = useMemo(() => {
    return productsData.filter((p: any) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(term);
        const matchesSku = (p.sku || '').toLowerCase().includes(term);
        const matchesBarcode = (p.barcode || '').toLowerCase().includes(term);
        const matchesHsn = (p.hsnCode || '').toLowerCase().includes(term);
        if (!matchesName && !matchesSku && !matchesBarcode && !matchesHsn) return false;
      }

      if (selectedType !== 'ALL' && p.itemType !== selectedType) return false;
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory && p.category?.id !== selectedCategory) return false;

      const totalStock = p.stocks ? p.stocks.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0) : 0;
      const reorderLevel = Number(p.reorderLevel || 0);

      if (selectedStockStatus === 'LOW_STOCK' && (totalStock > reorderLevel || totalStock === 0)) return false;
      if (selectedStockStatus === 'OUT_OF_STOCK' && totalStock > 0) return false;
      if (selectedStockStatus === 'IN_STOCK' && totalStock === 0) return false;

      return true;
    });
  }, [productsData, searchTerm, selectedType, selectedCategory, selectedStockStatus]);

  // KPI aggregates
  const kpis = useMemo(() => {
    let totalStockValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let servicesCount = 0;
    let inventoryCount = 0;
    let rawMaterialsCount = 0;
    let digitalCount = 0;
    let assetsCount = 0;
    let expenseCount = 0;
    let inactiveCount = 0;

    productsData.forEach((p: any) => {
      const stock = p.stocks ? p.stocks.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0) : 0;
      const cost = Number(p.purchasePrice || 0);
      totalStockValuation += stock * cost;

      if (!p.status || p.status === 'INACTIVE') {
        inactiveCount++;
      }

      if (p.itemType === 'SERVICE') servicesCount++;
      else if (p.itemType === 'FINISHED_GOOD') inventoryCount++;
      else if (p.itemType === 'RAW_MATERIAL') rawMaterialsCount++;
      else if (p.itemType === 'DIGITAL') digitalCount++;
      else if (p.itemType === 'ASSET') assetsCount++;
      else if (p.itemType === 'EXPENSE') expenseCount++;

      const reorder = Number(p.reorderLevel || 0);
      if (p.isInventoryItem) {
        if (stock === 0) outOfStockCount++;
        else if (stock <= reorder && stock > 0) lowStockCount++;
      }
    });

    return {
      totalProducts: productsData.length,
      totalStockValuation,
      lowStockCount,
      outOfStockCount,
      servicesCount,
      inventoryCount,
      rawMaterialsCount,
      digitalCount,
      assetsCount,
      expenseCount,
      inactiveCount,
    };
  }, [productsData]);

  const isColVisible = (colId: string) => columns.find(c => c.id === colId)?.visible ?? true;

  return (
    <PageContainer maxWidth="7xl">
      {/* UNIFIED COMMAND TOOLBAR HEADER */}
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-sm space-y-3">
        {/* ROW 1: Title, Global Search (500px+), Controls & Add Button */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title & Subtitle */}
          <div className="shrink-0">
            <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-accent" /> Products
            </h1>
            <p className="text-[11px] text-muted-foreground">Product Intelligence & Master Catalog</p>
          </div>

          {/* Center Search (Expandable, min-w-[450px]) */}
          <div className="relative flex-1 max-w-xl min-w-[320px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Product Name, SKU, Barcode, HSN, Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Type Dropdown */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="FINISHED_GOOD">Finished Goods</option>
              <option value="RAW_MATERIAL">Raw Materials</option>
              <option value="SERVICE">Services</option>
              <option value="NON_INVENTORY">Non-Inventory</option>
              <option value="DIGITAL">Digital</option>
              <option value="ASSET">Assets</option>
              <option value="EXPENSE">Expense</option>
            </select>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.categoryName || c.name}</option>
              ))}
            </select>

            {/* Column Chooser Button */}
            <div className="relative">
              <button
                onClick={() => setIsColumnChooserOpen(!isColumnChooserOpen)}
                className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-foreground flex items-center gap-1.5 hover:bg-muted transition-colors cursor-pointer"
              >
                <Columns className="w-3.5 h-3.5 text-accent" /> Columns <ChevronDown className="w-3 h-3" />
              </button>

              {isColumnChooserOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-xl z-30 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1">Toggle Visible Columns</p>
                  {columns.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => toggleColumn(col.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-muted/50 text-foreground cursor-pointer"
                    >
                      <span>{col.label}</span>
                      {col.visible && <Check className="w-3.5 h-3.5 text-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Primary Add Button */}
            <Button
              onClick={openNewModal}
              variant="primary"
              className="flex items-center gap-1.5 text-xs px-3.5 py-2 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product
            </Button>
          </div>
        </div>

        {/* ROW 2: Compact Interactive KPI Summary Strip */}
        <div className="flex items-center gap-4 pt-2.5 border-t border-border/60 text-xs overflow-x-auto custom-scrollbar font-medium">
          <button
            onClick={() => { setSelectedType('ALL'); setSelectedStockStatus('ALL'); }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
          >
            <span className="font-bold text-foreground">Products</span>
            <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-extrabold text-[11px]">{kpis.totalProducts}</span>
          </button>
          <span className="text-border">|</span>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-muted-foreground">Stock Value</span>
            <span className="font-extrabold text-emerald-500 font-mono">₹{kpis.totalStockValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <span className="text-border">|</span>

          <button
            onClick={() => { setSelectedStockStatus('LOW_STOCK'); setSelectedType('ALL'); }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-amber-500 transition-colors shrink-0 cursor-pointer"
          >
            <span className="text-muted-foreground">Low Stock</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 font-extrabold text-[11px]">{kpis.lowStockCount}</span>
          </button>
          <span className="text-border">|</span>

          <button
            onClick={() => { setSelectedStockStatus('OUT_OF_STOCK'); setSelectedType('ALL'); }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-red-500 transition-colors shrink-0 cursor-pointer"
          >
            <span className="text-muted-foreground">Out of Stock</span>
            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 font-extrabold text-[11px]">{kpis.outOfStockCount}</span>
          </button>
          <span className="text-border">|</span>

          <button
            onClick={() => { setSelectedType('SERVICE'); setSelectedStockStatus('ALL'); }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors shrink-0 cursor-pointer"
          >
            <span className="text-muted-foreground">Services</span>
            <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20 font-extrabold text-[11px]">{kpis.servicesCount}</span>
          </button>
          <span className="text-border">|</span>

          <button
            onClick={() => { setSelectedType('FINISHED_GOOD'); setSelectedStockStatus('ALL'); }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
          >
            <span className="text-muted-foreground">Inventory</span>
            <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-extrabold text-[11px]">{kpis.inventoryCount}</span>
          </button>
        </div>

        {/* ROW 3: Scrollable Quick Filter Chips */}
        <div className="flex items-center gap-2.5 pt-3 pb-1 border-t border-border/40 overflow-x-auto custom-scrollbar">
          {[
            { label: 'All Items', type: 'ALL', status: 'ALL', icon: Globe, count: kpis.totalProducts },
            { label: 'Inventory', type: 'FINISHED_GOOD', status: 'ALL', icon: Package, count: kpis.inventoryCount },
            { label: 'Services', type: 'SERVICE', status: 'ALL', icon: Wrench, count: kpis.servicesCount },
            { label: 'Raw Materials', type: 'RAW_MATERIAL', status: 'ALL', icon: Box, count: kpis.rawMaterialsCount },
            { label: 'Digital Items', type: 'DIGITAL', status: 'ALL', icon: Server, count: kpis.digitalCount },
            { label: 'Expense Items', type: 'EXPENSE', status: 'ALL', icon: FileText, count: kpis.expenseCount },
            { label: 'Assets', type: 'ASSET', status: 'ALL', icon: Archive, count: kpis.assetsCount },
            { label: 'Low Stock', type: 'ALL', status: 'LOW_STOCK', icon: AlertTriangle, count: kpis.lowStockCount },
            { label: 'Out of Stock', type: 'ALL', status: 'OUT_OF_STOCK', icon: Ban, count: kpis.outOfStockCount },
          ].map((chip, idx) => {
            const isActive = selectedType === chip.type && selectedStockStatus === chip.status;
            const Icon = chip.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedType(chip.type);
                  setSelectedStockStatus(chip.status);
                }}
                className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap border active:scale-95 ${
                  isActive
                    ? 'bg-accent text-accent-foreground border-accent shadow-sm scale-[1.02]'
                    : 'bg-background border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{chip.label}</span>
                <span className={`ml-0.5 text-[11px] ${isActive ? 'text-accent-foreground/80' : 'text-muted-foreground/70'}`}>
                  ({chip.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Product Intelligence Grid */}
      {loading ? (
        <TableLoader cols={7} rows={6} className="mt-6 border border-border/80 bg-surface rounded-2xl" />
      ) : filteredProducts.length === 0 ? (
        <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Products Found"
            description="No product records match the current filter criteria."
            actionLabel="Add Product"
            onActionClick={openNewModal}
          />
        </div>
      ) : (
        <div className="border border-border/80 bg-surface rounded-2xl overflow-hidden mt-6 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 border-b border-border">
                {isColVisible('sku') && <TableHead className="font-bold text-xs uppercase">SKU / Code</TableHead>}
                {isColVisible('name') && <TableHead className="font-bold text-xs uppercase">Product</TableHead>}
                {isColVisible('itemType') && <TableHead className="font-bold text-xs uppercase">Type</TableHead>}
                {isColVisible('category') && <TableHead className="font-bold text-xs uppercase">Category</TableHead>}
                {isColVisible('brand') && <TableHead className="font-bold text-xs uppercase">Brand</TableHead>}
                {isColVisible('unit') && <TableHead className="font-bold text-xs uppercase">Unit</TableHead>}
                {isColVisible('sellingPrice') && <TableHead className="font-bold text-xs uppercase text-right">Sell Rate</TableHead>}
                {isColVisible('purchasePrice') && <TableHead className="font-bold text-xs uppercase text-right">Purchase Cost</TableHead>}
                {isColVisible('margin') && <TableHead className="font-bold text-xs uppercase text-right">Margin %</TableHead>}
                {isColVisible('stock') && <TableHead className="font-bold text-xs uppercase text-right">Stock Level</TableHead>}
                {isColVisible('status') && <TableHead className="font-bold text-xs uppercase text-center">Status</TableHead>}
                <TableHead className="font-bold text-xs uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p: any) => {
                const totalStock = p.stocks ? p.stocks.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0) : 0;
                const sellingPrice = Number(p.sellingPrice || 0);
                const purchasePrice = Number(p.purchasePrice || 0);
                const margin = sellingPrice > 0 ? (((sellingPrice - purchasePrice) / sellingPrice) * 100).toFixed(1) : '0';

                return (
                  <TableRow
                    key={p.id}
                    onClick={() => setInspectProductId(p.id)}
                    className="hover:bg-muted/40 border-b border-border/60 transition-colors cursor-pointer group"
                  >
                    {isColVisible('sku') && (
                      <TableCell className="font-mono text-xs text-muted-foreground font-semibold">
                        {p.sku || '-'}
                      </TableCell>
                    )}

                    {isColVisible('name') && (
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Package className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">{p.name}</div>
                            {p.alias && <div className="text-[10px] text-muted-foreground">Alias: {p.alias}</div>}
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {isColVisible('itemType') && (
                      <TableCell>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border">
                          {p.itemType ? p.itemType.replace('_', ' ') : 'FINISHED GOOD'}
                        </span>
                      </TableCell>
                    )}

                    {isColVisible('category') && (
                      <TableCell className="text-xs text-foreground font-medium">
                        {p.category?.categoryName || p.category?.name || '-'}
                      </TableCell>
                    )}

                    {isColVisible('brand') && (
                      <TableCell className="text-xs text-muted-foreground">
                        {p.brand?.name || '-'}
                      </TableCell>
                    )}

                    {isColVisible('unit') && (
                      <TableCell className="text-xs font-semibold text-foreground">
                        {p.unit || 'PCS'}
                      </TableCell>
                    )}

                    {isColVisible('sellingPrice') && (
                      <TableCell className="text-right font-bold text-sm text-foreground">
                        ₹{sellingPrice.toLocaleString('en-IN')}
                      </TableCell>
                    )}

                    {isColVisible('purchasePrice') && (
                      <TableCell className="text-right font-medium text-xs text-muted-foreground">
                        ₹{purchasePrice.toLocaleString('en-IN')}
                      </TableCell>
                    )}

                    {isColVisible('margin') && (
                      <TableCell className="text-right font-bold text-xs text-emerald-500">
                        {margin}%
                      </TableCell>
                    )}

                    {isColVisible('stock') && (
                      <TableCell className="text-right">
                        {p.isInventoryItem ? (
                          <div className="inline-flex items-center gap-1.5 font-bold text-xs">
                            <span className={totalStock === 0 ? 'text-red-500' : totalStock <= Number(p.reorderLevel || 0) ? 'text-amber-500' : 'text-emerald-500'}>
                              {totalStock} {p.unit || 'PCS'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground uppercase">N/A</span>
                        )}
                      </TableCell>
                    )}

                    {isColVisible('status') && (
                      <TableCell className="text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${p.isActive !== false ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground'
                          }`}>
                          {p.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                    )}

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 h-8"
                          title="View Product Intelligence"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectProductId(p.id);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 text-accent" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2 h-8"
                          title="Edit"
                          onClick={(e) => openEditModal(e, p)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete"
                          onClick={(e) => handleDelete(e, p.id, p.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Product Edit/Create Modal */}
      {isModalOpen && (
        <ProductFormModal
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          product={selectedProduct}
        />
      )}

      {/* Product Intelligence Sliding Drawer */}
      <ProductDetailsDrawer
        productId={inspectProductId}
        onClose={() => setInspectProductId(null)}
        onEdit={(p) => {
          setInspectProductId(null);
          setSelectedProduct(p);
          setIsModalOpen(true);
        }}
      />
    </PageContainer>
  );
};
