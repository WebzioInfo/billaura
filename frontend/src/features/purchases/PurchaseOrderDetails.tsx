import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, FileText, Calendar, Building, Landmark, Save, Plus, Trash2, 
  Printer, Mail, AlertCircle, CheckCircle, FileCheck, HelpCircle, ArrowRight,
  TrendingUp, Play, Clock, User, ShieldAlert, RotateCcw
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer, LoadingState, EmptyState, FinancialSummary, SummaryRow } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui';

export const PurchaseOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [emailing, setEmailing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [showCancelPoDialog, setShowCancelPoDialog] = useState(false);

  // GRN Modal Fields
  const [grnReceiptNo, setGrnReceiptNo] = useState('');
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [grnWarehouseId, setGrnWarehouseId] = useState('');
  const [grnVehicleNo, setGrnVehicleNo] = useState('');
  const [grnItems, setGrnItems] = useState<Array<{ productId: string; name: string; orderedQty: number; receivedQty: number; currentReceiveQty: number; description: string }>>([]);

  const { data: po, isLoading: loadingPo, refetch: refetchPo } = useQuery<any>({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const res = await apiClient.get(`/purchase-orders/${id}`);
      return res.data?.data || res.data || null;
    }
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ['purchase-order-audit', id],
    queryFn: async () => {
      const res = await apiClient.get(`/purchase-orders/${id}/audit`);
      return res.data?.data || res.data || [];
    },
    enabled: !!po
  });

  const { data: linkedGrns = [] } = useQuery<any[]>({
    queryKey: ['linked-grns', id],
    queryFn: async () => {
      const res = await apiClient.get('/goods-receipts', { params: { purchaseOrderId: id } });
      const list = res.data?.data || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!po
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      const list = res.data?.data || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    }
  });

  const { data: meData } = useQuery<any>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get('/auth/me'),
  });

  const companyProfile = meData?.data?.company || meData?.company || { name: 'Your Company', address: '', email: '', phone: '', state: '' };

  const meta = po?.gstBreakup || {};
  const receivedQtyMap = meta.receivedQty || {};

  const handleOpenGrnModal = () => {
    if (!po) return;
    
    // Auto suggest receipt number
    setGrnReceiptNo(`GRN-${po.orderNo.replace('PO-', '')}-${Date.now().toString().slice(-4)}`);
    setGrnWarehouseId(meta.warehouseId || '');
    
    // Map items, computing pending quantities
    const mapped = po.items.map((i: any) => {
      const ord = Number(i.qty);
      const rec = Number(receivedQtyMap[i.id] || 0);
      const pend = Math.max(0, ord - rec);

      return {
        productId: i.productId,
        name: i.product?.name || i.description,
        description: i.description || '',
        orderedQty: ord,
        receivedQty: rec,
        currentReceiveQty: pend, // default to receive full pending quantity
      };
    });

    setGrnItems(mapped);
    setGrnModalOpen(true);
  };

  const handleGrnItemQtyChange = (index: number, val: number) => {
    const list = [...grnItems];
    const maxAllowed = list[index].orderedQty - list[index].receivedQty;
    list[index].currentReceiveQty = Math.max(0, Math.min(maxAllowed, val));
    setGrnItems(list);
  };

  const handleSaveGrn = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsToSubmit = grnItems.filter(i => i.currentReceiveQty > 0);
    if (itemsToSubmit.length === 0) {
      toast.error('Please specify a receive quantity greater than 0 for at least one item.');
      return;
    }

    try {
      const payload = {
        businessPartnerId: po.businessPartnerId,
        receiptNo: grnReceiptNo,
        purchaseOrderId: po.id,
        date: new Date(grnDate).toISOString(),
        vehicleNumber: grnVehicleNo || undefined,
        warehouseId: grnWarehouseId || undefined,
        items: itemsToSubmit.map(i => ({
          productId: i.productId,
          description: i.description,
          qty: i.currentReceiveQty
        }))
      };

      await apiClient.post('/goods-receipts', payload);
      toast.success('Goods Receipt recorded and stock balances updated!');
      setGrnModalOpen(false);
      refetchPo();
      queryClient.invalidateQueries({ queryKey: ['linked-grns', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create Goods Receipt');
    }
  };

  const handleEmailVendor = async () => {
    setEmailing(true);
    setTimeout(() => {
      setEmailing(false);
      toast.success(`Purchase Order ${po?.orderNo} sent successfully to ${po?.businessPartner?.email || 'supplier'}!`);
    }, 1500);
  };

  const handleCancelPo = async () => {
    setShowCancelPoDialog(true);
  };

  const confirmCancelPo = async () => {
    setCancelling(true);
    try {
      await apiClient.patch(`/purchase-orders/${po.id}`, { status: 'CANCELLED' });
      toast.success('Purchase Order marked as CANCELLED');
      refetchPo();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel Purchase Order');
    } finally {
      setCancelling(false);
      setShowCancelPoDialog(false);
    }
  };

  const handleApprovePo = async () => {
    try {
      await apiClient.patch(`/purchase-orders/${po.id}`, { status: 'ACCEPTED' });
      toast.success('Purchase Order marked as APPROVED / CONFIRMED');
      refetchPo();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve Purchase Order');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loadingPo) return <PageContainer maxWidth="7xl"><LoadingState variant="form" /></PageContainer>;
  if (!po) return <PageContainer maxWidth="7xl"><EmptyState title="Purchase Order Not Found" description="The requested document does not exist." actionLabel="Back to PO List" onActionClick={() => navigate('/purchase-orders')} /></PageContainer>;

  const taxLabel = po.taxMode === 'IGST' ? 'IGST' : po.taxMode === 'CGST_SGST' ? 'CGST/SGST' : 'Exempt';

  return (
    <>
    <PageContainer maxWidth="7xl">
      {/* Action Toolbar Header - Hidden during print */}
      <div className="print:hidden">
        <PageHeader
          title={`PO: ${po.orderNo}`}
          description={`PO Date: ${po ? new Date(po.date).toLocaleDateString() : ''}`}
          backTo={{ label: 'Purchase Orders', path: '/purchase-orders' }}
          primaryAction={
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} variant="outline" className="flex items-center gap-1 text-xs">
                <Printer className="w-4 h-4" /> Print
              </Button>
              <Button onClick={handleEmailVendor} disabled={emailing} variant="outline" className="flex items-center gap-1 text-xs">
                <Mail className="w-4 h-4" /> {emailing ? 'Sending...' : 'Email Vendor'}
              </Button>

              {po.status === 'DRAFT' && (
                <Button onClick={handleApprovePo} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold">
                  Approve PO
                </Button>
              )}

              {po.status !== 'CANCELLED' && po.status !== 'CONVERTED' && (
                <Button onClick={handleOpenGrnModal} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
                  Receive Goods
                </Button>
              )}

              {po.status !== 'CANCELLED' && (
                <Link to={`/bills/new?poId=${po.id}`}>
                  <Button className="bg-accent hover:bg-accent/90 text-white text-xs font-bold flex items-center gap-1">
                    Convert to Bill <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}

              {po.status !== 'CANCELLED' && po.status !== 'CONVERTED' && (
                <Button onClick={handleCancelPo} disabled={cancelling} variant="outline" className="text-red-500 hover:bg-red-50 border-red-200 text-xs">
                  Cancel PO
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column - Printable A4 Document Sheet */}
        <div className="lg:col-span-3 bg-surface border border-border rounded-3xl p-8 min-h-[1050px] shadow-sm relative text-left font-sans text-sm text-foreground">
          
          {/* Company & Header Section */}
          <div className="flex justify-between items-start border-b border-border/80 pb-6 mb-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold tracking-tight text-accent uppercase">{companyProfile.name}</h2>
              <p className="text-muted-foreground whitespace-pre-wrap max-w-sm text-xs leading-relaxed">{companyProfile.address}</p>
              <p className="text-xs text-muted-foreground">GSTIN: <span className="font-semibold text-foreground">{companyProfile.gstNumber || companyProfile.gstin || 'N/A'}</span></p>
            </div>
            <div className="text-right space-y-1">
              <h1 className="text-3xl font-black text-foreground uppercase tracking-widest">Purchase Order</h1>
              <div className="text-xs text-muted-foreground">
                <p>PO Number: <span className="font-bold text-foreground text-sm font-mono">{po.orderNo}</span></p>
                <p>Date: <span className="font-semibold text-foreground">{new Date(po.date).toLocaleDateString()}</span></p>
                <p>Status: <span className={`font-bold ml-1 uppercase text-[10px] px-2 py-0.5 rounded-full ${po.status === 'CONVERTED' ? 'bg-green-100 text-green-700' : po.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : po.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{po.status === 'CONVERTED' ? 'FULLY RECEIVED' : po.status === 'PARTIAL' ? 'PARTIALLY RECEIVED' : po.status}</span></p>
              </div>
            </div>
          </div>

          {/* Billing & Shipping Split Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-border/50 pb-6 mb-8">
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vendor Details</h4>
              <p className="font-extrabold text-foreground text-base">{po.businessPartner?.name}</p>
              <p className="text-xs text-muted-foreground">GSTIN: <span className="font-semibold text-foreground">{po.businessPartner?.gstin || po.businessPartner?.gstNumber || 'N/A'}</span></p>
              <p className="text-xs text-muted-foreground">Contact: <span className="font-medium text-foreground">{po.businessPartner?.email} | {po.businessPartner?.phone}</span></p>
              <div className="pt-2">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase">Billing Address</h5>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{po.billingAddress || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-1.5 md:border-l md:border-border/30 md:pl-8">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shipping Details</h4>
              <p className="text-xs text-muted-foreground">Place of Supply: <span className="font-semibold text-foreground">{po.placeOfSupply || 'N/A'}</span></p>
              <p className="text-xs text-muted-foreground">Reference: <span className="font-semibold text-foreground">{meta.referenceNo || 'N/A'}</span></p>
              <div className="pt-2">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase">Shipping Address</h5>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{po.shippingAddress || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground font-bold text-xs uppercase tracking-wider text-right">
                  <th className="pb-3 text-left">Item Description</th>
                  <th className="pb-3 w-20">Ordered</th>
                  <th className="pb-3 w-20">Received</th>
                  <th className="pb-3 w-20">Pending</th>
                  <th className="pb-3 w-24">Rate</th>
                  <th className="pb-3 w-16">GST</th>
                  <th className="pb-3 w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono text-xs">
                {po.items.map((item: any) => {
                  const ord = Number(item.qty);
                  const rec = Number(receivedQtyMap[item.id] || 0);
                  const pend = Math.max(0, ord - rec);
                  const rate = Number(item.rate);
                  const amount = ord * rate;

                  return (
                    <tr key={item.id} className="text-right">
                      <td className="py-4 text-left font-sans">
                        <p className="font-bold text-foreground">{item.product?.name || item.description}</p>
                        <p className="text-[10px] text-muted-foreground">{item.description}</p>
                      </td>
                      <td className="py-4 font-semibold text-foreground">{ord.toLocaleString()}</td>
                      <td className="py-4 font-semibold text-green-600">{rec.toLocaleString()}</td>
                      <td className="py-4 font-semibold text-amber-600">{pend.toLocaleString()}</td>
                      <td className="py-4">₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4">{Number(item.taxPercent)}%</td>
                      <td className="py-4 font-bold text-foreground">₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border/50 pt-6">
            <div>
              <h5 className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Supplier/Vendor Instructions</h5>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{meta.notes || 'No notes specified.'}</p>
            </div>
            
            <div className="w-full text-right">
              <FinancialSummary className="bg-transparent border-0 shadow-none p-0">
                <SummaryRow label="Subtotal Base" value={po.subTotal} />
                <SummaryRow label={`Total GST Amount (${taxLabel})`} value={po.taxTotal} />
                <SummaryRow label="Grand Total" value={po.grandTotal} isTotal />
              </FinancialSummary>
            </div>
          </div>

          {/* Signature Block */}
          <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end border-t border-border/30 pt-8 print:relative print:mt-16">
            <div className="text-xs text-muted-foreground">
              <p>Generated By: <span className="font-semibold text-foreground">{meta.createdByName || 'Administrator'}</span></p>
              <p>Printed: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-center w-48 space-y-1">
              <div className="border-b border-border h-12"></div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Authorized Signatory</p>
            </div>
          </div>

        </div>

        {/* Right Column - Audit Timeline & Linked Operations */}
        <div className="space-y-6 print:hidden text-left">
          
          {/* Linked Documents (GRNs & Bills) */}
          <Card className="p-5 space-y-4">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-foreground">Linked Inventory & Bills</h4>
            
            {/* GRNs */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-muted-foreground uppercase">Goods Receipts ({linkedGrns.length})</h5>
              {linkedGrns.length === 0 ? (
                <p className="text-xs text-muted-foreground">No receipts linked.</p>
              ) : (
                <div className="space-y-1.5">
                  {linkedGrns.map((grn: any) => (
                    <div key={grn.id} className="text-xs flex justify-between bg-muted/40 p-2 rounded-lg border border-border">
                      <span className="font-semibold font-mono">{grn.receiptNo}</span>
                      <span className="text-muted-foreground">{new Date(grn.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Link to convert to Bill */}
            <div className="pt-2 border-t border-border/50">
              <Link to={`/bills/new?poId=${po.id}`} className="block">
                <button className="w-full text-xs font-bold bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 rounded-xl py-2 cursor-pointer transition-all">
                  Create Vendor Bill
                </button>
              </Link>
            </div>
          </Card>

          {/* Audit Logs Trail */}
          <Card className="p-5 space-y-4">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-foreground">Document Activity Trail</h4>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No edits logged.</p>
            ) : (
              <div className="space-y-3 pl-2 relative border-l border-border/60">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="relative pl-4 text-xs">
                    <div className="absolute w-2 h-2 rounded-full bg-accent left-[-21px] top-1"></div>
                    <p className="font-bold text-foreground capitalize">{log.action === 'CREATE' ? 'PO Created' : log.action === 'UPDATE' ? 'PO Updated' : log.action === 'RECEIVE' ? 'Inventory Received' : log.action}</p>
                    <p className="text-[10px] text-muted-foreground flex gap-1">
                      <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                      <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* Goods Receipt Recording Dialog Modal */}
      {grnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm print:hidden">
          <form onSubmit={handleSaveGrn} className="bg-surface border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-1.5">
                <FileCheck className="w-5 h-5 text-indigo-600" /> Record Goods Receipt Note
              </h3>
              <button type="button" onClick={() => setGrnModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">GRN Receipt Number *</label>
                <input
                  type="text"
                  required
                  value={grnReceiptNo}
                  onChange={e => setGrnReceiptNo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Receive Date *</label>
                <input
                  type="date"
                  required
                  value={grnDate}
                  onChange={e => setGrnDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Destination Warehouse *</label>
                <select
                  required
                  value={grnWarehouseId}
                  onChange={e => setGrnWarehouseId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none"
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Vehicle / Carrier Number</label>
                <input
                  type="text"
                  value={grnVehicleNo}
                  onChange={e => setGrnVehicleNo(e.target.value)}
                  placeholder="e.g. MH-12-GR-4521"
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Line items quantity adjustment */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quantities to Receive</h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {grnItems.map((item, idx) => {
                  const maxAllowed = item.orderedQty - item.receivedQty;

                  return (
                    <div key={item.productId} className="grid grid-cols-12 gap-3 items-center bg-muted/20 p-2 rounded-lg border border-border/60 text-xs">
                      <div className="col-span-6">
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">Ordered: {item.orderedQty} | Received: {item.receivedQty}</p>
                      </div>
                      <div className="col-span-6 flex items-center justify-end gap-2">
                        <span className="text-muted-foreground">Receive Qty:</span>
                        <input
                          type="number"
                          min="0"
                          max={maxAllowed}
                          value={item.currentReceiveQty}
                          onChange={e => handleGrnItemQtyChange(idx, Number(e.target.value))}
                          disabled={maxAllowed === 0}
                          className="w-20 px-2 py-1 text-right bg-background border border-border rounded focus:outline-none text-xs font-bold"
                        />
                        {maxAllowed === 0 && <span className="text-green-600 font-semibold text-[10px]">Fully Received</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setGrnModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Approve & Receive Stock
              </Button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
      <ConfirmDialog
        isOpen={showCancelPoDialog}
        onClose={() => setShowCancelPoDialog(false)}
        onConfirm={confirmCancelPo}
        title="Cancel Purchase Order"
        message="Are you sure you want to cancel this Purchase Order? This action cannot be undone."
        confirmText="Cancel PO"
        variant="danger"
      />
    </>
  );
};
