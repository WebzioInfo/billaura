import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Search,
  Plus,
  Trash2,
  Settings,
  HelpCircle,
  Calculator,
  GripVertical,
  ChevronDown
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';

interface CreditNoteItemRow {
  id: string;
  productId: string;
  name: string;
  description: string;
  accountId: string;
  quantity: number;
  rate: number;
  discount: number;
  discountType: '%' | '₹';
  taxRate: number;
  taxId: string;
}

const REASONS = [
  'Sales Return',
  'Post Sale Discount',
  'Deficiency in Services',
  'Correction in Invoice',
  'Change in POS',
  'Finalization of Provisional Assessment',
  'Others',
];

const GST_RATES = [
  { id: '', label: 'Select a Tax', rate: 0 },
  { id: 'GST0', label: 'GST0 [0%]', rate: 0 },
  { id: 'GST5', label: 'GST5 [5%]', rate: 5 },
  { id: 'GST12', label: 'GST12 [12%]', rate: 12 },
  { id: 'GST18', label: 'GST18 [18%]', rate: 18 },
  { id: 'GST28', label: 'GST28 [28%]', rate: 28 },
];

const TDS_RATES = [
  { id: '', label: 'Select a Tax', rate: 0 },
  { id: '194C-1', label: '194C - Contractor (1%)', rate: 1.0 },
  { id: '194C-2', label: '194C - Contractor (Company) (2%)', rate: 2.0 },
  { id: '194J', label: '194J - Professional (10%)', rate: 10.0 },
  { id: '194Q', label: '194Q - Purchase of Goods (0.1%)', rate: 0.1 },
];

const TCS_RATES = [
  { id: '', label: 'Select a Tax', rate: 0 },
  { id: '206C-1H', label: '206C(1H) - Sale of Goods (0.1%)', rate: 0.1 },
  { id: '206C-1', label: '206C(1) - Alcoholic Liquor (1%)', rate: 1.0 },
];

export const CreditNoteForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // Form Fields
  const queryCustomerId = searchParams.get('customerId');
  const [customerId, setCustomerId] = useState<string>(queryCustomerId || '');
  const [reason, setReason] = useState<string>('Sales Return');
  const [creditNoteNumber, setCreditNoteNumber] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [creditNoteDate, setCreditNoteDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [salesperson, setSalesperson] = useState<string>('ALI HASHIM');
  const [subject, setSubject] = useState<string>('');

  // Items
  const [items, setItems] = useState<CreditNoteItemRow[]>([
    {
      id: 'row-1',
      productId: '',
      name: '',
      description: '',
      accountId: '',
      quantity: 1,
      rate: 0,
      discount: 0,
      discountType: '%',
      taxRate: 0,
      taxId: '',
    },
  ]);

  // Bulk Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [bulkSearch, setBulkSearch] = useState<string>('');
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);

  // Totals & Adjustments
  const [tdsTcsType, setTdsTcsType] = useState<'TDS' | 'TCS'>('TDS');
  const [tdsTcsTaxId, setTdsTcsTaxId] = useState<string>('');
  const [adjustment, setAdjustment] = useState<number>(0);

  // Notes & Terms
  const [customerNotes, setCustomerNotes] = useState<string>('Will be displayed on the credit note');
  const [termsConditions, setTermsConditions] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch Next Credit Note Number
  useEffect(() => {
    if (isEditMode) return;
    let isMounted = true;
    apiClient.get('/sales/invoices/next-number?type=CREDIT_NOTE')
      .then((res: any) => {
        if (!isMounted) return;
        const nextNo = res.data?.data || res.data || '';
        if (nextNo && typeof nextNo === 'string') {
          setCreditNoteNumber(nextNo);
        } else {
          setCreditNoteNumber(`CN-${String(Math.floor(1000 + Math.random() * 9000))}`);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCreditNoteNumber(`CN-${String(Math.floor(1000 + Math.random() * 9000))}`);
        }
      });
    return () => { isMounted = false; };
  }, [isEditMode]);

  // Fetch Customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: async () => {
      const res = await apiClient.get('/customers', { params: { limit: 100 } });
      const list = res.data?.data?.items || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === customerId) || null;
  }, [customers, customerId]);

  // Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: { limit: 200 } });
      const list = res.data?.data?.items || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Fetch Accounts (Chart of Accounts)
  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts-lookup'],
    queryFn: async () => {
      const res = await apiClient.get('/accounts', { params: { limit: 200 } });
      const list = res.data?.data?.items || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Default sales return / sales accounts
  const defaultSalesAccount = useMemo(() => {
    const found = accounts.find((a: any) =>
      a.name?.toLowerCase().includes('sales return') ||
      a.name?.toLowerCase().includes('sales') ||
      a.category === 'REVENUE'
    );
    return found ? found.id : '';
  }, [accounts]);

  // Fetch Salespersons / Employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-lookup'],
    queryFn: async () => {
      const res = await apiClient.get('/employees', { params: { limit: 50 } });
      const list = res.data?.data?.items || res.data?.items || res.data || [];
      return Array.isArray(list) ? list : [];
    },
  });

  // Load existing credit note in Edit mode
  useEffect(() => {
    if (!isEditMode || !id) return;
    apiClient.get(`/sales/invoices/${id}`)
      .then((res: any) => {
        const doc = res.data?.data || res.data;
        if (!doc) return;
        setCustomerId(doc.businessPartnerId || doc.customerId || '');
        setCreditNoteNumber(doc.invoiceNo || '');
        setReferenceNumber(doc.referenceNo || doc.orderNumber || '');
        if (doc.date) setCreditNoteDate(new Date(doc.date).toISOString().split('T')[0]);
        setReason(doc.gstBreakup?.reason || doc.reason || 'Sales Return');
        setSalesperson(doc.gstBreakup?.salesperson || doc.salesperson || '');
        setSubject(doc.gstBreakup?.subject || doc.subject || '');
        setAdjustment(Number(doc.gstBreakup?.adjustment || doc.adjustment || 0));
        setCustomerNotes(doc.gstBreakup?.notes || doc.notes || '');
        setTermsConditions(doc.gstBreakup?.termsConditions || doc.termsConditions || '');

        if (Array.isArray(doc.items) && doc.items.length > 0) {
          setItems(
            doc.items.map((it: any, idx: number) => ({
              id: it.id || `row-${idx}`,
              productId: it.productId || '',
              name: it.description || '',
              description: it.description || '',
              accountId: it.salesAccountId || '',
              quantity: Number(it.qty || 1),
              rate: Number(it.rate || 0),
              discount: Number(it.discount || 0),
              discountType: '%',
              taxRate: Number(it.taxPercent || 0),
              taxId: '',
            }))
          );
        }
      })
      .catch((err) => {
        notification.error('Failed to load credit note details');
      });
  }, [isEditMode, id]);

  // Calculations
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const gross = Number(item.quantity || 0) * Number(item.rate || 0);
      const discountVal =
        item.discountType === '₹'
          ? Number(item.discount || 0)
          : (gross * Number(item.discount || 0)) / 100;
      const taxable = Math.max(0, gross - discountVal);
      const taxAmount = (taxable * Number(item.taxRate || 0)) / 100;
      const totalAmount = taxable + taxAmount;
      return {
        ...item,
        gross,
        taxable,
        taxAmount,
        totalAmount,
      };
    });
  }, [items]);

  const subTotal = useMemo(() => {
    return calculatedItems.reduce((sum, it) => sum + it.taxable, 0);
  }, [calculatedItems]);

  const totalTax = useMemo(() => {
    return calculatedItems.reduce((sum, it) => sum + it.taxAmount, 0);
  }, [calculatedItems]);

  const tdsTcsAmount = useMemo(() => {
    if (!tdsTcsTaxId) return 0;
    const ratesList = tdsTcsType === 'TDS' ? TDS_RATES : TCS_RATES;
    const matched = ratesList.find((r) => r.id === tdsTcsTaxId);
    if (!matched || matched.rate <= 0) return 0;
    return Number(((subTotal * matched.rate) / 100).toFixed(2));
  }, [tdsTcsType, tdsTcsTaxId, subTotal]);

  const grandTotal = useMemo(() => {
    const tdsTcsEffect = tdsTcsType === 'TDS' ? -tdsTcsAmount : tdsTcsAmount;
    return Math.max(0, Number((subTotal + totalTax + Number(adjustment || 0) + tdsTcsEffect).toFixed(2)));
  }, [subTotal, totalTax, adjustment, tdsTcsType, tdsTcsAmount]);

  // Item Management
  const handleItemChange = (index: number, field: keyof CreditNoteItemRow, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };

      if (field === 'productId') {
        const prod = products.find((p: any) => p.id === value);
        if (prod) {
          target.name = prod.name;
          target.description = prod.description || prod.name;
          target.rate = Number(prod.sellingPrice || prod.price || 0);
          target.taxRate = Number(prod.taxRate || prod.gstRate || 0);
          target.accountId = prod.salesAccountId || defaultSalesAccount;
        }
      }

      updated[index] = target;
      return updated;
    });
  };

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        productId: '',
        name: '',
        description: '',
        accountId: defaultSalesAccount,
        quantity: 1,
        rate: 0,
        discount: 0,
        discountType: '%',
        taxRate: 0,
        taxId: '',
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setItems([
        {
          id: `row-${Date.now()}`,
          productId: '',
          name: '',
          description: '',
          accountId: defaultSalesAccount,
          quantity: 1,
          rate: 0,
          discount: 0,
          discountType: '%',
          taxRate: 0,
          taxId: '',
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkAdd = () => {
    if (selectedBulkIds.length === 0) {
      setIsBulkModalOpen(false);
      return;
    }
    const newRows: CreditNoteItemRow[] = selectedBulkIds.map((prodId) => {
      const prod = products.find((p: any) => p.id === prodId);
      return {
        id: `row-${Date.now()}-${Math.random()}`,
        productId: prod?.id || '',
        name: prod?.name || '',
        description: prod?.description || prod?.name || '',
        accountId: prod?.salesAccountId || defaultSalesAccount,
        quantity: 1,
        rate: Number(prod?.sellingPrice || prod?.price || 0),
        discount: 0,
        discountType: '%',
        taxRate: Number(prod?.taxRate || prod?.gstRate || 0),
        taxId: '',
      };
    });

    const isFirstEmpty = items.length === 1 && !items[0].productId && !items[0].description;
    if (isFirstEmpty) {
      setItems(newRows);
    } else {
      setItems((prev) => [...prev, ...newRows]);
    }
    setSelectedBulkIds([]);
    setIsBulkModalOpen(false);
  };

  // Submit Handler
  const handleSubmit = async (submitStatus: 'DRAFT' | 'SENT') => {
    if (!customerId) {
      notification.error('Please select a Customer');
      return;
    }
    if (!creditNoteNumber.trim()) {
      notification.error('Credit Note Number is required');
      return;
    }
    if (items.length === 0 || !items.some((it) => it.quantity > 0 && it.rate >= 0)) {
      notification.error('At least one valid line item is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        customerId,
        businessPartnerId: customerId,
        invoiceNo: creditNoteNumber.trim(),
        documentNo: creditNoteNumber.trim(),
        date: creditNoteDate ? new Date(creditNoteDate).toISOString() : new Date().toISOString(),
        invoiceType: 'CREDIT_NOTE',
        documentType: 'CREDIT_NOTE',
        status: submitStatus,
        reason,
        salesperson: salesperson.trim() || undefined,
        subject: subject.trim() || undefined,
        referenceNo: referenceNumber.trim() || undefined,
        orderNumber: referenceNumber.trim() || undefined,
        adjustment: Number(adjustment) || 0,
        tdsTcsType: tdsTcsTaxId ? tdsTcsType : undefined,
        tdsTcsAmount: tdsTcsTaxId ? tdsTcsAmount : undefined,
        tdsTcsTaxId: tdsTcsTaxId || undefined,
        notes: customerNotes.trim() || undefined,
        customerNotes: customerNotes.trim() || undefined,
        termsConditions: termsConditions.trim() || undefined,
        items: items.map((it) => ({
          productId: it.productId || undefined,
          description: it.description || it.name || 'Item',
          qty: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0,
          discount: Number(it.discount) || 0,
          discountType: it.discountType === '₹' ? 'amount' : 'percent',
          taxPercent: Number(it.taxRate) || 0,
          accountId: it.accountId || undefined,
        })),
      };

      if (isEditMode) {
        await apiClient.put(`/sales/invoices/${id}`, payload);
        notification.success('Credit note updated successfully!');
      } else {
        await apiClient.post('/sales/invoices', payload);
        notification.success(
          submitStatus === 'DRAFT'
            ? 'Credit note saved as Draft.'
            : 'Credit note created and issued successfully.'
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      await erpInvalidate.invoice(queryClient, { customerId, invoiceId: id });
      navigate('/credit-notes');
    } catch (err: any) {
      notification.error(err?.response?.data?.message || 'Failed to save credit note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden text-xs text-[#2B2F36]">
      {/* 1. Header Bar */}
      <div className="h-12 border-b border-[#E5E7EB] bg-white px-8 flex items-center justify-between shrink-0">
        <h1 className="text-base font-semibold text-[#1E2540]">
          {isEditMode ? 'Edit Credit Note' : 'New Credit Note'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/credit-notes')}
          className="text-[#6B7280] hover:text-[#1E2540] p-1.5 rounded-[4px] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Customer & Reason Band (Grey Tinted Zoho Background) */}
        <div className="bg-[#F8F9FB] border-b border-[#E5E7EB] px-8 py-4">
          <div className="w-full max-w-[1040px] space-y-3">
            {/* Customer Name */}
            <div className="flex items-center">
              <label className="w-36 text-xs font-normal text-[#2B2F36]">
                Customer Name<span className="text-[#E54B4B]">*</span>
              </label>
              <div className="flex w-[380px] max-w-full">
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="flex-1 h-8 px-2.5 border border-r-0 border-[#CBD5E1] rounded-l-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                >
                  <option value="">Select or add a customer</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  title="Search customer"
                  className="h-8 px-3 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-r-[4px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Reason */}
            <div className="flex items-center">
              <label className="w-36 text-xs font-normal text-[#2B2F36]">
                Reason
              </label>
              <div className="w-[380px] max-w-full">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                >
                  <option value="">Select a reason</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Form Body Fields */}
        <div className="px-8 py-5">
          <div className="w-full max-w-[1040px] space-y-3.5">
            {/* Credit Note# */}
            <div className="flex items-center">
              <label className="w-36 text-xs font-normal text-[#2B2F36]">
                Credit Note#<span className="text-[#E54B4B]">*</span>
              </label>
              <div className="w-[380px] max-w-full relative flex items-center">
                <input
                  type="text"
                  value={creditNoteNumber}
                  onChange={(e) => setCreditNoteNumber(e.target.value)}
                  className="w-full h-8 pl-3 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs font-mono text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                />
                <button
                  type="button"
                  title="Auto-numbering preferences"
                  className="absolute right-2.5 text-[#408DFB] hover:text-[#2563EB] cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Reference# */}
            <div className="flex items-center">
              <label className="w-36 text-xs font-normal text-[#2B2F36]">
                Reference#
              </label>
              <div className="w-[380px] max-w-full">
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder=""
                  className="w-full h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                />
              </div>
            </div>

            {/* Credit Note Date */}
            <div className="flex items-center">
              <label className="w-36 text-xs font-normal text-[#2B2F36]">
                Credit Note Date<span className="text-[#E54B4B]">*</span>
              </label>
              <div className="w-[380px] max-w-full">
                <input
                  type="date"
                  value={creditNoteDate}
                  onChange={(e) => setCreditNoteDate(e.target.value)}
                  className="w-full h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none"
                />
              </div>
            </div>

            {/* Salesperson */}
            <div className="flex items-center">
              <label className="w-36 text-xs font-normal text-[#2B2F36]">
                Salesperson
              </label>
              <div className="w-[380px] max-w-full relative flex items-center">
                <select
                  value={salesperson}
                  onChange={(e) => setSalesperson(e.target.value)}
                  className="w-full h-8 pl-3 pr-8 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] focus:outline-none"
                >
                  <option value="">Select a salesperson</option>
                  <option value="ALI HASHIM">ALI HASHIM</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.name || emp.fullName}>
                      {emp.name || emp.fullName}
                    </option>
                  ))}
                </select>
                {salesperson && (
                  <button
                    type="button"
                    onClick={() => setSalesperson('')}
                    title="Clear salesperson"
                    className="absolute right-7 text-[#E54B4B] hover:text-red-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-start pt-1">
              <label className="w-36 text-xs font-normal text-[#2B2F36] flex items-center gap-1 pt-1.5">
                <span>Subject</span>
                <HelpCircle className="w-3 h-3 text-[#9CA3AF]" />
              </label>
              <div className="w-[380px] max-w-full">
                <textarea
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  rows={2}
                  placeholder="Let your customer know what this Credit Note is for"
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* 3. Item Table */}
            <div className="pt-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1E2540]">Item Table</span>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="text-xs text-[#408DFB] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Settings className="w-3 h-3" />
                  <span>Bulk Actions</span>
                </button>
              </div>

              <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden bg-white">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      <th className="w-8 px-2 py-2 text-center"></th>
                      <th className="px-3 py-2 text-left font-medium min-w-[200px]">ITEM DETAILS</th>
                      <th className="px-3 py-2 text-left font-medium w-40">ACCOUNT</th>
                      <th className="px-3 py-2 text-right font-medium w-20">QUANTITY</th>
                      <th className="px-3 py-2 text-right font-medium w-24">
                        <span className="flex items-center justify-end gap-1">
                          RATE <Calculator className="w-3 h-3 text-[#9CA3AF]" />
                        </span>
                      </th>
                      <th className="px-3 py-2 text-right font-medium w-24">DISCOUNT</th>
                      <th className="px-3 py-2 text-left font-medium w-32">
                        <span className="flex items-center gap-1">
                          TAX <HelpCircle className="w-3 h-3 text-[#9CA3AF]" />
                        </span>
                      </th>
                      <th className="px-3 py-2 text-right font-medium w-28">AMOUNT</th>
                      <th className="w-8 px-2 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {calculatedItems.map((item, index) => (
                      <tr key={item.id} className="hover:bg-[#FDFDFE] group">
                        {/* Drag Handle */}
                        <td className="px-2 py-2 text-center text-[#9CA3AF] cursor-grab">
                          <GripVertical className="w-3.5 h-3.5 mx-auto" />
                        </td>

                        {/* Item Details */}
                        <td className="px-3 py-2">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                            className="w-full h-7 px-2 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] outline-none"
                          >
                            <option value="">Type or click to select an item.</option>
                            {products.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Add description..."
                            className="w-full text-[11px] text-[#6B7280] mt-1 px-1 outline-none border-b border-transparent focus:border-[#CBD5E1]"
                          />
                        </td>

                        {/* Account */}
                        <td className="px-3 py-2">
                          <select
                            value={item.accountId}
                            onChange={(e) => handleItemChange(index, 'accountId', e.target.value)}
                            className="w-full h-7 px-2 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] outline-none"
                          >
                            <option value="">Select an account</option>
                            <option value="sales-return">Sales Return</option>
                            <option value="sales">Sales</option>
                            <option value="discount-allowed">Discount Allowed</option>
                            {accounts.map((acc: any) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Quantity */}
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full h-7 px-1.5 border border-[#CBD5E1] rounded-[4px] text-right text-xs font-semibold text-[#2B2F36] focus:border-[#408DFB] outline-none tabular-nums"
                          />
                        </td>

                        {/* Rate */}
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full h-7 px-1.5 border border-[#CBD5E1] rounded-[4px] text-right text-xs text-[#2B2F36] focus:border-[#408DFB] outline-none tabular-nums"
                          />
                        </td>

                        {/* Discount */}
                        <td className="px-3 py-2 text-right">
                          <div className="flex h-7 rounded-[4px] border border-[#CBD5E1] overflow-hidden">
                            <input
                              type="number"
                              step="0.01"
                              value={item.discount || ''}
                              onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full px-1 text-right text-xs text-[#2B2F36] outline-none tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleItemChange(index, 'discountType', item.discountType === '%' ? '₹' : '%')
                              }
                              className="px-1.5 bg-[#F8F9FA] text-[#6B7280] text-[10px] font-semibold border-l border-[#CBD5E1] cursor-pointer"
                            >
                              {item.discountType}
                            </button>
                          </div>
                        </td>

                        {/* Tax */}
                        <td className="px-3 py-2">
                          <select
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full h-7 px-1 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] outline-none"
                          >
                            {GST_RATES.map((t) => (
                              <option key={t.id} value={t.rate}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Amount */}
                        <td className="px-3 py-2 text-right font-medium text-[#2B2F36] tabular-nums">
                          {item.taxable.toFixed(2)}
                        </td>

                        {/* Delete Row */}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            title="Remove Row"
                            className="text-[#9CA3AF] hover:text-[#E54B4B] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="h-7 px-3 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] text-[#2B2F36] rounded-[4px] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#408DFB]" />
                  <span>Add New Row</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="h-7 px-3 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] text-[#2B2F36] rounded-[4px] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#408DFB]" />
                  <span>Add Items in Bulk</span>
                </button>
              </div>
            </div>

            {/* 4. Totals Area (Right Aligned matching Zoho) */}
            <div className="flex justify-end pt-4">
              <div className="w-[380px] space-y-3 text-xs">
                {/* Sub Total */}
                <div className="flex justify-between items-center text-[#2B2F36]">
                  <span className="font-semibold text-xs">Sub Total</span>
                  <span className="font-semibold text-xs tabular-nums">{subTotal.toFixed(2)}</span>
                </div>

                {/* Tax Breakdown */}
                {totalTax > 0 && (
                  <div className="flex justify-between items-center text-[#6B7280]">
                    <span>GST (Tax Total)</span>
                    <span className="tabular-nums">+{totalTax.toFixed(2)}</span>
                  </div>
                )}

                {/* TDS / TCS Section */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E5E7EB]">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="tdsTcsChoice"
                        checked={tdsTcsType === 'TDS'}
                        onChange={() => setTdsTcsType('TDS')}
                        className="text-[#408DFB] focus:ring-0"
                      />
                      <span>TDS</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="tdsTcsChoice"
                        checked={tdsTcsType === 'TCS'}
                        onChange={() => setTdsTcsType('TCS')}
                        className="text-[#408DFB] focus:ring-0"
                      />
                      <span>TCS</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={tdsTcsTaxId}
                      onChange={(e) => setTdsTcsTaxId(e.target.value)}
                      className="h-7 px-2 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] bg-white focus:border-[#408DFB] outline-none max-w-[140px]"
                    >
                      {(tdsTcsType === 'TDS' ? TDS_RATES : TCS_RATES).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <span className="w-16 text-right tabular-nums text-[#6B7280]">
                      {tdsTcsAmount > 0 ? (tdsTcsType === 'TDS' ? `-${tdsTcsAmount.toFixed(2)}` : `+${tdsTcsAmount.toFixed(2)}`) : '- 0.00'}
                    </span>
                  </div>
                </div>

                {/* Adjustment */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-1 bg-[#F8F9FA] border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36]">
                      Adjustment
                    </span>
                    <HelpCircle className="w-3 h-3 text-[#9CA3AF]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={adjustment || ''}
                      onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-24 h-7 px-2 border border-[#CBD5E1] rounded-[4px] text-right text-xs text-[#2B2F36] focus:border-[#408DFB] outline-none tabular-nums"
                    />
                    <span className="w-16 text-right tabular-nums text-[#6B7280]">
                      {adjustment ? Number(adjustment).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB]">
                  <span className="text-sm font-bold text-[#1E2540]">Total ( ₹ )</span>
                  <span className="text-base font-bold text-[#1E2540] tabular-nums">
                    {grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Lower Sections: Customer Notes & Terms */}
            <div className="pt-6 space-y-4 border-t border-[#E5E7EB]">
              <div>
                <label className="block text-xs font-normal text-[#2B2F36] mb-1">
                  Customer Notes
                </label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={2}
                  className="w-full max-w-[500px] px-3 py-2 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none resize-none"
                />
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  Will be displayed on the credit note
                </p>
              </div>

              <div>
                <label className="block text-xs font-normal text-[#2B2F36] mb-1">
                  Terms &amp; Conditions
                </label>
                <textarea
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.target.value)}
                  rows={3}
                  placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                  className="w-full max-w-[500px] px-3 py-2 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] focus:border-[#408DFB] focus:outline-none resize-none"
                />
              </div>

              <p className="text-[11px] text-[#6B7280] pt-2">
                Additional Fields: Start adding custom fields for your credit notes by going to <span className="italic">Settings &gt; Sales &gt; Credit Notes</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Fixed Workspace Bottom Action Bar */}
      <div className="border-t border-[#E5E7EB] bg-white px-8 py-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('DRAFT')}
            className="h-8 px-4 bg-white border border-[#CBD5E1] text-[#2B2F36] hover:bg-[#F8F9FA] rounded-[4px] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-none"
          >
            Save as Draft
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('SENT')}
            className="h-8 px-4 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-none"
          >
            {isSubmitting ? 'Saving...' : 'Save as Open'}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => navigate('/credit-notes')}
            className="h-8 px-4 bg-white border border-[#CBD5E1] text-[#2B2F36] hover:bg-[#F8F9FA] rounded-[4px] text-xs font-medium cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
          <span>PDF Template: &apos;Spreadsheet Template&apos;</span>
          <button type="button" className="text-[#408DFB] hover:underline cursor-pointer font-medium">
            Change
          </button>
        </div>
      </div>

      {/* Bulk Add Products Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-[#E5E7EB] overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#1E2540]">Add Items in Bulk</h3>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-[#9CA3AF] hover:text-[#2B2F36]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-[#E5E7EB]">
              <input
                type="text"
                value={bulkSearch}
                onChange={(e) => setBulkSearch(e.target.value)}
                placeholder="Search items by name or SKU..."
                className="w-full h-8 px-3 border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {products
                .filter(
                  (p: any) =>
                    !bulkSearch ||
                    p.name?.toLowerCase().includes(bulkSearch.toLowerCase()) ||
                    p.sku?.toLowerCase().includes(bulkSearch.toLowerCase())
                )
                .map((prod: any) => {
                  const isChecked = selectedBulkIds.includes(prod.id);
                  return (
                    <label
                      key={prod.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-[#F8F9FB] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedBulkIds((prev) =>
                            isChecked ? prev.filter((id) => id !== prod.id) : [...prev, prod.id]
                          );
                        }}
                        className="rounded border-[#CBD5E1] text-[#408DFB] focus:ring-0"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-xs text-[#2B2F36]">{prod.name}</p>
                        <p className="text-[11px] text-[#6B7280]">
                          Rate: ₹{Number(prod.sellingPrice || prod.price || 0).toFixed(2)} | GST: {prod.taxRate || prod.gstRate || 0}%
                        </p>
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="px-6 py-3 border-t border-[#E5E7EB] bg-[#F8F9FB] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="h-8 px-4 border border-[#CBD5E1] text-[#2B2F36] rounded-[4px] text-xs font-medium hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAdd}
                className="h-8 px-4 bg-[#408DFB] hover:bg-[#2563EB] text-white rounded-[4px] text-xs font-semibold"
              >
                Add Selected ({selectedBulkIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
