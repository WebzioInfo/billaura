import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, Edit2, Phone, Mail, Building, MapPin, DollarSign, 
  ShoppingCart, CreditCard, Activity, ArrowUpRight, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import { PageContainer, LoadingState, EmptyState } from '@/components/ui/LayoutComponents';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/data-table/DataTable';
import apiClient from '@/services/api';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

const formatDate = (date: string) => {
  if (!date) return '';
  return date.split('T')[0];
};

export const VendorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'purchases' | 'payments' | 'ledger'>('purchases');

  // Vendor Data
  const { data: vendor, isLoading: loadingVendor } = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const res = await apiClient.get(`/vendors/${id}`);
      return res.data?.data || res.data || null;
    }
  });

  // Recent Purchases
  const { data: purchasesData, isLoading: loadingPurchases } = useQuery({
    queryKey: ['vendor-purchases', id],
    queryFn: async () => {
      const res = await apiClient.get('/purchases', { params: { vendorId: id, limit: 50 } });
      return res.data?.data?.items || res.data?.data || [];
    }
  });

  // Recent Payments
  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['vendor-payments', id],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/payments', { params: { vendorId: id, limit: 50 } });
      return res.data?.data?.items || res.data?.data || [];
    }
  });

  const purchases = Array.isArray(purchasesData) ? purchasesData : [];
  const payments = Array.isArray(paymentsData) ? paymentsData : [];

  const purchaseColumns = useMemo(() => [
    {
      accessorKey: 'billNo',
      header: 'Bill No',
      cell: ({ row }: any) => <span className="font-medium text-foreground">{row.original.billNo}</span>
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }: any) => <span className="text-muted-foreground">{formatDate(row.original.date)}</span>
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const s = row.original.status;
        if (s === 'PAID') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Paid</span>;
        if (s === 'PARTIAL') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Partial</span>;
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Unpaid</span>;
      }
    },
    {
      accessorKey: 'grandTotal',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }: any) => <div className="text-right font-medium">{formatCurrency(row.original.grandTotal)}</div>
    }
  ], []);

  const paymentColumns = useMemo(() => [
    {
      accessorKey: 'paymentNo',
      header: 'Payment No',
      cell: ({ row }: any) => <span className="font-medium text-foreground">{row.original.paymentNo || row.original.voucherNo}</span>
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }: any) => <span className="text-muted-foreground">{formatDate(row.original.date)}</span>
    },
    {
      accessorKey: 'method',
      header: 'Method',
      cell: ({ row }: any) => <span className="text-muted-foreground">{row.original.method?.replace('_', ' ')}</span>
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }: any) => <div className="text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(row.original.amount)}</div>
    }
  ], []);

  if (loadingVendor) {
    return <PageContainer maxWidth="6xl"><LoadingState variant="card" /></PageContainer>;
  }

  if (!vendor) {
    return (
      <PageContainer maxWidth="6xl">
        <EmptyState title="Vendor Not Found" description="The vendor you are looking for does not exist." actionLabel="Back to Vendors" onActionClick={() => navigate('/vendors')} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="6xl">
      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <button 
            onClick={() => navigate('/vendors')}
            className="mt-1 p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground border border-border/40 bg-surface"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{vendor.name}</h1>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
                {vendor.bpCode || vendor.vendorCode}
              </span>
            </div>
            {vendor.tradeName && <p className="text-muted-foreground mt-1 font-medium">{vendor.tradeName}</p>}
            
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              {vendor.email && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary" /> {vendor.email}
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="w-4 h-4 text-primary" /> {vendor.phone}
                </div>
              )}
              {vendor.gstin && (
                <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                  <Building className="w-4 h-4 text-primary" /> GSTIN: {vendor.gstin}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => navigate(`/bills/new?vendorId=${vendor.id}`)} variant="outline" className="font-semibold bg-background">
            <ShoppingCart className="w-4 h-4 mr-2" /> New Bill
          </Button>
          <Button onClick={() => navigate(`/vendors/${vendor.id}/edit`)} variant="primary" className="font-semibold shadow-sm">
            <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-surface to-surface/50 border-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Outstanding Payable</h3>
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg"><AlertCircle className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-bold text-foreground">{formatCurrency(Number(vendor.payableBalance || 0))}</div>
          <p className="text-xs text-muted-foreground mt-2">Amount you owe to this vendor</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-surface to-surface/50 border-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CreditCard className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Total Bills (YTD)</h3>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><ShoppingCart className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-bold text-foreground">{purchases.length}</div>
          <p className="text-xs text-muted-foreground mt-2">Recorded in the current year</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-surface to-surface/50 border-border/60 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CheckCircle2 className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Credit Limit</h3>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Activity className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-bold text-foreground">{formatCurrency(Number(vendor.creditLimit || 0))}</div>
          <p className="text-xs text-muted-foreground mt-2">Maximum allowable credit</p>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card className="flex flex-col shadow-sm border-border/60 overflow-hidden">
        <div className="flex items-center gap-6 border-b border-border/40 px-6 pt-4 bg-surface/50">
          <button
            className={`pb-4 font-semibold text-sm transition-colors relative ${activeTab === 'purchases' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('purchases')}
          >
            Recent Purchases
            {activeTab === 'purchases' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
          </button>
          <button
            className={`pb-4 font-semibold text-sm transition-colors relative ${activeTab === 'payments' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments Made
            {activeTab === 'payments' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
          </button>
          <button
            className={`pb-4 font-semibold text-sm transition-colors relative ${activeTab === 'ledger' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('ledger')}
          >
            Vendor Information
            {activeTab === 'ledger' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
          </button>
        </div>

        <div className="p-0 min-h-[400px]">
          {activeTab === 'purchases' && (
            <div className="p-6">
              {loadingPurchases ? <LoadingState variant="table" /> : (
                <DataTable
                  columns={purchaseColumns}
                  data={purchases}
                  emptyText="No recent purchases found."
                  exportFilename={`${vendor.name}_Purchases`}
                />
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="p-6">
              {loadingPayments ? <LoadingState variant="table" /> : (
                <DataTable
                  columns={paymentColumns}
                  data={payments}
                  emptyText="No recent payments found."
                  exportFilename={`${vendor.name}_Payments`}
                />
              )}
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Billing Address
                  </h3>
                  <div className="bg-background rounded-xl p-4 border border-border/50">
                    <p className="text-foreground text-sm whitespace-pre-wrap">{vendor.address || 'No address provided.'}</p>
                    {vendor.state && <p className="text-foreground text-sm mt-2">{vendor.state} {vendor.pinCode}</p>}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-4 flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" /> Tax Details
                  </h3>
                  <div className="bg-background rounded-xl p-4 border border-border/50 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">GSTIN</p>
                      <p className="font-mono text-sm">{vendor.gstin || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">PAN</p>
                      <p className="font-mono text-sm">{vendor.panNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tax Type</p>
                      <p className="font-medium text-sm">{vendor.customerType || 'Unregistered'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Internal Notes
                </h3>
                <div className="bg-background rounded-xl p-4 border border-border/50 min-h-[120px]">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {vendor.notes || 'No internal notes recorded for this vendor.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </PageContainer>
  );
};
