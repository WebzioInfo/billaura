import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Shield, Search, RefreshCw, Loader2, Download, Printer, 
  ArrowUpRight, ArrowDownLeft, Landmark, Percent, FileText 
} from 'lucide-react';
import api from '../../services/api';

// --- TYPES ---
interface GstrRow {
  invoiceNo?: string;
  purchaseNo?: string;
  customerName?: string;
  vendorName?: string;
  gstin: string;
  date: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  totalValue: number;
}

interface TaxSummary {
  outwardTaxable: number;
  inwardTaxable: number;
  liability: { cgst: number; sgst: number; igst: number; total: number };
  itc: { cgst: number; sgst: number; igst: number; total: number };
  netPayable: { cgst: number; sgst: number; igst: number; total: number };
}

export const TaxesDashboard = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'gstr1' | 'gstr2'>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [summary, setSummary] = useState<TaxSummary>({
    outwardTaxable: 0,
    inwardTaxable: 0,
    liability: { cgst: 0, sgst: 0, igst: 0, total: 0 },
    itc: { cgst: 0, sgst: 0, igst: 0, total: 0 },
    netPayable: { cgst: 0, sgst: 0, igst: 0, total: 0 },
  });
  const [gstr1List, setGstr1List] = useState<GstrRow[]>([]);
  const [gstr2List, setGstr2List] = useState<GstrRow[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'summary') {
        const res = await api.get<any>('/taxes/summary');
        const data = res?.data || res;
        setSummary({
          outwardTaxable: data?.outwardTaxable ?? 0,
          inwardTaxable: data?.inwardTaxable ?? 0,
          liability: {
            cgst: data?.liability?.cgst ?? 0,
            sgst: data?.liability?.sgst ?? 0,
            igst: data?.liability?.igst ?? 0,
            total: data?.liability?.total ?? 0,
          },
          itc: {
            cgst: data?.itc?.cgst ?? 0,
            sgst: data?.itc?.sgst ?? 0,
            igst: data?.itc?.igst ?? 0,
            total: data?.itc?.total ?? 0,
          },
          netPayable: {
            cgst: data?.netPayable?.cgst ?? 0,
            sgst: data?.netPayable?.sgst ?? 0,
            igst: data?.netPayable?.igst ?? 0,
            total: data?.netPayable?.total ?? 0,
          },
        });
      } else if (activeTab === 'gstr1') {
        const res = await api.get<any>('/taxes/gstr-1');
        const list = Array.isArray(res) ? res : (res?.data || []);
        setGstr1List(list);
      } else if (activeTab === 'gstr2') {
        const res = await api.get<any>('/taxes/gstr-2');
        const list = Array.isArray(res) ? res : (res?.data || []);
        setGstr2List(list);
      }
    } catch (err) {
      toast.error('Failed to load GST tax reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const handleExportCsv = () => {
    const list = activeTab === 'gstr1' ? gstr1List : gstr2List;
    if (list.length === 0) {
      toast.error('No records available to export');
      return;
    }

    const headers = ['Ref No', 'Party Name', 'GSTIN', 'Date', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Cess', 'Total GST', 'Total Value'];
    const rows = list.map((item) => [
      item.invoiceNo || item.purchaseNo || '',
      item.customerName || item.vendorName || '',
      item.gstin,
      item.date.split('T')[0],
      item.taxableValue,
      item.cgst,
      item.sgst,
      item.igst,
      item.cess,
      item.totalTax,
      item.totalValue,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab}_gst_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-left p-6 max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent" />
            GST Tax Return Filing Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review outward liabilities (GSTR-1), purchase input tax credits (GSTR-2), and consolidated net GST payable.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab !== 'summary' && (
            <>
              <button
                onClick={handleExportCsv}
                className="bg-surface text-foreground hover:bg-opacity-90 border border-border px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="bg-surface text-foreground hover:bg-opacity-90 border border-border px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print List
              </button>
            </>
          )}
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-border hover:bg-surface cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'summary' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          GST Liability Summary
        </button>
        <button
          onClick={() => setActiveTab('gstr1')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'gstr1' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          GSTR-1 (Outward Supplies)
        </button>
        <button
          onClick={() => setActiveTab('gstr2')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'gstr2' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          GSTR-2 (Inward Supplies / ITC)
        </button>
      </div>

      {/* Main panel displays */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground flex justify-center items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Fetching Tax Records...
        </div>
      ) : activeTab === 'summary' ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface p-6 rounded-2xl border border-border flex items-center justify-between shadow-premium hover-premium">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Outward GST Liability</p>
                <p className="text-2xl font-black text-foreground mt-2">{formatCurrency(summary.liability.total)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Taxable: {formatCurrency(summary.outwardTaxable)}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <ArrowUpRight className="w-6 h-6 text-red-500" />
              </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-border flex items-center justify-between shadow-premium hover-premium">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Inward Input Credits (ITC)</p>
                <p className="text-2xl font-black text-green-500 mt-2">{formatCurrency(summary.itc.total)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Taxable: {formatCurrency(summary.inwardTaxable)}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-2xl">
                <ArrowDownLeft className="w-6 h-6 text-green-500" />
              </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-border flex items-center justify-between shadow-premium hover-premium">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Net GST Cash Payable</p>
                <p className={`text-2xl font-black mt-2 ${summary.netPayable.total >= 0 ? 'text-accent' : 'text-green-500'}`}>
                  {formatCurrency(Math.abs(summary.netPayable.total))}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {summary.netPayable.total >= 0 ? 'Net Cash Outflow Liability' : 'Eligible Carry Forward Refund'}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Percent className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          {/* Tax Ledger Breakdowns */}
          <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              GST Component Ledger Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">Central Tax (CGST)</p>
                <p className="text-sm font-medium text-foreground">Liability: {formatCurrency(summary.liability.cgst)}</p>
                <p className="text-sm font-medium text-green-500">ITC: {formatCurrency(summary.itc.cgst)}</p>
                <p className="text-sm font-bold border-t border-border pt-1.5 mt-1.5">Net: {formatCurrency(summary.netPayable.cgst)}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">State Tax (SGST)</p>
                <p className="text-sm font-medium text-foreground">Liability: {formatCurrency(summary.liability.sgst)}</p>
                <p className="text-sm font-medium text-green-500">ITC: {formatCurrency(summary.itc.sgst)}</p>
                <p className="text-sm font-bold border-t border-border pt-1.5 mt-1.5">Net: {formatCurrency(summary.netPayable.sgst)}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">Integrated Tax (IGST)</p>
                <p className="text-sm font-medium text-foreground">Liability: {formatCurrency(summary.liability.igst)}</p>
                <p className="text-sm font-medium text-green-500">ITC: {formatCurrency(summary.itc.igst)}</p>
                <p className="text-sm font-bold border-t border-border pt-1.5 mt-1.5">Net: {formatCurrency(summary.netPayable.igst)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // GSTR-1 / GSTR-2 Grids
        <div className="bg-surface rounded-2xl border border-border shadow-premium overflow-hidden">
          {/* Simple query filter */}
          <div className="p-4 border-b border-border bg-background bg-opacity-35 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Filter by ref no or party name..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background bg-opacity-35 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="py-4 px-6">Ref No</th>
                <th className="py-4 px-6">Party Name</th>
                <th className="py-4 px-6">GSTIN</th>
                <th className="py-4 px-6 text-right">Taxable Value</th>
                <th className="py-4 px-6 text-right">CGST</th>
                <th className="py-4 px-6 text-right">SGST</th>
                <th className="py-4 px-6 text-right">IGST</th>
                <th className="py-4 px-6 text-right">Total Invoice</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'gstr1' ? gstr1List : gstr2List)
                .filter(row => 
                  (row.invoiceNo || row.purchaseNo || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                  (row.customerName || row.vendorName || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((row, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-background/20 transition-colors text-xs">
                    <td className="py-4 px-6 font-bold text-foreground">{row.invoiceNo || row.purchaseNo}</td>
                    <td className="py-4 px-6 text-foreground font-semibold">{row.customerName || row.vendorName}</td>
                    <td className="py-4 px-6 font-mono">{row.gstin}</td>
                    <td className="py-4 px-6 text-right font-semibold text-foreground">{formatCurrency(row.taxableValue)}</td>
                    <td className="py-4 px-6 text-right text-foreground">{formatCurrency(row.cgst)}</td>
                    <td className="py-4 px-6 text-right text-foreground">{formatCurrency(row.sgst)}</td>
                    <td className="py-4 px-6 text-right text-foreground">{formatCurrency(row.igst)}</td>
                    <td className="py-4 px-6 text-right font-bold text-accent">{formatCurrency(row.totalValue)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
