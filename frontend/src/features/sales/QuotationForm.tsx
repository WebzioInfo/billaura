import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FileText,
  X,
  Search,
  Settings,
  Plus,
  Trash2,
  Package,
  Layers,
  Upload,
  Paperclip,
  Check,
  ChevronDown,
  Info,
  User,
  SlidersHorizontal
} from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SearchableItemCombobox, ProductItem } from './components/SearchableItemCombobox';

interface QuoteItemRow {
  id: string;
  productId: string;
  productName: string;
  description?: string;
  qty: number;
  rate: number;
  discount: number;
  discountType: '%' | 'fixed';
  taxPercent: number;
  taxName?: string;
  amount: number;
  unit?: string;
}

const TAX_OPTIONS = [
  { id: 'tax-0', name: 'Non-Taxable (0%)', rate: 0 },
  { id: 'tax-5', name: 'GST 5% (5%)', rate: 5 },
  { id: 'tax-12', name: 'GST 12% (12%)', rate: 12 },
  { id: 'tax-18', name: 'GST 18% (18%)', rate: 18 },
  { id: 'tax-28', name: 'GST 28% (28%)', rate: 28 },
];

const TDS_TAX_OPTIONS = [
  { id: 'tds-0.1', name: 'TDS 0.1% (Sec 194Q)', rate: 0.1 },
  { id: 'tds-1', name: 'TDS 1% (Sec 194C)', rate: 1 },
  { id: 'tds-2', name: 'TDS 2% (Sec 194I - Plant & Machinery)', rate: 2 },
  { id: 'tds-5', name: 'TDS 5% (Sec 194J - Professional)', rate: 5 },
  { id: 'tds-10', name: 'TDS 10% (Sec 194J - Technical)', rate: 10 },
];

const TCS_TAX_OPTIONS = [
  { id: 'tcs-0.075', name: 'TCS 0.075% (Sec 206C(1H))', rate: 0.075 },
  { id: 'tcs-0.1', name: 'TCS 0.1% (Sale of Goods)', rate: 0.1 },
  { id: 'tcs-1', name: 'TCS 1% (Scrap/Minerals)', rate: 1 },
  { id: 'tcs-5', name: 'TCS 5% (Overseas Remittance)', rate: 5 },
];

export const QuotationForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(id);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Quote Number Settings Modal State
  const [quoteNumberPrefix, setQuoteNumberPrefix] = useState<string>('QT-');
  const [quoteNumberSequence, setQuoteNumberSequence] = useState<string>('000089');
  const [isAutoGenerate, setIsAutoGenerate] = useState<boolean>(true);
  const [quoteNo, setQuoteNo] = useState<string>('QT-000089');
  const [isNumberSettingsOpen, setIsNumberSettingsOpen] = useState<boolean>(false);

  // General Fields
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [salespersonId, setSalespersonId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');

  // Item Rows
  const [rows, setRows] = useState<QuoteItemRow[]>([
    {
      id: 'row-1',
      productId: '',
      productName: '',
      description: '',
      qty: 1,
      rate: 0,
      discount: 0,
      discountType: '%',
      taxPercent: 18,
      taxName: 'GST 18% (18%)',
      amount: 0,
      unit: 'pcs',
    },
  ]);

  // Totals & TDS/TCS
  const [tdsTcsType, setTdsTcsType] = useState<'TDS' | 'TCS' | 'NONE'>('TDS');
  const [selectedTdsTcsTax, setSelectedTdsTcsTax] = useState<string>('');
  const [tdsTcsRate, setTdsTcsRate] = useState<number>(0);
  const [adjustment, setAdjustment] = useState<number>(0);

  // Notes & Terms
  const [customerNotes, setCustomerNotes] = useState<string>(
    'We Hope this offer is favorable to you and expect your valuable order at the earliest: please feel free to contact us on 7510510946,7510510947'
  );
  const [termsConditions, setTermsConditions] = useState<string>(
    'Transportation Charges extra.\nGoods once sold are not returnable or exchangeable.\nAny complaint or damages should be informed within four days after material received.'
  );

  // Attachments
  const [files, setFiles] = useState<Array<{ name: string; size?: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bulkModalOpen, setBulkModalOpen] = useState<boolean>(false);

  // Fetch Customers from active /customers API
  const { data: customers = [], isLoading: isLoadingCustomers, isError: isCustomersError } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/customers');
      return ensureArray(res);
    },
  });

  // Fetch Products with complete catalog support
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-full-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/products', { params: { limit: 1000 } });
      return ensureArray<ProductItem>(res);
    },
  });

  // Fetch Employees for Salesperson from /hr/employees API
  const { data: employees = [], isLoading: isLoadingEmployees, isError: isEmployeesError } = useQuery({
    queryKey: ['hr-employees-sales'],
    queryFn: async () => {
      const res: any = await apiClient.get('/hr/employees');
      const items = ensureArray(res);
      return items.filter((e: any) => e.status === 'ACTIVE' || !e.status);
    },
  });

  // Fetch Quote Templates
  const { data: quoteTemplates = [] } = useQuery({
    queryKey: ['document-templates', 'quote'],
    queryFn: async () => {
      try {
        const res: any = await apiClient.get('/document-templates?docType=quote');
        const items = res.data?.data || res.data || [];
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    if (!templateId && quoteTemplates.length > 0) {
      const def = quoteTemplates.find((t: any) => t.isDefault) || quoteTemplates[0];
      if (def) setTemplateId(def.id);
    }
  }, [quoteTemplates, templateId]);

  // Fetch Next Quote Number from backend
  useEffect(() => {
    if (!isEditMode) {
      apiClient
        .get('/sales/quotations/next-number')
        .then((res: any) => {
          const next = res.data?.nextNumber || res.nextNumber;
          if (next) {
            setQuoteNo(next);
            const match = next.match(/^([A-Za-z]+-?)(\d+)$/);
            if (match) {
              setQuoteNumberPrefix(match[1]);
              setQuoteNumberSequence(match[2]);
            }
          }
        })
        .catch(() => {});
    }
  }, [isEditMode]);

  // If query parameter customerId is provided
  useEffect(() => {
    const qCustId = searchParams.get('customerId');
    if (qCustId && !selectedCustomerId) {
      setSelectedCustomerId(qCustId);
    }
  }, [searchParams, selectedCustomerId]);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Quote for Edit Mode
  useEffect(() => {
    if (isEditMode && id) {
      apiClient.get(`/sales/quotations/${id}`).then((res: any) => {
        const quote = res.data || res;
        if (quote) {
          setSelectedCustomerId(quote.businessPartnerId || quote.customerId || '');
          setQuoteNo(quote.quotationNo || '');
          setReferenceNo(quote.referenceNo || '');
          if (quote.date) setDate(quote.date.split('T')[0]);
          if (quote.expiryDate) setExpiryDate(quote.expiryDate.split('T')[0]);
          if (quote.salespersonId) {
            setSalespersonId(quote.salespersonId);
          } else if (quote.salesperson) {
            const match = employees.find((e: any) => e.name === quote.salesperson || e.id === quote.salesperson);
            if (match) setSalespersonId(match.id);
          }
          setSubject(quote.subject || '');
          if (quote.templateId) setTemplateId(quote.templateId);
          if (quote.notes) setCustomerNotes(quote.notes);
          if (quote.termsConditions) setTermsConditions(quote.termsConditions);
          if (quote.items && quote.items.length > 0) {
            setRows(
              quote.items.map((it: any, idx: number) => ({
                id: `row-${idx}`,
                productId: it.productId,
                productName: it.product?.name || it.description || '',
                description: it.description || '',
                qty: Number(it.qty || 1),
                rate: Number(it.rate || 0),
                discount: Number(it.discount || 0),
                discountType: it.discountType || '%',
                taxPercent: Number(it.taxPercent || 18),
                taxName: it.taxName || `GST ${it.taxPercent || 18}% (${it.taxPercent || 18}%)`,
                amount: Number(it.total || 0),
                unit: it.unit || it.product?.unit || 'pcs',
              }))
            );
          }
        }
      });
    }
  }, [isEditMode, id, employees]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  // Recalculate Row Amount
  const calculateRowAmount = (qty: number, rate: number, discount: number, discountType: '%' | 'fixed'): number => {
    const rawTotal = qty * rate;
    const discAmount = discountType === '%' ? rawTotal * (discount / 100) : discount;
    const netTotal = Math.max(0, rawTotal - discAmount);
    return Number(netTotal.toFixed(2));
  };

  // Row Manipulation Handlers
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random()}`,
        productId: '',
        productName: '',
        description: '',
        qty: 1,
        rate: 0,
        discount: 0,
        discountType: '%',
        taxPercent: 18,
        taxName: 'GST 18% (18%)',
        amount: 0,
        unit: 'pcs',
      },
    ]);
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length === 1) {
      setRows([
        {
          id: `row-${Date.now()}`,
          productId: '',
          productName: '',
          description: '',
          qty: 1,
          rate: 0,
          discount: 0,
          discountType: '%',
          taxPercent: 18,
          taxName: 'GST 18% (18%)',
          amount: 0,
          unit: 'pcs',
        },
      ]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleProductSelect = (rowId: string, prod: any) => {
    if (!prod) {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          return {
            ...r,
            productId: '',
            productName: '',
            description: '',
            rate: 0,
            amount: 0,
            unit: 'pcs',
          };
        })
      );
      return;
    }

    const rate = Number(prod.sellingPrice ?? prod.rate ?? 0);
    const taxRate = Number(prod.gstRate ?? 18);
    const taxOpt = TAX_OPTIONS.find((t) => t.rate === taxRate) || {
      name: `GST ${taxRate}% (${taxRate}%)`,
      rate: taxRate,
    };

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const amt = calculateRowAmount(r.qty, rate, r.discount, r.discountType);
        return {
          ...r,
          productId: prod.id,
          productName: prod.name,
          description: prod.description || prod.name,
          rate,
          taxPercent: taxRate,
          taxName: taxOpt.name,
          unit: prod.unit || 'pcs',
          amount: amt,
        };
      })
    );
  };

  const handleQtyChange = (rowId: string, val: string) => {
    const q = parseFloat(val) || 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          qty: q,
          amount: calculateRowAmount(q, r.rate, r.discount, r.discountType),
        };
      })
    );
  };

  const handleRateChange = (rowId: string, val: string) => {
    const rt = parseFloat(val) || 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          rate: rt,
          amount: calculateRowAmount(r.qty, rt, r.discount, r.discountType),
        };
      })
    );
  };

  const handleDiscountChange = (rowId: string, val: string) => {
    const d = parseFloat(val) || 0;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          discount: d,
          amount: calculateRowAmount(r.qty, r.rate, d, r.discountType),
        };
      })
    );
  };

  const handleTaxChange = (rowId: string, taxRate: number, taxName: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          taxPercent: taxRate,
          taxName,
        };
      })
    );
  };

  const handleBulkAdd = (selectedIds: string[]) => {
    const newItems: QuoteItemRow[] = [];
    for (const pid of selectedIds) {
      const prod = products.find((p: any) => p.id === pid);
      if (!prod) continue;
      const rate = Number(prod.sellingPrice || prod.rate || 0);
      const taxRate = Number(prod.gstRate || 18);
      const amt = calculateRowAmount(1, rate, 0, '%');
      newItems.push({
        id: `row-${Date.now()}-${pid}`,
        productId: prod.id,
        productName: prod.name,
        description: prod.description || prod.name,
        qty: 1,
        rate,
        discount: 0,
        discountType: '%',
        taxPercent: taxRate,
        taxName: `GST ${taxRate}% (${taxRate}%)`,
        amount: amt,
        unit: prod.unit || 'pcs',
      });
    }

    if (newItems.length > 0) {
      setRows((prev) => {
        const filtered = prev.filter((r) => r.productId);
        return [...filtered, ...newItems];
      });
    }
    setBulkModalOpen(false);
  };

  // Subtotal & Totals Calculations
  const subTotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [rows]);

  const taxTotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.amount * (r.taxPercent / 100)), 0);
  }, [rows]);

  // TDS / TCS Amount Calculation
  const tdsTcsCalculatedAmount = useMemo(() => {
    if (tdsTcsType === 'NONE' || !tdsTcsRate) return 0;
    return Number(((subTotal * tdsTcsRate) / 100).toFixed(2));
  }, [subTotal, tdsTcsType, tdsTcsRate]);

  // Grand Total
  const grandTotal = useMemo(() => {
    let tot = subTotal + taxTotal + Number(adjustment || 0);
    if (tdsTcsType === 'TDS') {
      tot -= tdsTcsCalculatedAmount;
    } else if (tdsTcsType === 'TCS') {
      tot += tdsTcsCalculatedAmount;
    }
    return Math.max(0, Number(tot.toFixed(2)));
  }, [subTotal, taxTotal, adjustment, tdsTcsType, tdsTcsCalculatedAmount]);

  // File Upload Handlers
  const handleUpload = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).map((f) => ({
      name: f.name,
      size: f.size,
    }));
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler: Save as Draft or Save and Send
  const handleSave = async (isDraft: boolean) => {
    if (!selectedCustomerId) {
      notification.error('Please select a customer.');
      return;
    }

    const activeRows = rows.filter((r) => r.productId && r.qty > 0);
    if (activeRows.length === 0) {
      notification.error('Please add at least one line item with valid product and quantity.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedEmployee = employees.find((e: any) => e.id === salespersonId);

      const payload = {
        customerId: selectedCustomerId,
        businessPartnerId: selectedCustomerId,
        quotationNo: quoteNo.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        date: new Date(date).toISOString(),
        dueDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        salesperson: selectedEmployee?.name || undefined,
        salespersonId: salespersonId || undefined,
        subject: subject.trim() || undefined,
        templateId: templateId || undefined,
        status: isDraft ? 'DRAFT' : 'SENT',
        placeOfSupply: selectedCustomer?.state || selectedCustomer?.placeOfSupply || undefined,
        notes: customerNotes,
        termsConditions,
        adjustment: Number(adjustment || 0),
        items: activeRows.map((r) => ({
          productId: r.productId,
          description: r.description || r.productName,
          qty: Number(r.qty),
          rate: Number(r.rate),
          discount: Number(r.discount || 0),
          discountType: r.discountType || '%',
          taxPercent: Number(r.taxPercent || 0),
          taxAmount: Number((r.amount * (r.taxPercent / 100)).toFixed(2)),
          taxName: r.taxName,
          unit: r.unit || 'pcs',
          total: Number((r.amount + r.amount * (r.taxPercent / 100)).toFixed(2)),
        })),
      };

      if (isEditMode && id) {
        await apiClient.put(`/sales/quotations/${id}`, payload);
        notification.success('Quotation updated successfully!');
      } else {
        await apiClient.post('/sales/quotations', payload);
        notification.success(isDraft ? 'Quotation saved as Draft!' : 'Quotation issued and sent successfully!');
      }

      await queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/quotations');
    } catch (err: any) {
      notification.error(err?.response?.data?.message || err?.message || 'Failed to save quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white overflow-hidden text-xs text-[#2B2F36]">
      {/* Top Header Bar */}
      <div className="h-12 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#2B2F36]" />
          <h2 className="text-sm font-semibold text-[#1E2540]">
            {isEditMode ? 'Edit Quote' : 'New Quote'}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/quotations')}
          className="text-[#DC2626] hover:bg-[#FEF2F2] p-1 rounded transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-[#DC2626]" />
        </button>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 w-full space-y-6">
        {/* Upper Form Section */}
        <div className="space-y-4">
          {/* Customer Name* */}
          <div className="flex items-start gap-4 relative" ref={customerDropdownRef}>
            <label className="w-36 pt-1.5 text-xs font-medium text-[#DC2626]">
              Customer Name*
            </label>
            <div className="w-[380px] max-w-full relative">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                  className="flex-1 h-8 px-3 border border-r-0 border-[#CBD5E1] rounded-l-[4px] text-xs text-[#2B2F36] bg-white text-left flex items-center justify-between cursor-pointer focus:border-[#408DFB] focus:outline-none"
                >
                  <span className={selectedCustomer ? 'font-medium text-[#2B2F36]' : 'text-[#9CA3AF]'}>
                    {selectedCustomer ? selectedCustomer.name : 'Select or add a customer'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomerDropdownOpen((prev) => !prev)}
                  className="h-8 w-9 bg-[#408DFB] hover:bg-[#2563EB] text-white flex items-center justify-center rounded-r-[4px] transition-colors cursor-pointer"
                  title="Search Customer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Customer Searchable Dropdown Popup */}
              {isCustomerDropdownOpen && (
                <div className="absolute top-9 left-0 w-full bg-white border border-[#CBD5E1] rounded-[4px] shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-[#E5E7EB] bg-[#FAFBFD]">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search"
                        className="w-full pl-7 pr-3 py-1 bg-white border border-[#CBD5E1] rounded text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-[#F3F4F6]">
                    {isLoadingCustomers ? (
                      <div className="p-4 text-center text-xs text-[#6B7280]">Loading customers...</div>
                    ) : isCustomersError ? (
                      <div className="p-4 text-center text-xs text-[#DC2626]">Failed to load customers</div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#6B7280]">
                        {customerSearch.trim()
                          ? `No customers found matching "${customerSearch.trim()}"`
                          : 'No active customers available'}
                      </div>
                    ) : (
                      filteredCustomers.map((cust: any) => {
                        const isSelected = cust.id === selectedCustomerId;
                        const subInfo = [
                          cust.tradeName,
                          cust.phone ? `Ph: ${cust.phone}` : null,
                          cust.gstin ? `GST: ${cust.gstin}` : null,
                        ]
                          .filter(Boolean)
                          .join(' • ');

                        return (
                          <div
                            key={cust.id}
                            onClick={() => {
                              setSelectedCustomerId(cust.id);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className={`p-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#408DFB] text-white'
                                : 'hover:bg-[#F8F9FB] text-[#2B2F36]'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#EFF6FF] text-[#408DFB]'
                              }`}
                            >
                              {(cust.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`font-semibold text-xs truncate ${isSelected ? 'text-white' : 'text-[#1E2540]'}`}>
                                {cust.name}
                              </p>
                              {subInfo ? (
                                <p className={`text-[11px] truncate ${isSelected ? 'text-white/80' : 'text-[#6B7280]'}`}>
                                  {subInfo}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-[#E5E7EB] bg-[#FAFBFD]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomerDropdownOpen(false);
                        navigate('/customers/new');
                      }}
                      className="text-xs text-[#408DFB] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Customer</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quote#* */}
          <div className="flex items-center gap-4">
            <label className="w-36 text-xs font-medium text-[#DC2626]">
              Quote#*
            </label>
            <div className="w-[300px] relative flex items-center">
              <input
                type="text"
                value={quoteNo}
                disabled={isAutoGenerate}
                onChange={(e) => setQuoteNo(e.target.value)}
                className="w-full h-8 px-3 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none disabled:bg-[#F8F9FB]"
              />
              <button
                type="button"
                onClick={() => setIsNumberSettingsOpen(true)}
                className="absolute right-2 text-[#6B7280] hover:text-[#408DFB] cursor-pointer"
                title="Configure Quote Number Preferences"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Reference# */}
          <div className="flex items-center gap-4">
            <label className="w-36 text-xs text-[#2B2F36]">Reference#</label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-[300px] h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
            />
          </div>

          {/* Quote Date* & Expiry Date */}
          <div className="flex items-center gap-4">
            <label className="w-36 text-xs font-medium text-[#DC2626]">
              Quote Date*
            </label>
            <div className="flex items-center gap-6">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-48 h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none bg-white"
              />
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#2B2F36] w-20">Expiry Date</span>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="dd/MM/yyyy"
                  className="w-48 h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* Salesperson */}
          <div className="flex items-center gap-4">
            <label className="w-36 text-xs text-[#2B2F36]">Salesperson</label>
            <div className="w-[300px] relative flex items-center">
              <select
                value={salespersonId}
                onChange={(e) => setSalespersonId(e.target.value)}
                className="w-full h-8 px-3 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none appearance-none cursor-pointer"
              >
                {isLoadingEmployees ? (
                  <option value="">Loading employees...</option>
                ) : isEmployeesError ? (
                  <option value="">Error loading employees</option>
                ) : employees.length === 0 ? (
                  <option value="">No active employees found</option>
                ) : (
                  <>
                    <option value="">Select a salesperson</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {salespersonId ? (
                <button
                  type="button"
                  onClick={() => setSalespersonId('')}
                  className="absolute right-6 text-[#9CA3AF] hover:text-[#DC2626]"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : null}
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Subject */}
          <div className="flex items-start gap-4">
            <label className="w-36 pt-1.5 text-xs text-[#2B2F36] flex items-center gap-1">
              <span>Subject</span>
              <Info className="w-3 h-3 text-[#9CA3AF]" />
            </label>
            <div className="flex-1 max-w-xl">
              <textarea
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                rows={2}
                placeholder="Let your customer know what this Quote is for"
                className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none resize-y"
              />
            </div>
          </div>

          {/* PDF Template */}
          <div className="flex items-center gap-4">
            <label className="w-36 text-xs text-[#2B2F36]">PDF Template</label>
            <div className="w-[300px] relative flex items-center">
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full h-8 px-3 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none appearance-none cursor-pointer"
              >
                {quoteTemplates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Item Table Section */}
        <div className="mt-8 space-y-2">
          <span className="text-xs font-semibold text-[#1E2540]">Item Table</span>

          <div className="border border-[#E5E7EB] rounded-[4px] bg-white w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left font-medium">ITEM DETAILS</th>
                  <th className="px-3 py-2.5 text-right font-medium w-28">QUANTITY</th>
                  <th className="px-3 py-2.5 text-right font-medium w-32">RATE</th>
                  <th className="px-3 py-2.5 text-right font-medium w-28">DISCOUNT</th>
                  <th className="px-3 py-2.5 text-left font-medium w-36">TAX</th>
                  <th className="px-4 py-2.5 text-right font-medium w-32">AMOUNT</th>
                  <th className="w-8 px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {rows.map((row) => (
                  <tr key={row.id} className="group hover:bg-[#F9FAFB]">
                    {/* Item Details */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded border border-[#CBD5E1] bg-[#F8F9FB] flex items-center justify-center shrink-0 text-[#9CA3AF]">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex-1 relative">
                          <SearchableItemCombobox
                            value={row.productId}
                            displayValue={row.productName}
                            unit={row.unit}
                            initialProducts={products}
                            onSelect={(prod) => handleProductSelect(row.id, prod)}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={row.qty}
                          onChange={(e) => handleQtyChange(row.id, e.target.value)}
                          className="w-16 h-8 px-2 text-right border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                        />
                        <span className="text-[10px] text-[#6B7280] font-medium uppercase w-8 text-left truncate">
                          {row.unit || 'pcs'}
                        </span>
                      </div>
                    </td>

                    {/* Rate */}
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.rate}
                        onChange={(e) => handleRateChange(row.id, e.target.value)}
                        placeholder="0.00"
                        className="w-24 h-8 px-2 text-right border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none tabular-nums"
                      />
                    </td>

                    {/* Discount */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min="0"
                          value={row.discount || 0}
                          onChange={(e) => handleDiscountChange(row.id, e.target.value)}
                          className="w-14 h-8 px-1.5 text-right border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                        />
                        <span className="text-[11px] text-[#6B7280]">%</span>
                      </div>
                    </td>

                    {/* Tax */}
                    <td className="px-3 py-2.5">
                      <div className="relative">
                        <select
                          value={row.taxPercent}
                          onChange={(e) => {
                            const opt = TAX_OPTIONS.find((t) => t.rate === Number(e.target.value));
                            handleTaxChange(row.id, Number(e.target.value), opt?.name || '');
                          }}
                          className="w-full h-8 px-2.5 pr-7 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none appearance-none cursor-pointer"
                        >
                          {TAX_OPTIONS.map((t) => (
                            <option key={t.id} value={t.rate}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2 top-2.5 pointer-events-none" />
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-2.5 text-right tabular-nums text-xs font-medium text-[#2B2F36]">
                      {row.amount.toFixed(2)}
                    </td>

                    {/* Row delete */}
                    <td className="px-2 py-2.5 text-center">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#DC2626] p-1 rounded hover:bg-[#FEF2F2] transition-all cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Under-table Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#408DFB] cursor-pointer transition-colors shadow-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Row</span>
            </button>
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#408DFB] cursor-pointer transition-colors shadow-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Items in Bulk</span>
            </button>
          </div>
        </div>

        {/* Balanced Section Below Item Table: Left (Notes, Terms, Attachments) & Right (Totals) */}
        <div className="pt-6 pb-10 space-y-6">
          {/* Row 1: Customer Notes (Left) & Totals (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Customer Notes */}
            <div className="lg:col-span-7 space-y-1.5">
              <label className="text-xs font-semibold text-[#2B2F36] block">
                Customer Notes
              </label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={3}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none resize-y"
              />
            </div>

            {/* Right Column: Totals Box */}
            <div className="lg:col-span-5 flex justify-end">
              <div className="w-full bg-[#FAFBFD] border border-[#E5E7EB] rounded-[4px] p-4 text-xs space-y-3">
                {/* Sub Total */}
                <div className="flex justify-between items-center text-[#2B2F36]">
                  <span className="font-semibold text-xs">Sub Total</span>
                  <span className="font-semibold tabular-nums">{subTotal.toFixed(2)}</span>
                </div>

                {/* TDS / TCS Controls */}
                <div className="pt-2 border-t border-[#E5E7EB] space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tdsTcsOption"
                        checked={tdsTcsType === 'TDS'}
                        onChange={() => {
                          setTdsTcsType('TDS');
                          setSelectedTdsTcsTax('');
                          setTdsTcsRate(0);
                        }}
                        className="w-3.5 h-3.5 text-[#408DFB] border-[#CBD5E1] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs">TDS</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tdsTcsOption"
                        checked={tdsTcsType === 'TCS'}
                        onChange={() => {
                          setTdsTcsType('TCS');
                          setSelectedTdsTcsTax('');
                          setTdsTcsRate(0);
                        }}
                        className="w-3.5 h-3.5 text-[#408DFB] border-[#CBD5E1] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs">TCS</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 relative">
                      <select
                        value={selectedTdsTcsTax}
                        onChange={(e) => {
                          setSelectedTdsTcsTax(e.target.value);
                          const list = tdsTcsType === 'TDS' ? TDS_TAX_OPTIONS : TCS_TAX_OPTIONS;
                          const opt = list.find((t) => t.id === e.target.value);
                          setTdsTcsRate(opt ? opt.rate : 0);
                        }}
                        className="w-full h-8 px-2.5 pr-7 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Select a Tax</option>
                        {(tdsTcsType === 'TDS' ? TDS_TAX_OPTIONS : TCS_TAX_OPTIONS).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2 top-2.5 pointer-events-none" />
                    </div>
                    <span className="font-medium tabular-nums text-right w-24">
                      {tdsTcsType === 'TDS' ? `- ${tdsTcsCalculatedAmount.toFixed(2)}` : `+ ${tdsTcsCalculatedAmount.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Adjustment */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E5E7EB]">
                  <span className="text-[#2B2F36] text-xs">Adjustment</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={adjustment}
                      onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-24 h-7 px-2 text-right border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none tabular-nums"
                    />
                    <span className="tabular-nums w-14 text-right">
                      {Number(adjustment || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Total ( ₹ ) */}
                <div className="flex justify-between items-center text-sm font-bold text-[#1E2540] pt-2 border-t border-[#CBD5E1]">
                  <span>Total ( ₹ )</span>
                  <span className="tabular-nums text-base">{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Terms & Conditions (Left) & Attachments (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
            {/* Left Column: Terms & Conditions */}
            <div className="lg:col-span-7 space-y-1.5">
              <label className="text-xs font-semibold text-[#2B2F36] block">
                Terms & Conditions
              </label>
              <textarea
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                rows={4}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none resize-y"
              />
            </div>

            {/* Right Column: Attachments */}
            <div className="lg:col-span-5 space-y-2">
              <span className="text-xs font-semibold text-[#2B2F36] block">
                Attach File(s) to Quote
              </span>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Upload File</span>
                <ChevronDown className="w-3 h-3 text-[#6B7280]" />
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleUpload(e.target.files)}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-[#9CA3AF]">
                You can upload a maximum of 5 files, 10MB each
              </p>

              {/* Uploaded files display */}
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#F8F9FB] border border-[#E5E7EB] rounded text-xs text-[#2B2F36]"
                    >
                      <Paperclip className="w-3 h-3 text-[#6B7280]" />
                      <span className="truncate max-w-[180px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-[#9CA3AF] hover:text-[#DC2626] ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Additional Fields Notice */}
          <p className="text-[11px] text-[#9CA3AF] pt-2">
            Additional Fields: Start adding custom fields for your quotes by going to Settings ➔ Sales ➔ Quotes.
          </p>
        </div>
      </div>

      {/* Configure Quote Number Preferences Modal */}
      {isNumberSettingsOpen && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4px] border border-[#E5E7EB] shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#1E2540]">
                Configure Quote Number Preferences
              </h3>
              <button
                type="button"
                onClick={() => setIsNumberSettingsOpen(false)}
                className="text-[#9CA3AF] hover:text-[#2B2F36]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280]">
              Your quote numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
            </p>

            <div className="space-y-4 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="numberPref"
                  checked={isAutoGenerate}
                  onChange={() => setIsAutoGenerate(true)}
                  className="mt-0.5 text-[#408DFB] focus:ring-0"
                />
                <div className="space-y-2 flex-1">
                  <span className="font-semibold text-xs text-[#2B2F36] flex items-center gap-1">
                    <span>Continue auto-generating quote numbers</span>
                    <Info className="w-3 h-3 text-[#9CA3AF]" />
                  </span>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[11px] text-[#6B7280] block mb-1">Prefix</span>
                      <input
                        type="text"
                        value={quoteNumberPrefix}
                        onChange={(e) => setQuoteNumberPrefix(e.target.value)}
                        className="w-24 h-7 px-2 border border-[#CBD5E1] rounded text-xs text-[#2B2F36]"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-[#6B7280] block mb-1">Next Number</span>
                      <input
                        type="text"
                        value={quoteNumberSequence}
                        onChange={(e) => setQuoteNumberSequence(e.target.value)}
                        className="w-36 h-7 px-2 border border-[#CBD5E1] rounded text-xs text-[#2B2F36]"
                      />
                    </div>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="numberPref"
                  checked={!isAutoGenerate}
                  onChange={() => setIsAutoGenerate(false)}
                  className="text-[#408DFB] focus:ring-0"
                />
                <span className="font-medium text-xs text-[#2B2F36]">
                  Enter quote numbers manually
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => {
                  if (isAutoGenerate) {
                    setQuoteNo(`${quoteNumberPrefix}${quoteNumberSequence}`);
                  }
                  setIsNumberSettingsOpen(false);
                }}
                className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsNumberSettingsOpen(false)}
                className="px-3 py-1.5 border border-[#CBD5E1] text-[#2B2F36] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Item Selection Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4px] border border-[#E5E7EB] shadow-xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#1E2540]">Add Items in Bulk</h3>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="text-[#6B7280] hover:text-[#2B2F36]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-[#E5E7EB]">
              {products.map((p: any) => (
                <label
                  key={p.id}
                  className="flex items-center justify-between py-2 px-1 hover:bg-[#F8F9FB] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`quote-bulk-${p.id}`}
                      className="rounded text-[#408DFB] focus:ring-[#408DFB]"
                    />
                    <span className="font-medium text-xs text-[#2B2F36]">{p.name}</span>
                    {p.sku && <span className="text-[11px] text-[#6B7280]">({p.sku})</span>}
                  </div>
                  <span className="text-[11px] text-[#6B7280] tabular-nums">
                    ₹{Number(p.sellingPrice || p.rate || 0).toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-3 py-1.5 border border-[#CBD5E1] rounded-[4px] text-xs font-medium text-[#2B2F36] hover:bg-[#F8F9FB]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const checked: string[] = [];
                  products.forEach((p: any) => {
                    const el = document.getElementById(`quote-bulk-${p.id}`) as HTMLInputElement;
                    if (el && el.checked) checked.push(p.id);
                  });
                  handleBulkAdd(checked);
                }}
                className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold"
              >
                Add Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Bottom Footer */}
      <div className="h-14 border-t border-[#E5E7EB] bg-white px-6 flex items-center justify-between shrink-0 shadow-[0_-2px_6px_rgba(0,0,0,0.03)] z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(true)}
            className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#2B2F36] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium cursor-pointer disabled:opacity-50 transition-colors shadow-none"
          >
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(false)}
            className="px-4 py-2 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-none"
          >
            {isSubmitting ? 'Sending...' : 'Save and Send'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => navigate('/quotations')}
            className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#2B2F36] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium cursor-pointer transition-colors shadow-none"
          >
            Cancel
          </button>
        </div>

        <div className="text-[11px] text-[#6B7280]">
          PDF Template: <span className="text-[#2B2F36] font-medium">'Spreadsheet Template'</span>{' '}
          <button
            type="button"
            onClick={() => notification.info('Template preference is set to default spreadsheet format.')}
            className="text-[#408DFB] hover:underline cursor-pointer ml-1"
          >
            Change
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuotationForm;
