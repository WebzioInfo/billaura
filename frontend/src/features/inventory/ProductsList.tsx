import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Trash2,
  Edit,
  Plus,
  MoreVertical,
  MoreHorizontal,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  FileDown,
  Copy,
  X,
  Check,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import {
  ZohoPageHeader,
  ZohoListTable,
  ZohoColumn,
  ZohoStatusText,
} from '@/shared/components/zoho';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { SectionErrorBoundary } from '@/shared/components/SectionErrorBoundary';
import { ExportService } from '@/core/services/ExportService';
import { normalizeItem, NormalizedItem } from './normalizeItem';

export const ProductsList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const routeParams = useParams<{ id: string }>();

  // State
  const [activeView, setActiveView] = useState('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'updatedAt' | 'sellingPrice'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // More Actions Menu State
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [moreSubmenu, setMoreSubmenu] = useState<'sort' | 'export' | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Detail Pane State
  const [detailTab, setDetailTab] = useState<'overview' | 'transactions' | 'history'>('overview');
  const [transactionFilter, setTransactionFilter] = useState('ALL');
  const [isDetailMoreOpen, setIsDetailMoreOpen] = useState(false);
  const [isPriceListsOpen, setIsPriceListsOpen] = useState(false);
  const detailMoreRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
        setMoreSubmenu(null);
      }
      if (detailMoreRef.current && !detailMoreRef.current.contains(e.target as Node)) {
        setIsDetailMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Selected item id from route or state
  const selectedProductId = routeParams.id || null;

  // Query Products
  const { data: rawProducts = [], isLoading: loading, isError: queryError, refetch } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products');
      return ensureArray(res);
    },
  });

  // Query Selected Product Details if opened directly
  const { data: directProductData, isLoading: loadingDirectItem } = useQuery({
    queryKey: ['product', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const res = await apiClient.get(`/products/${selectedProductId}`);
      return res.data?.data || res.data || null;
    },
    enabled: Boolean(selectedProductId),
  });

  // Query Stock Movements for Selected Product (Hardened with default [])
  const { data: rawMovements = [], isLoading: loadingMovements, refetch: refetchMovements } = useQuery<any[]>({
    queryKey: ['stock-transactions', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const res: any = await apiClient.get('/inventory/transactions', {
        params: { productId: selectedProductId, limit: 50 },
      });
      return ensureArray(res);
    },
    enabled: Boolean(selectedProductId),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return Promise.all(ids.map((id) => apiClient.delete(`/products/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      notification.success('Item(s) deleted successfully');
      setSelectedIds([]);
      if (selectedProductId) {
        // Navigate to the next item or back to list
        const remaining = filteredProducts.filter((p) => p.id !== selectedProductId);
        if (remaining.length > 0) {
          navigate(`/products/${remaining[0].id}`);
        } else {
          navigate('/products');
        }
      }
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete item');
    },
  });

  const handleDelete = async (ids: string[]) => {
    const confirmed = await dialog.confirmDelete(
      'Delete Item(s)?',
      `Are you sure you want to delete ${ids.length} selected item(s)? This action cannot be undone.`
    );
    if (confirmed) {
      deleteMutation.mutate(ids);
    }
  };

  // Clone Item
  const handleCloneItem = (itemToClone: NormalizedItem) => {
    navigate('/products/new', {
      state: {
        cloneFrom: {
          ...itemToClone.raw,
          id: undefined,
          name: `${itemToClone.name} (Copy)`,
          sku: itemToClone.sku ? `${itemToClone.sku}-COPY` : '',
        },
      },
    });
  };

  // Mark Active/Inactive
  const handleToggleActive = async (targetItem: NormalizedItem) => {
    try {
      const newStatus = targetItem.isActive ? 'INACTIVE' : 'ACTIVE';
      await apiClient.put(`/products/${targetItem.id}`, {
        ...targetItem.raw,
        status: newStatus,
        isActive: newStatus === 'ACTIVE',
      });
      notification.success(`Item marked as ${newStatus.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', targetItem.id] });
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Normalize all raw products
  const normalizedProducts = useMemo(() => {
    return (rawProducts || []).map((raw) => normalizeItem(raw));
  }, [rawProducts]);

  // Filter products by view & search
  const filteredProducts = useMemo(() => {
    return normalizedProducts.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.hsnCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.purchaseDescription.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesView = true;
      if (activeView === 'ACTIVE') {
        matchesView = p.isActive;
      } else if (activeView === 'INACTIVE') {
        matchesView = !p.isActive;
      } else if (activeView === 'LOW_STOCK') {
        matchesView = p.trackInventory && p.stockOnHand <= p.reorderPoint;
      }

      return matchesSearch && matchesView;
    });
  }, [normalizedProducts, searchTerm, activeView]);

  // Sorted Products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let valA: any = a[sortBy] ?? '';
      let valB: any = b[sortBy] ?? '';
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortBy, sortOrder]);

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, page, pageSize]);

  // Selected Item normalized
  const selectedProduct: NormalizedItem | null = useMemo(() => {
    if (!selectedProductId) return null;
    const fromList = normalizedProducts.find((p) => p.id === selectedProductId);
    if (fromList) return fromList;
    if (directProductData) return normalizeItem(directProductData);
    return null;
  }, [selectedProductId, normalizedProducts, directProductData]);

  // Export CSV
  const handleExport = (exportAll = true) => {
    const itemsToExport = exportAll ? sortedProducts : paginatedData;
    if (itemsToExport.length === 0) {
      notification.warning('No items to export');
      return;
    }
    const headers = [
      'Name',
      'Purchase Description',
      'Purchase Rate',
      'Description',
      'Rate',
      'Stock on Hand',
      'HSN/SAC',
      'Usage Unit',
    ];
    const rows = itemsToExport.map((p) => ({
      Name: p.name,
      'Purchase Description': p.purchaseDescription,
      'Purchase Rate': p.hasPurchase && p.costPrice ? p.costPrice.toFixed(2) : '',
      Description: p.description,
      Rate: p.sellingPrice.toFixed(2),
      'Stock on Hand': p.trackInventory ? p.stockOnHand.toFixed(2) : '',
      'HSN/SAC': p.hsnCode,
      'Usage Unit': p.unit,
    }));
    ExportService.exportCsv(
      exportAll ? 'Items_List.csv' : 'Items_Current_View.csv',
      rows,
      headers
    );
  };

  // Columns per Prompt 08:
  // Order: Name, Purchase Description, Purchase Rate, Description, Rate, Stock on Hand, HSN/SAC, Usage Unit
  const columns: ZohoColumn<NormalizedItem>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'NAME',
        isPrimary: true,
        width: '240px',
        render: (item) => (
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/${item.id}`);
            }}
            className="text-[#408DFB] hover:underline cursor-pointer leading-snug line-clamp-2 text-[13px] font-normal"
            title={item.name}
          >
            {item.name || 'Unnamed Item'}
          </div>
        ),
      },
      {
        key: 'purchaseDescription',
        label: 'PURCHASE DESCRIPTION',
        width: '180px',
        emptyFallback: '',
        render: (item) => (
          <span className="text-[#6B7280] truncate block text-[13px]" title={item.purchaseDescription}>
            {item.purchaseDescription || ''}
          </span>
        ),
      },
      {
        key: 'costPrice',
        label: 'PURCHASE RATE',
        align: 'right',
        isNumeric: true,
        width: '130px',
        emptyFallback: '',
        render: (item) => {
          if (!item.hasPurchase || !item.costPrice) return null;
          return (
            <span className="text-[#2B2F36] tabular-nums text-[13px] font-normal">
              ₹{item.costPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        key: 'description',
        label: 'DESCRIPTION',
        width: '200px',
        emptyFallback: '',
        render: (item) => (
          <span className="text-[#6B7280] truncate block text-[13px]" title={item.description}>
            {item.description || ''}
          </span>
        ),
      },
      {
        key: 'rate',
        label: 'RATE',
        align: 'right',
        isNumeric: true,
        width: '130px',
        render: (item) => (
          <span className="text-[#2B2F36] tabular-nums text-[13px] font-normal">
            ₹{item.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'stockOnHand',
        label: 'STOCK ON HAND',
        align: 'right',
        isNumeric: true,
        width: '130px',
        emptyFallback: '',
        render: (item) => {
          if (!item.trackInventory) return null;
          const isNegative = item.stockOnHand < 0;
          return (
            <span
              className={cn(
                'tabular-nums text-[13px] font-normal',
                isNegative ? 'text-[#E54B4B]' : 'text-[#2B2F36]'
              )}
            >
              {item.stockOnHand.toFixed(2)}
            </span>
          );
        },
      },
      {
        key: 'hsnCode',
        label: 'HSN/SAC',
        align: 'right',
        width: '110px',
        emptyFallback: '',
        render: (item) => (
          <span className="text-[#6B7280] text-[13px] font-normal">
            {item.hsnCode || ''}
          </span>
        ),
      },
      {
        key: 'unit',
        label: 'USAGE UNIT',
        width: '100px',
        emptyFallback: '',
        render: (item) => (
          <span className="text-[#6B7280] text-[13px] font-normal">
            {item.unit || ''}
          </span>
        ),
      },
    ],
    [navigate]
  );

  const VIEWS = [
    { id: 'ACTIVE', label: 'Active Items' },
    { id: 'ALL', label: 'All Items' },
    { id: 'LOW_STOCK', label: 'Low Stock' },
    { id: 'INACTIVE', label: 'Inactive Items' },
  ];

  // Helper for Item Type label
  const getItemTypeLabel = (p: NormalizedItem) => {
    if (p.type === 'SERVICE') return 'Service';
    if (p.hasSales && p.hasPurchase) return 'Sales and Purchase Items';
    if (p.hasSales) return 'Sales Items';
    if (p.hasPurchase) return 'Purchase Items';
    return 'Goods';
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      {/* If an item is selected, render Zoho SplitDetail View */}
      {selectedProductId ? (
        <div className="w-full h-full flex overflow-hidden bg-white select-none">
          {/* LEFT PANE (~340px): Active Items List */}
          <div className="w-80 md:w-[340px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col h-full overflow-hidden">
            {/* Header: "Active Items ▾", "+" blue square, "…" button */}
            <div className="h-11 px-3 border-b border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#2B2F36]">
                <span>Active Items</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigate('/products/new')}
                  className="w-6 h-6 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[2px] flex items-center justify-center transition-colors cursor-pointer"
                  title="New Item"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="p-1 text-[#6B7280] hover:text-[#2B2F36] rounded-[2px] cursor-pointer"
                  title="More Actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Left Scrollable Items Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
              {sortedProducts.map((p) => {
                const isSelected = p.id === selectedProductId;
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/products/${p.id}`)}
                    className={cn(
                      'px-3 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-2.5',
                      isSelected
                        ? 'bg-[#F0F5FF]'
                        : 'hover:bg-[#F9FAFB]'
                    )}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(p.id)}
                          onChange={(checked) => {
                            if (checked) {
                              setSelectedIds((prev) => [...prev, p.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== p.id));
                            }
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] text-[#2B2F36] font-normal leading-tight line-clamp-2">
                          {p.name || 'Unnamed Item'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-[13px] font-normal text-[#2B2F36] tabular-nums">
                        ₹{p.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: Item Detail Pane */}
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            {loadingDirectItem ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-center text-xs text-[#6B7280]">
                  <div className="inline-block w-6 h-6 border-2 border-[#408DFB] border-t-transparent rounded-full animate-spin mb-2" />
                  <p>Loading item details...</p>
                </div>
              </div>
            ) : !selectedProduct ? (
              <div className="flex-1 flex items-center justify-center p-12 text-center">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#2B2F36]">Item not found</p>
                  <p className="text-xs text-[#6B7280]">The selected item could not be found or has been deleted.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/products')}
                    className="px-3 py-1.5 bg-[#408DFB] text-white rounded-[4px] text-xs font-medium cursor-pointer"
                  >
                    Back to Items List
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Right Pane Header: Name (20px), Edit icon button, More ▾, X close */}
                <div className="px-6 py-4 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
                  <h2 className="text-[20px] font-semibold text-[#2B2F36] truncate leading-tight">
                    {selectedProduct.name}
                  </h2>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Pencil Edit Icon Button (Bordered) */}
                    <button
                      type="button"
                      onClick={() => navigate(`/products/${selectedProduct.id}/edit`)}
                      className="p-1.5 border border-[#D1D5DB] hover:bg-[#F9FAFB] rounded-[4px] text-[#2B2F36] transition-colors cursor-pointer"
                      title="Edit Item"
                    >
                      <Edit className="w-4 h-4 text-[#6B7280]" />
                    </button>

                    {/* More ▾ Button */}
                    <div className="relative" ref={detailMoreRef}>
                      <button
                        type="button"
                        onClick={() => setIsDetailMoreOpen(!isDetailMoreOpen)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#D1D5DB] hover:bg-[#F9FAFB] rounded-[4px] text-[13px] text-[#2B2F36] transition-colors cursor-pointer"
                      >
                        <span>More</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
                      </button>

                      {isDetailMoreOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E5E7EB] rounded-[4px] shadow-lg py-1 z-30 text-[13px] text-[#2B2F36]">
                          <button
                            type="button"
                            onClick={() => {
                              setIsDetailMoreOpen(false);
                              handleToggleActive(selectedProduct);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                          >
                            {selectedProduct.isActive ? 'Mark as Inactive' : 'Mark as Active'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsDetailMoreOpen(false);
                              handleCloneItem(selectedProduct);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                          >
                            Clone
                          </button>
                          <hr className="my-1 border-t border-[#E5E7EB]" />
                          <button
                            type="button"
                            onClick={() => {
                              setIsDetailMoreOpen(false);
                              handleDelete([selectedProduct.id]);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#FEF2F2] text-[#E54B4B] cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* X Close Button: returns to list */}
                    <button
                      type="button"
                      onClick={() => navigate('/products')}
                      className="p-1 rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] hover:bg-[#F3F4F6] transition-colors cursor-pointer ml-1"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Tabs: Overview | Transactions | History */}
                <div className="px-6 border-b border-[#E5E7EB] bg-white flex items-center gap-6 text-[13px] shrink-0">
                  <button
                    type="button"
                    onClick={() => setDetailTab('overview')}
                    className={cn(
                      'py-2.5 font-medium border-b-2 transition-colors cursor-pointer',
                      detailTab === 'overview'
                        ? 'border-[#408DFB] text-[#408DFB]'
                        : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
                    )}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('transactions')}
                    className={cn(
                      'py-2.5 font-medium border-b-2 transition-colors cursor-pointer',
                      detailTab === 'transactions'
                        ? 'border-[#408DFB] text-[#408DFB]'
                        : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
                    )}
                  >
                    Transactions
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('history')}
                    className={cn(
                      'py-2.5 font-medium border-b-2 transition-colors cursor-pointer',
                      detailTab === 'history'
                        ? 'border-[#408DFB] text-[#408DFB]'
                        : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
                    )}
                  >
                    History
                  </button>
                </div>

                {/* Detail Body Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {detailTab === 'overview' && (
                    <SectionErrorBoundary sectionName="Item Overview">
                      <div className="max-w-3xl space-y-6 text-[13px]">
                        {/* Top Overview Key-Value Pairs */}
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <span className="w-44 text-[#6B7280] shrink-0">Item Type</span>
                            <span className="text-[#2B2F36] font-normal">{getItemTypeLabel(selectedProduct)}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="w-44 text-[#6B7280] shrink-0">HSN Code</span>
                            <span className="text-[#2B2F36] font-normal">{selectedProduct.hsnCode || '—'}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="w-44 text-[#6B7280] shrink-0">Unit</span>
                            <span className="text-[#2B2F36] font-normal">{selectedProduct.unit || '—'}</span>
                          </div>
                          {selectedProduct.createdSource && (
                            <div className="flex items-center">
                              <span className="w-44 text-[#6B7280] shrink-0">Created Source</span>
                              <span className="text-[#2B2F36] font-normal">{selectedProduct.createdSource}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <span className="w-44 text-[#6B7280] shrink-0">Tax Preference</span>
                            <span className="text-[#2B2F36] font-normal">{selectedProduct.taxPreference}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="w-44 text-[#6B7280] shrink-0">Intra State Tax Rate</span>
                            <span className="text-[#2B2F36] font-normal">{selectedProduct.intraStateTaxRate}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="w-44 text-[#6B7280] shrink-0">Inter State Tax Rate</span>
                            <span className="text-[#2B2F36] font-normal">{selectedProduct.interStateTaxRate}</span>
                          </div>
                        </div>

                        {/* Purchase Information */}
                        {selectedProduct.hasPurchase && (
                          <div className="pt-2 space-y-3">
                            <h3 className="font-semibold text-[13px] text-[#2B2F36]">Purchase Information</h3>
                            <div className="space-y-3">
                              <div className="flex items-center">
                                <span className="w-44 text-[#6B7280] shrink-0">Cost Price</span>
                                <span className="text-[#2B2F36] font-normal">
                                  ₹{selectedProduct.costPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="w-44 text-[#6B7280] shrink-0">Purchase Account</span>
                                <span className="text-[#2B2F36] font-normal">{selectedProduct.purchaseAccount}</span>
                              </div>
                              {selectedProduct.preferredVendor && (
                                <div className="flex items-center">
                                  <span className="w-44 text-[#6B7280] shrink-0">Preferred Vendor</span>
                                  <span className="text-[#2B2F36] font-normal">{selectedProduct.preferredVendor}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Sales Information */}
                        {selectedProduct.hasSales && (
                          <div className="pt-2 space-y-3">
                            <h3 className="font-semibold text-[13px] text-[#2B2F36]">Sales Information</h3>
                            <div className="space-y-3">
                              <div className="flex items-center">
                                <span className="w-44 text-[#6B7280] shrink-0">Selling Price</span>
                                <span className="text-[#2B2F36] font-normal">
                                  ₹{selectedProduct.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="w-44 text-[#6B7280] shrink-0">Sales Account</span>
                                <span className="text-[#2B2F36] font-normal">{selectedProduct.salesAccount}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Inventory Information (if tracked) */}
                        {selectedProduct.trackInventory && (
                          <div className="pt-2 space-y-3">
                            <h3 className="font-semibold text-[13px] text-[#2B2F36]">Inventory Information</h3>
                            <div className="space-y-3">
                              <div className="flex items-center">
                                <span className="w-44 text-[#6B7280] shrink-0">Inventory Account</span>
                                <span className="text-[#2B2F36] font-normal">{selectedProduct.inventoryAccount}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="w-44 text-[#6B7280] shrink-0">Opening Stock</span>
                                <span className="text-[#2B2F36] font-normal">{selectedProduct.openingStock.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="w-44 text-[#6B7280] shrink-0">Reorder Point</span>
                                <span className="text-[#2B2F36] font-normal">{selectedProduct.reorderPoint}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="w-44 text-[#6B7280] shrink-0">Stock on Hand</span>
                                <span className="text-[#2B2F36] font-normal">{selectedProduct.stockOnHand.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Reporting Tags */}
                        <div className="pt-2 space-y-2">
                          <h3 className="font-semibold text-[13px] text-[#2B2F36]">Reporting Tags</h3>
                          <p className="text-[#6B7280] text-[13px]">
                            No reporting tag has been associated with this item.
                          </p>
                        </div>

                        {/* Associated Price Lists Collapsible */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setIsPriceListsOpen(!isPriceListsOpen)}
                            className="inline-flex items-center gap-1 text-[13px] text-[#408DFB] hover:underline cursor-pointer"
                          >
                            <span>Associated Price Lists</span>
                            <ChevronRight
                              className={cn(
                                'w-3.5 h-3.5 transition-transform duration-150',
                                isPriceListsOpen && 'rotate-90'
                              )}
                            />
                          </button>
                          {isPriceListsOpen && (
                            <div className="mt-2 p-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px] text-[12px] text-[#6B7280]">
                              No price lists currently associated with this item.
                            </div>
                          )}
                        </div>
                      </div>
                    </SectionErrorBoundary>
                  )}

                  {detailTab === 'transactions' && (
                    <SectionErrorBoundary sectionName="Item Transactions" onRetry={refetchMovements}>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[13px] font-semibold text-[#2B2F36]">
                            Transactions
                          </h4>
                          <select
                            value={transactionFilter}
                            onChange={(e) => setTransactionFilter(e.target.value)}
                            className="h-8 px-2.5 bg-white border border-[#D1D5DB] rounded-[4px] text-xs text-[#2B2F36] outline-none"
                          >
                            <option value="ALL">All Transactions</option>
                            <option value="INVOICES">Invoices</option>
                            <option value="BILLS">Bills</option>
                            <option value="ADJUSTMENTS">Inventory Adjustments</option>
                          </select>
                        </div>

                        <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-left">
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Type</th>
                                <th className="px-4 py-2">Reference</th>
                                <th className="px-4 py-2 text-right">Quantity</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                              {loadingMovements ? (
                                <tr>
                                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                                    <div className="inline-block w-4 h-4 border-2 border-[#408DFB] border-t-transparent rounded-full animate-spin mb-1" />
                                    <p>Loading transactions...</p>
                                  </td>
                                </tr>
                              ) : (rawMovements || []).length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                                    No transactions recorded for this item.
                                  </td>
                                </tr>
                              ) : (
                                (rawMovements || []).map((m: any, idx: number) => (
                                  <tr key={m.id || idx} className="hover:bg-[#F9FAFB]">
                                    <td className="px-4 py-2 text-[#6B7280]">{m.date?.split('T')[0] || m.createdAt?.split('T')[0] || '—'}</td>
                                    <td className="px-4 py-2 font-medium text-[#2B2F36]">{m.type || m.movementType || 'Adjustment'}</td>
                                    <td className="px-4 py-2 text-[#6B7280]">{m.reference || m.referenceNumber || '—'}</td>
                                    <td className="px-4 py-2 text-right font-medium tabular-nums">
                                      {Number(m.quantity || m.quantityChange || 0) > 0
                                        ? `+${m.quantity || m.quantityChange}`
                                        : (m.quantity || m.quantityChange || 0)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </SectionErrorBoundary>
                  )}

                  {detailTab === 'history' && (
                    <SectionErrorBoundary sectionName="Item History">
                      <div className="space-y-4">
                        <h4 className="text-[13px] font-semibold text-[#2B2F36]">
                          Activity History
                        </h4>
                        <div className="border border-[#E5E7EB] rounded-[4px] p-6 text-center text-xs text-[#6B7280] bg-[#F9FAFB]">
                          <p>Created on {selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleDateString() : 'N/A'}</p>
                          {selectedProduct.updatedAt && (
                            <p className="mt-1">Last modified on {new Date(selectedProduct.updatedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </SectionErrorBoundary>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Standard Items List View (Edge-to-edge, single scroll area) */
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-white">
          {/* Header Row */}
          <div className="relative">
            <ZohoPageHeader
              title="Active Items"
              views={VIEWS}
              activeViewId={activeView}
              onViewChange={(vId) => {
                setActiveView(vId);
                setPage(1);
              }}
              newAction={{
                label: 'New',
                onClick: () => navigate('/products/new'),
              }}
              moreActions={[
                { label: 'Sort by Name', onClick: () => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); } },
                { label: 'Sort by Created Time', onClick: () => { setSortBy('createdAt'); setSortOrder('desc'); } },
                { label: 'Sort by Rate', onClick: () => { setSortBy('sellingPrice'); setSortOrder('desc'); } },
                { label: 'Export Current View', onClick: () => handleExport(false) },
                { label: 'Reset Column Width', onClick: () => notification.success('Column widths reset') },
              ]}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
              onExport={() => handleExport(true)}
            />

            {/* Zoho "…" More Actions Menu Dropdown */}
            {isMoreMenuOpen && (
              <div
                ref={moreMenuRef}
                className="absolute right-4 top-12 w-52 bg-white border border-[#E5E7EB] rounded-[4px] shadow-xl py-1 z-50 text-[13px] text-[#2B2F36]"
              >
                {/* Sort by ▸ */}
                <div
                  className="relative group/sort"
                  onMouseEnter={() => setMoreSubmenu('sort')}
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#6B7280]" />
                      Sort by
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
                  </button>

                  {moreSubmenu === 'sort' && (
                    <div className="absolute left-full top-0 -ml-1 w-44 bg-white border border-[#E5E7EB] rounded-[4px] shadow-xl py-1 z-50">
                      {[
                        { key: 'name', label: 'Name' },
                        { key: 'createdAt', label: 'Created Time' },
                        { key: 'updatedAt', label: 'Last Modified Time' },
                        { key: 'sellingPrice', label: 'Rate' },
                      ].map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => {
                            if (sortBy === s.key) {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortBy(s.key as any);
                              setSortOrder('asc');
                            }
                            setIsMoreMenuOpen(false);
                            setMoreSubmenu(null);
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                        >
                          <span>{s.label}</span>
                          {sortBy === s.key && (
                            <Check className="w-3.5 h-3.5 text-[#408DFB]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export ▸ */}
                <div
                  className="relative group/export"
                  onMouseEnter={() => setMoreSubmenu('export')}
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileDown className="w-3.5 h-3.5 text-[#6B7280]" />
                      Export
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
                  </button>

                  {moreSubmenu === 'export' && (
                    <div className="absolute left-full top-0 -ml-1 w-44 bg-white border border-[#E5E7EB] rounded-[4px] shadow-xl py-1 z-50">
                      <button
                        type="button"
                        onClick={() => {
                          handleExport(true);
                          setIsMoreMenuOpen(false);
                          setMoreSubmenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                      >
                        Export Items
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleExport(false);
                          setIsMoreMenuOpen(false);
                          setMoreSubmenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                      >
                        Export Current View
                      </button>
                    </div>
                  )}
                </div>

                <hr className="my-1 border-t border-[#E5E7EB]" />

                {/* Refresh List */}
                <button
                  type="button"
                  onClick={() => {
                    refetch();
                    setIsMoreMenuOpen(false);
                    notification.info('Refreshing items...');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Refresh List</span>
                </button>

                {/* Reset Column Width */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    notification.success('Column widths reset to default');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Reset Column Width</span>
                </button>
              </div>
            )}
          </div>

          {/* Edge-to-Edge Table (No outer padding, no card border, single scrollbar) */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
            <ZohoListTable
              columns={columns}
              data={paginatedData}
              keyField="id"
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              onRowClick={(row) => navigate(`/products/${row.id}`)}
              isLoading={loading}
              searchPlaceholder="Search in Items (Name, SKU, HSN, Description)..."
              onSearchChange={setSearchTerm}
              bulkActions={[
                {
                  label: 'Delete',
                  icon: Trash2,
                  variant: 'danger',
                  onClick: (ids) => handleDelete(ids),
                },
              ]}
              pagination={{
                currentPage: page,
                pageSize: pageSize,
                totalCount: sortedProducts.length,
                onPageChange: setPage,
                onPageSizeChange: (newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsList;
