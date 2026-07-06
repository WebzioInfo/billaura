import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, RefreshCw, Filter, Eye, Edit2, Copy, Trash2, 
  CheckCircle, XCircle, FileText, Download, Printer, Mail,
  ChevronDown, AlertCircle, ShoppingCart, TrendingUp, Info
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer, EmptyState, LoadingState } from '@/components/ui/LayoutComponents';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import apiClient from '@/services/api';
import { toast } from 'sonner';

export const PurchaseOrdersList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const [showFilters, setShowFilters] = useState(false);

  // Fetch Master Data
  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/vendors');
      const list = res.data?.data || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      const list = res.data?.data || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  // Query parameters for API
  const queryParams = useMemo(() => {
    return {
      search: search || undefined,
      status: status || undefined,
      vendorId: vendorId || undefined,
      warehouseId: warehouseId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      amountMin: amountMin || undefined,
      amountMax: amountMax || undefined,
      limit: 100
    };
  }, [search, status, vendorId, warehouseId, startDate, endDate, amountMin, amountMax]);

  const { data: poResponse, isLoading: loadingPo, refetch } = useQuery<any>({
    queryKey: ['purchase-orders', queryParams],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders', { params: queryParams });
      return res.data?.data || res.data || { items: [], total: 0 };
    }
  });

  const poList = useMemo(() => {
    const list = poResponse?.items || (Array.isArray(poResponse?.data) ? poResponse.data : poResponse?.data?.items) || [];
    return Array.isArray(list) ? list : [];
  }, [poResponse]);

  // Compute live KPI metrics from total queried list
  const kpis = useMemo(() => {
    let totalCount = poList.length;
    let draft = 0;
    let sent = 0;
    let approved = 0;
    let partial = 0;
    let completed = 0;
    let cancelled = 0;
    let totalValue = 0;
    let outstandingValue = 0;
    let dueTodayCount = 0;
    let overdueCount = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    poList.forEach(po => {
      const gTotal = Number(po.grandTotal || 0);
      totalValue += gTotal;

      if (po.status === 'DRAFT') draft++;
      else if (po.status === 'SENT') sent++;
      else if (po.status === 'ACCEPTED') approved++;
      else if (po.status === 'PARTIAL') {
        partial++;
        outstandingValue += gTotal; // treat partial as unpaid balance
      } else if (po.status === 'CONVERTED') {
        completed++;
      } else if (po.status === 'CANCELLED') cancelled++;

      // Expected delivery and warehouse details are removed from PO header
      const meta = po.gstBreakup || {};
    });

    return {
      totalCount,
      draft,
      sent,
      approved,
      partial,
      completed,
      cancelled,
      totalValue,
      outstandingValue,
      dueTodayCount,
      overdueCount
    };
  }, [poList]);

  // Actions Mutators
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/purchase-orders/${id}`),
    onSuccess: () => {
      toast.success('Purchase Order deleted');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete Purchase Order');
    }
  });

  const handleDuplicate = async (po: any) => {
    navigate(`/purchase-orders/new?duplicate=true`, { state: po });
    // Duplicate handler will fetch data via React Router state or duplicate=true
    navigate(`/purchase-orders/new?duplicate=true&poId=${po.id}`);
  };

  const handleCancelPo = async (id: string) => {
    try {
      await apiClient.patch(`/purchase-orders/${id}`, { status: 'CANCELLED' });
      toast.success('Purchase Order cancelled successfully');
      refetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to cancel Purchase Order');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setVendorId('');
    setWarehouseId('');
    setStartDate('');
    setEndDate('');
    setAmountMin('');
    setAmountMax('');
  };

  return (
    <PageContainer maxWidth="7xl">
      {/* Header */}
      <PageHeader
        title="Purchase Orders"
        description="Manage vendor purchase orders and incoming inventory"
        primaryAction={
          <div className="flex gap-2">
            <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className="flex items-center gap-1 text-xs">
              <Filter className="w-4 h-4" /> Filters
            </Button>
            <Button onClick={() => refetch()} variant="outline" className="flex items-center gap-1 text-xs">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Link to="/purchase-orders/new">
              <Button variant="primary" className="bg-accent hover:bg-accent/90 text-white font-bold px-5 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> New Purchase Order
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 text-left">
        <Card className="p-4 border border-border/80 flex flex-col justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Purchase Value</p>
          <p className="text-2xl font-black text-foreground mt-2 font-sans">₹{kpis.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Across {kpis.totalCount} active PO orders</p>
        </Card>

        <Card className="p-4 border border-border/80 flex flex-col justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Partially Received Value</p>
          <p className="text-2xl font-black text-amber-500 mt-2 font-sans">₹{kpis.outstandingValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Pending incoming delivery fulfillments</p>
        </Card>

        <Card className="p-4 border border-border/80 flex flex-col justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fulfillments Status</p>
          <div className="flex gap-4 mt-2 text-xs font-bold">
            <div><span className="text-green-600">{kpis.completed}</span> Fully</div>
            <div><span className="text-amber-500">{kpis.partial}</span> Partial</div>
            <div><span className="text-blue-500">{kpis.approved + kpis.sent + kpis.draft}</span> Pending</div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Total count tracking summary</p>
        </Card>

        <Card className="p-4 border border-border/80 flex flex-col justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Delivery Due Logs</p>
          <div className="flex gap-4 mt-2 text-xs font-bold">
            <div><span className="text-blue-500">{kpis.dueTodayCount}</span> Due Today</div>
            <div><span className="text-red-500">{kpis.overdueCount}</span> Overdue</div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Expected arrival schedule metrics</p>
        </Card>
      </div>

      {/* Expanded filters panel */}
      {showFilters && (
        <Card className="p-5 mb-6 text-left border border-border space-y-4">
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground">Advanced Search Filter Parameters</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Supplier Vendor</label>
              <select
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
              >
                <option value="">All Suppliers</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">PO Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Approved / Confirmed</option>
                <option value="PARTIAL">Partially Received</option>
                <option value="CONVERTED">Fully Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Destination Warehouse</label>
              <select
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
              >
                <option value="">All Warehouses</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-2 py-1 bg-background border border-border rounded-lg text-xs"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-2 py-1 bg-background border border-border rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Value Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={amountMin}
                  onChange={e => setAmountMin(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={amountMax}
                  onChange={e => setAmountMax(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="md:col-span-3 flex items-end justify-end gap-2">
              <Button onClick={clearFilters} variant="outline" className="text-xs font-bold py-2">
                Clear Filters
              </Button>
              <Button onClick={() => refetch()} variant="primary" className="bg-accent hover:bg-accent/95 text-white font-bold text-xs py-2 px-5">
                Apply Search Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Table search bar */}
      <div className="relative mb-4 max-w-md">
        <span className="absolute left-3 top-2.5 text-muted-foreground"><Search className="w-4 h-4" /></span>
        <input
          type="text"
          placeholder="Search by PO number or supplier name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent"
        />
      </div>

      {loadingPo ? (
        <LoadingState variant="table" />
      ) : poList.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8 text-muted-foreground" />}
          title="No purchase orders found"
          description="Create your first purchase order to start procurement flows."
          actionLabel="New Purchase Order"
          onActionClick={() => navigate('/purchase-orders/new')}
        />
      ) : (
        <Card className="overflow-x-auto border border-border">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/15 border-b border-border text-xs uppercase tracking-wider">
                <TableHead className="font-bold py-4 px-6">PO Number</TableHead>
                <TableHead className="font-bold py-4 px-6">Vendor Supplier</TableHead>
                <TableHead className="font-bold py-4 px-6">Order Date</TableHead>
                <TableHead className="font-bold py-4 px-6 text-right">Items</TableHead>
                <TableHead className="font-bold py-4 px-6 text-right">Grand Total</TableHead>
                <TableHead className="font-bold py-4 px-6 text-center">Status</TableHead>
                <TableHead className="font-bold py-4 px-6 text-center w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {poList.map((item: any) => {
                const meta = item.gstBreakup || {};
                
                return (
                  <TableRow key={item.id} className="hover:bg-muted/50 border-b border-border transition-all">
                    <TableCell className="font-bold py-4 px-6 font-mono">
                      <Link to={`/purchase-orders/${item.id}`} className="text-accent hover:underline">
                        {item.orderNo}
                      </Link>
                    </TableCell>
                    <TableCell className="py-4 px-6 font-bold text-foreground">{item.businessPartner?.name || 'N/A'}</TableCell>
                    <TableCell className="py-4 px-6 text-muted-foreground">{new Date(item.date).toLocaleDateString()}</TableCell>
                    <TableCell className="py-4 px-6 text-right font-medium">{item.items?.length || 0} lines</TableCell>
                    <TableCell className="font-bold py-4 px-6 text-right text-foreground font-mono">₹{Number(item.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'CONVERTED' ? 'bg-green-100 text-green-700' :
                        item.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                        item.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {item.status === 'CONVERTED' ? 'FULLY RECEIVED' : item.status === 'PARTIAL' ? 'PARTIALLY RECEIVED' : item.status === 'ACCEPTED' ? 'APPROVED' : item.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center">
                      <div className="flex gap-2 justify-center">
                        <Link to={`/purchase-orders/${item.id}`} title="View Details">
                          <button className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        {item.status !== 'CANCELLED' && item.status !== 'CONVERTED' && (
                          <Link to={`/purchase-orders/${item.id}/edit`} title="Edit Order">
                            <button className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </Link>
                        )}
                        <button 
                          onClick={() => handleDuplicate(item)} 
                          title="Duplicate Order"
                          className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {item.status !== 'CANCELLED' && item.status !== 'CONVERTED' && (
                          <button 
                            onClick={() => handleCancelPo(item.id)} 
                            title="Cancel Order"
                            className="p-1 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {item.status === 'DRAFT' && (
                          <button 
                            onClick={() => {
                              if (window.confirm('Delete this draft Purchase Order?')) {
                                deleteMutation.mutate(item.id);
                              }
                            }} 
                            title="Delete Draft"
                            className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageContainer>
  );
};
