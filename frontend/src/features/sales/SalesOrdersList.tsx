import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  Mail,
  Printer,
  FileCheck,
  Package,
  Truck
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import {
  ZohoListTable,
  ZohoColumn,
  ZohoSplitDetail,
  ZohoSplitListItem,
  ZohoStatusText,
  ZohoPDFPreview,
  ZohoViewOption,
  ZohoEmptyState
} from '@/shared/components/zoho';
import { ConfirmDialog } from '@/shared/components/ui';

const SO_VIEWS: ZohoViewOption[] = [
  { id: 'ALL', label: 'All Sales Orders' },
  { id: 'OPEN', label: 'Open' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export const SalesOrdersList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [search, setSearch] = useState<string>('');
  const [selectedSoId, setSelectedSoId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);

  // Fetch Sales Orders
  const { data: soResponse, isLoading, refetch } = useQuery({
    queryKey: ['sales-orders', activeView, page, limit, search],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (activeView !== 'ALL') params.status = activeView;

      const res = await apiClient.get('/sales-orders', { params });
      return res.data;
    },
    staleTime: 0,
  });

  const rawData = soResponse?.data !== undefined ? soResponse.data : soResponse;
  const orders: any[] = Array.isArray(rawData) ? rawData : rawData?.items || [];
  const meta = soResponse?.meta || rawData?.meta || {};
  const totalCount = meta.total ?? orders.length;

  const selectedOrder = useMemo(() => {
    if (!selectedSoId) return null;
    return orders.find((o: any) => o.id === selectedSoId) || null;
  }, [selectedSoId, orders]);

  const splitItems: ZohoSplitListItem[] = useMemo(() => {
    return orders.map((o: any) => {
      const custName = o.businessPartner?.name || 'Customer';
      const soNo = o.orderNo || 'SO-DRAFT';
      const dateStr = o.date ? new Date(o.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
      const amountVal = Number(o.grandTotal || 0);

      return {
        id: o.id,
        name: custName,
        number: soNo,
        date: dateStr,
        amount: `₹${amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: o.status || 'OPEN',
      };
    });
  }, [orders]);

  // Columns: Date, Sales Order#, Reference#, Customer Name, Status, Invoiced (dot), Payment (dot), Amount, Expected Shipment Date, Order Status, Delivery
  const columns: ZohoColumn<any>[] = [
    {
      key: 'date',
      label: 'Date',
      width: '100px',
      render: (row) => (
        <span className="text-[#2B2F36]">
          {row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'orderNo',
      label: 'Sales Order#',
      isPrimary: true,
      width: '130px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSoId(row.id);
          }}
          className="text-[#408DFB] hover:underline font-mono text-xs font-semibold cursor-pointer text-left"
        >
          {row.orderNo || 'SO-DRAFT'}
        </button>
      ),
    },
    {
      key: 'referenceNo',
      label: 'Reference#',
      width: '120px',
      render: (row) => (
        <span className="text-[#6B7280] font-mono">{row.referenceNo || '—'}</span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer Name',
      width: '180px',
      render: (row) => (
        <span className="font-medium text-[#2B2F36] truncate block" title={row.businessPartner?.name || '—'}>
          {row.businessPartner?.name || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (row) => <ZohoStatusText status={row.status || 'OPEN'} />,
    },
    {
      key: 'invoiced',
      label: 'Invoiced',
      align: 'center',
      width: '80px',
      render: (row) => {
        const isInvoiced = Boolean(row.isInvoiced || row.invoiceId);
        return (
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${isInvoiced ? 'bg-[#16A34A]' : 'bg-[#D1D5DB]'}`}
            title={isInvoiced ? 'Invoiced' : 'Not Invoiced'}
          />
        );
      },
    },
    {
      key: 'payment',
      label: 'Payment',
      align: 'center',
      width: '80px',
      render: (row) => {
        const isPaid = row.paymentStatus === 'PAID';
        const isPartial = row.paymentStatus === 'PARTIAL';
        return (
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              isPaid ? 'bg-[#16A34A]' : isPartial ? 'bg-[#D97706]' : 'bg-[#D1D5DB]'
            }`}
            title={row.paymentStatus || 'Unpaid'}
          />
        );
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      isNumeric: true,
      width: '120px',
      render: (row) => (
        <span className="font-medium text-[#2B2F36] tabular-nums">
          ₹{Number(row.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'expectedShipmentDate',
      label: 'Expected Shipment Date',
      width: '140px',
      render: (row) => (
        <span className="text-[#6B7280]">
          {row.expectedShipmentDate ? new Date(row.expectedShipmentDate).toLocaleDateString('en-IN') : '—'}
        </span>
      ),
    },
    {
      key: 'orderStatus',
      label: 'Order Status',
      width: '110px',
      render: (row) => (
        <span className="text-[#2B2F36]">{row.orderStatus || row.status || 'Confirmed'}</span>
      ),
    },
    {
      key: 'delivery',
      label: 'Delivery',
      width: '100px',
      render: (row) => (
        <span className="text-[#6B7280]">{row.deliveryMethod || 'Standard'}</span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden text-xs">
      {selectedOrder ? (
        <ZohoSplitDetail
          moduleTitle="All Sales Orders"
          items={splitItems}
          selectedId={selectedSoId || ''}
          onSelect={(id) => setSelectedSoId(id)}
          onNew={() => navigate('/sales-orders/new')}
          onClose={() => setSelectedSoId(null)}
          detailTitle={selectedOrder.orderNo || 'SALES ORDER'}
          detailActions={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate(`/sales-orders/${selectedOrder.id}/edit`)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/invoices/new?customerId=${selectedOrder.businessPartnerId || selectedOrder.customerId}&salesOrderId=${selectedOrder.id}`)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer shadow-none transition-colors"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Convert to Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderToDelete(selectedOrder)}
                className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#FEF2F2] rounded-[4px] text-[#6B7280] hover:text-[#E54B4B] cursor-pointer"
                title="Delete Sales Order"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        >
          <div className="p-6 space-y-6 text-xs text-[#2B2F36]">
            {/* Header info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-[#E5E7EB] rounded-[4px] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                  Customer & Order
                </h4>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Customer Name</span>
                  <span className="font-medium">{selectedOrder.businessPartner?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Order Date</span>
                  <span className="font-medium">{selectedOrder.date ? new Date(selectedOrder.date).toLocaleDateString('en-IN') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Expected Shipment</span>
                  <span className="font-medium">{selectedOrder.expectedShipmentDate ? new Date(selectedOrder.expectedShipmentDate).toLocaleDateString('en-IN') : '—'}</span>
                </div>
              </div>

              <div className="border border-[#E5E7EB] rounded-[4px] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                  Order Total
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Status</span>
                  <ZohoStatusText status={selectedOrder.status || 'OPEN'} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Grand Total</span>
                  <span className="text-base font-bold text-[#1E2540] tabular-nums">
                    ₹{Number(selectedOrder.grandTotal || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                Order Items
              </h4>
              <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase">
                      <th className="px-3 py-2 text-left">Item Details</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {(selectedOrder.items || []).map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-[#F9FAFB]">
                        <td className="px-3 py-2 font-medium">{it.product?.name || it.description || 'Item'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{it.qty || 1} {it.unit || 'pcs'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">₹{Number(it.rate || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">₹{Number(it.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ZohoSplitDetail>
      ) : (
        /* Full List View */
        <>
          <div className="h-12 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 shrink-0">
            <select
              value={activeView}
              onChange={(e) => {
                setActiveView(e.target.value);
                setPage(1);
              }}
              className="text-base font-semibold text-[#1E2540] bg-transparent border-none focus:ring-0 cursor-pointer pr-6 py-0"
            >
              {SO_VIEWS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ▾
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/sales-orders/new')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer shadow-none transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>

              <button
                type="button"
                onClick={() => refetch()}
                className="p-1.5 border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] cursor-pointer"
                title="Refresh Orders"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="h-10 border-b border-[#E5E7EB] bg-[#F8F9FB] px-6 flex items-center justify-between text-xs text-[#2B2F36] shrink-0">
            <span className="text-[#6B7280]">Total Sales Orders: <strong>{totalCount}</strong></span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search sales orders..."
                className="pl-8 pr-3 py-1 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none w-56"
              />
            </div>
          </div>

          <div className="flex-1 p-4 overflow-hidden min-h-0 bg-white">
            <ZohoListTable
              data={orders}
              columns={columns}
              isLoading={isLoading}
              keyField="id"
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              onRowClick={(row) => setSelectedSoId(row.id)}
              pagination={{
                currentPage: page,
                pageSize: limit,
                totalCount,
                onPageChange: (p) => setPage(p),
                onPageSizeChange: (l) => setLimit(l),
              }}
              emptyState={
                <ZohoEmptyState
                  title="No Sales Orders Found"
                  description="Create and track confirmed customer sales orders, shipment schedules, and order fulfillment."
                  createLabel="New Sales Order"
                  onCreate={() => navigate('/sales-orders/new')}
                />
              }
            />
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        onConfirm={async () => {
          if (!orderToDelete) return;
          try {
            await apiClient.delete(`/sales-orders/${orderToDelete.id}`);
            notification.success('Sales order deleted successfully');
            setOrderToDelete(null);
            setSelectedSoId(null);
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
          } catch (err: any) {
            notification.error(err?.response?.data?.message || 'Failed to delete sales order');
          }
        }}
        title="Delete Sales Order"
        message={`Are you sure you want to delete sales order ${orderToDelete?.orderNo}?`}
        confirmText="Delete"
        loadingText="Deleting..."
        variant="danger"
      />
    </div>
  );
};

export default SalesOrdersList;
