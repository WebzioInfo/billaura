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
  MapPin,
  Clock,
  ArrowRight,
  FileText,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { dialog } from '@/core/services/DialogService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { ExportService } from '@/core/services/ExportService';
import { DocumentEngine } from '@/core/reporting/DocumentEngine';
import { cn } from '@/lib/utils';
import { ZohoSplitDetail, ZohoStatusText } from '@/shared/components/zoho';

export const CustomerProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'statement' | 'comments'>('overview');
  const [transactionTab, setTransactionTab] = useState<'invoices' | 'quotes' | 'receipts'>('invoices');

  // Collapsible section toggles in Overview left column
  const [addressOpen, setAddressOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [contactsOpen, setContactsOpen] = useState(true);

  // Dropdown states
  const [newTxnOpen, setNewTxnOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // 1. Fetch Customers List for left compact list
  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get('/customers');
      const items = res.data?.data?.items || res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  // 2. Fetch Selected Customer Detail
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${id}`);
      return res.data?.data || res.data;
    },
    enabled: Boolean(id),
  });

  // 3. Fetch Customer Ledger (Statement)
  const { data: ledger } = useQuery({
    queryKey: ['customer', id, 'ledger'],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${id}/ledger`);
      return res.data?.data || res.data;
    },
    enabled: Boolean(id),
  });

  // 4. Fetch Customer History / Activity
  const { data: history = [] } = useQuery({
    queryKey: ['customer', id, 'history'],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${id}/history`);
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    },
    enabled: Boolean(id),
  });

  // 5. Fetch Customer Invoices
  const { data: customerInvoices = [] } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: async () => {
      const res = await apiClient.get('/invoices', { params: { customerId: id, limit: 50 } });
      const items = res.data?.data?.items || res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    },
    enabled: Boolean(id),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete(`/customers/${id}`);
    },
    onSuccess: async () => {
      await erpInvalidate.customer(queryClient, { customerId: id });
      notification.success('Customer deleted successfully');
      navigate('/customers');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete customer');
    },
  });

  const handleDelete = async () => {
    const confirmed = await dialog.confirmDelete(
      'Delete Customer?',
      `Are you sure you want to delete "${customer?.name}"? This action cannot be undone.`
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
    ExportService.exportCsv(`${customer?.name || 'Customer'}_Statement.csv`, rows, headers);
  };

  const handlePrintStatement = async () => {
    if (!ledger?.transactions || ledger.transactions.length === 0) {
      notification.error('No statement transactions to print');
      return;
    }
    await DocumentEngine.generateTablePDF({
      title: `Statement of Accounts: ${customer?.name}`,
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
    return allCustomers.map((c: any) => ({
      id: c.id,
      name: c.name || 'Unnamed',
      amount: c.balance || c.outstandingBalance || 0,
      number: c.bpCode || c.customerCode || 'CUST',
      date: c.createdAt ? c.createdAt.split('T')[0] : '',
      status: c.status || 'ACTIVE',
    }));
  }, [allCustomers]);

  if (isLoading && !customer) {
    return (
      <div className="w-full h-full flex items-center justify-center p-12 text-xs text-[#6B7280]">
        Loading Customer Profile...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 text-xs text-[#6B7280] space-y-3">
        <p>Customer not found.</p>
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="px-4 py-1.5 bg-[#408DFB] text-white rounded-[4px] cursor-pointer"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  const receivable = Number(customer.receivableBalance || customer.balance || customer.outstandingBalance || 0);
  const unusedCredits = Number(customer.unusedCredits || 0);
  const initials = (customer.name || 'C')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ZohoSplitDetail
      moduleTitle="All Customers"
      items={splitItems}
      selectedId={id || ''}
      onSelect={(selectedId) => navigate(`/customers/${selectedId}`)}
      onNew={() => navigate('/customers/new')}
      onClose={() => navigate('/customers')}
      detailTitle={customer.name}
      detailActions={
        <div className="flex items-center gap-2">
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => navigate(`/customers/${id}/edit`)}
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
                    navigate(`/invoices/new?customerId=${id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  Invoice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTxnOpen(false);
                    navigate(`/quotations/new?customerId=${id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  Customer Quote
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTxnOpen(false);
                    navigate(`/sales-orders/new?customerId=${id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  Sales Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTxnOpen(false);
                    navigate(`/receipts/new?customerId=${id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  Payment Received
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTxnOpen(false);
                    navigate(`/credit-notes/new?customerId=${id}`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  Credit Note
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
                    navigate(`/customers/new?cloneFrom=${id}`);
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
        {/* Detail Tabs Bar: Overview | Comments | Transactions | Statement */}
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

        {/* TAB 1: OVERVIEW (Two-Column Layout) */}
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
                    {customer.name}
                  </h3>
                  {customer.tradeName && (
                    <p className="text-[11px] text-[#6B7280] truncate">{customer.tradeName}</p>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-1 truncate">
                      <Mail className="w-3 h-3 shrink-0 text-[#9CA3AF]" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-0.5 tabular-nums">
                      <Phone className="w-3 h-3 shrink-0 text-[#9CA3AF]" />
                      <span>{customer.phone}</span>
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
                        {customer.address || customer.billingAddress?.street1 || 'No billing address provided.'}
                        {customer.billingAddress?.city && `, ${customer.billingAddress.city}`}
                        {customer.billingAddress?.state && `, ${customer.billingAddress.state}`}
                        {customer.billingAddress?.pinCode && ` - ${customer.billingAddress.pinCode}`}
                      </p>
                    </div>

                    <div>
                      <div className="font-medium text-[#2B2F36] mb-0.5">Shipping Address</div>
                      <p className="text-[#6B7280] leading-relaxed">
                        {customer.shippingAddress?.street1 || customer.address || 'Same as billing address.'}
                        {customer.shippingAddress?.city && `, ${customer.shippingAddress.city}`}
                        {customer.shippingAddress?.state && `, ${customer.shippingAddress.state}`}
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
                      <span className="text-[#6B7280]">Customer Type</span>
                      <span className="font-medium text-[#2B2F36]">
                        {customer.customerType || 'Business'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">Currency</span>
                      <span className="font-medium text-[#2B2F36]">INR - Indian Rupee</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">GST Treatment</span>
                      <span className="font-medium text-[#2B2F36]">
                        {customer.gstRegistrationStatus || 'Registered'}
                      </span>
                    </div>

                    {customer.gstin && (
                      <div className="flex justify-between py-1">
                        <span className="text-[#6B7280]">GSTIN</span>
                        <span className="font-mono font-medium text-[#2B2F36]">{customer.gstin}</span>
                      </div>
                    )}

                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">Place of Supply</span>
                      <span className="font-medium text-[#2B2F36]">
                        {customer.placeOfSupply || customer.state || 'Maharashtra'}
                      </span>
                    </div>

                    {customer.panNumber && (
                      <div className="flex justify-between py-1">
                        <span className="text-[#6B7280]">PAN</span>
                        <span className="font-mono font-medium text-[#2B2F36]">{customer.panNumber}</span>
                      </div>
                    )}

                    <div className="flex justify-between py-1">
                      <span className="text-[#6B7280]">Tax Preference</span>
                      <span className="font-medium text-[#2B2F36]">
                        {customer.taxPreference || 'Taxable'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Section: CONTACT PERSONS */}
              <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setContactsOpen(!contactsOpen)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-[#6B7280] uppercase tracking-wider cursor-pointer"
                >
                  <span>Contact Persons</span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-[#6B7280] transition-transform duration-150',
                      !contactsOpen && '-rotate-90'
                    )}
                  />
                </button>

                {contactsOpen && (
                  <div className="pt-1 text-xs text-[#6B7280]">
                    {customer.contactPersons && customer.contactPersons.length > 0 ? (
                      <div className="space-y-2">
                        {customer.contactPersons.map((cp: any, idx: number) => (
                          <div key={idx} className="bg-white p-2 border border-[#E5E7EB] rounded-[4px]">
                            <div className="font-medium text-[#2B2F36]">
                              {cp.salutation} {cp.firstName} {cp.lastName}
                            </div>
                            {cp.email && <div className="text-[11px] text-[#6B7280]">{cp.email}</div>}
                            {cp.mobile && <div className="text-[11px] text-[#6B7280] tabular-nums">{cp.mobile}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No contact persons found.</p>
                    )}
                  </div>
                )}
              </div>

              {/* RECORD INFO */}
              <div className="pt-2 border-t border-[#E5E7EB] text-[11px] text-[#6B7280] space-y-1">
                <div>Customer Code: <span className="font-mono text-[#2B2F36]">{customer.bpCode || customer.customerCode || '—'}</span></div>
                <div>Created: <span>{customer.createdAt?.split('T')[0] || 'Recently'}</span></div>
              </div>
            </div>

            {/* Right Column: Receivables Table, Income Chart, Activity Timeline */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-white">
              {/* Payment due period */}
              <div className="text-xs text-[#6B7280]">
                Payment due period: <span className="font-semibold text-[#2B2F36]">Due on Receipt</span>
              </div>

              {/* Receivables Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                    Receivables
                  </h4>
                  <button
                    type="button"
                    onClick={() => navigate(`/customers/${id}/edit`)}
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
                        <th className="px-4 py-2 text-right">Outstanding Receivables</th>
                        <th className="px-4 py-2 text-right">Unused Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-[#F9FAFB]">
                        <td className="px-4 py-3 font-medium text-[#2B2F36]">
                          INR - Indian Rupee
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#2B2F36] tabular-nums">
                          ₹{receivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right text-[#6B7280] tabular-nums">
                          ₹{unusedCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Income Summary (Last 6 Months) */}
              <div className="border border-[#E5E7EB] rounded-[4px] p-4 bg-[#F8F9FB] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2B2F36]">
                    Total Income (Last 6 Months)
                  </span>
                  <span className="text-[11px] text-[#6B7280]">Accrual</span>
                </div>
                <div className="text-xl font-bold text-[#2B2F36] tabular-nums">
                  ₹{receivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                  Activity Timeline
                </h4>

                <div className="relative pl-6 space-y-4 border-l-2 border-[#CBD5E1] ml-2">
                  {history.length === 0 ? (
                    <div className="text-xs text-[#6B7280]">
                      Customer profile active. No recent updates logged.
                    </div>
                  ) : (
                    history.map((item: any, idx: number) => (
                      <div key={idx} className="relative">
                        {/* Dot on line */}
                        <div className="w-2.5 h-2.5 rounded-full bg-[#408DFB] absolute -left-[31px] top-1.5 ring-4 ring-white" />
                        <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-3 text-xs shadow-2xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#2B2F36]">
                              {item.action || item.type || 'Customer Updated'}
                            </span>
                            <span className="text-[10px] text-[#6B7280]">
                              {item.createdAt ? item.createdAt.split('T')[0] : 'Today'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6B7280]">
                            {item.description || item.notes || `Activity recorded by ${item.user || 'System'}`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {/* Transaction Sub-Tabs: Invoices */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-bold text-[#2B2F36]">Invoices ({customerInvoices.length})</span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/invoices/new?customerId=${id}`)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#408DFB] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Invoice</span>
              </button>
            </div>

            <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-left">
                    <th className="px-4 py-2">Invoice#</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Due Date</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">Balance Due</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {customerInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                        No invoices created for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    customerInvoices.map((inv: any) => (
                      <tr
                        key={inv.id}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="hover:bg-[#F9FAFB] cursor-pointer"
                      >
                        <td className="px-4 py-2.5 font-medium text-[#408DFB] hover:underline">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280]">
                          {inv.invoiceDate?.split('T')[0] || inv.date?.split('T')[0]}
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280]">
                          {inv.dueDate?.split('T')[0] || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-[#2B2F36] tabular-nums">
                          ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#2B2F36] tabular-nums">
                          ₹{Number(inv.balanceDue || inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <ZohoStatusText status={inv.status || 'DRAFT'} />
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
                Customer Statement
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
                    <th className="px-4 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {!ledger?.transactions || ledger.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                        No ledger statement transactions recorded for this period.
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
                        <td className="px-4 py-2 text-right font-medium text-[#2B2F36] tabular-nums">
                          {tx.runningBalance !== undefined ? `₹${Number(tx.runningBalance).toFixed(2)}` : '—'}
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
              {customer.notes ? customer.notes : 'No customer notes or comments provided.'}
            </div>
          </div>
        )}
      </div>
    </ZohoSplitDetail>
  );
};
