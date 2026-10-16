import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Mail, Phone, Plus, Trash2, Copy } from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';
import notification from '@/core/services/NotificationService';
import { erpInvalidate } from '@/core/query/erpConsistency';
import { extractPanFromGstin } from '@/shared/utils/business-rules';
import { cn } from '@/lib/utils';
import { ZohoFormFooter } from '@/shared/components/zoho';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

interface ContactPerson {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone: string;
  mobile: string;
}

export const BusinessPartnerForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isVendor = window.location.pathname.includes('/vendors');
  const entityType = isVendor ? 'VENDOR' : 'CUSTOMER';
  const entityPath = isVendor ? 'vendors' : 'customers';
  const entityLabel = isVendor ? 'Vendor' : 'Customer';
  const isEditMode = Boolean(id);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'other' | 'address' | 'contacts' | 'remarks'>('other');

  // Form States
  const [partnerType, setPartnerType] = useState<'BUSINESS' | 'INDIVIDUAL'>('BUSINESS');
  const [salutation, setSalutation] = useState('Mr.');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [language, setLanguage] = useState('English');

  // Other Details
  const [gstTreatment, setGstTreatment] = useState('REGISTERED');
  const [gstin, setGstin] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Maharashtra');
  const [taxPreference, setTaxPreference] = useState<'TAXABLE' | 'TAX_EXEMPT'>('TAXABLE');
  const [currency] = useState('INR');
  const [openingBalanceType, setOpeningBalanceType] = useState<'NONE' | 'DEBIT_BALANCE' | 'CREDIT_BALANCE'>('NONE');
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState('0');
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');

  // Address Details
  const [billingAttention, setBillingAttention] = useState('');
  const [billingStreet1, setBillingStreet1] = useState('');
  const [billingStreet2, setBillingStreet2] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('Maharashtra');
  const [billingPin, setBillingPin] = useState('');
  const [billingCountry, setBillingCountry] = useState('India');
  const [billingPhone, setBillingPhone] = useState('');

  const [shippingAttention, setShippingAttention] = useState('');
  const [shippingStreet1, setShippingStreet1] = useState('');
  const [shippingStreet2, setShippingStreet2] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('Maharashtra');
  const [shippingPin, setShippingPin] = useState('');
  const [shippingCountry, setShippingCountry] = useState('India');
  const [shippingPhone, setShippingPhone] = useState('');

  // Contact Persons
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);

  // Remarks
  const [remarks, setRemarks] = useState('');

  // Hidden backend-preserved keys
  const [customerCode, setCustomerCode] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [customerSegmentId, setCustomerSegmentId] = useState('');
  const [customerDepartmentId, setCustomerDepartmentId] = useState('');

  // Fetch partner data if edit mode
  const { data: partnerData, isLoading } = useQuery({
    queryKey: [entityPath, id],
    queryFn: async () => {
      const res = await apiClient.get(`/${entityPath}/${id}`);
      return res.data?.data || res.data;
    },
    enabled: isEditMode,
  });

  // Populate data in edit mode
  useEffect(() => {
    if (partnerData) {
      setCompanyName(partnerData.tradeName || partnerData.companyName || partnerData.name || '');
      setDisplayName(partnerData.name || '');
      setCustomerCode(partnerData.bpCode || partnerData.customerCode || partnerData.vendorCode || '');
      setEmail(partnerData.email || '');
      setWorkPhone(partnerData.phone || '');
      setMobile(partnerData.mobile || '');
      setGstTreatment(partnerData.gstRegistrationStatus || 'REGISTERED');
      setGstin(partnerData.gstin || '');
      setPanNumber(partnerData.panNumber || '');
      setPlaceOfSupply(partnerData.placeOfSupply || partnerData.state || 'Maharashtra');
      setTaxPreference(partnerData.taxPreference === 'TAX_EXEMPT' ? 'TAX_EXEMPT' : 'TAXABLE');
      setRemarks(partnerData.notes || '');
      setCreditLimit(partnerData.creditLimit ? String(partnerData.creditLimit) : '');
      setCustomerSegmentId(partnerData.customerSegmentId || '');
      setCustomerDepartmentId(partnerData.customerDepartmentId || '');
      setOpeningBalanceType(partnerData.openingBalanceType || 'NONE');
      setOpeningBalanceAmount(partnerData.openingBalanceAmount ? String(partnerData.openingBalanceAmount) : '0');

      if (partnerData.address) {
        setBillingStreet1(partnerData.address);
      }
      if (partnerData.pinCode) {
        setBillingPin(partnerData.pinCode);
      }
      if (partnerData.state) {
        setBillingState(partnerData.state);
      }

      const isInd = partnerData.customerType === 'INDIVIDUAL' || partnerData.customerType === 'B2C';
      setPartnerType(isInd ? 'INDIVIDUAL' : 'BUSINESS');
    }
  }, [partnerData]);

  // Auto-generate Display Name from Company or First/Last name if user hasn't explicitly edited
  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    if (!displayName || displayName === companyName) {
      setDisplayName(val);
    }
  };

  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (partnerType === 'INDIVIDUAL' && (!displayName || displayName === `${firstName} ${lastName}`.trim())) {
      setDisplayName(`${val} ${lastName}`.trim());
    }
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    if (partnerType === 'INDIVIDUAL' && (!displayName || displayName === `${firstName} ${lastName}`.trim())) {
      setDisplayName(`${firstName} ${val}`.trim());
    }
  };

  // Auto-extract PAN from GSTIN
  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase().trim();
    setGstin(upper);
    const extracted = extractPanFromGstin(upper);
    if (extracted) {
      setPanNumber(extracted);
    }
  };

  const handleCopyBillingAddress = () => {
    setShippingAttention(billingAttention);
    setShippingStreet1(billingStreet1);
    setShippingStreet2(billingStreet2);
    setShippingCity(billingCity);
    setShippingState(billingState);
    setShippingPin(billingPin);
    setShippingCountry(billingCountry);
    setShippingPhone(billingPhone);
    notification.success('Billing address copied to shipping address');
  };

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

  const handleContactPersonChange = (index: number, field: keyof ContactPerson, val: string) => {
    const updated = [...contactPersons];
    updated[index] = { ...updated[index], [field]: val };
    setContactPersons(updated);
  };

  const handleRemoveContactPerson = (index: number) => {
    setContactPersons((prev) => prev.filter((_, i) => i !== index));
  };

  // Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const fullAddress = [billingStreet1, billingStreet2, billingCity, billingState, billingPin]
        .filter(Boolean)
        .join(', ');

      const payload: any = {
        name: displayName.trim() || companyName.trim() || `${firstName} ${lastName}`.trim() || 'Unnamed',
        tradeName: companyName.trim(),
        customerCode,
        bpCode: customerCode,
        customerType: partnerType === 'BUSINESS' ? 'B2B' : 'INDIVIDUAL',
        gstRegistrationStatus: gstTreatment,
        taxPreference,
        gstin,
        panNumber,
        email,
        phone: workPhone || mobile,
        mobile,
        address: fullAddress || billingStreet1,
        pinCode: billingPin,
        state: placeOfSupply || billingState,
        placeOfSupply,
        country: billingCountry || 'India',
        notes: remarks,
        status: 'ACTIVE',
        creditLimit: creditLimit || undefined,
        customerSegmentId: customerSegmentId || undefined,
        customerDepartmentId: customerDepartmentId || undefined,
        openingBalanceType,
        openingBalanceAmount: Number(openingBalanceAmount) || 0,
        billingAddress: {
          attention: billingAttention,
          street1: billingStreet1,
          street2: billingStreet2,
          city: billingCity,
          state: billingState,
          pinCode: billingPin,
          country: billingCountry,
          phone: billingPhone,
        },
        shippingAddress: {
          attention: shippingAttention,
          street1: shippingStreet1,
          street2: shippingStreet2,
          city: shippingCity,
          state: shippingState,
          pinCode: shippingPin,
          country: shippingCountry,
          phone: shippingPhone,
        },
        contactPersons,
      };

      if (isVendor) {
        payload.type = 'VENDOR';
        payload.vendorCode = customerCode;
        payload.vendorType = partnerType === 'BUSINESS' ? 'B2B' : 'INDIVIDUAL';
      } else {
        payload.type = 'CUSTOMER';
      }

      if (isEditMode) {
        return apiClient.patch(`/${entityPath}/${id}`, payload);
      }
      return apiClient.post(`/${entityPath}`, payload);
    },
    onSuccess: async (res) => {
      const newId = isEditMode ? id : res.data?.id || res.data?.data?.id;
      if (isVendor) {
        await erpInvalidate.vendor(queryClient, { vendorId: newId || undefined });
      } else {
        await erpInvalidate.customer(queryClient, { customerId: newId || undefined });
      }
      notification.success(`${entityLabel} saved successfully`);
      navigate(`/${entityPath}`);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || `Failed to save ${entityLabel}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() && !companyName.trim()) {
      notification.error('Display Name is required');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full h-full flex flex-col bg-white overflow-hidden select-none"
    >
      {/* 1. Title Row with X to Close */}
      <div className="h-12 px-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
        <h1 className="text-base font-semibold text-[#2B2F36]">
          {isEditMode ? `Edit ${entityLabel}` : `New ${entityLabel}`}
        </h1>

        <button
          type="button"
          onClick={() => navigate(`/${entityPath}`)}
          className="p-1 rounded-[4px] text-[#6B7280] hover:text-[#E54B4B] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
          title="Close and exit form"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-5xl">
        {/* Top Section (Label left ~180px, Input right ~330px) */}
        <div className="space-y-4">
          {/* Customer Type: Radio Business / Individual */}
          <div className="flex items-center">
            <span className="w-44 text-xs font-medium text-[#2B2F36]">
              {entityLabel} Type
            </span>
            <div className="flex items-center gap-6 text-xs text-[#2B2F36]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="partner_type"
                  checked={partnerType === 'BUSINESS'}
                  onChange={() => setPartnerType('BUSINESS')}
                  className="text-[#408DFB] focus:ring-0 cursor-pointer"
                />
                <span>Business</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="partner_type"
                  checked={partnerType === 'INDIVIDUAL'}
                  onChange={() => setPartnerType('INDIVIDUAL')}
                  className="text-[#408DFB] focus:ring-0 cursor-pointer"
                />
                <span>Individual</span>
              </label>
            </div>
          </div>

          {/* Primary Contact: Salutation dropdown, First Name, Last Name in one row */}
          <div className="flex items-center">
            <span className="w-44 text-xs font-medium text-[#2B2F36]">
              Primary Contact
            </span>
            <div className="flex items-center gap-2 max-w-md w-full">
              <select
                value={salutation}
                onChange={(e) => setSalutation(e.target.value)}
                className="w-24 h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              >
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Miss">Miss</option>
                <option value="Dr.">Dr.</option>
              </select>

              <input
                type="text"
                value={firstName}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                placeholder="First Name"
                className="flex-1 h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />

              <input
                type="text"
                value={lastName}
                onChange={(e) => handleLastNameChange(e.target.value)}
                placeholder="Last Name"
                className="flex-1 h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>
          </div>

          {/* Company Name */}
          <div className="flex items-center">
            <span className="w-44 text-xs font-medium text-[#2B2F36]">
              Company Name
            </span>
            <input
              type="text"
              value={companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              placeholder="Company / Legal Entity Name"
              className="w-full max-w-md h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          </div>

          {/* Display Name* (Required) */}
          <div className="flex items-center">
            <span className="w-44 text-xs font-medium text-[#2B2F36] zoho-required">
              Display Name
            </span>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display Name on Invoices / Bills"
              className="w-full max-w-md h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          </div>

          {/* Email Address */}
          <div className="flex items-center">
            <span className="w-44 text-xs font-medium text-[#2B2F36]">
              Email Address
            </span>
            <div className="relative w-full max-w-md">
              <Mail className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
                className="w-full h-8 pl-8 pr-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>
          </div>

          {/* Phone: Work Phone + Mobile */}
          <div className="flex items-center">
            <span className="w-44 text-xs font-medium text-[#2B2F36]">
              Phone
            </span>
            <div className="flex items-center gap-3 w-full max-w-md">
              <div className="flex-1 flex items-center border border-[#CBD5E1] rounded-[4px] bg-white h-8 overflow-hidden">
                <span className="px-2 text-[11px] text-[#6B7280] bg-[#F8F9FB] border-r border-[#CBD5E1] h-full flex items-center">
                  +91
                </span>
                <input
                  type="text"
                  value={workPhone}
                  onChange={(e) => setWorkPhone(e.target.value)}
                  placeholder="Work Phone"
                  className="flex-1 px-2 text-xs outline-none"
                />
              </div>

              <div className="flex-1 flex items-center border border-[#CBD5E1] rounded-[4px] bg-white h-8 overflow-hidden">
                <span className="px-2 text-[11px] text-[#6B7280] bg-[#F8F9FB] border-r border-[#CBD5E1] h-full flex items-center">
                  +91
                </span>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Mobile"
                  className="flex-1 px-2 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Customer Language */}
          <div className="flex items-center">
            <span className="w-44 text-xs font-medium text-[#2B2F36]">
              {entityLabel} Language
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-44 h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation Below */}
        <div className="border-b border-[#E5E7EB] pt-4 flex items-center gap-6 text-xs select-none">
          <button
            type="button"
            onClick={() => setActiveTab('other')}
            className={cn(
              'pb-2.5 font-medium transition-colors border-b-2 cursor-pointer',
              activeTab === 'other'
                ? 'border-[#408DFB] text-[#408DFB] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
            )}
          >
            Other Details
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={cn(
              'pb-2.5 font-medium transition-colors border-b-2 cursor-pointer',
              activeTab === 'address'
                ? 'border-[#408DFB] text-[#408DFB] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
            )}
          >
            Address
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={cn(
              'pb-2.5 font-medium transition-colors border-b-2 cursor-pointer',
              activeTab === 'contacts'
                ? 'border-[#408DFB] text-[#408DFB] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
            )}
          >
            Contact Persons
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('remarks')}
            className={cn(
              'pb-2.5 font-medium transition-colors border-b-2 cursor-pointer',
              activeTab === 'remarks'
                ? 'border-[#408DFB] text-[#408DFB] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#2B2F36]'
            )}
          >
            Remarks
          </button>
        </div>

        {/* TAB 1: Other Details */}
        {activeTab === 'other' && (
          <div className="space-y-4 pt-2">
            {/* GST Treatment */}
            <div className="flex items-center">
              <span className="w-44 text-xs font-medium text-[#2B2F36] zoho-required">
                GST Treatment
              </span>
              <select
                value={gstTreatment}
                onChange={(e) => setGstTreatment(e.target.value)}
                className="w-full max-w-md h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              >
                <option value="REGISTERED">Registered Business - Regular</option>
                <option value="COMPOSITION">Registered Business - Composition</option>
                <option value="UNREGISTERED">Unregistered Business</option>
                <option value="CONSUMER">Consumer</option>
                <option value="OVERSEAS">Overseas</option>
                <option value="SEZ">Special Economic Zone</option>
              </select>
            </div>

            {/* GSTIN (If registered) */}
            {gstTreatment !== 'UNREGISTERED' && gstTreatment !== 'CONSUMER' && (
              <div className="flex items-center">
                <span className="w-44 text-xs font-medium text-[#2B2F36] zoho-required">
                  GSTIN
                </span>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                  className="w-full max-w-md h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono uppercase text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>
            )}

            {/* Place / Source of Supply */}
            <div className="flex items-center">
              <span className="w-44 text-xs font-medium text-[#2B2F36] zoho-required">
                {isVendor ? 'Source of Supply' : 'Place of Supply'}
              </span>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full max-w-md h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              >
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* PAN */}
            <div className="flex items-center">
              <span className="w-44 text-xs font-medium text-[#2B2F36]">
                PAN
              </span>
              <input
                type="text"
                maxLength={10}
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="w-full max-w-md h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs font-mono uppercase text-[#2B2F36] outline-none focus:border-[#408DFB]"
              />
            </div>

            {/* Tax Preference: Taxable / Tax Exempt */}
            <div className="flex items-center">
              <span className="w-44 text-xs font-medium text-[#2B2F36] zoho-required">
                Tax Preference
              </span>
              <div className="flex items-center gap-6 text-xs text-[#2B2F36]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tax_pref"
                    checked={taxPreference === 'TAXABLE'}
                    onChange={() => setTaxPreference('TAXABLE')}
                    className="text-[#408DFB] focus:ring-0 cursor-pointer"
                  />
                  <span>Taxable</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tax_pref"
                    checked={taxPreference === 'TAX_EXEMPT'}
                    onChange={() => setTaxPreference('TAX_EXEMPT')}
                    className="text-[#408DFB] focus:ring-0 cursor-pointer"
                  />
                  <span>Tax Exempt</span>
                </label>
              </div>
            </div>

            {/* Currency (INR default) */}
            <div className="flex items-center">
              <span className="w-44 text-xs font-medium text-[#2B2F36]">
                Currency
              </span>
              <input
                type="text"
                disabled
                value="INR - Indian Rupee"
                className="w-full max-w-md h-8 px-2.5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-[4px] text-xs text-[#6B7280] cursor-not-allowed outline-none"
              />
            </div>

            {/* Opening Balance (INR prefix) */}
            <div className="flex items-center">
              <span className="w-44 text-xs font-medium text-[#2B2F36]">
                Opening Balance
              </span>
              <div className="flex items-center gap-2 w-full max-w-md">
                <div className="flex-1 flex items-center border border-[#CBD5E1] rounded-[4px] bg-white h-8 overflow-hidden">
                  <span className="px-2.5 text-xs text-[#6B7280] bg-[#F8F9FB] border-r border-[#CBD5E1] h-full flex items-center">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={openingBalanceAmount}
                    onChange={(e) => {
                      setOpeningBalanceAmount(e.target.value);
                      if (openingBalanceType === 'NONE' && Number(e.target.value) > 0) {
                        setOpeningBalanceType(isVendor ? 'CREDIT_BALANCE' : 'DEBIT_BALANCE');
                      }
                    }}
                    placeholder="0.00"
                    className="flex-1 px-2 text-xs outline-none"
                  />
                </div>

                <select
                  value={openingBalanceType}
                  onChange={(e) => setOpeningBalanceType(e.target.value as any)}
                  className="w-32 h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                >
                  <option value="NONE">None</option>
                  <option value="DEBIT_BALANCE">Debit (Dr)</option>
                  <option value="CREDIT_BALANCE">Credit (Cr)</option>
                </select>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="flex items-center">
              <span className="w-44 text-xs font-medium text-[#2B2F36]">
                Payment Terms
              </span>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full max-w-md h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
              >
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
          </div>
        )}

        {/* TAB 2: Address */}
        {activeTab === 'address' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {/* Billing Address Block */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                Billing Address
              </h3>

              <div className="space-y-1">
                <span className="text-[11px] text-[#6B7280]">Attention</span>
                <input
                  type="text"
                  value={billingAttention}
                  onChange={(e) => setBillingAttention(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#6B7280]">Street 1</span>
                <input
                  type="text"
                  value={billingStreet1}
                  onChange={(e) => setBillingStreet1(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#6B7280]">Street 2</span>
                <input
                  type="text"
                  value={billingStreet2}
                  onChange={(e) => setBillingStreet2(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-[#6B7280]">City</span>
                  <input
                    type="text"
                    value={billingCity}
                    onChange={(e) => setBillingCity(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-[#6B7280]">State</span>
                  <select
                    value={billingState}
                    onChange={(e) => setBillingState(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-[#6B7280]">ZIP / Pin Code</span>
                  <input
                    type="text"
                    value={billingPin}
                    onChange={(e) => setBillingPin(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-[#6B7280]">Phone</span>
                  <input
                    type="text"
                    value={billingPhone}
                    onChange={(e) => setBillingPhone(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address Block with "Copy billing address" Link */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#E5E7EB]">
                <h3 className="text-xs font-semibold text-[#2B2F36] uppercase tracking-wider">
                  Shipping Address
                </h3>
                <button
                  type="button"
                  onClick={handleCopyBillingAddress}
                  className="inline-flex items-center gap-1 text-[11px] text-[#408DFB] hover:underline font-medium cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy billing address</span>
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#6B7280]">Attention</span>
                <input
                  type="text"
                  value={shippingAttention}
                  onChange={(e) => setShippingAttention(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#6B7280]">Street 1</span>
                <input
                  type="text"
                  value={shippingStreet1}
                  onChange={(e) => setShippingStreet1(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#6B7280]">Street 2</span>
                <input
                  type="text"
                  value={shippingStreet2}
                  onChange={(e) => setShippingStreet2(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-[#6B7280]">City</span>
                  <input
                    type="text"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-[#6B7280]">State</span>
                  <select
                    value={shippingState}
                    onChange={(e) => setShippingState(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-[#6B7280]">ZIP / Pin Code</span>
                  <input
                    type="text"
                    value={shippingPin}
                    onChange={(e) => setShippingPin(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-[#6B7280]">Phone</span>
                  <input
                    type="text"
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Contact Persons */}
        {activeTab === 'contacts' && (
          <div className="space-y-3 pt-2">
            <div className="border border-[#E5E7EB] rounded-[4px] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-left">
                    <th className="px-3 py-2 w-20">Salutation</th>
                    <th className="px-3 py-2">First Name</th>
                    <th className="px-3 py-2">Last Name</th>
                    <th className="px-3 py-2">Email Address</th>
                    <th className="px-3 py-2">Work Phone</th>
                    <th className="px-3 py-2">Mobile</th>
                    <th className="w-10 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {contactPersons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                        No contact persons added yet. Click "+ Add Contact Person" below.
                      </td>
                    </tr>
                  ) : (
                    contactPersons.map((cp, idx) => (
                      <tr key={idx} className="group hover:bg-[#F9FAFB]">
                        <td className="px-2 py-1.5">
                          <select
                            value={cp.salutation}
                            onChange={(e) => handleContactPersonChange(idx, 'salutation', e.target.value)}
                            className="w-full h-7 px-1 bg-white border border-[#CBD5E1] rounded-[4px] text-xs outline-none"
                          >
                            <option value="Mr.">Mr.</option>
                            <option value="Mrs.">Mrs.</option>
                            <option value="Ms.">Ms.</option>
                            <option value="Dr.">Dr.</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={cp.firstName}
                            onChange={(e) => handleContactPersonChange(idx, 'firstName', e.target.value)}
                            placeholder="First Name"
                            className="w-full h-7 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={cp.lastName}
                            onChange={(e) => handleContactPersonChange(idx, 'lastName', e.target.value)}
                            placeholder="Last Name"
                            className="w-full h-7 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="email"
                            value={cp.email}
                            onChange={(e) => handleContactPersonChange(idx, 'email', e.target.value)}
                            placeholder="email@domain.com"
                            className="w-full h-7 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={cp.workPhone}
                            onChange={(e) => handleContactPersonChange(idx, 'workPhone', e.target.value)}
                            placeholder="Work Phone"
                            className="w-full h-7 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={cp.mobile}
                            onChange={(e) => handleContactPersonChange(idx, 'mobile', e.target.value)}
                            placeholder="Mobile"
                            className="w-full h-7 px-2 bg-white border border-[#CBD5E1] rounded-[4px] text-xs outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveContactPerson(idx)}
                            className="text-[#6B7280] hover:text-[#E54B4B] p-1 cursor-pointer"
                            title="Remove contact person"
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#408DFB] hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contact Person</span>
            </button>
          </div>
        )}

        {/* TAB 4: Remarks */}
        {activeTab === 'remarks' && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-medium text-[#2B2F36]">
              Remarks (For Internal Use)
            </span>
            <textarea
              rows={5}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any internal remarks or notes regarding this business contact..."
              className="w-full max-w-2xl p-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          </div>
        )}
      </div>

      {/* 3. Pinned Footer: Save, Cancel */}
      <ZohoFormFooter
        primaryActions={[
          {
            label: saveMutation.isPending ? 'Saving...' : 'Save',
            type: 'submit',
            disabled: saveMutation.isPending,
          },
        ]}
        secondaryActions={[
          {
            label: 'Cancel',
            onClick: () => navigate(`/${entityPath}`),
          },
        ]}
      />
    </form>
  );
};
