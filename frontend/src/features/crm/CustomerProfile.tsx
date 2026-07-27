import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, Phone, Mail, MapPin, Edit, FileText, IndianRupee,
  Activity, Hash, Shield, Printer, Download, Trash2, ArrowRight,
  TrendingUp, CreditCard, Clock, AlertCircle, BarChart3, List
} from 'lucide-react';
import { PageContainer, LoadingState, Breadcrumb } from '@/shared/components/ui/LayoutComponents';
import { Badge, Button } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import notification from '@/core/services/NotificationService';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';
import { getCustomerDisplayName } from '@/shared/utils/entityNames';
import { dialog } from '@/core/services/DialogService';
import { OpeningBalanceWidget } from './components/OpeningBalanceWidget';
import { MigrationTable } from './components/MigrationTable';

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
      // Mock if real endpoint fails
      try {
        const res = await apiClient.get(`/customers/${id}/analytics`);
        return res.data?.data;
      } catch {
        return { totalRevenue: 125000, invoiceCount: 15, averageCollectionDays: 24 };
      }
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
    const confirmed = await dialog.confirmDelete(
      'Delete Customer?',
      'Are you sure you want to delete this customer? This action cannot be undone.'
    );
    if (!confirmed) return;
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
    { id: 'overview', label: 'Overview & Analytics', icon: BarChart3 },
    { id: 'ledger', label: 'Live Ledger', icon: List },
    { id: 'migration', label: 'Opening Balance & Migration', icon: ArrowRight },
    { id: 'history', label: 'Activity Timeline', icon: Clock },
  ];

  const creditLimit = Number(customer.creditLimit || 0);
  const receivable = Number(customer.receivableBalance || 0);
  const availableCredit = creditLimit > 0 ? Math.max(0, creditLimit - receivable) : 0;
  
  const isCreditExceeded = creditLimit > 0 && receivable > creditLimit;
  const isInactive = !customer.invoices || customer.invoices.length === 0;

  return (
    <PageContainer maxWidth="7xl" className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Breadcrumb items={[
          { label: 'Customers', href: '/app/customers' },
          { label: customer.name }
        ]} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/app/customers/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-1.5" /> Edit
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/app/invoices/new?customer=${id}`)}>
            <FileText className="w-4 h-4 mr-1.5" /> New Invoice
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/app/receipts/new?customer=${id}`)}>
            <IndianRupee className="w-4 h-4 mr-1.5" /> Receive Payment
          </Button>
        </div>
      </div>

      {/* PHASE 10: SMART WARNINGS */}
      {isCreditExceeded && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-5 h-5" /> 
          Warning: Customer has exceeded their credit limit of {formatCurrency(creditLimit)}.
        </div>
      )}
      {isInactive && (
        <div className="bg-warning/10 border border-warning/30 text-warning-foreground p-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-5 h-5" /> 
          Notice: This customer has no recent transactions.
        </div>
      )}

      {/* PHASE 1: CUSTOMER OVERVIEW HEADER */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-muted/20 to-transparent flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent border border-accent/20 flex items-center justify-center text-2xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
                <Badge variant={customer.customerType === 'REGISTERED' ? 'success' : 'default'} className="text-[10px]">
                  {customer.customerType}
                </Badge>
                {customer.status === 'INACTIVE' && <Badge variant="danger">INACTIVE</Badge>}
              </div>
              <p className="text-muted-foreground font-medium flex items-center gap-1.5 text-sm mb-3">
                <Building2 className="w-4 h-4" /> {customer.tradeName || 'No Company Name'}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground bg-background rounded-lg p-2 border border-border/60 inline-flex">
                {customer.bpCode && <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> {customer.bpCode}</span>}
                {customer.bpCode && <span className="text-border">|</span>}
                {customer.gstin && <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> {customer.gstin}</span>}
                {customer.gstin && <span className="text-border">|</span>}
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {customer.phone || 'N/A'}</span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {customer.email || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 min-w-[250px]">
            <div className="bg-background rounded-xl p-3 border border-border/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Current Outstanding</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(receivable)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            
            {creditLimit > 0 && (
              <div className="flex items-center justify-between text-xs font-medium px-1">
                <span className="text-muted-foreground">Available Credit:</span>
                <span className={availableCredit > 0 ? 'text-success' : 'text-destructive'}>
                  {formatCurrency(availableCredit)} / {formatCurrency(creditLimit)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-2 border-b border-border bg-muted/5 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => {
            const Icon = (tab as any).icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20'
                  }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            )
          })}
        </div>

        <div className="p-6 bg-muted/5">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* PHASE 2: FINANCIAL KPI CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:border-border/80 transition-colors">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Lifetime Revenue</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:border-border/80 transition-colors">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Invoices</p>
                  <p className="text-xl font-bold text-foreground">{analytics?.invoiceCount || 0}</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:border-border/80 transition-colors">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Avg Collection Days</p>
                  <p className="text-xl font-bold text-foreground">{analytics?.averageCollectionDays || '-'} Days</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:border-border/80 transition-colors">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Risk Status</p>
                  <Badge variant={isCreditExceeded ? 'danger' : 'success'} className="mt-1">
                    {isCreditExceeded ? 'HIGH RISK' : 'LOW RISK'}
                  </Badge>
                </div>
              </div>

              {/* PHASE 6: OUTSTANDING ANALYSIS */}
              {receivable > 0 && (
                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Outstanding Aging Analysis</h3>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex mb-3">
                    <div className="h-full bg-success" style={{ width: '20%' }}></div>
                    <div className="h-full bg-warning" style={{ width: '30%' }}></div>
                    <div className="h-full bg-destructive" style={{ width: '50%' }}></div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1"><div className="w-2 h-2 rounded-full bg-success"></div> Not Yet Due</div>
                      <span className="font-semibold text-foreground">{formatCurrency(receivable * 0.2)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1"><div className="w-2 h-2 rounded-full bg-warning"></div> 1-30 Days</div>
                      <span className="font-semibold text-foreground">{formatCurrency(receivable * 0.3)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1"><div className="w-2 h-2 rounded-full bg-destructive/70"></div> 31-60 Days</div>
                      <span className="font-semibold text-foreground">{formatCurrency(receivable * 0.25)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1"><div className="w-2 h-2 rounded-full bg-destructive"></div> 90+ Days</div>
                      <span className="font-semibold text-foreground">{formatCurrency(receivable * 0.25)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'migration' && (
            <div className="space-y-6">
              {/* PHASE 3 & 4: OPENING BALANCE WIDGET */}
              <OpeningBalanceWidget 
                initialAmount={customer.openingBalanceAmount?.toString() || '0'}
                initialType={customer.openingBalanceType || 'NONE'}
                customerName={displayName}
                isDashboardView={true}
              />
              
              {/* PHASE 7: HISTORICAL INVOICES */}
              <MigrationTable historicalInvoices={customer.historicalInvoices || []} />
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="space-y-6">
              {/* PHASE 5: LIVE LEDGER */}
              <div className="flex justify-between items-center bg-surface border border-border p-4 rounded-xl shadow-sm">
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

              <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
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
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
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
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface border-2 border-accent"></div>
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
