import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Plus, Edit, Trash2, Search, Filter, Layers, Package, AlertTriangle, TrendingUp, Columns, Eye, ChevronDown, Check, Box, Wrench, Globe, Archive, Server, FileText, Ban } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, StatusBadge, CurrencyCell, Button, IconButton, SearchableSelect } from '@/shared/components/ui';
import { EmptyState } from '@/shared/components/ui/LayoutComponents';
import { Pagination } from '@/shared/components/ui/Pagination';
import { usePagination } from '@/shared/hooks/usePagination';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  // TODO: Endpoint /products should support server-side pagination (?page=&limit=)
  const {
    page,
    limit,
    paginatedData: paginatedProducts,
    totalPages,
    totalItems,
    setPage,
    setLimit,
  } = usePagination({
    data: filteredProducts,
    tableKey: 'products_list',
    defaultLimit: 25,
  });

  return (
    <PageLayout>
      <PageHeader
        title="Products"
        count={filteredProducts.length}
        primaryAction={
          <Button
            onClick={openNewModal}
            variant="primary"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Product
          </Button>
        }
      />

      {/* COMMAND TOOLBAR */}
      <div className="bg-surface border border-border rounded-xl p-3 shadow-xs space-y-2 shrink-0">
        {/* ROW 1: Search and Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Product Name, SKU, Barcode, HSN, Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none"
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

            <div className="w-48">
              <SearchableSelect
                placeholder="All Categories"
                searchPlaceholder="Search category..."
                value={selectedCategory === 'ALL' ? '' : selectedCategory}
                onChange={(val) => setSelectedCategory(val || 'ALL')}
                options={categories}
                mapOption={(c: any) => ({ label: c.categoryName || c.name, value: c.id })}
                clearable
              />
            </div>

            {/* Column Chooser Button */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsColumnChooserOpen(!isColumnChooserOpen)}
                className="flex items-center gap-1.5"
              >
                <Columns className="w-3.5 h-3.5" /> Columns <ChevronDown className="w-3 h-3" />
              </Button>

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
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-card border border-border rounded-xl shadow-xs overflow-hidden mt-3">
          <div className="flex-1 min-h-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#34303F] hover:bg-[#34303F] text-white border-none">
                  {isColVisible('sku') && <TableHead className="pl-6 pr-4 text-white font-medium">SKU / Code</TableHead>}
                  {isColVisible('name') && <TableHead className={cn("text-white font-medium", !isColVisible('sku') && "pl-6 pr-4")}>Product</TableHead>}
                  {isColVisible('itemType') && <TableHead className="text-white font-medium">Type</TableHead>}
                  {isColVisible('category') && <TableHead className="text-white font-medium">Category</TableHead>}
                  {isColVisible('brand') && <TableHead className="text-white font-medium">Brand</TableHead>}
                  {isColVisible('unit') && <TableHead className="text-white font-medium">Unit</TableHead>}
                  {isColVisible('sellingPrice') && <TableHead align="right" className="text-white font-medium">Sell Rate</TableHead>}
                  {isColVisible('purchasePrice') && <TableHead align="right" className="text-white font-medium">Purchase Cost</TableHead>}
                  {isColVisible('margin') && <TableHead align="right" className="text-white font-medium">Margin %</TableHead>}
                  {isColVisible('stock') && <TableHead align="right" className="text-white font-medium">Stock Level</TableHead>}
                  {isColVisible('status') && <TableHead align="center" className="text-white font-medium">Status</TableHead>}
                  <TableHead align="right" className="pr-6 pl-4 text-white font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((p: any) => {
              const totalStock = p.stocks ? p.stocks.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0) : 0;
              const sellingPrice = Number(p.sellingPrice || 0);
              const purchasePrice = Number(p.purchasePrice || 0);
              const margin = sellingPrice > 0 ? (((sellingPrice - purchasePrice) / sellingPrice) * 100).toFixed(1) : '0';

              return (
                <TableRow
                  key={p.id}
                  onClick={() => setInspectProductId(p.id)}
                  className="cursor-pointer group"
                >
                  {isColVisible('sku') && (
                    <TableCell className="pl-6 pr-4 font-mono font-medium text-foreground">
                      {p.sku || '—'}
                    </TableCell>
                  )}

                  {isColVisible('name') && (
                    <TableCell className={cn("font-medium text-foreground", !isColVisible('sku') && "pl-6 pr-4")}>
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-foreground group-hover:underline transition-colors">{p.name}</span>
                        {p.alias && <span className="text-[11px] text-muted-foreground">({p.alias})</span>}
                      </div>
                    </TableCell>
                  )}

                  {isColVisible('itemType') && (
                    <TableCell className="text-xs text-muted-foreground uppercase font-medium">
                      {p.itemType ? p.itemType.replace('_', ' ') : 'FINISHED GOOD'}
                    </TableCell>
                  )}

                  {isColVisible('category') && (
                    <TableCell className="text-muted-foreground font-medium">
                      {p.category?.categoryName || p.category?.name || '—'}
                    </TableCell>
                  )}

                  {isColVisible('brand') && (
                    <TableCell className="text-muted-foreground">
                      {p.brand?.name || '—'}
                    </TableCell>
                  )}

                  {isColVisible('unit') && (
                    <TableCell className="font-medium text-foreground">
                      {p.unit || 'PCS'}
                    </TableCell>
                  )}

                  {isColVisible('sellingPrice') && (
                    <CurrencyCell amount={sellingPrice} className="font-semibold text-foreground" />
                  )}

                  {isColVisible('purchasePrice') && (
                    <CurrencyCell amount={purchasePrice} />
                  )}

                  {isColVisible('margin') && (
                    <TableCell align="right" className="tabular-nums text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {margin}%
                    </TableCell>
                  )}

                  {isColVisible('stock') && (
                    <TableCell align="right" className="tabular-nums text-xs font-semibold">
                      {p.isInventoryItem ? (
                        <span className={totalStock === 0 ? 'text-red-500' : totalStock <= Number(p.reorderLevel || 0) ? 'text-amber-500' : 'text-foreground'}>
                          {totalStock} {p.unit || 'PCS'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal">N/A</span>
                      )}
                    </TableCell>
                  )}

                  {isColVisible('status') && (
                    <TableCell align="center">
                      <StatusBadge status={p.isActive !== false ? 'ACTIVE' : 'INACTIVE'} />
                    </TableCell>
                  )}

                  <TableCell align="right" className="pr-6 pl-4">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton
                        icon={Eye}
                        aria-label="View Details"
                        tooltip="View Details"
                        size="dense"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectProductId(p.id);
                        }}
                      />
                      <IconButton
                        icon={Edit}
                        aria-label="Edit Product"
                        tooltip="Edit Product"
                        size="dense"
                        onClick={(e) => openEditModal(e, p)}
                      />
                      <IconButton
                        icon={Trash2}
                        aria-label="Delete Product"
                        tooltip="Delete Product"
                        size="dense"
                        variant="danger-ghost"
                        onClick={(e) => handleDelete(e, p.id, p.name)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        itemLabel="products"
      />
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
    </PageLayout>
  );
};
