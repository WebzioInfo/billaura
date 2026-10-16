import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
  FileDown,
  Upload,
  X,
  FileText, 
  Check,
  Edit, 
  Trash2, 
  Printer, 
  Package, 
  BarChart2,
  Search,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/core/api/apiClient';
import notification from '@/core/services/NotificationService';
import { ExportService } from '@/core/services/ExportService';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { 
  ZohoSplitDetail, 
  ZohoStatusText, 
} from '@/shared/components/zoho';
import { InventoryAdjustmentForm } from './InventoryAdjustmentForm';
import { cn } from '@/lib/utils';

export interface AdjustmentRecord {
  id: string;
  date: string;
  reason: string;
  description: string;
  status: 'ADJUSTED' | 'DRAFT';
  referenceNumber: string;
  type: 'Quantity' | 'Value';
  createdBy: string;
  createdTime: string;
  lastModifiedBy: string;
  lastModifiedTime: string;
  productName?: string;
  quantityChange?: number;
  quantityBefore?: number;
  quantityAfter?: number;
  unit?: string;
  averageCost?: number;
  warehouseName?: string;
  raw?: any;
}

export const InventoryAdjustmentsList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null);
  const [isNewFormOpen, setIsNewFormOpen] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'referenceNumber' | 'createdTime' | 'status'>('createdTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Three-dot Overflow Menu State
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [moreSubmenu, setMoreSubmenu] = useState<'sort' | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Close overflow menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
        setMoreSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch transactions from backend
  const { data: transactionsRes, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['transactions', { page, limit: 100 }],
    queryFn: async () => {
      try {
        const res: any = await api.get('/inventory/transactions', {
          params: { page: 1, limit: 100 },
        });
        return res.data || res;
      } catch (err) {
        console.error('Failed to fetch transactions', err);
        return { data: [], meta: { total: 0 } };
      }
    },
  });

  // Fetch warehouses for mapping
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res: any = await api.get('/warehouses');
      return res.data || res || [];
    },
  });

  const warehouseMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of warehouses) {
      map.set(w.id, w.name);
    }
    return map;
  }, [warehouses]);

  // Read local drafts
  const localDrafts = useMemo(() => {
    try {
      const raw = localStorage.getItem('billaura_adjustment_drafts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [isNewFormOpen]);

  // Aggregate into clean adjustment records
  const allAdjustments: AdjustmentRecord[] = useMemo(() => {
    const list: AdjustmentRecord[] = [];

    // 1. Add drafts
    for (const draft of localDrafts) {
      list.push({
        id: draft.id,
        date: draft.date || new Date().toISOString().split('T')[0],
        reason: draft.reason || 'Stocktaking results',
        description: draft.description || '',
        status: 'DRAFT',
        referenceNumber: draft.referenceNumber || 'DRAFT-ADJ',
        type: draft.mode === 'VALUE' ? 'Value' : 'Quantity',
        createdBy: 'ALI HASHIM',
        createdTime: draft.createdAt ? new Date(draft.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—',
        lastModifiedBy: 'ALI HASHIM',
        lastModifiedTime: draft.createdAt ? new Date(draft.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—',
        raw: draft,
      });
    }

    // 2. Add backend ledger transactions (ADJUSTMENT type)
    const txData = Array.isArray(transactionsRes?.data) ? transactionsRes.data : Array.isArray(transactionsRes) ? transactionsRes : [];
    for (const tx of txData) {
      if (tx.type !== 'ADJUSTMENT' && tx.referenceType !== 'STOCK_ADJUSTMENT') continue;

      let reason = 'Stocktaking results';
      let description = tx.notes || '';
      let refNo = `ADJ-${tx.id.slice(-6).toUpperCase()}`;

      if (tx.notes) {
        const reasonMatch = tx.notes.match(/\[Reason:\s*([^\]]+)\]/i);
        if (reasonMatch) reason = reasonMatch[1].trim();
        const refMatch = tx.notes.match(/\[Ref:\s*([^\]]+)\]/i);
        if (refMatch) refNo = refMatch[1].trim();
        description = tx.notes.replace(/\[[^\]]+\]/g, '').trim();
      }

      const txDate = tx.date ? new Date(tx.date) : new Date(tx.createdAt);
      const formattedDate = txDate.toISOString().split('T')[0];
      const formattedTime = txDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

      list.push({
        id: tx.id,
        date: formattedDate,
        reason,
        description,
        status: 'ADJUSTED',
        referenceNumber: refNo,
        type: (tx.notes?.includes('[Mode: VALUE]') || tx.notes?.includes('[Mode: Value]')) ? 'Value' : 'Quantity',
        createdBy: 'ALI HASHIM',
        createdTime: formattedTime,
        lastModifiedBy: 'ALI HASHIM',
        lastModifiedTime: formattedTime,
        productName: tx.product?.name || 'Item',
        quantityChange: Number(tx.quantityChange || 0),
        quantityBefore: Number(tx.quantityBefore || 0),
        quantityAfter: Number(tx.quantityAfter || 0),
        unit: tx.product?.unit || 'pcs',
        averageCost: Number(tx.averageCost || 0),
        warehouseName: tx.referenceId ? warehouseMap.get(tx.referenceId) || 'Main Warehouse' : 'Main Warehouse',
        raw: tx,
      });
    }

    return list;
  }, [transactionsRes, localDrafts, warehouseMap]);

  // Filter records
  const filteredAdjustments = useMemo(() => {
    return allAdjustments.filter((item) => {
      // Type filter
      if (typeFilter !== 'ALL' && item.type.toUpperCase() !== typeFilter.toUpperCase()) {
        return false;
      }

      // Period filter
      if (periodFilter !== 'ALL') {
        const itemDate = new Date(item.date);
        const now = new Date();
        if (periodFilter === 'TODAY') {
          if (itemDate.toDateString() !== now.toDateString()) return false;
        } else if (periodFilter === 'THIS_WEEK') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (itemDate < sevenDaysAgo) return false;
        } else if (periodFilter === 'THIS_MONTH') {
          if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (periodFilter === 'THIS_YEAR') {
          if (itemDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.referenceNumber.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.productName && item.productName.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [allAdjustments, typeFilter, periodFilter, searchQuery]);

  // Sorted records
  const sortedAdjustments = useMemo(() => {
    return [...filteredAdjustments].sort((a, b) => {
      let valA: any = a[sortBy] ?? '';
      let valB: any = b[sortBy] ?? '';

      if (sortBy === 'date' || sortBy === 'createdTime') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAdjustments, sortBy, sortOrder]);

  // Paginated records
  const paginatedAdjustments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedAdjustments.slice(start, start + pageSize);
  }, [sortedAdjustments, page, pageSize]);

  // Selected item for split view
  const selectedAdjustment = useMemo(() => {
    if (!selectedAdjustmentId) return null;
    return allAdjustments.find((a) => a.id === selectedAdjustmentId) || null;
  }, [selectedAdjustmentId, allAdjustments]);

  // Compact items for left pane in split view
  const splitItems = useMemo(() => {
    return sortedAdjustments.map((a) => ({
      id: a.id,
      name: a.reason,
      number: a.referenceNumber,
      date: a.date,
      amount: a.quantityChange !== undefined ? (a.quantityChange > 0 ? `+${a.quantityChange}` : `${a.quantityChange}`) : undefined,
      status: a.status,
    }));
  }, [sortedAdjustments]);

  // Handle Sort Toggle
  const handleSort = (field: 'date' | 'referenceNumber' | 'createdTime' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (sortedAdjustments.length === 0) {
      notification.warning('No adjustments to export');
      return;
    }
    const headers = [
      'Date',
      'Reason',
      'Description',
      'Status',
      'Reference Number',
      'Adjustment Type',
      'Created By',
      'Created Time',
      'Last Modified By',
    ];
    const rows = sortedAdjustments.map((a) => ({
      Date: a.date,
      Reason: a.reason,
      Description: a.description,
      Status: a.status,
      'Reference Number': a.referenceNumber,
      'Adjustment Type': a.type,
      'Created By': a.createdBy,
      'Created Time': a.createdTime,
      'Last Modified By': a.lastModifiedBy,
    }));
    ExportService.exportCsv('Inventory_Adjustments.csv', rows, headers);
    setIsMoreMenuOpen(false);
  };

  // Refresh handler
  const handleRefresh = async () => {
    setIsMoreMenuOpen(false);
    try {
      await refetch();
      notification.success('Inventory adjustments refreshed');
    } catch {
      notification.error('Failed to refresh adjustments');
    }
  };

  // Selection handlers
  const isAllSelected =
    paginatedAdjustments.length > 0 &&
    paginatedAdjustments.every((a) => selectedIds.includes(a.id));
  const isSomeSelected = selectedIds.length > 0;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedAdjustments.map((a) => a.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleDeleteDraft = (draftId: string) => {
    try {
      const raw = localStorage.getItem('billaura_adjustment_drafts');
      if (raw) {
        const list = JSON.parse(raw).filter((d: any) => d.id !== draftId);
        localStorage.setItem('billaura_adjustment_drafts', JSON.stringify(list));
      }
      notification.success('Draft adjustment removed.');
      setSelectedAdjustmentId(null);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch {
      notification.error('Failed to remove draft.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden text-xs text-[#2B2F36] select-none">
      {/* If an adjustment is selected, render Zoho SplitDetail View */}
      {selectedAdjustment ? (
        <ZohoSplitDetail
          moduleTitle="Inventory Adjustments"
          items={splitItems}
          selectedId={selectedAdjustmentId || ''}
          onSelect={(id) => setSelectedAdjustmentId(id)}
          onNew={() => setIsNewFormOpen(true)}
          onClose={() => setSelectedAdjustmentId(null)}
          detailTitle={selectedAdjustment.referenceNumber}
          detailActions={
            <div className="flex items-center gap-2">
              {selectedAdjustment.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={() => setIsNewFormOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Edit Draft</span>
                </button>
              )}
              {selectedAdjustment.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={() => handleDeleteDraft(selectedAdjustment.id)}
                  className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#FEF2F2] rounded-[4px] text-[#6B7280] hover:text-[#E54B4B] cursor-pointer"
                  title="Delete Draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] cursor-pointer"
                title="Print Adjustment"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          }
        >
          {/* Detail Pane Content */}
          <div className="p-6 space-y-6 text-xs text-[#2B2F36]">
            {/* Header info strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
              <div>
                <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block">Reference Number</span>
                <span className="font-mono font-bold text-base text-[#1E2540]">{selectedAdjustment.referenceNumber}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block">Status</span>
                <span className={cn(
                  'font-semibold text-xs',
                  selectedAdjustment.status === 'ADJUSTED' ? 'text-[#408DFB]' : 'text-[#6B7280]'
                )}>
                  {selectedAdjustment.status}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block">Date</span>
                <span className="font-medium text-sm text-[#2B2F36]">{selectedAdjustment.date}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#6B7280] uppercase tracking-wider block">Mode</span>
                <span className="font-medium text-sm text-[#2B2F36]">{selectedAdjustment.type} Adjustment</span>
              </div>
            </div>

            {/* General Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                Adjustment Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#6B7280] block">Reason</span>
                  <span className="font-medium text-[#2B2F36]">{selectedAdjustment.reason}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Warehouse</span>
                  <span className="font-medium text-[#2B2F36]">{selectedAdjustment.warehouseName || 'Main Warehouse'}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Created By</span>
                  <span className="text-[#2B2F36]">{selectedAdjustment.createdBy} ({selectedAdjustment.createdTime})</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Last Modified</span>
                  <span className="text-[#2B2F36]">{selectedAdjustment.lastModifiedBy} ({selectedAdjustment.lastModifiedTime})</span>
                </div>
              </div>

              {selectedAdjustment.description && (
                <div className="pt-2">
                  <span className="text-[#6B7280] block mb-1">Description / Notes</span>
                  <p className="p-2.5 bg-[#F8F9FB] rounded-[4px] border border-[#E5E7EB] text-[#2B2F36]">
                    {selectedAdjustment.description}
                  </p>
                </div>
              )}
            </div>

            {/* Affected Item Details */}
            {selectedAdjustment.productName && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                  Adjusted Stock Items
                </h4>
                <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-left">
                        <th className="px-4 py-2">Item Name</th>
                        <th className="px-4 py-2 text-right">Qty Before</th>
                        <th className="px-4 py-2 text-right">Adjustment</th>
                        <th className="px-4 py-2 text-right">Qty After</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-2.5 font-medium text-[#2B2F36]">{selectedAdjustment.productName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#6B7280]">{selectedAdjustment.quantityBefore ?? 0} {selectedAdjustment.unit}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                          <span className={Number(selectedAdjustment.quantityChange || 0) > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                            {Number(selectedAdjustment.quantityChange || 0) > 0 ? `+${selectedAdjustment.quantityChange}` : selectedAdjustment.quantityChange} {selectedAdjustment.unit}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-[#2B2F36]">{selectedAdjustment.quantityAfter ?? 0} {selectedAdjustment.unit}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </ZohoSplitDetail>
      ) : (
        /* Standard Inventory Adjustments List View */
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-white">
          {/* 1. Header (Zoho Inventory Reference Style) */}
          <div className="h-12 px-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
            <h1 className="text-[20px] font-semibold text-[#2B2F36] leading-tight">
              Inventory Adjustments
            </h1>

            <div className="flex items-center gap-3">
              {/* FIFO Cost Lot Tracking Report link */}
              <button
                type="button"
                onClick={() => notification.info('FIFO Cost Lot Tracking Report opened')}
                className="text-[#408DFB] hover:underline text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>FIFO Cost Lot Tracking Report</span>
              </button>

              {/* Primary + New Button */}
              <button
                type="button"
                onClick={() => setIsNewFormOpen(true)}
                className="h-8 px-3.5 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
              </button>

              {/* Functional Three-Dot Overflow Menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="h-8 w-8 border border-[#D1D5DB] hover:bg-[#F9FAFB] rounded-[4px] flex items-center justify-center text-[#6B7280] hover:text-[#2B2F36] transition-colors cursor-pointer"
                  title="More Actions"
                  aria-label="More Actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-[#E5E7EB] rounded-[4px] shadow-xl py-1 z-50 text-[13px] text-[#2B2F36] animate-in fade-in duration-100">
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
                        <div className="absolute left-full top-0 -ml-1 w-48 bg-white border border-[#E5E7EB] rounded-[4px] shadow-xl py-1 z-50">
                          {[
                            { key: 'date', label: 'Date' },
                            { key: 'createdTime', label: 'Created Time' },
                            { key: 'referenceNumber', label: 'Reference Number' },
                            { key: 'status', label: 'Status' },
                          ].map((s) => (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => {
                                handleSort(s.key as any);
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

                    {/* Import */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        notification.info('Inventory Adjustments bulk import is currently handled via migration template.');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F3F4F6] text-[#6B7280] cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#6B7280]" />
                      <span>Import</span>
                    </button>

                    {/* Export Inventory Adjustments */}
                    <button
                      type="button"
                      onClick={handleExport}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-[#6B7280]" />
                      <span>Export Inventory Adjustments</span>
                    </button>

                    <hr className="my-1 border-t border-[#E5E7EB]" />

                    {/* Refresh List */}
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F3F4F6] cursor-pointer"
                    >
                      <RefreshCw className={cn('w-3.5 h-3.5 text-[#6B7280]', isFetching && 'animate-spin')} />
                      <span>Refresh List</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Compact Filter Toolbar (Zoho Style: Filter By : Type: All ▾  Period: All ▾) */}
          <div className="px-6 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#6B7280]">Filter By :</span>

              {/* Type Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[#6B7280]">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 px-2 bg-white border border-[#D1D5DB] rounded-[3px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value="ALL">All</option>
                  <option value="QUANTITY">Quantity</option>
                  <option value="VALUE">Value</option>
                </select>
              </div>

              {/* Period Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[#6B7280]">Period:</span>
                <select
                  value={periodFilter}
                  onChange={(e) => {
                    setPeriodFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 px-2 bg-white border border-[#D1D5DB] rounded-[3px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value="ALL">All</option>
                  <option value="TODAY">Today</option>
                  <option value="THIS_WEEK">This Week</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="THIS_YEAR">This Year</option>
                </select>
              </div>

              {(typeFilter !== 'ALL' || periodFilter !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('ALL');
                    setPeriodFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="text-[#408DFB] hover:underline text-xs ml-2 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* In-table Search */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search reference, reason, item..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full h-7 pl-7 pr-3 bg-white border border-[#D1D5DB] rounded-[3px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>
          </div>

          {/* 3. Edge-to-Edge Table Layout (36px header, 13px rows) */}
          <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 bg-white">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider h-9 sticky top-0 z-10 select-none">
                  <th className="w-10 px-4 py-2">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={!isAllSelected && isSomeSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    onClick={() => handleSort('date')}
                    className="px-4 py-2 font-semibold cursor-pointer hover:text-[#408DFB]"
                  >
                    <div className="flex items-center gap-1">
                      <span>DATE</span>
                      <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                    </div>
                  </th>
                  <th className="px-4 py-2 font-semibold">REASON</th>
                  <th className="px-4 py-2 font-semibold">DESCRIPTION</th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-4 py-2 font-semibold cursor-pointer hover:text-[#408DFB]"
                  >
                    <div className="flex items-center gap-1">
                      <span>STATUS</span>
                      <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('referenceNumber')}
                    className="px-4 py-2 font-semibold cursor-pointer hover:text-[#408DFB]"
                  >
                    <div className="flex items-center gap-1">
                      <span>REFERENCE NUMBER</span>
                      <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                    </div>
                  </th>
                  <th className="px-4 py-2 font-semibold">TYPE</th>
                  <th className="px-4 py-2 font-semibold">CREATED BY</th>
                  <th 
                    onClick={() => handleSort('createdTime')}
                    className="px-4 py-2 font-semibold cursor-pointer hover:text-[#408DFB]"
                  >
                    <div className="flex items-center gap-1">
                      <span>CREATED TIME</span>
                      <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                    </div>
                  </th>
                  <th className="px-4 py-2 font-semibold">LAST MODIFIED BY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-xs text-[#6B7280]">
                      <div className="inline-block w-5 h-5 border-2 border-[#408DFB] border-t-transparent rounded-full animate-spin mb-2" />
                      <p>Loading inventory adjustments...</p>
                    </td>
                  </tr>
                ) : paginatedAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-xs text-[#6B7280]">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-[#2B2F36]">No inventory adjustments found</p>
                        <p className="text-xs text-[#6B7280]">
                          {searchQuery || typeFilter !== 'ALL' || periodFilter !== 'ALL'
                            ? 'Try adjusting or clearing your filters.'
                            : 'Create your first inventory adjustment to adjust stock quantities or values.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsNewFormOpen(true)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-[#408DFB] text-white rounded-[4px] text-xs font-medium cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New Adjustment</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAdjustments.map((row) => {
                    const isSelected = selectedIds.includes(row.id);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedAdjustmentId(row.id)}
                        className={cn(
                          'hover:bg-[#F5F7FA] transition-colors cursor-pointer min-h-[41px]',
                          isSelected && 'bg-[#F0F5FF]'
                        )}
                      >
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectRow(row.id)}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-[#2B2F36]">
                          {row.date}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-[#2B2F36]">
                          {row.reason}
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280]">
                          {row.description ? (
                            <div className="flex items-center gap-1.5" title={row.description}>
                              <FileText className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                              <span className="truncate max-w-[140px]">{row.description}</span>
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              row.status === 'ADJUSTED' ? 'text-[#408DFB]' : 'text-[#6B7280]'
                            )}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[#408DFB] hover:underline font-mono font-medium">
                            {row.referenceNumber}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[#2B2F36]">
                          {row.type}
                        </td>
                        <td className="px-4 py-2.5 text-[#2B2F36]">
                          {row.createdBy}
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280] text-xs tabular-nums">
                          {row.createdTime}
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280]">
                          {row.lastModifiedBy}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Fixed Bottom Pagination Bar (Zoho Style) */}
          <div className="shrink-0 flex items-center justify-between px-6 h-10 bg-[#F8F9FB] border-t border-[#E5E7EB] text-[12px] text-[#6B7280]">
            <div className="flex items-center gap-4">
              <span>
                Total: <strong className="text-[#2B2F36] font-semibold">{filteredAdjustments.length}</strong>
              </span>

              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] rounded-[4px] px-2 py-0.5 text-[12px] text-[#2B2F36] focus:outline-none focus:border-[#408DFB] cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span>
                Page <strong className="text-[#2B2F36]">{page}</strong> of{' '}
                {Math.max(1, Math.ceil(filteredAdjustments.length / pageSize))}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-2 py-0.5 rounded-[4px] border border-[#CBD5E1] bg-white text-[#2B2F36] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] cursor-pointer"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= Math.ceil(filteredAdjustments.length / pageSize)}
                  onClick={() => setPage(page + 1)}
                  className="px-2 py-0.5 rounded-[4px] border border-[#CBD5E1] bg-white text-[#2B2F36] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3F4F6] cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Adjustment Form Modal / Full Screen */}
      {isNewFormOpen && (
        <InventoryAdjustmentForm
          isOpen={isNewFormOpen}
          onClose={() => setIsNewFormOpen(false)}
          onSuccess={() => {
            setIsNewFormOpen(false);
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
          }}
        />
      )}
    </div>
  );
};

export default InventoryAdjustmentsList;
