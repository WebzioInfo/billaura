import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud,
  FileText,
  Search,
  Check,
  Building2,
  Trash2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ArrowLeft,
  X,
  Info,
  Car,
  Receipt,
  Tag,
} from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/lib/utils';
import { INDIAN_STATES, GST_TREATMENTS } from '@/features/vendors/VendorForm';
import { ZohoModal } from '@/shared/components/zoho/ZohoModal';

export const TAX_RATES = [
  { id: '', name: 'Select a Tax', rate: 0, type: 'NONE' },
  { id: 'GST0', name: '[GST0] GST 0% (0%)', rate: 0, type: 'GST' },
  { id: 'GST5', name: '[GST5] GST 5% (5%)', rate: 5, type: 'GST' },
  { id: 'GST12', name: '[GST12] GST 12% (12%)', rate: 12, type: 'GST' },
  { id: 'GST18', name: '[GST18] GST 18% (18%)', rate: 18, type: 'GST' },
  { id: 'GST28', name: '[GST28] GST 28% (28%)', rate: 28, type: 'GST' },
];

export const ExpenseForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company } = useAuth();
  const [searchParams] = useSearchParams();

  // Tab state: Record Expense or Record Mileage
  const [activeTab, setActiveTab] = useState<'expense' | 'mileage'>('expense');

  // Form states
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('INR');
  const [paidThroughId, setPaidThroughId] = useState<string>('');
  const [expenseType, setExpenseType] = useState<'GOODS' | 'SERVICES'>('SERVICES');
  const [hsnSac, setHsnSac] = useState<string>('');
  const [vendorId, setVendorId] = useState<string>('');
  const [vendorGstin, setVendorGstin] = useState<string>('');
  const [gstTreatment, setGstTreatment] = useState<string>('Registered Business - Regular');
  const [sourceOfSupply, setSourceOfSupply] = useState<string>('');
  const [destinationOfSupply, setDestinationOfSupply] = useState<string>('');
  const [reverseCharge, setReverseCharge] = useState<boolean>(false);
  const [selectedTaxId, setSelectedTaxId] = useState<string>('GST18');
  const [amountIs, setAmountIs] = useState<'TAX_EXCLUSIVE' | 'TAX_INCLUSIVE'>('TAX_EXCLUSIVE');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [isBillable, setIsBillable] = useState<boolean>(false);
  const [reportingTags, setReportingTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [showTagInput, setShowTagInput] = useState<boolean>(false);

  // Search modals state
  const [isVendorSearchOpen, setIsVendorSearchOpen] = useState<boolean>(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState<string>('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState<boolean>(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>('');

  // File upload states
  const [uploadedReceipts, setUploadedReceipts] = useState<
    Array<{ url: string; name: string; size?: number; type?: string }>
  >([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form dirty tracker
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Queries
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await apiClient.get('/accounts');
      return res.data?.data || res.data || [];
    },
  });
  const allAccounts = Array.isArray(accountsData) ? accountsData : [];

  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/expenses/categories');
      return ensureArray(res);
    },
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await apiClient.get('/bank-accounts');
      return ensureArray(res);
    },
  });
  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : [];

  const {
    data: vendorsData,
    isLoading: isLoadingVendors,
    isError: isVendorsError,
    refetch: refetchVendors,
  } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/vendors');
        return ensureArray(res);
      } catch (err: any) {
        notification.error('Failed to load vendors: ' + (err?.response?.data?.message || err?.message || 'Network error'));
        throw err;
      }
    },
    staleTime: 60 * 1000,
  });
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];

  const {
    data: customersData,
    isLoading: isLoadingCustomers,
    isError: isCustomersError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/customers');
        return ensureArray(res);
      } catch (err: any) {
        notification.error('Failed to load customers: ' + (err?.response?.data?.message || err?.message || 'Network error'));
        throw err;
      }
    },
    staleTime: 60 * 1000,
  });
  const customers = Array.isArray(customersData) ? customersData : [];

  // Filtered lists for search modals
  const filteredVendors = useMemo(() => {
    if (!vendorSearchTerm.trim()) return vendors;
    const q = vendorSearchTerm.toLowerCase();
    return vendors.filter((v: any) => {
      const name = (v.name || '').toLowerCase();
      const company = (v.companyName || v.tradeName || '').toLowerCase();
      const gstin = (v.gstin || v.gstNumber || '').toLowerCase();
      const phone = (v.phone || v.mobile || '').toLowerCase();
      const email = (v.email || '').toLowerCase();
      return name.includes(q) || company.includes(q) || gstin.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [vendors, vendorSearchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return customers;
    const q = customerSearchTerm.toLowerCase();
    return customers.filter((c: any) => {
      const name = (c.name || '').toLowerCase();
      const company = (c.companyName || c.tradeName || '').toLowerCase();
      const gstin = (c.gstin || c.gstNumber || '').toLowerCase();
      const phone = (c.phone || c.mobile || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return name.includes(q) || company.includes(q) || gstin.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [customers, customerSearchTerm]);

  // Filter accounts for Expense Account and Paid Through
  const expenseAccounts = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((cat: any) => ({
        id: cat.accountId || cat.id,
        categoryId: cat.id,
        name: cat.name,
        code: cat.account?.code || '',
      }));
    }
    return allAccounts
      .filter((a: any) => a.category === 'EXPENSE' || a.accountType === 'EXPENSE' || a.name?.toLowerCase().includes('expense'))
      .map((a: any) => ({ id: a.id, name: a.name, code: a.code || '' }));
  }, [categories, allAccounts]);

  const paidThroughAccounts = useMemo(() => {
    const list: Array<{ id: string; name: string; group: string }> = [];

    // Bank accounts
    bankAccounts.forEach((b: any) => {
      list.push({ id: b.id, name: `${b.name || b.bankName} (${b.accountNumber || 'Bank'})`, group: 'Bank Accounts' });
    });

    // Cash and asset accounts from Chart of Accounts
    allAccounts
      .filter((a: any) => a.category === 'ASSET' && (a.name?.toLowerCase().includes('cash') || a.name?.toLowerCase().includes('bank') || a.name?.toLowerCase().includes('petty')))
      .forEach((a: any) => {
        if (!list.some((existing) => existing.id === a.id)) {
          list.push({ id: a.id, name: `${a.name} ${a.code ? `(${a.code})` : ''}`, group: 'Cash & Asset Accounts' });
        }
      });

    return list;
  }, [bankAccounts, allAccounts]);

  // Set default Destination of Supply based on company state
  useEffect(() => {
    if (!destinationOfSupply && company?.state) {
      const matched = INDIAN_STATES.find(
        (s) => s.name.toLowerCase() === company.state?.toLowerCase() || s.code === company.state
      );
      if (matched) {
        setDestinationOfSupply(`[${matched.code}] - ${matched.name}`);
        if (!sourceOfSupply) setSourceOfSupply(`[${matched.code}] - ${matched.name}`);
      } else {
        setDestinationOfSupply(company.state);
        if (!sourceOfSupply) setSourceOfSupply(company.state);
      }
    } else if (!destinationOfSupply) {
      const kl = INDIAN_STATES.find((s) => s.name === 'Kerala');
      if (kl) {
        setDestinationOfSupply(`[${kl.code}] - ${kl.name}`);
        if (!sourceOfSupply) setSourceOfSupply(`[${kl.code}] - ${kl.name}`);
      }
    }
  }, [company, destinationOfSupply, sourceOfSupply]);

  // Set default Paid Through and Expense Account if empty
  useEffect(() => {
    if (!paidThroughId && paidThroughAccounts.length > 0) {
      setPaidThroughId(paidThroughAccounts[0].id);
    }
  }, [paidThroughAccounts, paidThroughId]);

  useEffect(() => {
    if (!accountId && expenseAccounts.length > 0) {
      setAccountId(expenseAccounts[0].id);
    }
  }, [expenseAccounts, accountId]);

  // Fetch expense if editing
  const { data: existingExpense, isLoading: isLoadingExpense } = useQuery({
    queryKey: ['expense-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get(`/expenses/${id}`);
      return res.data?.data || res.data;
    },
    enabled: isEditMode,
  });

  // Populate existing expense data when editing
  useEffect(() => {
    if (existingExpense) {
      setDate(existingExpense.date ? new Date(existingExpense.date).toISOString().split('T')[0] : '');
      setAccountId(existingExpense.categoryId || existingExpense.category?.accountId || '');
      setAmount(existingExpense.amount ? String(existingExpense.amount) : '');
      setPaidThroughId(existingExpense.bankAccountId || existingExpense.cashAccountId || '');
      setExpenseType(existingExpense.expenseType === 'GOODS' ? 'GOODS' : 'SERVICES');
      setHsnSac(existingExpense.hsnSac || existingExpense.sacCode || existingExpense.hsnCode || '');
      setVendorId(existingExpense.vendorId || '');
      setVendorGstin(existingExpense.vendorGstin || existingExpense.vendor?.gstin || '');
      setGstTreatment(existingExpense.gstTreatment || 'Registered Business - Regular');
      if (existingExpense.sourceOfSupply) setSourceOfSupply(existingExpense.sourceOfSupply);
      if (existingExpense.destinationOfSupply) setDestinationOfSupply(existingExpense.destinationOfSupply);
      setReverseCharge(Boolean(existingExpense.reverseCharge));

      const matchedTax = TAX_RATES.find((t) => Number(t.rate) === Number(existingExpense.gstRate));
      if (matchedTax) setSelectedTaxId(matchedTax.id);

      setAmountIs(existingExpense.amountIs === 'TAX_INCLUSIVE' ? 'TAX_INCLUSIVE' : 'TAX_EXCLUSIVE');
      setInvoiceNumber(existingExpense.billNumber || existingExpense.invoiceNumber || '');
      setNotes(existingExpense.notes || '');
      setCustomerId(existingExpense.customerId || '');
      setIsBillable(Boolean(existingExpense.isBillable));
      if (Array.isArray(existingExpense.reportingTags)) {
        setReportingTags(existingExpense.reportingTags);
      }
      if (Array.isArray(existingExpense.receiptUrls)) {
        setUploadedReceipts(
          existingExpense.receiptUrls.map((url: string) => ({
            url,
            name: url.split('/').pop() || 'Receipt',
          }))
        );
      } else if (Array.isArray(existingExpense.attachments)) {
        setUploadedReceipts(
          existingExpense.attachments.map((a: any) => ({
            url: a.fileUrl,
            name: a.fileName || 'Receipt',
          }))
        );
      }
    }
  }, [existingExpense]);

  // Dynamic GST Treatment Handler
  const handleGstTreatmentChange = (newTreatment: string, currentGstin?: string) => {
    setGstTreatment(newTreatment);
    markDirty();

    if (newTreatment === 'Registered Business - Composition') {
      setSelectedTaxId('GST0');
      setReverseCharge(false);
    } else if (newTreatment === 'Unregistered Business') {
      if (!reverseCharge) {
        setSelectedTaxId('GST0');
      }
      if (!currentGstin && !vendorId) setVendorGstin('');
    } else if (newTreatment === 'Consumer') {
      setReverseCharge(false);
      if (!currentGstin && !vendorId) setVendorGstin('');
    } else if (newTreatment === 'Overseas') {
      setSourceOfSupply('[OVERSEAS] - Outside India / Import');
      if (!currentGstin && !vendorId) setVendorGstin('');
      if (!reverseCharge) {
        setSelectedTaxId('GST0');
      }
    } else if (newTreatment === 'Special Economic Zone (SEZ)' || newTreatment === 'Deemed Export') {
      if (!selectedTaxId || selectedTaxId === 'GST0') {
        setSelectedTaxId('GST18');
      }
    } else if (newTreatment === 'Registered Business - Regular') {
      if (!selectedTaxId || selectedTaxId === 'GST0') {
        setSelectedTaxId('GST18');
      }
    }
  };

  // Handle vendor selection auto-population
  const handleVendorChange = (vId: string) => {
    setVendorId(vId);
    markDirty();
    if (!vId) {
      setVendorGstin('');
      return;
    }

    const selectedVendor = vendors.find((v: any) => v.id === vId);
    if (selectedVendor) {
      const gstinVal = selectedVendor.gstin || selectedVendor.gstNumber || '';
      setVendorGstin(gstinVal);
      if (selectedVendor.gstTreatment) {
        handleGstTreatmentChange(selectedVendor.gstTreatment, gstinVal);
      }
      if (selectedVendor.placeOfSupply || selectedVendor.state) {
        const stateName = selectedVendor.placeOfSupply || selectedVendor.state;
        const matched = INDIAN_STATES.find(
          (s) => s.name.toLowerCase() === stateName.toLowerCase() || s.code === stateName
        );
        if (matched) {
          setSourceOfSupply(`[${matched.code}] - ${matched.name}`);
        } else {
          setSourceOfSupply(stateName);
        }
      } else if (gstinVal && gstinVal.length >= 2) {
        const stateCode = gstinVal.slice(0, 2);
        const matched = INDIAN_STATES.find((s) => s.code === stateCode);
        if (matched) {
          setSourceOfSupply(`[${matched.code}] - ${matched.name}`);
        }
      }
    }
  };

  const handleReverseChargeToggle = (checked: boolean) => {
    setReverseCharge(checked);
    markDirty();
    if (checked && (!selectedTaxId || selectedTaxId === 'GST0')) {
      setSelectedTaxId('GST18');
    }
  };

  // Dynamic GST calculation
  const calculations = useMemo(() => {
    const rawAmount = parseFloat(amount) || 0;
    const taxOption = TAX_RATES.find((t) => t.id === selectedTaxId) || TAX_RATES[0];
    let rate = taxOption.rate || 0;

    // Composition vendor cannot charge tax
    if (gstTreatment === 'Registered Business - Composition') {
      rate = 0;
    }

    // Unregistered or overseas cannot charge normal GST without Reverse Charge
    if ((gstTreatment === 'Unregistered Business' || gstTreatment === 'Overseas') && !reverseCharge) {
      rate = 0;
    }

    const isInterState =
      gstTreatment === 'Special Economic Zone (SEZ)' ||
      gstTreatment === 'Deemed Export' ||
      gstTreatment === 'Overseas' ||
      Boolean(sourceOfSupply && destinationOfSupply && sourceOfSupply.trim() !== destinationOfSupply.trim());

    let taxableBase = 0;
    let totalTax = 0;
    let finalTotal = 0;

    if (rate > 0) {
      if (amountIs === 'TAX_INCLUSIVE') {
        finalTotal = Math.round(rawAmount * 100) / 100;
        totalTax = Math.round((rawAmount * rate / (100 + rate)) * 100) / 100;
        taxableBase = Math.round((finalTotal - totalTax) * 100) / 100;
      } else {
        taxableBase = Math.round(rawAmount * 100) / 100;
        totalTax = Math.round((taxableBase * rate / 100) * 100) / 100;
        finalTotal = Math.round((taxableBase + totalTax) * 100) / 100;
      }
    } else {
      taxableBase = Math.round(rawAmount * 100) / 100;
      totalTax = 0;
      finalTotal = taxableBase;
    }

    const cgst = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
    const sgst = isInterState ? 0 : Math.round((totalTax - cgst) * 100) / 100;
    const igst = isInterState ? totalTax : 0;

    const vendorPayout = reverseCharge && rate > 0 ? taxableBase : finalTotal;

    return {
      taxableBase,
      totalTax,
      finalTotal,
      vendorPayout,
      isInterState,
      rate,
      cgst,
      sgst,
      igst,
    };
  }, [amount, selectedTaxId, amountIs, sourceOfSupply, destinationOfSupply, gstTreatment, reverseCharge]);

  // File Upload Handlers
  const handleFileUpload = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        notification.error(`File "${file.name}" exceeds the maximum limit of 10MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    markDirty();

    try {
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.post('/purchases/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const attachment = res.data?.data || res.data;
        if (attachment?.secureUrl) {
          setUploadedReceipts((prev) => [
            ...prev,
            {
              url: attachment.secureUrl,
              name: file.name,
              size: file.size,
              type: file.type,
            },
          ]);
          notification.success(`"${file.name}" uploaded successfully`);
        }
      }
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to upload receipt. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveReceipt = (index: number) => {
    setUploadedReceipts((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Add / remove tags
  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !reportingTags.includes(trimmed)) {
      setReportingTags([...reportingTags, trimmed]);
      setNewTagInput('');
      markDirty();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setReportingTags(reportingTags.filter((t) => t !== tagToRemove));
    markDirty();
  };

  // Form Reset for "Save and New"
  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setHsnSac('');
    setVendorId('');
    setVendorGstin('');
    setGstTreatment('Registered Business - Regular');
    setReverseCharge(false);
    setSelectedTaxId('GST18');
    setAmountIs('TAX_EXCLUSIVE');
    setCustomerId('');
    setIsBillable(false);
    setReportingTags([]);
    setInvoiceNumber('');
    setNotes('');
    setUploadedReceipts([]);
    setIsDirty(false);
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async ({ payload }: { payload: any; isSaveAndNew: boolean }) => {
      if (isEditMode) {
        return apiClient.put(`/expenses/${id}`, payload);
      }
      return apiClient.post('/expenses', payload);
    },
    onSuccess: (res, variables: { payload: any; isSaveAndNew: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      notification.success(isEditMode ? 'Expense updated successfully' : 'Expense recorded successfully');

      if (variables.isSaveAndNew) {
        resetForm();
      } else {
        navigate('/expenses');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      const formatted = Array.isArray(msg) ? msg.join(', ') : msg;
      notification.error(formatted || 'Failed to save expense. Please check all required fields.');
    },
  });

  const handleSubmit = (isSaveAndNew = false) => {
    if (!date) {
      notification.error('Please enter an expense date');
      return;
    }
    if (!accountId) {
      notification.error('Please select an Expense Account');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      notification.error('Please enter a valid expense Amount greater than zero');
      return;
    }
    if (!paidThroughId) {
      notification.error('Please select a Paid Through account');
      return;
    }

    const payload = {
      date,
      accountId,
      amount: numAmount,
      taxAmount: calculations.totalTax,
      totalAmount: calculations.finalTotal,
      paidThroughAccountId: paidThroughId,
      expenseType,
      hsnSac: hsnSac.trim() || undefined,
      vendorId: vendorId || undefined,
      vendorGstin: vendorGstin.trim() || undefined,
      gstTreatment,
      sourceOfSupply: sourceOfSupply || undefined,
      destinationOfSupply: destinationOfSupply || undefined,
      reverseCharge,
      taxId: selectedTaxId || undefined,
      gstRate: calculations.rate,
      taxApplicable: calculations.rate > 0,
      taxType: calculations.rate > 0 ? (calculations.isInterState ? 'IGST' : 'GST') : undefined,
      taxMode: amountIs,
      taxableAmount: calculations.taxableBase,
      cgstAmount: calculations.cgst,
      sgstAmount: calculations.sgst,
      igstAmount: calculations.igst,
      invoiceNumber: invoiceNumber.trim() || undefined,
      billNumber: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      customerId: customerId || undefined,
      customerName: customers.find((c: any) => c.id === customerId)?.name || undefined,
      isBillable,
      reportingTags,
      receiptUrls: uploadedReceipts.map((r) => r.url),
      autoApprove: true,
      approvalStatus: 'APPROVED',
    };

    saveMutation.mutate({ payload, isSaveAndNew });
  };

  // Cancel Handler
  const handleCancel = () => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmLeave) return;
    }
    navigate('/expenses');
  };

  // Keyboard shortcut listener (Alt+S, Alt+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSubmit(false);
      } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleSubmit(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    date,
    accountId,
    amount,
    paidThroughId,
    expenseType,
    hsnSac,
    vendorId,
    gstTreatment,
    sourceOfSupply,
    destinationOfSupply,
    reverseCharge,
    selectedTaxId,
    amountIs,
    invoiceNumber,
    notes,
    customerId,
    isBillable,
    reportingTags,
    uploadedReceipts,
    calculations,
  ]);

  if (isLoadingExpense) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-white overflow-hidden font-sans text-xs text-[#2B2F36]">
      {/* 1. Header with Zoho Tabs (Pinned at top, shrink-0) */}
      <div className="shrink-0 border-b border-[#E2E8F0] bg-white px-8 pt-3 pb-0 flex items-center justify-between z-10">
        <div className="flex gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={cn(
              'pb-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer',
              activeTab === 'expense'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {isEditMode ? 'Edit Expense' : 'Record Expense'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mileage')}
            className={cn(
              'pb-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer',
              activeTab === 'mileage'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            <Car className="w-4 h-4" />
            Record Mileage
          </button>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 pb-2.5 p-1 rounded transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Body Content (Single primary vertical scroll area) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full bg-white">
        {activeTab === 'mileage' ? (
          <div className="max-w-[700px] mx-auto mt-12 bg-white rounded-lg border border-dashed border-gray-300 p-10 text-center shadow-xs">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Car className="w-8 h-8" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Mileage Tracking Mode</h2>
            <p className="text-xs text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
              Mileage tracking requires vehicle reimbursement rate preferences and odometer tracking units. This
              workflow is currently scheduled for the upcoming compliance integration release.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('expense')}
              className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-[4px] text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              Return to Record Expense
            </button>
          </div>
        ) : (
          /* Main Zoho Books Expense Form layout */
          <div className="w-full px-8 py-5 pb-28">
            <div className="flex flex-col lg:flex-row items-start gap-12">
              {/* Left Form Column (Compact, Left-aligned, matching Zoho Books) */}
              <div className="w-full max-w-[580px] space-y-3.5">
                {/* 1. Date */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-xs text-[#DC2626] font-medium">
                    Date<span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="w-full max-w-[360px]">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        markDirty();
                      }}
                      className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>
                </div>

                {/* 2. Expense Account */}
                <div className="grid grid-cols-[160px_1fr] items-start gap-3">
                  <label className="text-xs text-[#DC2626] font-medium pt-1.5">
                    Expense Account<span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="w-full max-w-[360px]">
                    <select
                      value={accountId}
                      onChange={(e) => {
                        setAccountId(e.target.value);
                        markDirty();
                      }}
                      className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    >
                      <option value="">Select an account</option>
                      {expenseAccounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} {acc.code ? `(${acc.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        notification.info('Single-account expense record mode. Multi-line split is active.');
                      }}
                      className="mt-1 text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-normal cursor-pointer"
                    >
                      <span className="text-xs">⇄</span> Itemize
                    </button>
                  </div>
                </div>

                {/* 3. Amount */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-xs text-[#DC2626] font-medium">
                    Amount<span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="flex w-full max-w-[360px]">
                    <span className="inline-flex items-center px-2.5 border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-xs rounded-l-[4px] font-medium select-none">
                      INR ▾
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        markDirty();
                      }}
                      className="flex-1 h-8 px-2.5 text-xs border border-gray-300 rounded-r-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB] font-mono"
                    />
                  </div>
                </div>

                {/* 4. Paid Through */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-xs text-[#DC2626] font-medium">
                    Paid Through<span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="w-full max-w-[360px]">
                    <select
                      value={paidThroughId}
                      onChange={(e) => {
                        setPaidThroughId(e.target.value);
                        markDirty();
                      }}
                      className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    >
                      <option value="">Select an account</option>
                      {paidThroughAccounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Expense Type */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-xs text-[#DC2626] font-medium">
                    Expense Type<span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="flex items-center gap-6 text-xs text-[#2B2F36]">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="expenseType"
                        checked={expenseType === 'GOODS'}
                        onChange={() => {
                          setExpenseType('GOODS');
                          markDirty();
                        }}
                        className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Goods</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="expenseType"
                        checked={expenseType === 'SERVICES'}
                        onChange={() => {
                          setExpenseType('SERVICES');
                          markDirty();
                        }}
                        className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Services</span>
                    </label>
                  </div>
                </div>

                {/* 6. SAC / HSN */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-xs text-gray-700 font-medium">
                    {expenseType === 'SERVICES' ? 'SAC:' : 'HSN:'}
                  </label>
                  <div className="w-full max-w-[360px]">
                    <input
                      type="text"
                      placeholder={expenseType === 'SERVICES' ? 'e.g. 998311' : 'e.g. 8471'}
                      value={hsnSac}
                      onChange={(e) => {
                        setHsnSac(e.target.value);
                        markDirty();
                      }}
                      className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB] uppercase"
                    />
                  </div>
                </div>

                {/* 7. Vendor */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-xs text-gray-700 font-medium">Vendor</label>
                  <div className="flex w-full max-w-[360px] gap-1">
                    <select
                      value={vendorId}
                      onChange={(e) => handleVendorChange(e.target.value)}
                      disabled={isLoadingVendors}
                      className="flex-1 h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB] disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer"
                    >
                      <option value="">
                        {isLoadingVendors
                          ? 'Loading vendors...'
                          : isVendorsError
                          ? 'Failed to load vendors (click retry)'
                          : 'Select or search a vendor'}
                      </option>
                      {vendors.map((v: any) => {
                        const displayName = v.name || v.companyName || 'Unnamed Vendor';
                        const extra = [
                          v.companyName && v.companyName !== v.name ? v.companyName : null,
                          v.gstin || v.gstNumber,
                        ]
                          .filter(Boolean)
                          .join(' - ');
                        return (
                          <option key={v.id} value={v.id}>
                            {displayName} {extra ? `(${extra})` : ''}
                          </option>
                        );
                      })}
                      {!isLoadingVendors && !isVendorsError && vendors.length === 0 && (
                        <option disabled value="">
                          No vendors found
                        </option>
                      )}
                    </select>
                    <button
                      type="button"
                      title="Search & select vendor"
                      onClick={() => {
                        setVendorSearchTerm('');
                        setIsVendorSearchOpen(true);
                      }}
                      className="h-8 w-8 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 8. GST Treatment */}
                <div className="grid grid-cols-[160px_1fr] items-start gap-3">
                  <label className="text-xs text-[#DC2626] font-medium pt-1.5">
                    GST Treatment<span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="w-full max-w-[360px] space-y-1.5">
                    <select
                      value={gstTreatment}
                      onChange={(e) => handleGstTreatmentChange(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    >
                      {GST_TREATMENTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    {/* Dynamic Zoho contextual hints */}
                    {gstTreatment === 'Registered Business - Composition' && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 leading-tight">
                        <strong>Composition Scheme:</strong> Supplier cannot charge GST or issue a tax invoice. Tax rate is locked to 0%.
                      </div>
                    )}
                    {gstTreatment === 'Unregistered Business' && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800 leading-tight">
                        <strong>Unregistered Supplier:</strong> No GST charged by vendor. Enable <em>Reverse Charge</em> below if recipient is liable to pay tax under RCM.
                      </div>
                    )}
                    {gstTreatment === 'Overseas' && (
                      <div className="p-2 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-800 leading-tight">
                        <strong>Overseas Import:</strong> Domestic GST is not billed. Enable <em>Reverse Charge</em> below if import of service/goods is subject to IGST under RCM.
                      </div>
                    )}
                    {gstTreatment === 'Special Economic Zone (SEZ)' && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-800 leading-tight">
                        <strong>SEZ Supply:</strong> Governed by Inter-State supply rules. Tax is applied as IGST.
                      </div>
                    )}
                    {gstTreatment === 'Consumer' && (
                      <div className="p-2 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-600 leading-tight">
                        <strong>Consumer:</strong> B2C expense. Registration details are not required.
                      </div>
                    )}
                  </div>
                </div>

                {/* 8b. Vendor GSTIN (Conditional for registered treatments) */}
                {(gstTreatment === 'Registered Business - Regular' ||
                  gstTreatment === 'Registered Business - Composition' ||
                  gstTreatment === 'Special Economic Zone (SEZ)' ||
                  gstTreatment === 'Deemed Export') && (
                  <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                    <label className="text-xs text-gray-700 font-medium">
                      Vendor GSTIN
                      {gstTreatment === 'Registered Business - Regular' && (
                        <span className="text-[#DC2626]">*</span>
                      )}
                    </label>
                    <div className="w-full max-w-[360px]">
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="e.g. 27AAPFU0939F1ZV"
                        value={vendorGstin}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().trim();
                          setVendorGstin(val);
                          markDirty();
                          if (val.length >= 2) {
                            const code = val.slice(0, 2);
                            const matched = INDIAN_STATES.find((s) => s.code === code);
                            if (matched && (!sourceOfSupply || sourceOfSupply.startsWith('['))) {
                              setSourceOfSupply(`[${matched.code}] - ${matched.name}`);
                            }
                          }
                        }}
                        className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB] uppercase font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 9. Source of Supply */}
                {gstTreatment !== 'Consumer' && (
                  <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                    <label className="text-xs text-[#DC2626] font-medium">
                      Source of Supply<span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="w-full max-w-[360px]">
                      {gstTreatment === 'Overseas' ? (
                        <select
                          value={sourceOfSupply}
                          onChange={(e) => {
                            setSourceOfSupply(e.target.value);
                            markDirty();
                          }}
                          className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                        >
                          <option value="[OVERSEAS] - Outside India / Import">
                            [OVERSEAS] - Outside India / Import
                          </option>
                          <option value="[USA] - United States">United States</option>
                          <option value="[UK] - United Kingdom">United Kingdom</option>
                          <option value="[UAE] - United Arab Emirates">United Arab Emirates</option>
                          <option value="[OTHER] - Other Foreign Country">Other Foreign Country</option>
                        </select>
                      ) : (
                        <select
                          value={sourceOfSupply}
                          onChange={(e) => {
                            setSourceOfSupply(e.target.value);
                            markDirty();
                          }}
                          className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                        >
                          <option value="">State/Province</option>
                          {INDIAN_STATES.map((s) => (
                            <option key={s.code} value={`[${s.code}] - ${s.name}`}>
                              [{s.code}] - {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* 10. Destination of Supply */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-xs text-[#DC2626] font-medium">
                    Destination of Supply<span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="w-full max-w-[360px]">
                    <select
                      value={destinationOfSupply}
                      onChange={(e) => {
                        setDestinationOfSupply(e.target.value);
                        markDirty();
                      }}
                      className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    >
                      <option value="">State/Province</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={`[${s.code}] - ${s.name}`}>
                          [{s.code}] - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 11. Reverse Charge (Hidden for Composition and Consumer) */}
                {gstTreatment !== 'Registered Business - Composition' && gstTreatment !== 'Consumer' && (
                  <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                    <label className="text-xs text-gray-700 font-medium">Reverse Charge</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="reverseCharge"
                        checked={reverseCharge}
                        onChange={(e) => handleReverseChargeToggle(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <label htmlFor="reverseCharge" className="text-xs text-gray-700 cursor-pointer select-none">
                        This transaction is applicable for reverse charge
                      </label>
                    </div>
                  </div>
                )}

                {/* 12. Tax */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-xs text-gray-700 font-medium">Tax</label>
                  <div className="w-full max-w-[360px]">
                    {gstTreatment === 'Registered Business - Composition' ? (
                      <div className="w-full h-8 px-2.5 text-xs border border-gray-200 rounded-[4px] bg-gray-50 text-gray-500 flex items-center">
                        GST 0% (Composition Scheme - No Tax Allowed)
                      </div>
                    ) : (gstTreatment === 'Unregistered Business' || gstTreatment === 'Overseas') && !reverseCharge ? (
                      <div className="w-full h-8 px-2.5 text-xs border border-gray-200 rounded-[4px] bg-gray-50 text-gray-500 flex items-center justify-between">
                        <span>GST 0% (No Tax Charged by Supplier)</span>
                        <span className="text-[10px] text-blue-600 font-medium">Enable RCM for Tax</span>
                      </div>
                    ) : (
                      <select
                        value={selectedTaxId}
                        onChange={(e) => {
                          setSelectedTaxId(e.target.value);
                          markDirty();
                        }}
                        className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                      >
                        {TAX_RATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* 13. Amount Is */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-xs text-gray-700 font-medium">Amount Is</label>
                  <div className="flex items-center gap-6 text-xs text-[#2B2F36]">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="amountIs"
                        checked={amountIs === 'TAX_INCLUSIVE'}
                        onChange={() => {
                          setAmountIs('TAX_INCLUSIVE');
                          markDirty();
                        }}
                        className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Tax Inclusive</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="amountIs"
                        checked={amountIs === 'TAX_EXCLUSIVE'}
                        onChange={() => {
                          setAmountIs('TAX_EXCLUSIVE');
                          markDirty();
                        }}
                        className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Tax Exclusive</span>
                    </label>
                  </div>
                </div>

                {/* Dynamic Tax Breakdown */}
                {calculations.rate > 0 && parseFloat(amount) > 0 && (
                  <div className="grid grid-cols-[160px_1fr] items-start gap-3">
                    <div></div>
                    <div className="w-full max-w-[360px] bg-blue-50/60 border border-blue-100 rounded-[4px] p-2.5 text-xs space-y-1">
                      <div className="flex justify-between text-gray-600">
                        <span>Taxable Base:</span>
                        <span className="font-mono font-medium">₹{calculations.taxableBase.toFixed(2)}</span>
                      </div>
                      {calculations.isInterState ? (
                        <div className="flex justify-between text-gray-600">
                          <span>
                            IGST ({calculations.rate}%){reverseCharge ? ' [RCM]' : ''}:
                          </span>
                          <span className="font-mono font-medium">₹{calculations.igst.toFixed(2)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-gray-600">
                            <span>
                              CGST ({(calculations.rate / 2).toFixed(1)}%){reverseCharge ? ' [RCM]' : ''}:
                            </span>
                            <span className="font-mono font-medium">₹{calculations.cgst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>
                              SGST ({(calculations.rate / 2).toFixed(1)}%){reverseCharge ? ' [RCM]' : ''}:
                            </span>
                            <span className="font-mono font-medium">₹{calculations.sgst.toFixed(2)}</span>
                          </div>
                        </>
                      )}

                      {reverseCharge ? (
                        <>
                          <div className="flex justify-between text-amber-700 font-medium pt-1 border-t border-blue-200">
                            <span>RCM Tax (Payable to Govt):</span>
                            <span className="font-mono">₹{calculations.totalTax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-700">
                            <span>Paid to Vendor:</span>
                            <span className="font-mono font-medium">₹{calculations.vendorPayout.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[#1E293B] font-semibold pt-1 border-t border-blue-200">
                            <span>Total Expense Recognized:</span>
                            <span className="font-mono">₹{calculations.finalTotal.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-[#1E293B] font-semibold pt-1 border-t border-blue-200">
                          <span>Total Expense:</span>
                          <span className="font-mono">₹{calculations.finalTotal.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 14. Invoice Number */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                  <label className="text-xs text-gray-700 font-medium">Invoice#</label>
                  <div className="w-full max-w-[360px]">
                    <input
                      type="text"
                      placeholder="e.g. INV-9821"
                      value={invoiceNumber}
                      onChange={(e) => {
                        setInvoiceNumber(e.target.value);
                        markDirty();
                      }}
                      className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB] font-mono"
                    />
                  </div>
                </div>

                {/* 15. Notes */}
                <div className="grid grid-cols-[160px_1fr] items-start gap-3">
                  <label className="text-xs text-gray-700 font-medium pt-1.5">Notes</label>
                  <div className="w-full max-w-[360px]">
                    <textarea
                      rows={3}
                      maxLength={500}
                      placeholder="Max. 500 characters"
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        markDirty();
                      }}
                      className="w-full p-2 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB] resize-none"
                    />
                    <div className="text-[10px] text-gray-400 text-right">{notes.length}/500</div>
                  </div>
                </div>

                {/* 16. Customer Name */}
                <div className="grid grid-cols-[160px_1fr] items-center gap-3 pt-3 border-t border-gray-100">
                  <label className="text-xs text-gray-700 font-medium">Customer Name</label>
                  <div className="flex w-full max-w-[360px] gap-1">
                    <select
                      value={customerId}
                      onChange={(e) => {
                        setCustomerId(e.target.value);
                        markDirty();
                      }}
                      disabled={isLoadingCustomers}
                      className="flex-1 h-8 px-2.5 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB] disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer"
                    >
                      <option value="">
                        {isLoadingCustomers
                          ? 'Loading customers...'
                          : isCustomersError
                          ? 'Failed to load customers (click retry)'
                          : 'Select or add a customer'}
                      </option>
                      {customers.map((c: any) => {
                        const displayName = c.name || c.companyName || 'Unnamed Customer';
                        const extra = [
                          c.companyName && c.companyName !== c.name ? c.companyName : null,
                          c.phone || c.email,
                        ]
                          .filter(Boolean)
                          .join(' - ');
                        return (
                          <option key={c.id} value={c.id}>
                            {displayName} {extra ? `(${extra})` : ''}
                          </option>
                        );
                      })}
                      {!isLoadingCustomers && !isCustomersError && customers.length === 0 && (
                        <option disabled value="">
                          No customers found
                        </option>
                      )}
                    </select>
                    <button
                      type="button"
                      title="Search & select customer"
                      onClick={() => {
                        setCustomerSearchTerm('');
                        setIsCustomerSearchOpen(true);
                      }}
                      className="h-8 w-8 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {customerId && (
                  <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                    <div></div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isBillable"
                        checked={isBillable}
                        onChange={(e) => {
                          setIsBillable(e.target.checked);
                          markDirty();
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <label htmlFor="isBillable" className="text-xs text-gray-700 cursor-pointer select-none">
                        Billable to customer
                      </label>
                    </div>
                  </div>
                )}

                {/* 17. Reporting Tags */}
                <div className="grid grid-cols-[160px_1fr] items-start gap-3 pt-1">
                  <label className="text-xs text-gray-700 font-medium pt-1">Reporting Tags</label>
                  <div className="w-full max-w-[360px]">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {reportingTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[11px]"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {showTagInput ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Tag name..."
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          className="flex-1 h-7 px-2 text-xs border border-gray-300 rounded-[4px] bg-white focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="bg-blue-600 text-white text-xs px-2.5 rounded-[4px] hover:bg-blue-700 cursor-pointer"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTagInput(false)}
                          className="border border-gray-300 text-gray-600 text-xs px-2 rounded-[4px] hover:bg-gray-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowTagInput(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-normal cursor-pointer"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        Associate Tags
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Receipt Upload Panel (Zoho Reference 1) */}
              <div className="w-full lg:w-[280px] shrink-0 pt-0.5">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-5 text-center transition-all bg-white shadow-xs',
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>

                  <h3 className="text-xs font-semibold text-gray-900 mb-0.5">
                    Drag or Drop your Receipts
                  </h3>
                  <p className="text-[11px] text-gray-400 mb-3.5">
                    Maximum file size allowed is 10MB
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files);
                      }
                    }}
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5 text-gray-500" />
                        <span>Upload your Files</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Uploaded Receipts List */}
                {uploadedReceipts.length > 0 && (
                  <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 shadow-xs">
                    <h4 className="text-[11px] font-semibold text-gray-700 mb-2 flex items-center justify-between">
                      <span>Attached Receipts ({uploadedReceipts.length})</span>
                    </h4>
                    <div className="space-y-1.5">
                      {uploadedReceipts.map((receipt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 rounded border border-gray-100 text-xs"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate text-gray-800 text-[11px] font-medium" title={receipt.name}>
                              {receipt.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={receipt.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="View receipt"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveReceipt(idx)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Remove receipt"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Action Bar (Pinned at bottom of container, shrink-0, never covering content or sidebar) */}
      <div className="shrink-0 bg-white border-t border-[#E5E7EB] px-8 py-3 flex items-center gap-3 z-20 shadow-[0_-2px_6px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => handleSubmit(false)}
          className="bg-[#2563EB] hover:bg-blue-700 text-white font-medium px-4 py-1.5 rounded-[4px] text-xs transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          {saveMutation.isPending && !saveMutation.variables?.isSaveAndNew ? (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
          ) : null}
          <span>Save (Alt+S)</span>
        </button>

        {!isEditMode && (
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => handleSubmit(true)}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium px-4 py-1.5 rounded-[4px] text-xs transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {saveMutation.isPending && saveMutation.variables?.isSaveAndNew ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600" />
            ) : null}
            <span>Save and New (Alt+N)</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCancel}
          className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium px-4 py-1.5 rounded-[4px] text-xs transition-colors shadow-xs cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* 4. Vendor Search Modal */}
      <ZohoModal
        isOpen={isVendorSearchOpen}
        onClose={() => {
          setIsVendorSearchOpen(false);
          setVendorSearchTerm('');
        }}
        title="Select Vendor"
        maxWidth="max-w-xl"
        secondaryAction={{
          label: 'Cancel',
          onClick: () => {
            setIsVendorSearchOpen(false);
            setVendorSearchTerm('');
          },
        }}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={vendorSearchTerm}
              onChange={(e) => setVendorSearchTerm(e.target.value)}
              placeholder="Search vendor by name, company, GSTIN, phone, email..."
              className="w-full h-9 pl-9 pr-8 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              autoFocus
            />
            {vendorSearchTerm && (
              <button
                type="button"
                onClick={() => setVendorSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-[4px] divide-y divide-gray-100 max-h-72 overflow-y-auto bg-white">
            {isLoadingVendors ? (
              <div className="p-8 text-center text-gray-500 text-xs">Loading vendors...</div>
            ) : isVendorsError ? (
              <div className="p-8 text-center text-red-600 text-xs">
                Failed to load vendors.{' '}
                <button
                  type="button"
                  onClick={() => refetchVendors()}
                  className="text-blue-600 hover:underline font-medium ml-1 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                {vendorSearchTerm ? `No vendors match "${vendorSearchTerm}"` : 'No vendors found'}
              </div>
            ) : (
              filteredVendors.map((v: any) => {
                const isSelected = v.id === vendorId;
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      handleVendorChange(v.id);
                      setIsVendorSearchOpen(false);
                      setVendorSearchTerm('');
                    }}
                    className={cn(
                      'p-3 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors',
                      isSelected && 'bg-blue-50/90'
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#2B2F36]">
                          {v.name || v.companyName || 'Unnamed Vendor'}
                        </span>
                        {v.companyName && v.companyName !== v.name && (
                          <span className="text-[11px] text-gray-500">({v.companyName})</span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        {v.gstin && (
                          <span>
                            GSTIN: <span className="font-mono text-gray-700">{v.gstin}</span>
                          </span>
                        )}
                        {v.phone && <span>Phone: {v.phone}</span>}
                        {(v.state || v.placeOfSupply) && (
                          <span>State: {v.state || v.placeOfSupply}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 pl-3">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <span className="text-xs text-blue-600 font-medium hover:text-blue-800">
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
            <span>
              Showing {filteredVendors.length} of {vendors.length} vendors
            </span>
            <div className="flex items-center gap-3">
              {vendorId && (
                <button
                  type="button"
                  onClick={() => {
                    handleVendorChange('');
                    setIsVendorSearchOpen(false);
                  }}
                  className="text-red-600 hover:text-red-800 underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
              <a
                href="/vendors/new"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                + New Vendor
              </a>
            </div>
          </div>
        </div>
      </ZohoModal>

      {/* 5. Customer Search Modal */}
      <ZohoModal
        isOpen={isCustomerSearchOpen}
        onClose={() => {
          setIsCustomerSearchOpen(false);
          setCustomerSearchTerm('');
        }}
        title="Select Customer"
        maxWidth="max-w-xl"
        secondaryAction={{
          label: 'Cancel',
          onClick: () => {
            setIsCustomerSearchOpen(false);
            setCustomerSearchTerm('');
          },
        }}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={customerSearchTerm}
              onChange={(e) => setCustomerSearchTerm(e.target.value)}
              placeholder="Search customer by name, company, phone, email, GSTIN..."
              className="w-full h-9 pl-9 pr-8 text-xs border border-gray-300 rounded-[4px] bg-white text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              autoFocus
            />
            {customerSearchTerm && (
              <button
                type="button"
                onClick={() => setCustomerSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-[4px] divide-y divide-gray-100 max-h-72 overflow-y-auto bg-white">
            {isLoadingCustomers ? (
              <div className="p-8 text-center text-gray-500 text-xs">Loading customers...</div>
            ) : isCustomersError ? (
              <div className="p-8 text-center text-red-600 text-xs">
                Failed to load customers.{' '}
                <button
                  type="button"
                  onClick={() => refetchCustomers()}
                  className="text-blue-600 hover:underline font-medium ml-1 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                {customerSearchTerm ? `No customers match "${customerSearchTerm}"` : 'No customers found'}
              </div>
            ) : (
              filteredCustomers.map((c: any) => {
                const isSelected = c.id === customerId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setCustomerId(c.id);
                      markDirty();
                      setIsCustomerSearchOpen(false);
                      setCustomerSearchTerm('');
                    }}
                    className={cn(
                      'p-3 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors',
                      isSelected && 'bg-blue-50/90'
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#2B2F36]">
                          {c.name || c.companyName || 'Unnamed Customer'}
                        </span>
                        {c.companyName && c.companyName !== c.name && (
                          <span className="text-[11px] text-gray-500">({c.companyName})</span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        {c.gstin && (
                          <span>
                            GSTIN: <span className="font-mono text-gray-700">{c.gstin}</span>
                          </span>
                        )}
                        {c.phone && <span>Phone: {c.phone}</span>}
                        {c.email && <span>Email: {c.email}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 pl-3">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <span className="text-xs text-blue-600 font-medium hover:text-blue-800">
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
            <span>
              Showing {filteredCustomers.length} of {customers.length} customers
            </span>
            <div className="flex items-center gap-3">
              {customerId && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerId('');
                    markDirty();
                    setIsCustomerSearchOpen(false);
                  }}
                  className="text-red-600 hover:text-red-800 underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
              <a
                href="/crm/customers/new"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                + New Customer
              </a>
            </div>
          </div>
        </div>
      </ZohoModal>
    </div>
  );
};

export default ExpenseForm;
