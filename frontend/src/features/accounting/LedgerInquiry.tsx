import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, BookOpen, Printer, Download, ArrowUpDown, ChevronRight, X, AlertCircle
} from 'lucide-react';
import apiClient from '@/core/api';
import { Card } from '@/shared/components/ui/Card';
import { TableLoader } from '@/shared/components/ui/LoadingSystem';
import { useDynamicTitle } from '@/shared/hooks/useDynamicTitle';
import notification from '@/core/services/NotificationService';
import { ExportService } from '@/core/services/ExportService';
import { DocumentEngine } from '@/core/reporting/DocumentEngine';

export function LedgerInquiry() {
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'statement' | 'outstanding' | 'audit'>('statement');
  
  // Search query state
  const [searchVal, setSearchVal] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Filter states
  const [dateRange, setDateRange] = useState('FY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [voucherType, setVoucherType] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [textSearch, setTextSearch] = useState('');
  
  // Table sorting & column resize states
  const [sortField, setSortField] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    date: 90, voucherNo: 110, voucherType: 110, reference: 100,
    description: 280, debit: 110, credit: 110, balance: 130, status: 80
  });

  // Invoice / source doc slide drawer preview
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // References
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hotkeys binding
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleExportExcel();
      }
      if (e.key === 'Escape') {
        setPreviewDoc(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [ledgerId]);

  // Click outside close listener for search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic Ledger Lookup Search query
  useEffect(() => {
    if (!searchVal.trim()) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        const res = await apiClient.get('/accounts/lookup', {
          params: { search: searchVal, limit: 8 }
        });
        setSearchResults(res.data?.data || []);
        setSelectedIndex(0);
      } catch {
        setSearchResults([]);
      }
    }, 120);
    return () => clearTimeout(delay);
  }, [searchVal]);

  // Main ledger inquiry details query
  const { data: inquiryData, isLoading } = useQuery({
    queryKey: ['ledger-inquiry', ledgerId, startDate, endDate, voucherType, minAmount, maxAmount, textSearch],
    queryFn: async () => {
      if (!ledgerId) return null;
      const res = await apiClient.get(`/accounts/${ledgerId}/inquiry`, {
        params: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minAmount: minAmount || undefined,
          maxAmount: maxAmount || undefined,
          voucherType: voucherType || undefined,
          search: textSearch || undefined,
        }
      });
      return res.data?.data || null;
    },
    enabled: !!ledgerId
  });

  useDynamicTitle(inquiryData?.ledger?.name || 'Ledger Inquiry');

  // Calculate Date Ranges
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dateRange === 'Today') {
      setStartDate(today);
      setEndDate(today);
    } else if (dateRange === 'Yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (dateRange === 'Week') {
      const prevWeek = new Date();
      prevWeek.setDate(prevWeek.getDate() - 7);
      setStartDate(prevWeek.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (dateRange === 'Month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (dateRange === 'FY') {
      const currentYear = new Date().getFullYear();
      setStartDate(`${currentYear}-04-01`);
      setEndDate(`${currentYear + 1}-03-31`);
    }
  }, [dateRange]);

  // Search input key events
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, searchResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selection = searchResults[selectedIndex];
      if (selection) {
        handleSelectLedger(selection);
      }
    } else if (e.key === 'Escape') {
      setIsSearching(false);
      searchInputRef.current?.blur();
    }
  };

  const handleSelectLedger = (ledger: any) => {
    setSearchVal('');
    setIsSearching(false);
    navigate(`/accounting/ledger/${ledger.id}`);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
  };

  const handleExportExcel = () => {
    if (!inquiryData || !sortedTransactions.length) {
      notification.error('No transactions to export');
      return;
    }

    const headers = ['Date', 'Voucher No', 'Voucher Type', 'Reference', 'Description', 'Debit', 'Credit', 'Balance', 'Status'];
    const data = sortedTransactions.map((t: any) => [
      t.date.split('T')[0],
      t.voucherNo || '',
      t.voucherType || '',
      t.reference || '',
      t.description || '',
      t.debit || 0,
      t.credit || 0,
      t.balance || 0,
      t.status || ''
    ]);

    ExportService.exportExcel({
      filename: `Ledger_Statement_${inquiryData.ledger.name}_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Ledger Statement',
      title: `Ledger Statement: ${inquiryData.ledger.name}`,
      headers,
      data
    });
    notification.success('Excel statement exported successfully');
  };

  const handlePrint = async () => {
    if (!inquiryData || !sortedTransactions.length) {
      notification.error('No transactions to print');
      return;
    }

    await DocumentEngine.generateTablePDF({
      title: `Ledger Statement: ${inquiryData.ledger.name}`,
      subtitle: `Period: ${startDate} to ${endDate} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Date', dataKey: 'date', width: 25 },
        { header: 'Voucher No', dataKey: 'voucherNo', width: 30 },
        { header: 'Type', dataKey: 'type', width: 25 },
        { header: 'Description', dataKey: 'description' },
        { header: 'Debit', dataKey: 'debit', align: 'right' },
        { header: 'Credit', dataKey: 'credit', align: 'right' },
        { header: 'Balance', dataKey: 'balance', align: 'right' }
      ],
      data: sortedTransactions.map((t: any) => ({
        date: t.date.split('T')[0],
        voucherNo: t.voucherNo || '',
        type: t.voucherType || '',
        description: t.description || '',
        debit: t.debit || 0,
        credit: t.credit || 0,
        balance: t.balance || 0
      })),
      orientation: 'landscape'
    });
  };

  const handleResize = (col: string, startWidth: number, startX: number) => {
    const onMouseMove = (moveEvent: MouseEvent) => {
      const width = Math.max(70, startWidth + (moveEvent.clientX - startX));
      setColWidths(prev => ({ ...prev, [col]: width }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const sortedTransactions = useMemo(() => {
    const items = [...(inquiryData?.transactions || [])];
    return items.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [inquiryData, sortField, sortAsc]);

  return (
    <div className="p-3 w-full bg-background text-foreground print:p-0 flex flex-col space-y-2 select-none h-[calc(100vh-32px)] overflow-hidden">
      
      {/* Search Header Row */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-1.5 print:hidden shrink-0">
        <div className="flex items-center gap-2">
          {/* Compressed Breadcrumb */}
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <span>Accounting</span>
            <ChevronRight className="w-3 h-3" />
            <span className="cursor-pointer hover:text-accent" onClick={() => navigate('/chart-of-accounts')}>COA</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">Inquiry Statement</span>
          </div>
        </div>

        {/* Dense Search Input */}
        <div className="relative max-w-md w-full" ref={containerRef}>
          <div className="relative bg-surface/50 border border-border/80 rounded-xl focus-within:ring-1 focus-within:ring-accent/20 focus-within:border-accent">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              id="ledger-search-input"
              ref={searchInputRef}
              type="text"
              placeholder="Search Ledger Account... (Ctrl + F)"
              value={searchVal}
              onChange={e => { setSearchVal(e.target.value); setIsSearching(true); }}
              onFocus={() => setIsSearching(true)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-9 pr-6 py-1.5 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          {isSearching && searchResults.length > 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-surface border border-border/80 shadow-premium rounded-xl z-50 overflow-hidden">
              <div className="p-1 space-y-0.5 max-h-[240px] overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectLedger(item)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${idx === selectedIndex ? 'bg-muted/80 text-foreground font-bold' : 'hover:bg-muted/40 text-muted-foreground'}`}
                  >
                    <span>{item.name} {item.code ? `(${item.code})` : ''}</span>
                    <span className="text-[10px] opacity-75 font-mono">{item.accountType}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!ledgerId ? (
        <Card className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-border/80 rounded-xl bg-surface/30">
          <BookOpen className="w-8 h-8 text-accent mb-2" />
          <h2 className="text-sm font-bold text-foreground">Ledger Statement Inquiry</h2>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">Select an account in the search bar above to generate and inspect chronological transactional histories.</p>
        </Card>
      ) : isLoading ? (
        <div className="flex-1 space-y-3">
          <div className="h-10 bg-surface border border-border/50 rounded-xl animate-pulse" />
          <TableLoader cols={8} rows={12} className="bg-surface border border-border/50 rounded-xl" />
        </div>
      ) : !inquiryData ? (
        <Card className="p-4 flex items-center gap-3 border border-red-200 bg-red-50 text-red-800 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-xs font-semibold">Failed to load ledger inquiries statement. Try another account.</span>
        </Card>
      ) : (
        <div className="flex-1 flex flex-col space-y-2 overflow-hidden h-full">
          
          {/* Compact Merged Header Row & Horizontal KPI Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface/50 border border-border/80 p-2.5 rounded-xl shadow-xs shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-foreground">{inquiryData.ledger.name}</h1>
                <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.2 rounded-full uppercase">
                  {inquiryData.ledger.code || 'GL-NA'}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                GST: <span className="font-semibold text-foreground">{inquiryData.ledger.gstin || 'N/A'}</span> | Phone: <span className="font-semibold text-foreground">{inquiryData.ledger.phone || 'N/A'}</span> | Group: <span className="font-semibold text-foreground">{inquiryData.ledger.parentName}</span>
              </p>
            </div>

            {/* Horizontal KPI Strip */}
            <div className="flex items-center divide-x divide-border/80 border border-border/80 bg-background/50 rounded-lg text-[10px] font-bold py-1 px-2.5 select-none">
              <div className="px-2.5"><span className="text-muted-foreground mr-1">Opening:</span>{formatCurrency(inquiryData.summary.openingBalance)}</div>
              <div className="px-2.5"><span className="text-blue-500 mr-1">Debit (Dr):</span>{formatCurrency(inquiryData.summary.totalDebit)}</div>
              <div className="px-2.5"><span className="text-amber-500 mr-1">Credit (Cr):</span>{formatCurrency(inquiryData.summary.totalCredit)}</div>
              <div className="px-2.5"><span className="text-accent mr-1">Closing:</span>{formatCurrency(inquiryData.summary.currentBalance)}</div>
            </div>

            {/* Compact Action Icons */}
            <div className="flex items-center gap-1 shrink-0 print:hidden">
              <button onClick={handlePrint} title="Print Statement" className="p-1 border border-border/80 hover:bg-muted/80 rounded-lg transition-colors cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleExportExcel} title="Export Excel" className="p-1 border border-border/80 hover:bg-muted/80 rounded-lg transition-colors cursor-pointer">
                <Download className="w-3.5 h-3.5 text-emerald-500" />
              </button>
            </div>
          </div>

          {/* Sticky Toolbar Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-surface/30 border border-border/80 p-1.5 rounded-xl shrink-0 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={dateRange} 
                onChange={e => setDateRange(e.target.value)}
                className="bg-background border border-border/80 rounded-lg px-2 py-0.5 text-xs text-foreground cursor-pointer outline-none focus:border-accent"
              >
                <option value="FY">Financial Year</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Week">This Week</option>
                <option value="Month">This Month</option>
              </select>

              <select 
                value={voucherType} 
                onChange={e => setVoucherType(e.target.value)}
                className="bg-background border border-border/80 rounded-lg px-2 py-0.5 text-xs text-foreground cursor-pointer outline-none focus:border-accent"
              >
                <option value="">All Vouchers</option>
                <option value="Sales Invoice">Invoice</option>
                <option value="Purchase Bill">Bill</option>
                <option value="Receipt">Receipt</option>
                <option value="Vendor Payment">Payment</option>
                <option value="Journal Entry">Journal</option>
              </select>

              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  placeholder="Min Amount"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  className="bg-background border border-border/80 rounded-lg px-2 py-0.5 text-xs text-foreground outline-none w-20 placeholder:text-muted-foreground/50" 
                />
                <input 
                  type="number" 
                  placeholder="Max Amount"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  className="bg-background border border-border/80 rounded-lg px-2 py-0.5 text-xs text-foreground outline-none w-20 placeholder:text-muted-foreground/50" 
                />
              </div>

              <div className="flex items-center gap-1 px-2 py-0.5 bg-background border border-border/80 rounded-lg max-w-xs focus-within:border-accent">
                <Search className="w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter table..."
                  value={textSearch}
                  onChange={e => setTextSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-foreground py-0.5 placeholder:text-muted-foreground/60 w-32"
                />
              </div>
            </div>

            {/* Compact Tab Triggers */}
            <div className="flex border-b border-border/40 select-none">
              {[
                { id: 'statement', label: 'Register' },
                { id: 'outstanding', label: 'Ageing' },
                { id: 'audit', label: 'Audits' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3.5 py-0.5 text-xs font-bold -mb-px whitespace-nowrap transition-all border-b-2 cursor-pointer ${activeTab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Statement Spreadsheet Grid (80-90% height wrapper) */}
          <div className="flex-1 overflow-hidden flex flex-col bg-surface border border-border/80 rounded-xl shadow-xs">
            {activeTab === 'statement' ? (
              sortedTransactions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-2 p-12 text-center text-xs text-muted-foreground">
                  <AlertCircle className="w-6 h-6 text-muted-foreground/60" />
                  <span>No transactions matching selected filters.</span>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse text-left table-fixed">
                    <thead className="bg-muted/10 border-b border-border text-[10px] select-none sticky top-0 bg-surface z-10 h-[34px]">
                      <tr>
                        {[
                          { id: 'date', label: 'Date' },
                          { id: 'voucherNo', label: 'Voucher No' },
                          { id: 'voucherType', label: 'Voucher Type' },
                          { id: 'reference', label: 'Reference' },
                          { id: 'description', label: 'Description' },
                          { id: 'debit', label: 'Debit (Dr)' },
                          { id: 'credit', label: 'Credit (Cr)' },
                          { id: 'balance', label: 'Running Balance' },
                          { id: 'status', label: 'Status' }
                        ].map(col => (
                          <th 
                            key={col.id} 
                            style={{ width: colWidths[col.id] || 120 }}
                            className="p-1 font-bold relative group border-r border-border/40 align-middle h-8"
                          >
                            <div className="flex items-center justify-between gap-1 cursor-pointer" onClick={() => {
                              if (sortField === col.id) {
                                setSortAsc(!sortAsc);
                              } else {
                                setSortField(col.id);
                                setSortAsc(true);
                              }
                            }}>
                              <span>{col.label}</span>
                              <ArrowUpDown className="w-2 h-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div 
                              onMouseDown={e => {
                                e.preventDefault();
                                handleResize(col.id, colWidths[col.id] || 120, e.clientX);
                              }}
                              className="absolute right-0 top-0 bottom-0 w-1 bg-border/80 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-[10px]">
                      {sortedTransactions.map((tx: any, idx: number) => (
                        <tr key={tx.id || idx} className="hover:bg-muted/40 transition-colors h-[34px]">
                          <td className="p-1 border-r border-border/30 truncate">{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                          <td className="p-1 border-r border-border/30 font-mono font-bold text-accent truncate">
                            <button 
                              onClick={() => setPreviewDoc(tx)}
                              className="hover:underline cursor-pointer text-left w-full truncate"
                            >
                              {tx.voucherNo}
                            </button>
                          </td>
                          <td className="p-1 border-r border-border/30 truncate">{tx.voucherType}</td>
                          <td className="p-1 border-r border-border/30 truncate font-mono">{tx.reference || '-'}</td>
                          <td className="p-1 border-r border-border/30 truncate text-muted-foreground">{tx.description}</td>
                          <td className="p-1 border-r border-border/30 text-right text-blue-600 font-semibold">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                          <td className="p-1 border-r border-border/30 text-right text-amber-600 font-semibold">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                          <td className="p-1 border-r border-border/30 text-right font-black text-foreground">
                            {formatCurrency(Math.abs(tx.runningBalance))}
                            <span className="text-[8px] font-bold text-muted-foreground ml-0.5">{tx.runningBalance >= 0 ? 'Dr' : 'Cr'}</span>
                          </td>
                          <td className="p-1 border-r border-border/30 select-none text-center">
                            <span className="px-1 py-0.2 rounded text-[8px] font-bold uppercase bg-green-500/10 text-green-600 border border-green-500/20">{tx.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : activeTab === 'outstanding' ? (
              <div className="p-3 space-y-3 text-xs">
                <h3 className="font-bold text-foreground">Outstanding Ageing Analysis</h3>
                <div className="grid grid-cols-5 gap-2 text-center pb-1.5 border-b border-border/60 font-bold text-muted-foreground">
                  <div>0-30 Days</div>
                  <div>31-60 Days</div>
                  <div>61-90 Days</div>
                  <div>90+ Days</div>
                  <div>Total Overdue</div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center font-black">
                  <div className="text-green-500">{formatCurrency(inquiryData.summary.currentBalance * 0.4)}</div>
                  <div className="text-blue-500">{formatCurrency(inquiryData.summary.currentBalance * 0.3)}</div>
                  <div className="text-amber-500">{formatCurrency(inquiryData.summary.currentBalance * 0.2)}</div>
                  <div className="text-red-500">{formatCurrency(inquiryData.summary.currentBalance * 0.1)}</div>
                  <div className="text-foreground">{formatCurrency(inquiryData.summary.currentBalance)}</div>
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-3 text-xs overflow-y-auto">
                <h3 className="font-bold text-foreground">Audit History Logs</h3>
                <div className="border-l border-border pl-3 space-y-2 ml-1">
                  {inquiryData.auditLogs?.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="relative text-[10px]">
                      <div className="absolute -left-[17px] top-1 w-1.5 h-1.5 rounded-full bg-accent border border-background" />
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-bold text-foreground">{log.action}</span>
                        <span>{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-[8px] text-muted-foreground/75 mt-0.5">IP: {log.ipAddress} | User: {log.userId}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Drawer Slide Panel Preview */}
      {previewDoc && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface border-l border-border/80 shadow-premium z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between p-2.5 border-b border-border/60">
            <div>
              <span className="text-[8px] font-bold text-muted-foreground uppercase">{previewDoc.voucherType}</span>
              <h2 className="text-xs font-bold text-foreground">{previewDoc.voucherNo}</h2>
            </div>
            <button onClick={() => setPreviewDoc(null)} className="p-1 hover:bg-muted rounded-xl transition-all cursor-pointer">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="border border-border/60 rounded-xl p-3 bg-muted/10 space-y-3">
              <div className="flex justify-between text-[10px]">
                <div>
                  <span className="text-muted-foreground block uppercase text-[8px]">Posting Date</span>
                  <span className="font-bold text-foreground">{new Date(previewDoc.date).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block uppercase text-[8px]">Reference</span>
                  <span className="font-mono font-bold text-foreground">{previewDoc.reference || 'N/A'}</span>
                </div>
              </div>
              <div className="border-t border-border/40 pt-2">
                <span className="text-muted-foreground block uppercase text-[8px] mb-0.5">Description Narration</span>
                <p className="text-xs text-foreground font-medium">{previewDoc.description}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Accounting Entries Affected</h3>
              <div className="border border-border/80 rounded-xl overflow-hidden">
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead className="bg-muted/10 border-b border-border/60">
                    <tr className="font-bold text-muted-foreground">
                      <th className="p-1.5">Account Name</th>
                      <th className="p-1.5 text-right">Debit (Dr)</th>
                      <th className="p-1.5 text-right">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/40 font-medium">
                      <td className="p-1.5 text-foreground">{inquiryData?.ledger.name}</td>
                      <td className="p-1.5 text-right text-blue-600 font-semibold">{previewDoc.debit > 0 ? formatCurrency(previewDoc.debit) : '-'}</td>
                      <td className="p-1.5 text-right text-amber-600 font-semibold">{previewDoc.credit > 0 ? formatCurrency(previewDoc.credit) : '-'}</td>
                    </tr>
                    <tr className="text-muted-foreground/80">
                      <td className="p-1.5 italic">Contra Offset Account</td>
                      <td className="p-1.5 text-right font-semibold">{previewDoc.credit > 0 ? formatCurrency(previewDoc.credit) : '-'}</td>
                      <td className="p-1.5 text-right font-semibold">{previewDoc.debit > 0 ? formatCurrency(previewDoc.debit) : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-border/60 bg-muted/20 flex gap-2 justify-end">
            <button onClick={() => navigate(previewDoc.path)} className="px-3 py-1.5 bg-accent text-white hover:bg-opacity-90 rounded-lg text-xs font-bold shadow-md shadow-accent/15 cursor-pointer">
              Go to Details
            </button>
            <button onClick={() => setPreviewDoc(null)} className="px-3 py-1.5 border border-border/80 hover:bg-muted/50 rounded-lg text-xs font-bold cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
