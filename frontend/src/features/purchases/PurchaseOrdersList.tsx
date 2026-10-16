import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Edit,
  Printer,
  Trash2,
  Mail,
  Share2,
  CheckCircle,
  Eye,
  AlertCircle,
  Info,
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import {
  ZohoPageHeader,
  ZohoListTable,
  ZohoColumn,
  ZohoSplitDetail,
  ZohoSplitListItem,
  ZohoPDFPreview,
  ZohoStatusText,
  ZohoViewOption,
} from '@/shared/components/zoho';
import { DeleteDialog } from '@/shared/components/ui';

interface PurchaseOrder {
  id: string;
  orderNo: string;
  referenceNo?: string;
  businessPartnerId: string;
  date: string;
  expectedDeliveryDate?: string;
  deliveryDate?: string;
  status: string;
  subTotal: number;
  taxTotal: number;
  grandTotal: number;
  notes?: string;
  businessPartner?: {
    name: string;
    gstNumber?: string;
    email?: string;
  };
  vendor?: {
    name: string;
    gstNumber?: string;
  };
  items?: Array<{
    id: string;
    productId: string;
    description?: string;
    qty: number;
    rate: number;
    taxPercent: number;
    total?: number;
    product?: { name: string };
  }>;
}

export const PurchaseOrdersList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState('ALL');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [showPdfView, setShowPdfView] = useState(true);
  const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);

  // Queries
  const { data: poResponse, isLoading } = useQuery<any>({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/purchase-orders', { params: { limit: 200 } });
      return res.data?.data || res.data || { items: [] };
    },
  });

  const purchaseOrders: PurchaseOrder[] = useMemo(() => {
    const list = poResponse?.items || (Array.isArray(poResponse) ? poResponse : poResponse?.data) || [];
    return Array.isArray(list) ? list : [];
  }, [poResponse]);

  const selectedPo = useMemo(() => {
    return purchaseOrders.find((po) => po.id === selectedPoId) || null;
  }, [purchaseOrders, selectedPoId]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/purchase-orders/${id}`);
    },
    onSuccess: () => {
      notification.success('Purchase order deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setPoToDelete(null);
      if (selectedPoId === poToDelete?.id) setSelectedPoId(null);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete purchase order');
    },
  });

  const issueMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/purchase-orders/${id}/status`, { status: 'SENT' }).catch(async () => {
        await apiClient.put(`/purchase-orders/${id}`, { status: 'SENT' });
      });
    },
    onSuccess: () => {
      notification.success('Purchase order marked as ISSUED');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err: any) => {
      notification.error(err?.response?.data?.message || 'Failed to mark purchase order as issued');
    },
  });

  // Views filter
  const views: ZohoViewOption[] = [
    { id: 'ALL', label: 'All Purchase Orders', count: purchaseOrders.length },
    {
      id: 'DRAFT',
      label: 'Draft',
      count: purchaseOrders.filter((p) => (p.status || 'DRAFT').toUpperCase() === 'DRAFT').length,
    },
    {
      id: 'ISSUED',
      label: 'Issued',
      count: purchaseOrders.filter((p) => p.status?.toUpperCase() === 'ISSUED' || p.status?.toUpperCase() === 'SENT').length,
    },
    {
      id: 'BILLED',
      label: 'Billed',
      count: purchaseOrders.filter((p) => p.status?.toUpperCase() === 'BILLED' || p.status?.toUpperCase() === 'CONVERTED').length,
    },
    {
      id: 'CLOSED',
      label: 'Closed',
      count: purchaseOrders.filter((p) => p.status?.toUpperCase() === 'CLOSED').length,
    },
  ];

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((p) => {
      const st = (p.status || 'DRAFT').toUpperCase();
      if (activeView === 'DRAFT') return st === 'DRAFT';
      if (activeView === 'ISSUED') return st === 'ISSUED' || st === 'SENT';
      if (activeView === 'BILLED') return st === 'BILLED' || st === 'CONVERTED';
      if (activeView === 'CLOSED') return st === 'CLOSED';
      return true;
    });
  }, [purchaseOrders, activeView]);

  const getPoStatus = (po: PurchaseOrder) => {
    const s = (po.status || 'DRAFT').toUpperCase();
    if (s === 'SENT') return 'ISSUED';
    if (s === 'CONVERTED') return 'BILLED';
    return s;
  };

  const splitItems = useMemo<ZohoSplitListItem[]>(() => {
    return filteredOrders.map((p) => ({
      id: p.id,
      name: p.vendor?.name || p.businessPartner?.name || 'Unknown Vendor',
      amount: `₹${(Number(p.grandTotal) || 0).toLocaleString('en-IN')}`,
      number: p.orderNo,
      date: p.date ? new Date(p.date).toLocaleDateString('en-GB') : '',
      status: getPoStatus(p),
    }));
  }, [filteredOrders]);

  const columns: ZohoColumn<PurchaseOrder>[] = [
    {
      key: 'date',
      label: 'Date',
      width: '110px',
      render: (p) => (
        <span className="text-[#2B2F36] font-medium">
          {p.date ? new Date(p.date).toLocaleDateString('en-GB') : '-'}
        </span>
      ),
    },
    {
      key: 'orderNo',
      label: 'Purchase Order#',
      width: '150px',
      render: (p) => (
        <span className="text-[#408DFB] hover:underline font-mono font-medium cursor-pointer">
          {p.orderNo}
        </span>
      ),
    },
    {
      key: 'referenceNo',
      label: 'Reference#',
      width: '130px',
      render: (p) => <span className="text-[#6B7280]">{p.referenceNo || '-'}</span>,
    },
    {
      key: 'vendor',
      label: 'Vendor Name',
      render: (p) => (
        <span className="text-[#2B2F36] font-medium truncate block max-w-[220px]">
          {p.vendor?.name || p.businessPartner?.name || 'Unknown Vendor'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (p) => <ZohoStatusText status={getPoStatus(p)} />,
    },
    {
      key: 'grandTotal',
      label: 'Amount',
      align: 'right',
      width: '130px',
      render: (p) => (
        <span className="font-semibold text-[#2B2F36] tabular-nums">
          ₹{(Number(p.grandTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'deliveryDate',
      label: 'Expected Delivery Date',
      width: '160px',
      render: (p) => {
        const d = p.expectedDeliveryDate || p.deliveryDate;
        return <span className="text-[#6B7280]">{d ? new Date(d).toLocaleDateString('en-GB') : '-'}</span>;
      },
    },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden select-none">
      <ZohoPageHeader
        title="All Purchase Orders"
        views={views}
        activeViewId={activeView}
        onViewChange={(vId) => setActiveView(vId)}
        newAction={{
          label: '+ New',
          onClick: () => navigate('/purchase-orders/new'),
        }}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })}
      />

      <div className="flex-1 overflow-hidden">
        {selectedPo ? (
          <ZohoSplitDetail
            moduleTitle="All Purchase Orders"
            items={splitItems}
            selectedId={selectedPo.id}
            onSelect={(id) => setSelectedPoId(id)}
            onNew={() => navigate('/purchase-orders/new')}
            onClose={() => setSelectedPoId(null)}
            detailTitle={selectedPo.orderNo}
            detailActions={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigate(`/purchase-orders/${selectedPo.id}/edit`)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => notification.info('Email Purchase Order to vendor')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Send Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>PDF/Print</span>
                </button>
                {getPoStatus(selectedPo) === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => issueMutation.mutate(selectedPo.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-medium cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark as Issued</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPoToDelete(selectedPo)}
                  className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#FEF2F2] rounded-[4px] text-[#6B7280] hover:text-[#DC2626] cursor-pointer"
                  title="Delete Purchase Order"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            }
          >
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
              {/* What's Next Banner for DRAFT status */}
              {getPoStatus(selectedPo) === 'DRAFT' && (
                <div className="p-4 bg-white border border-[#CBD5E1] rounded-[4px] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-xs text-[#2B2F36] block">WHAT'S NEXT?</span>
                    <span className="text-xs text-[#6B7280]">
                      Send this purchase order to your vendor or mark it as issued.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => notification.info('Email composer opened')}
                      className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] text-xs font-medium text-[#2B2F36] rounded-[4px] cursor-pointer"
                    >
                      Send Purchase Order
                    </button>
                    <button
                      type="button"
                      onClick={() => issueMutation.mutate(selectedPo.id)}
                      className="px-3 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] text-xs font-medium text-white rounded-[4px] cursor-pointer"
                    >
                      Mark As Issued
                    </button>
                  </div>
                </div>
              )}

              {/* PDF Preview Toggle & Card */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#2B2F36]">Purchase Order Preview</span>
                <label className="flex items-center gap-2 text-xs text-[#6B7280] cursor-pointer">
                  <span>Show PDF View</span>
                  <input
                    type="checkbox"
                    checked={showPdfView}
                    onChange={(e) => setShowPdfView(e.target.checked)}
                    className="rounded border-[#CBD5E1] text-[#408DFB] focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>

              {showPdfView && (
                <ZohoPDFPreview
                  status={getPoStatus(selectedPo)}
                  onPrint={() => window.print()}
                  onDownload={() => window.print()}
                >
                  <div className="space-y-6 text-xs text-[#2B2F36]">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-4">
                      <div>
                        <h2 className="text-lg font-bold text-[#2B2F36] uppercase tracking-wide">PURCHASE ORDER</h2>
                        <p className="font-mono text-xs text-[#6B7280] mt-0.5">{selectedPo.orderNo}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-[#2B2F36]">{selectedPo.vendor?.name || selectedPo.businessPartner?.name}</p>
                        {selectedPo.vendor?.gstNumber && <p className="text-[11px] text-[#6B7280]">GSTIN: {selectedPo.vendor.gstNumber}</p>}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-3 gap-4 py-2 text-xs">
                      <div>
                        <span className="text-[#6B7280] block text-[11px]">Order Date</span>
                        <span className="font-semibold">{selectedPo.date ? new Date(selectedPo.date).toLocaleDateString('en-GB') : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block text-[11px]">Delivery Date</span>
                        <span className="font-semibold">
                          {(selectedPo.expectedDeliveryDate || selectedPo.deliveryDate)
                            ? new Date(selectedPo.expectedDeliveryDate || selectedPo.deliveryDate!).toLocaleDateString('en-GB')
                            : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block text-[11px]">Reference#</span>
                        <span className="font-semibold">{selectedPo.referenceNo || '-'}</span>
                      </div>
                    </div>

                    {/* Line Items */}
                    <div className="border border-[#CBD5E1] rounded-[4px] overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-[#F8F9FB] border-b border-[#CBD5E1] text-[#6B7280] font-semibold">
                          <tr>
                            <th className="py-2 px-3 text-left">Item Details</th>
                            <th className="py-2 px-2 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Rate</th>
                            <th className="py-2 px-3 text-right">Tax %</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {selectedPo.items?.map((it, idx) => (
                            <tr key={idx} className="hover:bg-[#F9FAFB]">
                              <td className="py-2 px-3 font-medium text-[#2B2F36]">{it.product?.name || it.description}</td>
                              <td className="py-2 px-2 text-right">{it.qty}</td>
                              <td className="py-2 px-3 text-right">₹{Number(it.rate).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right">{it.taxPercent}%</td>
                              <td className="py-2 px-3 text-right font-semibold">₹{(Number(it.qty) * Number(it.rate)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Box */}
                    <div className="flex justify-end">
                      <div className="w-72 space-y-1.5 text-xs bg-[#F8F9FB] p-4 rounded-[4px] border border-[#CBD5E1]">
                        <div className="flex justify-between text-[#6B7280]">
                          <span>Sub Total</span>
                          <span className="font-medium text-[#2B2F36]">₹{Number(selectedPo.subTotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[#6B7280]">
                          <span>Tax Total</span>
                          <span className="font-medium text-[#2B2F36]">₹{Number(selectedPo.taxTotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm text-[#2B2F36] pt-1.5 border-t border-[#CBD5E1]">
                          <span>Total (₹)</span>
                          <span>₹{Number(selectedPo.grandTotal || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ZohoPDFPreview>
              )}
            </div>
          </ZohoSplitDetail>
        ) : (
          <ZohoListTable
            columns={columns}
            data={filteredOrders}
            isLoading={isLoading}
            keyField="id"
            onRowClick={(p) => setSelectedPoId(p.id)}
          />
        )}
      </div>

      {poToDelete && (
        <DeleteDialog
          isOpen={!!poToDelete}
          onClose={() => setPoToDelete(null)}
          onConfirm={() => deleteMutation.mutate(poToDelete.id)}
          entityName={`Purchase Order ${poToDelete.orderNo}`}
          warningText={`Are you sure you want to delete purchase order "${poToDelete.orderNo}"? This action cannot be undone.`}
        />
      )}
    </div>
  );
};

export default PurchaseOrdersList;
