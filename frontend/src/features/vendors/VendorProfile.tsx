import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Edit,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Paperclip,
  Printer,
  Download,
  Mail,
  Phone,
  Building2,
  Clock,
  ShoppingCart,
  CreditCard,
  FileText,
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { ExportService } from '@/core/services/ExportService';
import { DocumentEngine } from '@/core/reporting/DocumentEngine';
import { cn } from '@/lib/utils';
import { ZohoSplitDetail, ZohoStatusText } from '@/shared/components/zoho';

export const VendorProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'statement' | 'comments'>('overview');

  // Collapsible section toggles
  const [addressOpen, setAddressOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [contactsOpen, setContactsOpen] = useState(true);

  // Dropdown states
  const [newTxnOpen, setNewTxnOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // 1. Fetch Vendors List for left compact list
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/vendors');
      const items = res.data?.data?.items || res.data?.items || (Array.isArray(res.data?.data) ? res.data.data : res.data) || [];
      return Array.isArray(items) ? items : [];
    },
  });
  const allVendors = Array.isArray(vendorsData) ? vendorsData : [];

  // 2. Fetch Selected Vendor Detail
  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const res = await apiClient.get(`/vendors/${id}`);
      return res.data?.data || res.data || null;
    },
    enabled: Boolean(id),
  });

  // 3. Fetch Vendor Bills / Purchases
  const { data: purchasesData } = useQuery({
    queryKey: ['vendor-purchases', id],
    queryFn: async () => {
      const res = await apiClient.get('/purchases', { params: { vendorId: id, limit: 50 } });
      return res.data?.data?.items || res.data?.data || [];
    },
    enabled: Boolean(id),
  });
  const purchases = Array.isArray(purchasesData) ? purchasesData : [];

  // 4. Fetch Vendor Payments
  const { data: paymentsData } = useQuery({
    queryKey: ['vendor-payments', id],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/payments', { params: { vendorId: id, limit: 50 } });
      return res.data?.data?.items || res.data?.data || [];
    },
    enabled: Boolean(id),
  });
  const payments = Array.isArray(paymentsData) ? paymentsData : [];

  // 5. Fetch Vendor Ledger
  const { data: ledger } = useQuery({
    queryKey: ['vendor', id, 'ledger'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/vendors/${id}/ledger`);
        return res.data?.data || res.data || null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(id),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete(`/vendors/${id}`);
    },
    onSuccess: async () => {
      await erpInvalidate.vendor(queryClient, { vendorId: id });
      notification.success('Vendor deleted successfully');
      navigate('/vendors');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete vendor');
    },
  });

  const handleDelete = async () => {
    const confirmed = await dialog.confirmDelete(
      'Delete Vendor?',
      `Are you sure you want to delete "${vendor?.name}"? This action cannot be undone.`
    );
    if (confirmed) {
      deleteMutation.mutate();
    }
  };

  const handleExportStatement = () => {
    if (!ledger?.transactions || ledger.transactions.length === 0) {
      notification.error('No statement transactions to export');
      return;
    }
    const headers = ['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Balance'];
    const rows = ledger.transactions.map((t: any) => ({
      Date: t.date?.split('T')[0] || '',
      Type: t.type || '',
      Reference: t.reference || '',
      Debit: t.balanceImpact > 0 ? t.balanceImpact : 0,
      Credit: t.balanceImpact < 0 ? Math.abs(t.balanceImpact) : 0,
      Balance: t.runningBalance || 0,
    }));
    ExportService.exportCsv(`${vendor?.name || 'Vendor'}_Statement.csv`, rows, headers);
  };

  const handlePrintStatement = async () => {
    if (!ledger?.transactions || ledger.transactions.length === 0) {
      notification.error('No statement transactions to print');
      return;
    }
    await DocumentEngine.generateTablePDF({
      title: `Statement of Accounts: ${vendor?.name}`,
      columns: [
        { header: 'Date', dataKey: 'date', width: 25 },
        { header: 'Type', dataKey: 'type', width: 25 },
        { header: 'Reference', dataKey: 'reference', width: 40 },
        { header: 'Debit (₹)', dataKey: 'debit', align: 'right' },
        { header: 'Credit (₹)', dataKey: 'credit', align: 'right' },
      ],
      data: ledger.transactions.map((t: any) => ({
        date: t.date?.split('T')[0] || '',
        type: t.type || '',
        reference: t.reference || '',
        debit: t.balanceImpact > 0 ? `₹${t.balanceImpact.toFixed(2)}` : '',
        credit: t.balanceImpact < 0 ? `₹${Math.abs(t.balanceImpact).toFixed(2)}` : '',
      })),
    });
  };

  // Map compact list items for SplitDetail
  const splitItems = useMemo(() => {
    return allVendors.map((v: any) => ({
      id: v.id,
      name: v.name || 'Unnamed Vendor',
      amount: v.balance || v.outstandingBalance || 0,
      number: v.bpCode || v.vendorCode || 'VEND',
      date: v.createdAt ? v.createdAt.split('T')[0] : '',
      status: v.status || 'ACTIVE',
    }));
  }, [allVendors]);

  if (isLoading && !vendor) {
    return (
      <div className="w-full h-full flex items-center justify-center p-12 text-xs text-[#6B7280]">
        Loading Vendor Profile...
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 text-xs text-[#6B7280] space-y-3">
        <p>Vendor not found.</p>
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="px-4 py-1.5 bg-[#408DFB] text-white rounded-[4px] cursor-pointer"
        >
          Back to Vendors
        </button>
      </div>
    );
  }

  const payable = Number(vendor.payableBalance || vendor.balance || vendor.outstandingBalance || 0);
  const unusedCredits = Number(vendor.unusedCredits || 0);
  const initials = (vendor.name || 'V')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ZohoSplitDetail
      moduleTitle="All Vendors"
      items={splitItems}
      selectedId={id || ''}
      onSelect={(selectedId) => navigate(`/vendors/${selectedId}`)}
      onNew={() => navigate('/vendors/new')}
      onClose={() => navigate('/vendors')}
      detailTitle={vendor.name}
      detailActions={
        <div className="flex items-center gap-2">
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => navigate(`/vendors/${id}/edit`)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Edit</span>
          </button>

          {/* Blue "New Transaction ▾" Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNewTxnOpen(!newTxnOpen)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] text-xs font-medium cursor-pointer"
            >
              <span>New Transaction</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {newTxnOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white text-[#2B2F36] rounded-[4px] shadow-xl border border-[#E5E7EB] py-1 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setNewTxnOpen(false);
                    navigate(`/bills/new?vendorId=${id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  Bill
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTxnOpen(false);
                    navigate(`/purchase-orders/new?vendorId=${id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  Purchase Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTxnOpen(false);
                    navigate(`/expenses?vendorId=${id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTxnOpen(false);
                    navigate(`/debit-notes/new?vendorId=${id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  Vendor Credit
                </button>
              </div>
            )}
          </div>

          {/* "More ▾" Options */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="p-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] cursor-pointer"
              title="More"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-white text-[#2B2F36] rounded-[4px] shadow-xl border border-[#E5E7EB] py-1 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    navigate(`/vendors/new?cloneFrom=${id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] cursor-pointer"
                >
                  Clone
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    handleDelete();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FEF2F2] text-[#E54B4B] cursor-pointer font-medium"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full bg-white select-none">
        {/* Detail Tabs Bar: Overview | Transactions | Statement | Comments */}
        <div className="h-10 px-6 border-b border-[#E5E7EB] bg-white flex items-center gap-6 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={cn(
              'h-full border-b-2 font-medium cursor-pointer transition-colors flex items-center',
              activeTab === 'overview'
                ? 'border-[#408DFB] text-[#408DFB] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
            )}
          >
            Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={cn(
              'h-full border-b-2 font-medium cursor-pointer transition-colors flex items-center',
              activeTab === 'transactions'
                ? 'border-[#408DFB] text-[#408DFB] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
            )}
          >
            Transactions
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            className={cn(
              'h-full border-b-2 font-medium cursor-pointer transition-colors flex items-center',
              activeTab === 'statement'
                ? 'border-[#408DFB] text-[#408DFB] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
            )}
          >
            Statement
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={cn(
              'h-full border-b-2 font-medium cursor-pointer transition-colors flex items-center',
              activeTab === 'comments'
                ? 'border-[#408DFB] text-[#408DFB] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
            )}
          >
            Comments
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column (Light Grey Background #F8F9FB, ~320px) */}
            <div className="w-80 md:w-96 bg-[#F8F9FB] border-r border-[#E5E7EB] p-5 overflow-y-auto space-y-5 text-xs text-[#2B2F36] shrink-0">
              {/* Contact Card */}
              <div className="flex items-start gap-3 pb-4 border-b border-[#E5E7EB]">
                <div className="w-11 h-11 rounded-[4px] bg-[#408DFB] text-white flex items-center justify-center font-bold text-base shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm text-[#2B2F36] truncate">
                    {vendor.name}
                  </h3>
                  {vendor.companyName && (
                    <p className="text-[11px] text-[#6B7280] truncate">{vendor.companyName}</p>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-1 truncate">
                      <Mail className="w-3 h-3 shrink-0 text-[#9CA3AF]" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-0.5 tabular-nums">
                      <Phone className="w-3 h-3 shrink-0 text-[#9CA3AF]" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible Section: ADDRESS */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setAddressOpen(!addressOpen)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-[#6B7280] uppercase tracking-wider cursor-pointer"
                >
                  <span>Address</span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-[#6B7280] transition-transform duration-150',
                      !addressOpen && '-rotate-90'
                    )}
                  />
                </button>

                {addressOpen && (
                  <div className="space-y-3 pt-1 text-xs">
                    <div>
                      <div className="font-medium text-[#2B2F36] mb-0.5">Billing Address</div>
                      <p className="text-[#6B7280] leading-relaxed">
                        {vendor.address || 'No billing address provided.'}
                        {vendor.state && `, ${vendor.state}`}
                        {vendor.pinCode && ` - ${vendor.pinCode}`}
                      </p>
                    </div>

                    <div>
                      <div className="font-medium text-[#2B2F36] mb-0.5">Shipping Address</div>
                      <p className="text-[#6B7280] leading-relaxed">
                        {vendor.address || 'Same as billing address.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Section: OTHER DETAILS */}
              <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setDetailsOpen(!detailsOpen)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-[#6B7280] uppercase tracking-wider cursor-pointer"
                >
                  <span>Other Details</span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-[#6B7280] transition-transform duration-150',
                      !detailsOpen && '-rotate-90'
                    )}
                  />
                </button>

                {detailsOpen && (
                  <div className="space-y-2 pt-1 text-xs divide-y divide-[#E5E7EB]">
                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">Vendor Type</span>
                      <span className="font-medium text-[#2B2F36]">
                        {vendor.customerType || vendor.vendorType || 'Business'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">Currency</span>
                      <span className="font-medium text-[#2B2F36]">INR - Indian Rupee</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">GST Treatment</span>
                      <span className="font-medium text-[#2B2F36]">
                        {vendor.gstRegistrationStatus || 'Registered'}
                      </span>
                    </div>

                    {vendor.gstin && (
                      <div className="flex justify-between py-1">
                        <span className="text-[#6B7280]">GSTIN</span>
                        <span className="font-mono font-medium text-[#2B2F36]">{vendor.gstin}</span>
                      </div>
                    )}

                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">Source of Supply</span>
                      <span className="font-medium text-[#2B2F36]">
                        {vendor.placeOfSupply || vendor.state || 'Maharashtra'}
                      </span>
                    </div>

                    {vendor.panNumber && (
                      <div className="flex justify-between py-1">
                        <span className="text-[#6B7280]">PAN</span>
                        <span className="font-mono font-medium text-[#2B2F36]">{vendor.panNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RECORD INFO */}
              <div className="pt-2 border-t border-[#E5E7EB] text-[11px] text-[#6B7280] space-y-1">
                <div>Vendor Code: <span className="font-mono text-[#2B2F36]">{vendor.bpCode || vendor.vendorCode || '—'}</span></div>
                <div>Created: <span>{vendor.createdAt?.split('T')[0] || 'Recently'}</span></div>
              </div>
            </div>

            {/* Right Column: Payables Table, Expenses Chart, Activity Timeline */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-white">
              {/* Payment due period */}
              <div className="text-xs text-[#6B7280]">
                Payment due period: <span className="font-semibold text-[#2B2F36]">Due on Receipt</span>
              </div>

              {/* Payables Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                    Payables
                  </h4>
                  <button
                    type="button"
                    onClick={() => navigate(`/vendors/${id}/edit`)}
                    className="text-xs text-[#408DFB] hover:underline cursor-pointer"
                  >
                    Enter Opening Balance
                  </button>
                </div>

                <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-left">
                        <th className="px-4 py-2">Currency</th>
                        <th className="px-4 py-2 text-right">Outstanding Payables</th>
                        <th className="px-4 py-2 text-right">Unused Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-[#F9FAFB]">
                        <td className="px-4 py-3 font-medium text-[#2B2F36]">
                          INR - Indian Rupee
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#2B2F36] tabular-nums">
                          ₹{payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right text-[#6B7280] tabular-nums">
                          ₹{unusedCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expenses Summary */}
              <div className="border border-[#E5E7EB] rounded-[4px] p-4 bg-[#F8F9FB] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2B2F36]">
                    Total Purchases & Expenses
                  </span>
                  <span className="text-[11px] text-[#6B7280]">Accrual</span>
                </div>
                <div className="text-xl font-bold text-[#2B2F36] tabular-nums">
                  ₹{payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Recent Bills & Purchases */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                  Recent Bills
                </h4>

                <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-left">
                        <th className="px-4 py-2">Bill#</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {purchases.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-xs text-[#6B7280]">
                            No bills found for this vendor.
                          </td>
                        </tr>
                      ) : (
                        purchases.slice(0, 5).map((p: any) => (
                          <tr key={p.id} className="hover:bg-[#F9FAFB]">
                            <td className="px-4 py-2 font-medium text-[#408DFB]">
                              {p.billNo || p.billNumber || 'BILL'}
                            </td>
                            <td className="px-4 py-2 text-[#6B7280]">
                              {p.date?.split('T')[0] || ''}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-[#2B2F36] tabular-nums">
                              ₹{Number(p.grandTotal || p.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <ZohoStatusText status={p.status || 'OPEN'} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <span className="font-bold text-xs text-[#2B2F36]">Bills ({purchases.length})</span>
              <button
                type="button"
                onClick={() => navigate(`/bills/new?vendorId=${id}`)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#408DFB] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Bill</span>
              </button>
            </div>

            <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-left">
                    <th className="px-4 py-2">Bill#</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                        No bills recorded for this vendor.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((b: any) => (
                      <tr key={b.id} className="hover:bg-[#F9FAFB]">
                        <td className="px-4 py-2.5 font-medium text-[#408DFB]">
                          {b.billNo || b.billNumber || 'BILL'}
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280]">
                          {b.date?.split('T')[0] || ''}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-[#2B2F36] tabular-nums">
                          ₹{Number(b.grandTotal || b.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <ZohoStatusText status={b.status || 'OPEN'} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: STATEMENT */}
        {activeTab === 'statement' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h3 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                Vendor Statement
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintStatement}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportStatement}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-left">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Reference</th>
                    <th className="px-4 py-2 text-right">Debit</th>
                    <th className="px-4 py-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {!ledger?.transactions || ledger.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                        No statement entries available for this vendor.
                      </td>
                    </tr>
                  ) : (
                    ledger.transactions.map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F9FAFB]">
                        <td className="px-4 py-2 text-[#6B7280]">
                          {tx.date?.split('T')[0] || ''}
                        </td>
                        <td className="px-4 py-2 font-medium text-[#2B2F36]">
                          {tx.type || 'Entry'}
                        </td>
                        <td className="px-4 py-2 text-[#6B7280]">
                          {tx.reference || '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-[#2B2F36] tabular-nums">
                          {tx.balanceImpact > 0 ? `₹${tx.balanceImpact.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-[#2B2F36] tabular-nums">
                          {tx.balanceImpact < 0 ? `₹${Math.abs(tx.balanceImpact).toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: COMMENTS */}
        {activeTab === 'comments' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <h3 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-2 border-b border-[#E5E7EB]">
              Notes & Comments
            </h3>
            <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px] p-4 text-xs text-[#2B2F36] leading-relaxed">
              {vendor.notes ? vendor.notes : 'No vendor notes or remarks recorded.'}
            </div>
          </div>
        )}
      </div>
    </ZohoSplitDetail>
  );
};
