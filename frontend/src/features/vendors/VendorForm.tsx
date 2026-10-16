import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Mail,
  Phone,
  Plus,
  Trash2,
  Copy,
  Upload,
  Info,
  Check,
  Building,
  CreditCard,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { isValidGstin, isValidPan, extractPanFromGstin } from '@/shared/utils/business-rules';
import { cn } from '@/lib/utils';

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
];

export const GST_TREATMENTS = [
  'Registered Business - Regular',
  'Registered Business - Composition',
  'Unregistered Business',
  'Consumer',
  'Overseas',
  'Special Economic Zone (SEZ)',
  'Deemed Export',
];

export const PAYMENT_TERMS_OPTIONS = [
  'Due on Receipt',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Due end of the month',
  'Due end of next month',
];

export const TDS_TAX_OPTIONS = [
  { id: '', label: 'Select a Tax' },
  { id: 'TDS_194C_1', label: 'TDS 194C - Payment to Contractors (Individuals/HUF) (1%)' },
  { id: 'TDS_194C_2', label: 'TDS 194C - Payment to Contractors (Companies/Firms) (2%)' },
  { id: 'TDS_194J_10', label: 'TDS 194J - Fees for Professional Services (10%)' },
  { id: 'TDS_194J_2', label: 'TDS 194J - Fees for Technical Services (2%)' },
  { id: 'TDS_194I_10', label: 'TDS 194I - Rent on Land/Building/Furniture (10%)' },
  { id: 'TDS_194I_2', label: 'TDS 194I - Rent on Plant & Machinery (2%)' },
  { id: 'TDS_194Q', label: 'TDS 194Q - Purchase of Goods exceeding ₹50L (0.1%)' },
];

interface ContactPerson {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone: string;
  mobile: string;
}

interface BankAccount {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  isDefault: boolean;
}

interface AddressState {
  attention: string;
  country: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
  fax: string;
}

export const VendorForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Active Tab: 1. Other Details, 2. Address, 3. Contact Persons, 4. Bank Details, 5. Custom Fields, 6. Reporting Tags, 7. Remarks
  const [activeTab, setActiveTab] = useState<
    'other' | 'address' | 'contacts' | 'bank' | 'custom' | 'reporting' | 'remarks'
  >('other');

  // Top Section: Primary Contact & Company
  const [salutation, setSalutation] = useState('Mr.');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [workPhoneCountry, setWorkPhoneCountry] = useState('+91');
  const [workPhone, setWorkPhone] = useState('');
  const [mobileCountry, setMobileCountry] = useState('+91');
  const [mobile, setMobile] = useState('');

  // Tab 1: Other Details
  const [gstTreatment, setGstTreatment] = useState('Registered Business - Regular');
  const [gstin, setGstin] = useState('');
  const [sourceOfSupply, setSourceOfSupply] = useState('Maharashtra');
  const [panNumber, setPanNumber] = useState('');
  const [msmeRegistered, setMsmeRegistered] = useState(false);
  const [msmeRegNo, setMsmeRegNo] = useState('');
  const [currency] = useState('INR - Indian Rupee');
  const [openingBalanceType, setOpeningBalanceType] = useState<'CREDIT_BALANCE' | 'DEBIT_BALANCE'>('CREDIT_BALANCE');
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState<string>('0');
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [tdsTaxId, setTdsTaxId] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number }[]>([]);

  // Tab 2: Address
  const [billingAddress, setBillingAddress] = useState<AddressState>({
    attention: '',
    country: 'India',
    street1: '',
    street2: '',
    city: '',
    state: 'Maharashtra',
    pinCode: '',
    phone: '',
    fax: '',
  });

  const [shippingAddress, setShippingAddress] = useState<AddressState>({
    attention: '',
    country: 'India',
    street1: '',
    street2: '',
    city: '',
    state: 'Maharashtra',
    pinCode: '',
    phone: '',
    fax: '',
  });

  // Tab 3: Contact Persons
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);

  // Tab 4: Bank Details
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState<BankAccount>({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    branch: '',
    isDefault: false,
  });

  // Tab 7: Remarks
  const [remarks, setRemarks] = useState('');

  // GST Prefill Modal State
  const [showGstModal, setShowGstModal] = useState(false);
  const [gstModalInput, setGstModalInput] = useState('');
  const [gstPrefillNotice, setGstPrefillNotice] = useState<string | null>(null);

  // Suggestions for Display Name
  const displayNameSuggestions = useMemo(() => {
    const list: string[] = [];
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (companyName.trim()) list.push(companyName.trim());
    if (fullName) list.push(fullName);
    if (companyName.trim() && fullName) list.push(`${fullName} (${companyName.trim()})`);
    return Array.from(new Set(list));
  }, [firstName, lastName, companyName]);

  // Load Vendor Data for Edit Mode
  const { data: vendorData, isLoading: isFetchingVendor } = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const res = await apiClient.get(`/vendors/${id}`);
      return res.data?.data || res.data;
    },
    enabled: isEditMode,
  });

  useEffect(() => {
    if (vendorData) {
      setDisplayName(vendorData.name || '');
      setCompanyName(vendorData.companyName || vendorData.tradeName || '');
      setSalutation(vendorData.salutation || 'Mr.');
      setFirstName(vendorData.firstName || '');
      setLastName(vendorData.lastName || '');
      setEmail(vendorData.email || '');
      setWorkPhone(vendorData.workPhone || '');
      setMobile(vendorData.mobile || vendorData.phone || '');
      setGstTreatment(vendorData.gstTreatment || vendorData.gstRegistrationStatus || 'Registered Business - Regular');
      setGstin(vendorData.gstin || '');
      setPanNumber(vendorData.panNumber || '');
      setSourceOfSupply(vendorData.placeOfSupply || vendorData.sourceOfSupply || vendorData.state || 'Maharashtra');
      setMsmeRegistered(Boolean(vendorData.msmeRegistered));
      setMsmeRegNo(vendorData.msmeRegNo || '');
      setPaymentTerms(vendorData.paymentTerms || 'Due on Receipt');
      setTdsTaxId(vendorData.tdsTaxId || '');
      setRemarks(vendorData.remarks || vendorData.notes || '');

      if (vendorData.openingBalanceAmount) {
        setOpeningBalanceAmount(String(vendorData.openingBalanceAmount));
      }
      if (vendorData.openingBalanceType === 'DEBIT_BALANCE') {
        setOpeningBalanceType('DEBIT_BALANCE');
      } else {
        setOpeningBalanceType('CREDIT_BALANCE');
      }

      if (vendorData.billingAddress) {
        setBillingAddress({
          attention: vendorData.billingAddress.attention || '',
          country: vendorData.billingAddress.country || 'India',
          street1: vendorData.billingAddress.street1 || '',
          street2: vendorData.billingAddress.street2 || '',
          city: vendorData.billingAddress.city || '',
          state: vendorData.billingAddress.state || 'Maharashtra',
          pinCode: vendorData.billingAddress.pinCode || '',
          phone: vendorData.billingAddress.phone || '',
          fax: vendorData.billingAddress.fax || '',
        });
      } else if (vendorData.address) {
        setBillingAddress((prev) => ({
          ...prev,
          street1: vendorData.address || '',
          state: vendorData.state || 'Maharashtra',
          pinCode: vendorData.pinCode || '',
        }));
      }

      if (vendorData.shippingAddress) {
        setShippingAddress({
          attention: vendorData.shippingAddress.attention || '',
          country: vendorData.shippingAddress.country || 'India',
          street1: vendorData.shippingAddress.street1 || '',
          street2: vendorData.shippingAddress.street2 || '',
          city: vendorData.shippingAddress.city || '',
          state: vendorData.shippingAddress.state || 'Maharashtra',
          pinCode: vendorData.shippingAddress.pinCode || '',
          phone: vendorData.shippingAddress.phone || '',
          fax: vendorData.shippingAddress.fax || '',
        });
      }

      if (Array.isArray(vendorData.contactPersons) && vendorData.contactPersons.length > 0) {
        setContactPersons(vendorData.contactPersons);
      } else if (Array.isArray(vendorData.contacts) && vendorData.contacts.length > 0) {
        setContactPersons(
          vendorData.contacts.map((c: any) => ({
            salutation: '',
            firstName: c.firstName || '',
            lastName: c.lastName || '',
            email: c.email || '',
            workPhone: '',
            mobile: c.phone || '',
          }))
        );
      }

      if (Array.isArray(vendorData.bankAccounts)) {
        setBankAccounts(vendorData.bankAccounts);
      }
      if (Array.isArray(vendorData.documents)) {
        setUploadedFiles(vendorData.documents);
      }
    }
  }, [vendorData]);

  // Handle GSTIN Change and auto-derive state and PAN
  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase();
    setGstin(upper);

    if (upper.length >= 2) {
      const stateCode = upper.substring(0, 2);
      const match = INDIAN_STATES.find((s) => s.code === stateCode);
      if (match) {
        setSourceOfSupply(match.name);
        setBillingAddress((prev) => ({ ...prev, state: match.name }));
      }
    }
    if (upper.length >= 12) {
      const pan = extractPanFromGstin(upper);
      if (pan) {
        setPanNumber(pan);
      }
    }
  };

  // Copy billing to shipping
  const handleCopyBillingAddress = () => {
    setShippingAddress({ ...billingAddress });
    notification.info('Billing address copied to shipping address');
  };

  // Contact Persons Handlers
  const handleAddContactPerson = () => {
    setContactPersons((prev) => [
      ...prev,
      {
        salutation: 'Mr.',
        firstName: '',
        lastName: '',
        email: '',
        workPhone: '',
        mobile: '',
      },
    ]);
  };

  const handleUpdateContactPerson = (index: number, field: keyof ContactPerson, val: string) => {
    setContactPersons((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveContactPerson = (index: number) => {
    setContactPersons((prev) => prev.filter((_, i) => i !== index));
  };

  // Bank Account Handlers
  const handleSaveBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.accountNumber.trim()) {
      notification.error('Account number is required');
      return;
    }
    if (bankForm.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankForm.ifsc.toUpperCase())) {
      notification.error('Invalid IFSC Code format (e.g. HDFC0000123)');
      return;
    }

    setBankAccounts((prev) => {
      let next = [...prev];
      if (bankForm.isDefault) {
        next = next.map((a) => ({ ...a, isDefault: false }));
      }
      return [...next, { ...bankForm, ifsc: bankForm.ifsc.toUpperCase() }];
    });

    setShowBankModal(false);
    setBankForm({
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      branch: '',
      isDefault: false,
    });
    notification.success('Bank account added');
  };

  const handleRemoveBankAccount = (index: number) => {
    setBankAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  // Document Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: { name: string; size: number }[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 10 * 1024 * 1024) {
        notification.error(`File "${files[i].name}" exceeds 10MB limit`);
        continue;
      }
      newFiles.push({ name: files[i].name, size: files[i].size });
    }
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: displayName.trim(),
        companyName: companyName.trim() || undefined,
        tradeName: companyName.trim() || undefined,
        salutation,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        workPhone: workPhone.trim() ? `${workPhoneCountry} ${workPhone.trim()}` : undefined,
        mobile: mobile.trim() ? `${mobileCountry} ${mobile.trim()}` : undefined,
        phone: (mobile.trim() || workPhone.trim()) ? `${mobile.trim() || workPhone.trim()}` : undefined,
        gstTreatment,
        gstRegistrationStatus: gstTreatment,
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
        panNumber: panNumber.trim() ? panNumber.trim().toUpperCase() : undefined,
        sourceOfSupply,
        placeOfSupply: sourceOfSupply,
        state: sourceOfSupply,
        msmeRegistered,
        msmeRegNo: msmeRegistered ? msmeRegNo.trim() : undefined,
        currency: 'INR',
        openingBalanceType: Number(openingBalanceAmount) > 0 ? openingBalanceType : 'NONE',
        openingBalanceAmount: Number(openingBalanceAmount) || 0,
        paymentTerms,
        tdsTaxId: tdsTaxId || undefined,
        billingAddress,
        shippingAddress,
        contactPersons: contactPersons.filter((c) => c.firstName.trim() || c.lastName.trim() || c.email.trim() || c.mobile.trim()),
        bankAccounts,
        remarks: remarks.trim() || undefined,
        documents: uploadedFiles,
      };

      if (isEditMode) {
        return apiClient.patch(`/vendors/${id}`, payload);
      }
      return apiClient.post('/vendors', payload);
    },
    onSuccess: async () => {
      await erpInvalidate.vendor(queryClient, { vendorId: id });
      notification.success(isEditMode ? 'Vendor updated successfully' : 'Vendor created successfully');
      navigate('/vendors');
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to save vendor');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setDisplayNameTouched(true);

    if (!displayName.trim()) {
      setActiveTab('other');
      notification.error('Please enter the Display Name of the vendor');
      return;
    }

    if (gstin.trim() && !isValidGstin(gstin.trim())) {
      setActiveTab('other');
      notification.error('Invalid GSTIN format (must be 15 alphanumeric characters)');
      return;
    }

    if (panNumber.trim() && !isValidPan(panNumber.trim())) {
      setActiveTab('other');
      notification.error('Invalid PAN format (must be 10 characters, e.g. ABCDE1234F)');
      return;
    }

    saveMutation.mutate();
  };

  const isSaving = saveMutation.isPending;

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-white overflow-hidden font-sans text-xs text-[#2B2F36]">
      {/* 1. Header (Pinned at top) */}
      <div className="w-full border-b border-[#E5E7EB] bg-white px-8 py-3.5 flex items-center justify-between shrink-0 z-10">
        <h1 className="text-lg font-semibold text-[#111827]">
          {isEditMode ? 'Edit Vendor' : 'New Vendor'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="text-[#9CA3AF] hover:text-[#4B5563] p-1 rounded-md transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Body Content (Single clear vertical scroll area) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full">
        <div className="w-full max-w-[1040px] px-8 py-5 pb-28 space-y-5">
        {/* GST Prefill Banner */}
        <div className="bg-[#EDF5FE] border border-[#D0E3FD] rounded p-2.5 flex items-center justify-between text-xs text-[#1E3A8A]">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-[#408DFB] shrink-0" />
            <span>Prefill Vendor details from the GST portal using the Vendor's GSTIN.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setGstModalInput(gstin || '');
              setShowGstModal(true);
            }}
            className="text-[#408DFB] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer ml-3 shrink-0"
          >
            Prefill &gt;
          </button>
        </div>

        {/* Top Contact Form */}
        <div className="space-y-3.5">
          {/* Primary Contact */}
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="text-xs text-[#4B5563] flex items-center gap-1">
              Primary Contact <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </label>
            <div className="flex items-center gap-2 max-w-[500px]">
              <select
                value={salutation}
                onChange={(e) => setSalutation(e.target.value)}
                className="w-24 border border-[#CBD5E1] rounded-[4px] px-2 py-1.5 bg-white text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              >
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Miss">Miss</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
              </select>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="flex-1 border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="flex-1 border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              />
            </div>
          </div>

          {/* Company Name */}
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="text-xs text-[#4B5563]">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="max-w-[420px] border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
            />
          </div>

          {/* Display Name* */}
          <div className="grid grid-cols-[160px_1fr] items-start gap-3">
            <label className="text-xs text-[#EF4444] font-medium flex items-center gap-1 pt-1.5">
              Display Name* <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </label>
            <div className="max-w-[420px] space-y-1">
              <input
                type="text"
                placeholder="Select or type to add"
                value={displayName}
                onFocus={() => setDisplayNameTouched(true)}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setDisplayNameTouched(true);
                }}
                className={cn(
                  'w-full border rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none',
                  displayNameTouched && !displayName.trim()
                    ? 'border-[#EF4444] focus:border-[#EF4444]'
                    : 'border-[#CBD5E1] focus:border-[#408DFB]'
                )}
              />

              {displayNameTouched && !displayName.trim() && (
                <p className="text-[11px] text-[#EF4444] flex items-center gap-1">
                  ▲ Enter the Display Name of your vendor.
                </p>
              )}

              {/* Suggestions */}
              {displayNameSuggestions.length > 0 && !displayName && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-[#9CA3AF]">Suggestions:</span>
                  {displayNameSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setDisplayName(sug)}
                      className="px-2 py-0.5 bg-[#F0F5FF] text-[#408DFB] hover:bg-[#E0EEFE] rounded text-[11px] font-medium transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Email Address */}
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="text-xs text-[#4B5563] flex items-center gap-1">
              Email Address <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </label>
            <div className="relative max-w-[420px]">
              <Mail className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#CBD5E1] rounded-[4px] pl-8 pr-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="text-xs text-[#4B5563] flex items-center gap-1">
              Phone <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </label>
            <div className="flex items-center gap-4 max-w-[480px]">
              {/* Work Phone */}
              <div className="flex items-center border border-[#CBD5E1] rounded-[4px] flex-1 overflow-hidden focus-within:border-[#408DFB]">
                <select
                  value={workPhoneCountry}
                  onChange={(e) => setWorkPhoneCountry(e.target.value)}
                  className="bg-[#F8F9FB] border-r border-[#CBD5E1] px-2 py-1.5 text-xs text-[#4B5563] focus:outline-none"
                >
                  <option value="+91">+91</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+971">+971</option>
                  <option value="+65">+65</option>
                </select>
                <input
                  type="text"
                  placeholder="Work Phone"
                  value={workPhone}
                  onChange={(e) => setWorkPhone(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none"
                />
              </div>

              {/* Mobile */}
              <div className="flex items-center border border-[#CBD5E1] rounded-[4px] flex-1 overflow-hidden focus-within:border-[#408DFB]">
                <select
                  value={mobileCountry}
                  onChange={(e) => setMobileCountry(e.target.value)}
                  className="bg-[#F8F9FB] border-r border-[#CBD5E1] px-2 py-1.5 text-xs text-[#4B5563] focus:outline-none"
                >
                  <option value="+91">+91</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+971">+971</option>
                  <option value="+65">+65</option>
                </select>
                <input
                  type="text"
                  placeholder="Mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Horizontal Tab Bar */}
        <div className="border-b border-[#E5E7EB] flex items-center gap-6 pt-4 text-xs">
          {[
            { id: 'other', label: 'Other Details' },
            { id: 'address', label: 'Address' },
            { id: 'contacts', label: 'Contact Persons' },
            { id: 'bank', label: 'Bank Details' },
            { id: 'custom', label: 'Custom Fields' },
            { id: 'reporting', label: 'Reporting Tags' },
            { id: 'remarks', label: 'Remarks' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'pb-2.5 font-medium transition-colors cursor-pointer',
                activeTab === tab.id
                  ? 'border-b-2 border-[#408DFB] text-[#408DFB] font-semibold'
                  : 'text-[#6B7280] hover:text-[#111827]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 4. Tab Contents */}
        {/* TAB 1: OTHER DETAILS */}
        {activeTab === 'other' && (
          <div className="space-y-3.5 pt-2">
            {/* GST Treatment */}
            <div className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-xs text-[#EF4444] font-medium">GST Treatment*</label>
              <select
                value={gstTreatment}
                onChange={(e) => setGstTreatment(e.target.value)}
                className="max-w-[340px] border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 bg-white text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              >
                {GST_TREATMENTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* GSTIN (If registered) */}
            {gstTreatment.includes('Registered') && (
              <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                <label className="text-xs text-[#EF4444] font-medium">GSTIN*</label>
                <input
                  type="text"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  className="max-w-[340px] border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] uppercase focus:outline-none focus:border-[#408DFB]"
                />
              </div>
            )}

            {/* Source of Supply */}
            <div className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-xs text-[#EF4444] font-medium">Source of Supply*</label>
              <select
                value={sourceOfSupply}
                onChange={(e) => setSourceOfSupply(e.target.value)}
                className="max-w-[340px] border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 bg-white text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} [{s.code}]
                  </option>
                ))}
              </select>
            </div>

            {/* PAN */}
            <div className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-xs text-[#4B5563] flex items-center gap-1">
                PAN <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                className="max-w-[340px] border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] uppercase focus:outline-none focus:border-[#408DFB]"
              />
            </div>

            {/* MSME Registered */}
            <div className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-xs text-[#4B5563] flex items-center gap-1">
                MSME Registered? <HelpCircle className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={msmeRegistered}
                    onChange={(e) => setMsmeRegistered(e.target.checked)}
                    className="w-4 h-4 text-[#408DFB] rounded border-[#CBD5E1] focus:ring-0"
                  />
                  <span className="text-xs text-[#2B2F36]">This vendor is MSME registered</span>
                </label>
                {msmeRegistered && (
                  <input
                    type="text"
                    placeholder="Udyam Registration Number"
                    value={msmeRegNo}
                    onChange={(e) => setMsmeRegNo(e.target.value)}
                    className="w-56 border border-[#CBD5E1] rounded-[4px] px-2.5 py-1 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                  />
                )}
              </div>
            </div>

            {/* Currency */}
            <div className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-xs text-[#4B5563]">Currency</label>
              <input
                type="text"
                readOnly
                value={currency}
                className="max-w-[340px] border border-[#CBD5E1] bg-[#F8F9FB] rounded-[4px] px-2.5 py-1.5 text-xs text-[#6B7280] cursor-not-allowed"
              />
            </div>

            {/* Opening Balance */}
            <div className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-xs text-[#4B5563]">Opening Balance</label>
              <div className="flex items-center gap-2 max-w-[340px]">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1.5 text-[#9CA3AF] text-xs">INR</span>
                  <input
                    type="number"
                    step="0.01"
                    value={openingBalanceAmount}
                    onChange={(e) => setOpeningBalanceAmount(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded-[4px] pl-10 pr-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                  />
                </div>
                <select
                  value={openingBalanceType}
                  onChange={(e) => setOpeningBalanceType(e.target.value as any)}
                  className="w-36 border border-[#CBD5E1] rounded-[4px] px-2 py-1.5 bg-white text-xs text-[#2B2F36] focus:outline-none"
                >
                  <option value="CREDIT_BALANCE">Payables (Cr)</option>
                  <option value="DEBIT_BALANCE">Advance (Dr)</option>
                </select>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-xs text-[#4B5563]">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="max-w-[340px] border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 bg-white text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              >
                {PAYMENT_TERMS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* TDS */}
            <div className="grid grid-cols-[160px_1fr] items-center gap-3">
              <label className="text-xs text-[#4B5563]">TDS</label>
              <select
                value={tdsTaxId}
                onChange={(e) => setTdsTaxId(e.target.value)}
                className="max-w-[340px] border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 bg-white text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
              >
                {TDS_TAX_OPTIONS.map((tax) => (
                  <option key={tax.id} value={tax.id}>
                    {tax.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Documents */}
            <div className="grid grid-cols-[160px_1fr] items-start gap-3 pt-1">
              <label className="text-xs text-[#4B5563] pt-1">Documents</label>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs text-[#2B2F36] font-medium cursor-pointer transition-colors shadow-sm">
                  <Upload className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-[#9CA3AF]">
                  You can upload a maximum of 10 files, 10MB each
                </p>

                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded px-2.5 py-1 text-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#6B7280]" />
                        <span className="truncate max-w-[140px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[#9CA3AF] hover:text-[#EF4444] ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADDRESS */}
        {activeTab === 'address' && (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Billing Address */}
              <div className="space-y-3">
                <h3 className="font-semibold text-xs text-[#111827] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                  Billing Address
                </h3>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Attention</label>
                    <input
                      type="text"
                      value={billingAddress.attention}
                      onChange={(e) => setBillingAddress({ ...billingAddress, attention: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Country/Region</label>
                    <select
                      value={billingAddress.country}
                      onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 bg-white text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Address</label>
                    <textarea
                      rows={2}
                      placeholder="Street 1"
                      value={billingAddress.street1}
                      onChange={(e) => setBillingAddress({ ...billingAddress, street1: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB] mb-2"
                    />
                    <textarea
                      rows={2}
                      placeholder="Street 2"
                      value={billingAddress.street2}
                      onChange={(e) => setBillingAddress({ ...billingAddress, street2: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">City</label>
                    <input
                      type="text"
                      value={billingAddress.city}
                      onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">State</label>
                    <select
                      value={billingAddress.state}
                      onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 bg-white text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Pin Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={billingAddress.pinCode}
                      onChange={(e) => setBillingAddress({ ...billingAddress, pinCode: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Phone</label>
                    <input
                      type="text"
                      value={billingAddress.phone}
                      onChange={(e) => setBillingAddress({ ...billingAddress, phone: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Fax Number</label>
                    <input
                      type="text"
                      value={billingAddress.fax}
                      onChange={(e) => setBillingAddress({ ...billingAddress, fax: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-[#E5E7EB]">
                  <h3 className="font-semibold text-xs text-[#111827] uppercase tracking-wider">
                    Shipping Address
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopyBillingAddress}
                    className="text-[#408DFB] hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>( ↓ Copy billing address )</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Attention</label>
                    <input
                      type="text"
                      value={shippingAddress.attention}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, attention: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Country/Region</label>
                    <select
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 bg-white text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Address</label>
                    <textarea
                      rows={2}
                      placeholder="Street 1"
                      value={shippingAddress.street1}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, street1: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB] mb-2"
                    />
                    <textarea
                      rows={2}
                      placeholder="Street 2"
                      value={shippingAddress.street2}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, street2: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">City</label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">State</label>
                    <select
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 bg-white text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Pin Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={shippingAddress.pinCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, pinCode: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Phone</label>
                    <input
                      type="text"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Fax Number</label>
                    <input
                      type="text"
                      value={shippingAddress.fax}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, fax: e.target.value })}
                      className="w-full border border-[#CBD5E1] rounded-[4px] px-2.5 py-1.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Footer Note */}
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded p-3 text-[11px] text-[#92400E] space-y-1">
              <p className="font-semibold">Note:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Add and manage additional addresses from this Customers and Vendors details section.</li>
                <li>You can customise how customers' addresses are displayed in transaction PDFs. To do this, go to Settings &gt; Preferences &gt; Customers and Vendors.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: CONTACT PERSONS */}
        {activeTab === 'contacts' && (
          <div className="space-y-4 pt-2">
            <div className="border border-[#E5E7EB] rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[#4B5563] text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-28">Salutation</th>
                    <th className="py-2.5 px-3">First Name</th>
                    <th className="py-2.5 px-3">Last Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Work Phone</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {contactPersons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#9CA3AF] text-xs">
                        No contact persons added yet. Click "+ Add Contact Person" below.
                      </td>
                    </tr>
                  ) : (
                    contactPersons.map((cp, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FAFB]">
                        <td className="py-2 px-3">
                          <select
                            value={cp.salutation}
                            onChange={(e) => handleUpdateContactPerson(idx, 'salutation', e.target.value)}
                            className="w-full border border-[#CBD5E1] rounded px-1.5 py-1 text-xs bg-white"
                          >
                            <option value="Mr.">Mr.</option>
                            <option value="Mrs.">Mrs.</option>
                            <option value="Ms.">Ms.</option>
                            <option value="Miss">Miss</option>
                            <option value="Dr.">Dr.</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={cp.firstName}
                            onChange={(e) => handleUpdateContactPerson(idx, 'firstName', e.target.value)}
                            className="w-full border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={cp.lastName}
                            onChange={(e) => handleUpdateContactPerson(idx, 'lastName', e.target.value)}
                            className="w-full border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="email"
                            value={cp.email}
                            onChange={(e) => handleUpdateContactPerson(idx, 'email', e.target.value)}
                            className="w-full border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="+91..."
                            value={cp.workPhone}
                            onChange={(e) => handleUpdateContactPerson(idx, 'workPhone', e.target.value)}
                            className="w-full border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="+91..."
                            value={cp.mobile}
                            onChange={(e) => handleUpdateContactPerson(idx, 'mobile', e.target.value)}
                            className="w-full border border-[#CBD5E1] rounded px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveContactPerson(idx)}
                            className="text-[#9CA3AF] hover:text-[#EF4444] p-1"
                            title="Remove contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddContactPerson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#408DFB] cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contact Person</span>
            </button>
          </div>
        )}

        {/* TAB 4: BANK DETAILS */}
        {activeTab === 'bank' && (
          <div className="space-y-4 pt-2">
            {bankAccounts.length === 0 ? (
              <div className="border border-dashed border-[#CBD5E1] rounded-lg p-10 flex flex-col items-center justify-center text-center space-y-3">
                <CreditCard className="w-10 h-10 text-[#9CA3AF]" />
                <p className="text-xs text-[#6B7280]">
                  Add your vendor's bank details and make payments.
                </p>
                <button
                  type="button"
                  onClick={() => setShowBankModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] text-xs font-medium cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bank Account</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-[#111827]">Configured Bank Accounts</h4>
                  <button
                    type="button"
                    onClick={() => setShowBankModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#408DFB]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Another Account</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bankAccounts.map((acc, idx) => (
                    <div
                      key={idx}
                      className="border border-[#E5E7EB] rounded-lg p-4 bg-white relative space-y-1.5 text-xs shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-sm text-[#111827]">{acc.bankName}</div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBankAccount(idx)}
                          className="text-[#9CA3AF] hover:text-[#EF4444]"
                          title="Remove bank account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[#6B7280]">
                        <span className="font-medium text-[#2B2F36]">Account No: </span>
                        •••• {acc.accountNumber.slice(-4)}
                      </div>
                      <div className="text-[#6B7280]">
                        <span className="font-medium text-[#2B2F36]">Holder: </span>
                        {acc.accountHolderName || '—'}
                      </div>
                      <div className="text-[#6B7280]">
                        <span className="font-medium text-[#2B2F36]">IFSC: </span>
                        {acc.ifsc}
                        {acc.branch && ` (${acc.branch})`}
                      </div>
                      {acc.isDefault && (
                        <span className="inline-block px-2 py-0.5 bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] rounded text-[10px] font-semibold">
                          Default Account
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CUSTOM FIELDS */}
        {activeTab === 'custom' && (
          <div className="pt-2 text-xs text-[#6B7280] space-y-2">
            <p>No custom fields configured for Vendors yet.</p>
            <p className="text-[11px] text-[#9CA3AF]">
              Custom fields allow you to record specific vendor attributes. Configure them in Settings &gt; Preferences &gt; Vendors &gt; Custom Fields.
            </p>
          </div>
        )}

        {/* TAB 6: REPORTING TAGS */}
        {activeTab === 'reporting' && (
          <div className="pt-2 text-xs text-[#6B7280] space-y-2">
            <p>No reporting tags assigned.</p>
            <p className="text-[11px] text-[#9CA3AF]">
              Reporting tags allow you to tag vendors and their purchase transactions for departmental and project profit & loss reporting.
            </p>
          </div>
        )}

        {/* TAB 7: REMARKS */}
        {activeTab === 'remarks' && (
          <div className="space-y-2 pt-2">
            <label className="block text-xs text-[#4B5563] font-medium">
              Remarks (For Internal Use)
            </label>
            <textarea
              rows={5}
              placeholder="Enter internal notes, terms agreement notes, or vendor evaluations..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full max-w-[650px] border border-[#CBD5E1] rounded-[4px] p-2.5 text-xs text-[#2B2F36] focus:outline-none focus:border-[#408DFB]"
            />
          </div>
        )}
        </div>
      </div>

      {/* 5. Bottom Action Bar (Pinned at bottom of container, never overlapping content or sidebar) */}
      <div className="shrink-0 bg-white border-t border-[#E5E7EB] px-8 py-3 flex items-center gap-3 z-20 shadow-[0_-2px_6px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] disabled:bg-[#93C5FD] text-white font-medium rounded-[4px] text-xs transition-colors cursor-pointer shadow-sm"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="px-5 py-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] font-medium rounded-[4px] text-xs transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* Bank Account Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#111827]">Add Bank Account</h3>
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="text-[#9CA3AF] hover:text-[#4B5563]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBankAccount} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#4B5563] mb-1">Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountHolderName}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                  className="w-full border border-[#CBD5E1] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#408DFB]"
                />
              </div>

              <div>
                <label className="block text-[#4B5563] mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full border border-[#CBD5E1] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#408DFB]"
                />
              </div>

              <div>
                <label className="block text-[#4B5563] mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  className="w-full border border-[#CBD5E1] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#408DFB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4B5563] mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC0000123"
                    value={bankForm.ifsc}
                    onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })}
                    className="w-full border border-[#CBD5E1] rounded px-2.5 py-1.5 uppercase focus:outline-none focus:border-[#408DFB]"
                  />
                </div>
                <div>
                  <label className="block text-[#4B5563] mb-1">Branch</label>
                  <input
                    type="text"
                    value={bankForm.branch}
                    onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                    className="w-full border border-[#CBD5E1] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#408DFB]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bankForm.isDefault}
                  onChange={(e) => setBankForm({ ...bankForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-[#408DFB] rounded border-[#CBD5E1] focus:ring-0"
                />
                <span className="text-xs text-[#2B2F36]">Set as default payment bank account</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-1.5 border border-[#CBD5E1] rounded text-xs text-[#4B5563] hover:bg-[#F9FAFB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded text-xs font-medium"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GST Prefill Modal */}
      {showGstModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#111827]">Prefill from GST Portal</h3>
              <button
                type="button"
                onClick={() => {
                  setShowGstModal(false);
                  setGstPrefillNotice(null);
                }}
                className="text-[#9CA3AF] hover:text-[#4B5563]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#6B7280]">
                Enter the 15-character GSTIN to auto-derive state code, PAN, and vendor tax treatment.
              </p>
              <div>
                <label className="block text-[#4B5563] mb-1 font-medium">Vendor GSTIN</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  value={gstModalInput}
                  onChange={(e) => setGstModalInput(e.target.value.toUpperCase())}
                  className="w-full border border-[#CBD5E1] rounded px-2.5 py-1.5 uppercase font-mono text-xs focus:outline-none focus:border-[#408DFB]"
                />
              </div>

              {gstPrefillNotice && (
                <div className="p-2.5 bg-[#FEF2F2] border border-[#FCA5A5] rounded text-xs text-[#991B1B] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span>{gstPrefillNotice}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => {
                    setShowGstModal(false);
                    setGstPrefillNotice(null);
                  }}
                  className="px-4 py-1.5 border border-[#CBD5E1] rounded text-xs text-[#4B5563] hover:bg-[#F9FAFB]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!gstModalInput.trim() || !isValidGstin(gstModalInput.trim())) {
                      setGstPrefillNotice('Please enter a valid 15-digit GSTIN.');
                      return;
                    }
                    handleGstinChange(gstModalInput.trim());
                    setShowGstModal(false);
                    setGstPrefillNotice(null);
                    notification.success('State and PAN extracted successfully from GSTIN');
                  }}
                  className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded text-xs font-medium"
                >
                  Apply Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
