import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, Phone, Mail, MapPin, Edit, FileText, IndianRupee,
  Activity, Hash, Shield, Printer, Download, Trash2,
} from 'lucide-react';
import { PageContainer, LoadingState, Breadcrumb } from '@/components/ui/LayoutComponents';
import { Badge, Button } from '@/components/ui';
import apiClient from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import notification from '@/services/NotificationService';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';
import { getCustomerDisplayName } from '@/utils/entityNames';

export const CustomerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${id}`);
      return res.data?.data;
    }
  });

  const displayName = getCustomerDisplayName(customer);
  useDynamicTitle(customer ? displayName : null);

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['customer', id, 'analytics'],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${id}/analytics`);
      return res.data?.data;
    }
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['customer', id, 'ledger'],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${id}/ledger`);
      return res.data?.data;
    }
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['customer', id, 'history'],
    queryFn: async () => {
      const res = await apiClient.get(`/customers/${id}/history`);
      return res.data?.data;
    }
  });

  if (isLoading) return <PageContainer><LoadingState variant="form" /></PageContainer>;
  if (!customer) return <PageContainer><div className="p-8 text-center text-muted-foreground">Customer not found</div></PageContainer>;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await apiClient.delete(`/customers/${id}`);
      notification.success("Customer deleted successfully");
      navigate("/app/customers");
    } catch (e: any) {
      notification.error(e.response?.data?.message || "Failed to delete customer");
    }
  };

  const handleExport = () => {
    if (!ledger?.transactions || ledger.transactions.length === 0) {
      notification.error("No transactions to export");
      return;
    }
    const headers = ['Date', 'Type', 'Reference', 'Debit', 'Credit'];
    const rows = ledger.transactions.map((t: any) => [
      formatDate(t.date),
      t.type,
      t.reference || '',
      t.balanceImpact > 0 ? t.balanceImpact : '',
      t.balanceImpact < 0 ? Math.abs(t.balanceImpact) : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${customer?.name || 'Customer'}_Ledger.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'ledger', label: 'Ledger & Transactions' },
    { id: 'history', label: 'Activity History' },
  ];

  return (
    <PageContainer maxWidth="7xl" className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Breadcrumb items={[
          { label: 'Customers', href: '/app/customers' },
          { label: customer.name }
        ]} />
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-6 py-6 border-b border-border bg-muted/10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-accent/10 text-accent flex items-center justify-center text-2xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{displayName}</h1>
                <Badge variant={customer.customerType === 'REGISTERED' ? 'success' : 'default'}>
                  {customer.customerType}
                </Badge>
              </div>
              <p className="text-muted-foreground font-medium flex items-center gap-1.5 text-sm">
                <Building2 className="w-4 h-4" /> {customer.tradeName || 'No Company Name'}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                {customer.bpCode && <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {customer.bpCode}</span>}
                {customer.gstin && <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> GST: {customer.gstin}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap md:justify-end">
            <Button variant="outline" size="sm" onClick={() => navigate(`/app/customers/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-1.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate(`/app/invoices/new?customer=${id}`)}>
              <FileText className="w-4 h-4 mr-1.5" /> Create Invoice
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate(`/app/receipts/new?customer=${id}`)}>
              <IndianRupee className="w-4 h-4 mr-1.5" /> Receive Payment
            </Button>
          </div>
        </div>

        <div className="flex px-6 border-b border-border bg-muted/5 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <div className="lg:col-span-2 space-y-6">
                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Revenue</p>
                    {analyticsLoading ? <div className="h-8 bg-muted animate-pulse rounded w-1/2"></div> : (
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                    )}
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Invoices</p>
                    {analyticsLoading ? <div className="h-8 bg-muted animate-pulse rounded w-1/3"></div> : (
                      <p className="text-2xl font-bold text-foreground">{analytics?.invoiceCount || 0}</p>
                    )}
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Outstanding</p>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(customer.receivableBalance || 0)}</p>
                  </div>
                </div>

                <div className="bg-background border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Recent Invoices</h3>
                  {customer.invoices && customer.invoices.length > 0 ? (
                    <div className="space-y-3">
                      {customer.invoices.map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/10">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent/10 text-accent rounded-md">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <Link to={`/app/invoices/${inv.id}`} className="font-semibold text-sm hover:underline">{inv.invoiceNumber}</Link>
                              <p className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatCurrency(inv.totalAmount)}</p>
                            <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'warning'}>
                              {inv.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent invoices.</p>
                  )}
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="bg-background border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Contact Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">{customer.email || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">Email Address</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">{customer.phone || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">Phone Number</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground whitespace-pre-wrap">{customer.address || 'N/A'}</p>
                        {(customer.state || customer.pinCode) && (
                          <p className="font-medium text-foreground mt-0.5">{customer.state} {customer.pinCode}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">Billing Address</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-background border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Business Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PAN</span>
                      <span className="font-semibold font-mono">{customer.panNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Credit Limit</span>
                      <span className="font-semibold">{formatCurrency(customer.creditLimit || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Place of Supply</span>
                      <span className="font-semibold">{customer.placeOfSupply || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer Since</span>
                      <span className="font-semibold">{formatDate(customer.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-background border border-border p-4 rounded-xl shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Closing Balance</h3>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(ledger?.receivableBalance || 0)}
                    <span className="text-sm font-normal text-muted-foreground ml-2">(Dr)</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</Button>
                  <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Export</Button>
                </div>
              </div>

              <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledgerLoading ? (
                      <tr><td colSpan={5} className="p-4 text-center">Loading ledger...</td></tr>
                    ) : ledger?.transactions?.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No transactions found.</td></tr>
                    ) : (
                      ledger?.transactions?.map((t: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{formatDate(t.date)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={t.type === 'INVOICE' ? 'default' : 'success'}>{t.type}</Badge>
                          </td>
                          <td className="px-4 py-3 font-medium">{t.reference}</td>
                          <td className="px-4 py-3 text-right">{t.balanceImpact > 0 ? formatCurrency(t.balanceImpact) : '-'}</td>
                          <td className="px-4 py-3 text-right">{t.balanceImpact < 0 ? formatCurrency(Math.abs(t.balanceImpact)) : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-background border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">Activity Timeline</h3>
              {historyLoading ? (
                <div className="text-center p-4">Loading history...</div>
              ) : history?.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No activity history available yet.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-border ml-3 space-y-8">
                  {history?.map((act: any) => (
                    <div key={act.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-2 border-accent"></div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-accent">{formatDate(act.activityDate)}</span>
                        <h4 className="font-semibold text-sm">{act.type}</h4>
                        {act.description && <p className="text-sm text-muted-foreground">{act.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </PageContainer>
  );
};
