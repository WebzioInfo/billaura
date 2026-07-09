import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Receipt, Check, FileCheck, Landmark, Trash2, Plus, 
  HelpCircle, AlertCircle, Save, Calendar, Info, RefreshCw, ShoppingCart,
  ChevronDown, Search, Loader2 
} from 'lucide-react';
import { PageContainer, LoadingState, AsyncSelect } from '@/components/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { LedgerSearchSelect } from '@/components/ui/LedgerSearchSelect';
import apiClient from '@/services/api';
import { toast } from 'sonner';

interface FormLineItem {
  keyId: string;
  productId: string;
  description: string;
  qty: number;
  rate: number;
  discount: number; // percentage
  taxPercent: number; // GST percentage
}

// Grouped Cash/Bank accounts selector component
interface GroupedCashBankSelectProps {
  value: string;
  onChange: (value: string, item: any) => void;
  error?: string;
}

const GroupedCashBankSelect = ({ value, onChange, error }: GroupedCashBankSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cash-bank-accounts-all'],
    queryFn: async () => {
      const res = await apiClient.get('/bank-accounts');
      return res.data?.items || res.items || [];
    }
  });

  const rawItems = Array.isArray(data) ? data : [];

  const filteredItems = useMemo(() => {
    return rawItems.filter((item: any) => {
      const name = (item.name || '').toLowerCase();
      const code = (item.accountNumber || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [rawItems, searchTerm]);

  const grouped = useMemo(() => {
    const cash: any[] = [];
    const bank: any[] = [];
    filteredItems.forEach((item: any) => {
      if (item.accountType === 'CASH') {
        cash.push(item);
      } else {
        bank.push(item);
      }
    });
    return { cash, bank };
  }, [filteredItems]);

  const flatList = useMemo(() => {
    return [...grouped.cash, ...grouped.bank];
  }, [grouped]);

  const selectedItem = useMemo(() => {
    return rawItems.find((item: any) => item.id === value) || null;
  }, [rawItems, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      setActiveIndex(prev => (prev + 1) % flatList.length);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setActiveIndex(prev => (prev - 1 + flatList.length) % flatList.length);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < flatList.length) {
        const item = flatList[activeIndex];
        onChange(item.id, item);
        setIsOpen(false);
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      e.preventDefault();
    }
  };

  return (
    <div className="w-full relative" ref={containerRef} onKeyDown={handleKeyDown}>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">
        Cash / Bank Account Ledger *
      </label>
      
      <div 
        tabIndex={0}
        className={`relative w-full bg-background border rounded-xl flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${
          error ? 'border-red-500 hover:border-red-600' : 'border-border hover:border-border-hover'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate pr-4 text-foreground font-semibold text-xs md:text-sm">
          {selectedItem ? (
            <div className="flex justify-between items-center w-full">
              <span>{selectedItem.name}</span>
              {selectedItem.accountNumber && (
                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border/40">
                  {selectedItem.accountNumber}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground font-normal">Select Cash or Bank Account...</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-xl shadow-xl max-h-72 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Type to search cash or bank..."
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-accent text-foreground"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setActiveIndex(-1);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="overflow-y-auto p-1 flex-1 max-h-56">
            {isLoading ? (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : flatList.length > 0 ? (
              <div>
                {grouped.cash.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-[9px] font-bold text-accent uppercase tracking-wider bg-accent/5 rounded-md my-1 font-sans">
                      Cash Accounts
                    </div>
                    {grouped.cash.map((item: any) => {
                      const idx = flatList.indexOf(item);
                      const isSelected = value === item.id;
                      const isActive = activeIndex === idx;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg mb-0.5 transition-colors ${
                            isSelected ? 'bg-accent/15 text-accent font-semibold' : isActive ? 'bg-muted text-foreground' : 'hover:bg-muted/50 text-foreground'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onChange(item.id, item);
                            setIsOpen(false);
                            setSearchTerm('');
                          }}
                        >
                          <span className="text-xs">{item.name}</span>
                          {item.accountNumber && (
                            <span className="text-[10px] text-muted-foreground font-mono">{item.accountNumber}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {grouped.bank.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-[9px] font-bold text-accent uppercase tracking-wider bg-accent/5 rounded-md my-1 font-sans">
                      Bank Accounts
                    </div>
                    {grouped.bank.map((item: any) => {
                      const idx = flatList.indexOf(item);
                      const isSelected = value === item.id;
                      const isActive = activeIndex === idx;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg mb-0.5 transition-colors ${
                            isSelected ? 'bg-accent/15 text-accent font-semibold' : isActive ? 'bg-muted text-foreground' : 'hover:bg-muted/50 text-foreground'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onChange(item.id, item);
                            setIsOpen(false);
                            setSearchTerm('');
                          }}
                        >
                          <span className="text-xs">{item.name}</span>
                          {item.accountNumber && (
                            <span className="text-[10px] text-muted-foreground font-mono">{item.accountNumber}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No matching accounts found.
              </div>
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export const UnifiedReceiptForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Unified Receipt State
  const [receiptType, setReceiptType] = useState<'SALES' | 'PURCHASE' | 'EXPENSE'>('SALES');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  
  // Ledger/Bank selection
  const [accountId, setAccountId] = useState('');
  const [selectedLedger, setSelectedLedger] = useState<any>(null);

  // Common Fields
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState('INR');

  // Party Selection
  const [businessPartnerId, setBusinessPartnerId] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<any>(null);

  // Sales/Purchase Line Items
  const [items, setItems] = useState<FormLineItem[]>([
    {
      keyId: 'item-1',
      productId: '',
      description: '',
      qty: 1,
      rate: 0,
      discount: 0,
      taxPercent: 18
    }
  ]);

  // Expense Specifics
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState<number>(0);

  // Expense category searchable selector states
  const [catSearch, setCatSearch] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const catContainerRef = useRef<HTMLDivElement>(null);

  // --- API QUERIES ---

  // Expense categories lookup
  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expense-categories-lookup'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses/categories');
      return res.data || [];
    },
    enabled: receiptType === 'EXPENSE'
  });

  const filteredCategories = useMemo(() => {
    return expenseCategories.filter((c: any) =>
      (c.name || '').toLowerCase().includes(catSearch.toLowerCase())
    );
  }, [expenseCategories, catSearch]);

  const selectedCategory = useMemo(() => {
    return expenseCategories.find((c: any) => c.id === categoryId) || null;
  }, [expenseCategories, categoryId]);

  // Sync / Reset on Type Change
  useEffect(() => {
    setBusinessPartnerId('');
    setSelectedPartner(null);
    setAccountId('');
    setSelectedLedger(null);
    setCategoryId('');
    setAmount(0);
    setItems([
      {
        keyId: 'item-1',
        productId: '',
        description: '',
        qty: 1,
        rate: 0,
        discount: 0,
        taxPercent: 18
      }
    ]);
  }, [receiptType]);

  // Close dropdown on click outside
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (catContainerRef.current && !catContainerRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  // --- LINE ITEMS MANAGEMENT ---
  const handleAddRow = () => {
    setItems(prev => [
      ...prev,
      {
        keyId: `item-${Date.now()}`,
        productId: '',
        description: '',
        qty: 1,
        rate: 0,
        discount: 0,
        taxPercent: 18
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length === 1) {
      setItems([
        {
          keyId: 'item-1',
          productId: '',
          description: '',
          qty: 1,
          rate: 0,
          discount: 0,
          taxPercent: 18
        }
      ]);
    } else {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof FormLineItem, val: any) => {
    setItems(prev => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: val };
      return clone;
    });
  };

  const handleProductSelect = (index: number, product: any) => {
    if (!product) return;
    setItems(prev => {
      const clone = [...prev];
      const defaultRate = receiptType === 'SALES' 
        ? (product.salePrice || product.price || 0)
        : (product.purchasePrice || product.price || 0);
      const defaultTax = product.taxRate || product.gstRate || 18;
      
      clone[index] = {
        ...clone[index],
        productId: product.id,
        description: product.description || product.name,
        rate: defaultRate,
        taxPercent: defaultTax
      };
      return clone;
    });
  };

  // --- CALCULATION ---
  const totals = useMemo(() => {
    if (receiptType === 'EXPENSE') {
      const sub = Number(amount || 0);
      return { subTotal: sub, taxTotal: 0, discountTotal: 0, grandTotal: sub, roundOff: 0 };
    }

    let subTotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    items.forEach(item => {
      const lineSub = Number(item.qty || 0) * Number(item.rate || 0);
      const lineDiscount = item.discount ? (lineSub * Number(item.discount)) / 100 : 0;
      const lineAfterDisc = lineSub - lineDiscount;
      const lineTax = (lineAfterDisc * Number(item.taxPercent || 0)) / 100;

      subTotal += lineSub;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
    });

    const rawGrand = subTotal - discountTotal + taxTotal;
    const roundedGrand = Math.round(rawGrand);
    const roundOff = Number((roundedGrand - rawGrand).toFixed(2));

    return {
      subTotal: Number(subTotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal: roundedGrand,
      roundOff: roundOff
    };
  }, [receiptType, items, amount]);

  // --- LIVE GL PREVIEW QUERY ---
  const previewPayload = useMemo(() => {
    return {
      type: receiptType,
      date,
      paymentMethod,
      accountId,
      businessPartnerId,
      items: items.map(i => ({ productId: i.productId, qty: i.qty, rate: i.rate, taxPercent: i.taxPercent })),
      categoryId,
      amount,
      taxAmount: 0
    };
  }, [receiptType, date, paymentMethod, accountId, businessPartnerId, items, categoryId, amount]);

  const { data: previewData, isLoading: loadingPreview } = useQuery({
    queryKey: ['receipt-gl-preview', previewPayload],
    queryFn: async () => {
      if (receiptType === 'EXPENSE') {
        if (!categoryId || amount <= 0) return null;
      } else {
        if (items.length === 0 || !items[0].productId) return null;
      }
      try {
        const res = await apiClient.post('/receipts/preview', previewPayload);
        return res.data?.data?.lines || [];
      } catch {
        return null;
      }
    },
    enabled: (receiptType === 'EXPENSE' && !!categoryId && amount > 0) || 
             (receiptType !== 'EXPENSE' && items.length > 0 && !!items[0].productId),
    refetchOnWindowFocus: false
  });

  const previewLines = previewData || [];

  // --- FORM VALIDATION ---
  const isFormInvalid = useMemo(() => {
    if (paymentMethod !== 'CREDIT' && !accountId) return true;

    if (receiptType === 'SALES') {
      if (!businessPartnerId) return true;
      const invalidItems = items.some(item => !item.productId || item.qty <= 0 || item.rate <= 0);
      if (invalidItems) return true;
    } else if (receiptType === 'PURCHASE') {
      if (!businessPartnerId) return true;
      const invalidItems = items.some(item => !item.productId || item.qty <= 0 || item.rate <= 0);
      if (invalidItems) return true;
    } else if (receiptType === 'EXPENSE') {
      if (!categoryId) return true;
      if (amount <= 0) return true;
    }

    return false;
  }, [receiptType, paymentMethod, accountId, businessPartnerId, items, categoryId, amount]);

  // --- SAVE MUTATION ---
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/receipts', payload);
    },
    onSuccess: () => {
      toast.success('Receipt created successfully');
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      navigate('/receipts');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record receipt');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInvalid) return;

    const payload: any = {
      type: receiptType,
      date,
      referenceNo: referenceNo || undefined,
      paymentMethod,
      accountId: paymentMethod !== 'CREDIT' ? accountId : undefined,
      notes: notes || undefined,
      currency
    };

    if (receiptType === 'SALES') {
      payload.businessPartnerId = businessPartnerId;
      payload.items = items.map(i => ({
        productId: i.productId,
        qty: i.qty,
        rate: i.rate,
        taxPercent: i.taxPercent,
        description: i.description
      }));
    } else if (receiptType === 'PURCHASE') {
      payload.businessPartnerId = businessPartnerId;
      payload.items = items.map(i => ({
        productId: i.productId,
        qty: i.qty,
        rate: i.rate,
        taxPercent: i.taxPercent,
        description: i.description
      }));
    } else if (receiptType === 'EXPENSE') {
      payload.categoryId = categoryId;
      payload.amount = Number(amount);
      payload.taxAmount = 0;
      payload.businessPartnerId = businessPartnerId || undefined; // supplier is optional
    }

    saveMutation.mutate(payload);
  };

  const formatCurrencyValue = (val: number) => '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader
        title="Unified Receipt Creation"
        description="Unified ledger posting gateway for Sales, Purchases, and Expenses."
        backTo={{ label: 'Receipts', path: '/receipts' }}
      />

      <form onSubmit={handleSubmit} className="w-full text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (8/12) */}
          <div className="xl:col-span-8 lg:col-span-7 space-y-6">
            
            {/* Block 1: Receipt Type and Common Fields */}
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-6 shadow-sm">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2 font-sans uppercase tracking-wider">
                <Receipt className="w-4.5 h-4.5 text-accent" /> Basic Details
              </h3>

              {/* Receipt Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-sans">Receipt Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SALES', 'PURCHASE', 'EXPENSE'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setReceiptType(type)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        receiptType === type 
                          ? 'bg-accent/10 border-accent text-accent shadow-sm'
                          : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {type === 'SALES' ? 'Sales Receipt' : type === 'PURCHASE' ? 'Purchase Receipt' : 'Expense Receipt'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Common Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">Reference / Bill No</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. REF-12345"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value === 'CREDIT') {
                        setAccountId('');
                        setSelectedLedger(null);
                      }
                    }}
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent text-foreground"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CREDIT">Credit / On Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent text-foreground"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                {paymentMethod !== 'CREDIT' && (
                  <div className="md:col-span-2">
                    <GroupedCashBankSelect
                      value={accountId}
                      onChange={(val, item) => {
                        setAccountId(val);
                        setSelectedLedger(item);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Block 2: Type Specific Fields (Sales/Purchase Party & Item Table OR Expense details) */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              {receiptType === 'EXPENSE' ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2 font-sans uppercase tracking-wider">
                    <Landmark className="w-4.5 h-4.5 text-accent" /> Expense Specifications
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div ref={catContainerRef} className="relative">
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">
                        Expense Category (Ledger) *
                      </label>
                      <div 
                        tabIndex={0}
                        className="relative w-full bg-background border border-border rounded-xl flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                        onClick={() => setCatOpen(!catOpen)}
                      >
                        <div className="flex-1 truncate pr-4 text-foreground font-semibold text-xs md:text-sm">
                          {selectedCategory ? selectedCategory.name : <span className="text-muted-foreground font-normal">Select Expense Category...</span>}
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                      {catOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-xl shadow-xl max-h-60 flex flex-col overflow-hidden">
                          <div className="p-2 border-b border-border relative">
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Search expense category..."
                              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-accent text-foreground"
                              value={catSearch}
                              onChange={(e) => setCatSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="overflow-y-auto p-1 flex-1 max-h-48">
                            {filteredCategories.length > 0 ? (
                              filteredCategories.map((c: any) => (
                                <div
                                  key={c.id}
                                  className={`px-3 py-2 cursor-pointer rounded-lg mb-0.5 text-xs text-foreground transition-colors ${
                                    categoryId === c.id ? 'bg-accent/15 text-accent font-semibold' : 'hover:bg-muted/50'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCategoryId(c.id);
                                    setCatOpen(false);
                                    setCatSearch('');
                                  }}
                                >
                                  {c.name}
                                </div>
                              ))
                            ) : (
                              <div className="py-3 text-center text-xs text-muted-foreground">
                                No categories found.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">Net Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount || ''}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        required
                        placeholder="0.00"
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent text-foreground font-mono"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <AsyncSelect
                        label="Supplier (Optional)"
                        apiPath="/vendors"
                        queryKeyPrefix="vendors_lookup"
                        placeholder="Search suppliers/vendors..."
                        value={businessPartnerId}
                        onChange={(val, item) => {
                          setBusinessPartnerId(val);
                          setSelectedPartner(item);
                        }}
                        mapOption={(vendor: any) => ({
                          label: vendor.name,
                          value: vendor.id,
                          description: vendor.gstin ? `GSTIN: ${vendor.gstin}` : 'No GSTIN'
                        })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2 font-sans uppercase tracking-wider">
                    <ShoppingCart className="w-4.5 h-4.5 text-accent" /> {receiptType === 'SALES' ? 'Customer & Items' : 'Vendor & Items'}
                  </h3>

                  {/* Party Selection */}
                  <div>
                    {receiptType === 'SALES' ? (
                      <AsyncSelect
                        label="Customer *"
                        apiPath="/customers"
                        queryKeyPrefix="customers_lookup"
                        placeholder="Search customers..."
                        value={businessPartnerId}
                        onChange={(val, item) => {
                          setBusinessPartnerId(val);
                          setSelectedPartner(item);
                        }}
                        mapOption={(cust: any) => ({
                          label: cust.name,
                          value: cust.id,
                          description: cust.gstin ? `GSTIN: ${cust.gstin}` : 'No GSTIN'
                        })}
                      />
                    ) : (
                      <AsyncSelect
                        label="Vendor *"
                        apiPath="/vendors"
                        queryKeyPrefix="vendors_lookup"
                        placeholder="Search vendors..."
                        value={businessPartnerId}
                        onChange={(val, item) => {
                          setBusinessPartnerId(val);
                          setSelectedPartner(item);
                        }}
                        mapOption={(vend: any) => ({
                          label: vend.name,
                          value: vend.id,
                          description: vend.gstin ? `GSTIN: ${vend.gstin}` : 'No GSTIN'
                        })}
                      />
                    )}
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-border rounded-2xl overflow-hidden bg-background">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-muted/30 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            <th className="py-3 px-4 w-[35%] font-sans">Product *</th>
                            <th className="py-3 px-3 w-[25%] font-sans">Description</th>
                            <th className="py-3 px-3 w-[10%] text-right font-sans">Qty</th>
                            <th className="py-3 px-3 w-[12%] text-right font-sans">Rate</th>
                            <th className="py-3 px-3 w-[8%] text-right font-sans">Disc %</th>
                            <th className="py-3 px-3 w-[8%] text-right font-sans">Tax %</th>
                            <th className="py-3 px-4 w-[2%]"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {items.map((item, index) => (
                            <tr key={item.keyId} className="hover:bg-muted/10 transition-colors">
                              <td className="py-2 px-4">
                                <AsyncSelect
                                  apiPath="/products"
                                  queryKeyPrefix="products_lookup"
                                  placeholder="Select product"
                                  value={item.productId}
                                  onChange={(val, p) => handleProductSelect(index, p)}
                                  mapOption={(prod: any) => ({
                                    label: prod.name,
                                    value: prod.id,
                                    description: `SKU: ${prod.sku || 'N/A'} | Price: ₹${prod.salePrice || prod.price || 0}`
                                  })}
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                  placeholder="Item details"
                                  className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-accent text-foreground font-sans"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty || ''}
                                  onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                                  placeholder="1"
                                  className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:border-accent text-foreground font-mono"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.rate || ''}
                                  onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                                  placeholder="0.00"
                                  className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-right focus:outline-none focus:border-accent text-foreground font-mono"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.discount || ''}
                                  onChange={(e) => handleItemChange(index, 'discount', Number(e.target.value))}
                                  placeholder="0"
                                  className="w-full bg-background border border-border/80 rounded-lg px-2 px-1.5 text-xs text-right focus:outline-none focus:border-accent text-foreground font-mono"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={item.taxPercent}
                                  onChange={(e) => handleItemChange(index, 'taxPercent', Number(e.target.value))}
                                  className="w-full bg-background border border-border/80 rounded-lg px-1 py-1.5 text-xs focus:outline-none focus:border-accent text-foreground"
                                >
                                  <option value="0">0%</option>
                                  <option value="5">5%</option>
                                  <option value="12">12%</option>
                                  <option value="18">18%</option>
                                  <option value="28">28%</option>
                                </select>
                              </td>
                              <td className="py-2 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(index)}
                                  className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-2.5 border-t border-border bg-muted/5 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddRow}
                        className="flex items-center gap-1.5 text-xs px-4 py-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Row
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Block 3: Narration */}
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2 font-sans uppercase tracking-wider">
                <Info className="w-4.5 h-4.5 text-accent" /> Additional Information
              </h3>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">Narration / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide transaction details or terms..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-foreground resize-none"
                />
              </div>
            </div>

          </div>

          {/* Right Column (4/12) - Sticky Summary Card */}
          <div className="xl:col-span-4 lg:col-span-5 space-y-6 lg:sticky lg:top-6">
            
            {/* Summary Card */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-premium space-y-6">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2 font-sans uppercase tracking-wider">
                <FileCheck className="w-4.5 h-4.5 text-accent" /> Transaction Summary
              </h3>

              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-bold text-foreground text-xs bg-accent/5 text-accent border border-accent/20 px-2 py-0.5 rounded-full">
                    {receiptType}
                  </span>
                </div>
                
                {(receiptType === 'SALES' || receiptType === 'PURCHASE') && (
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-muted-foreground">{receiptType === 'SALES' ? 'Customer' : 'Vendor'}</span>
                    <span className="font-semibold text-foreground text-right truncate max-w-[180px]">
                      {selectedPartner?.name || 'Not selected'}
                    </span>
                  </div>
                )}

                {receiptType === 'EXPENSE' && categoryId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expense Ledger</span>
                    <span className="font-semibold text-foreground">
                      {selectedCategory?.name || 'N/A'}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Source</span>
                  <span className="font-semibold text-foreground font-sans">
                    {paymentMethod === 'CREDIT' 
                      ? 'Credit / Outstanding' 
                      : (selectedLedger?.name || selectedLedger?.bankName || 'Not selected')}
                  </span>
                </div>

                {receiptType !== 'EXPENSE' ? (
                  <div className="border-t border-border/60 my-2 pt-2 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-mono">{formatCurrencyValue(totals.subTotal)}</span>
                    </div>
                    
                    {totals.discountTotal > 0 && (
                      <div className="flex justify-between text-xs text-red-500">
                        <span>Discount</span>
                        <span className="font-mono">-{formatCurrencyValue(totals.discountTotal)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>GST (CGST/SGST/IGST)</span>
                      <span className="font-mono">{formatCurrencyValue(totals.taxTotal)}</span>
                    </div>

                    {totals.roundOff !== 0 && (
                      <div className="flex justify-between text-[11px] text-muted-foreground font-sans">
                        <span>Round Off</span>
                        <span className="font-mono">{totals.roundOff > 0 ? '+' : ''}{totals.roundOff.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="border-t border-border pt-3.5 flex justify-between items-center">
                  <span className="font-bold text-foreground">Net Amount</span>
                  <span className="font-bold text-xl text-foreground font-mono">
                    {formatCurrencyValue(totals.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Double Entry Accounting Preview Section */}
              <div className="border-t border-border pt-4 space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-sans">Accounting Preview</h4>
                  {loadingPreview && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {previewLines.length > 0 ? (
                  <div className="border border-border/80 rounded-xl overflow-hidden bg-background/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border text-[9px] font-bold text-muted-foreground font-sans">
                          <th className="py-2 px-2.5 text-left">Ledger Account</th>
                          <th className="py-2 px-2 text-right">Debit</th>
                          <th className="py-2 px-2.5 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewLines.map((line: any, idx: number) => (
                          <tr key={idx} className="border-b border-border/40 hover:bg-muted/10">
                            <td className="py-2 px-2.5 font-medium text-foreground truncate max-w-[130px]" title={line.ledgerName}>
                              {line.ledgerName}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-green-600">
                              {line.debit > 0 ? formatCurrencyValue(line.debit) : '—'}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-red-500">
                              {line.credit > 0 ? formatCurrencyValue(line.credit) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-3 text-center bg-muted/5">
                    <HelpCircle className="w-5 h-5 text-muted-foreground mx-auto mb-1.5 opacity-65" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Select receipt type, party, and items to view live general ledger entries.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit & Cancel Actions */}
              <div className="space-y-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={isFormInvalid || saveMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 font-bold py-3 text-sm rounded-xl cursor-pointer"
                  variant="primary"
                >
                  {saveMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving Receipt...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Receipt
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs py-2.5 rounded-xl cursor-pointer font-sans"
                  onClick={() => navigate('/receipts')}
                >
                  Cancel & Go Back
                </Button>
              </div>

            </div>

          </div>

        </div>
      </form>
    </PageContainer>
  );
};
