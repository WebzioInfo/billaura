import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Building, MapPin, DollarSign, FileText, Upload, ChevronDown, X, Search, Check
} from 'lucide-react';
import { PageContainer, LoadingState } from '@/components/ui/LayoutComponents';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import apiClient from '@/services/api';
import { toast } from 'sonner';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';

// ─── Full India State / UT List ───────────────────────────────────────────────
const INDIAN_STATES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman & Diu" },
  { code: "26", name: "Dadra & Nagar Haveli" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh (New)" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
];

// ─── Searchable State Dropdown ────────────────────────────────────────────────
interface StateSelectProps {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}

const StateSelect: React.FC<StateSelectProps> = ({ value, onChange, hasError }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? INDIAN_STATES.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : INDIAN_STATES;

  const selectedState = INDIAN_STATES.find(s => s.name === value);

  const openDropdown = () => {
    setOpen(true);
    setHighlighted(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleSelect = (stateName: string) => {
    onChange(stateName);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) handleSelect(filtered[highlighted].name);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  useEffect(() => {
    if (!open) return;
    const listEl = listRef.current?.children[highlighted] as HTMLElement;
    listEl?.scrollIntoView?.({ block: 'nearest' });
  }, [highlighted, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={`w-full bg-background border rounded-xl px-3 py-2 text-sm flex items-center justify-between cursor-pointer transition-colors ${
          hasError ? 'border-red-500' : open ? 'border-primary ring-2 ring-primary/10' : 'border-border hover:border-border/80'
        }`}
        onClick={openDropdown}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDropdown(); }}
      >
        <span className={selectedState ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedState ? `${selectedState.name}` : 'Select State / UT'}
        </span>
        <div className="flex items-center gap-1">
          {selectedState && (
            <button type="button" onClick={handleClear} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-surface border border-border rounded-xl shadow-2xl flex flex-col" style={{ maxHeight: 260 }}>
          {/* Search Input */}
          <div className="p-2 border-b border-border/60 shrink-0 relative">
            <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setHighlighted(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Type to search states..."
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          {/* Options */}
          <div className="overflow-y-auto p-1 flex-1" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">No states found</div>
            ) : (
              filtered.map((s, i) => (
                <div
                  key={s.code}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    i === highlighted ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                  } ${value === s.name ? 'font-semibold' : ''}`}
                  onClick={() => handleSelect(s.name)}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <span className="text-xs text-muted-foreground font-mono w-6 shrink-0">{s.code}</span>
                  <span className="flex-1">{s.name}</span>
                  {value === s.name && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Field error helper ────────────────────────────────────────────────────────
interface FieldError { [key: string]: string }

// ─── Main Form ────────────────────────────────────────────────────────────────
export const VendorForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});

  // Form fields
  const [vendorCode, setVendorCode] = useState('');
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [customerType, setCustomerType] = useState('UNREGISTERED');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [notes, setNotes] = useState('');

  // Auto-focus first field on mount
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isEditMode) nameRef.current?.focus();
  }, [isEditMode]);

  // Fetch existing vendor in edit mode
  const { data: existingVendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const res = await apiClient.get(`/vendors/${id}`);
      return res.data?.data || null;
    },
    enabled: isEditMode,
  });

  useDynamicTitle(isEditMode ? (existingVendor?.name ? `Edit ${existingVendor.name}` : 'Edit Vendor') : 'New Vendor');

  useEffect(() => {
    if (!existingVendor) return;
    setVendorCode(existingVendor.bpCode || '');
    setName(existingVendor.name || '');
    setTradeName(existingVendor.tradeName || '');
    setCustomerType(existingVendor.customerType || 'UNREGISTERED');
    setEmail(existingVendor.email || '');
    setPhone(existingVendor.phone || '');
    setGstin(existingVendor.gstin || '');
    setPanNumber(existingVendor.panNumber || '');
    setAddress(existingVendor.address || '');
    setState(existingVendor.state || '');
    setPinCode(existingVendor.pinCode || '');
    setNotes(existingVendor.notes || '');
  }, [existingVendor]);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: FieldError = {};

    if (!name.trim()) newErrors.name = 'Vendor name is required';

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase())) {
      newErrors.gstin = 'GSTIN must be a valid 15-character format';
    }

    if (panNumber.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.trim().toUpperCase())) {
      newErrors.panNumber = 'PAN must be in the format ABCDE1234F';
    }

    if (pinCode.trim() && !/^\d{6}$/.test(pinCode.trim())) {
      newErrors.pinCode = 'PIN Code must be exactly 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, gstin, panNumber, pinCode]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditMode) {
        const res = await apiClient.patch(`/vendors/${id}`, payload);
        return res.data;
      }
      const res = await apiClient.post('/vendors', payload);
      return res.data;
    },
    onSuccess: (responseData) => {
      const createdId = responseData?.data?.id;
      toast.success(isEditMode ? 'Vendor profile updated' : 'Vendor created successfully');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      if (!isEditMode && createdId) {
        navigate(`/vendors/${createdId}`);
      } else {
        navigate('/vendors');
      }
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        'Failed to save vendor. Please check your input and try again.';
      toast.error(msg);
    },
    onSettled: () => setSaving(false),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    saveMutation.mutate({
      vendorCode: vendorCode.trim() || undefined,
      name: name.trim(),
      tradeName: tradeName.trim() || undefined,
      customerType,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      gstin: gstin.trim() || undefined,
      panNumber: panNumber.trim() || undefined,
      address: address.trim() || undefined,
      state: state || undefined,
      pinCode: pinCode.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  // Enter-key advances to next field
  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, nextRef?: React.RefObject<HTMLElement | null>) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  };

  // Refs for tab/enter navigation
  const vendorCodeRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const tradeNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const gstinRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  if (isEditMode && isLoading) {
    return <PageContainer maxWidth="4xl"><LoadingState variant="form" /></PageContainer>;
  }

  return (
    <PageContainer maxWidth="5xl">
      <form onSubmit={handleSave} className="space-y-6 pb-16" noValidate>
        {/* ── Sticky Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5 sticky top-0 bg-background z-20 pt-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/vendors')}
              className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer text-muted-foreground hover:text-foreground border border-border/40 bg-surface"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {isEditMode ? 'Edit Vendor Profile' : 'Register New Vendor'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditMode
                  ? 'Update supplier contact, tax, and address details'
                  : 'Add a new supplier to the master vendor directory'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/vendors')}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              className="min-w-[140px] font-bold"
            >
              {saving
                ? 'Saving...'
                : isEditMode
                ? 'Save Changes'
                : 'Create Vendor'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left / Main area ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic Information */}
            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <Building className="w-4 h-4 text-primary" /> Basic Information
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Primary Name — first field, autofocused */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Vendor / Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: '' })); }}
                    onKeyDown={e => handleFieldKeyDown(e, vendorCodeRef)}
                    className={`w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'}`}
                    placeholder="e.g. Reliance Industries Ltd."
                  />
                  {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* Vendor Code */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Vendor Code <span className="text-muted-foreground font-normal normal-case">(auto-generated if blank)</span>
                  </label>
                  <input
                    ref={vendorCodeRef}
                    type="text"
                    value={vendorCode}
                    onChange={e => setVendorCode(e.target.value.toUpperCase())}
                    onKeyDown={e => handleFieldKeyDown(e, typeRef)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary uppercase font-mono"
                    placeholder="e.g. VEND-001"
                  />
                </div>

                {/* Vendor Type */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    GST Registration Type
                  </label>
                  <select
                    ref={typeRef}
                    value={customerType}
                    onChange={e => setCustomerType(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="UNREGISTERED">Unregistered</option>
                    <option value="REGISTERED">Regular (GST Registered)</option>
                    <option value="COMPOSITION">Composition Dealer</option>
                    <option value="SEZ">SEZ Unit / Developer</option>
                    <option value="EXPORT">Overseas / Import</option>
                  </select>
                </div>

                {/* Trade Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Trade Name <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    ref={tradeNameRef}
                    type="text"
                    value={tradeName}
                    onChange={e => setTradeName(e.target.value)}
                    onKeyDown={e => handleFieldKeyDown(e, emailRef)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="Doing business as (DBA)"
                  />
                </div>
              </div>
            </Card>

            {/* Address & Contact */}
            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <MapPin className="w-4 h-4 text-primary" /> Address & Contact Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
                    onKeyDown={e => handleFieldKeyDown(e, phoneRef)}
                    className={`w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'}`}
                    placeholder="billing@vendor.com"
                  />
                  {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input
                    ref={phoneRef}
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="+91 98765 43210"
                  />
                </div>

                {/* Billing Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Billing Address
                  </label>
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary min-h-[80px] resize-none"
                    placeholder="Full street address, building, area..."
                  />
                </div>

                {/* State — searchable dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    State / Union Territory
                  </label>
                  <StateSelect value={state} onChange={setState} />
                </div>

                {/* PIN Code — optional */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    PIN Code <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    ref={pinRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinCode}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPinCode(v);
                      if (errors.pinCode) setErrors(p => ({ ...p, pinCode: '' }));
                    }}
                    className={`w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none font-mono tracking-widest ${errors.pinCode ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'}`}
                    placeholder="6-digit PIN"
                  />
                  {errors.pinCode && <p className="mt-1.5 text-xs text-red-500">{errors.pinCode}</p>}
                </div>
              </div>
            </Card>

            {/* Internal Notes */}
            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <FileText className="w-4 h-4 text-primary" /> Internal Notes
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary min-h-[100px] resize-none"
                placeholder="Internal remarks, carrier preferences, special instructions, payment conditions..."
              />
            </Card>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-6">

            {/* Tax Registration */}
            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <DollarSign className="w-4 h-4 text-primary" /> Tax Registration
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    GSTIN <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    ref={gstinRef}
                    type="text"
                    value={gstin}
                    onChange={e => {
                      const v = e.target.value.toUpperCase().slice(0, 15);
                      setGstin(v);
                      if (errors.gstin) setErrors(p => ({ ...p, gstin: '' }));
                    }}
                    onKeyDown={e => handleFieldKeyDown(e, panRef)}
                    className={`w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none uppercase font-mono tracking-widest ${errors.gstin ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'}`}
                    placeholder="27AAAAA0000A1Z5"
                    maxLength={15}
                  />
                  {errors.gstin && <p className="mt-1.5 text-xs text-red-500">{errors.gstin}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    PAN Number <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    ref={panRef}
                    type="text"
                    value={panNumber}
                    onChange={e => {
                      const v = e.target.value.toUpperCase().slice(0, 10);
                      setPanNumber(v);
                      if (errors.panNumber) setErrors(p => ({ ...p, panNumber: '' }));
                    }}
                    className={`w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none uppercase font-mono tracking-widest ${errors.panNumber ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'}`}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                  {errors.panNumber && <p className="mt-1.5 text-xs text-red-500">{errors.panNumber}</p>}
                </div>
              </div>
            </Card>

            {/* Documents placeholder */}
            <Card className="p-6 border-dashed bg-muted/20">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-4">
                <Upload className="w-4 h-4 text-muted-foreground" /> Documents
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Upload GST certificate, trade agreements, or PAN copies for record-keeping.
              </p>
              <Button type="button" variant="outline" className="w-full text-xs h-8" disabled>
                Select Files (Coming Soon)
              </Button>
            </Card>

            {/* Tip card */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl p-4">
              <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1">💡 Quick Tip</p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/70 leading-relaxed">
                Only <strong>Vendor Name</strong> is mandatory. All other fields can be filled in later from the Vendor Profile page.
              </p>
            </div>
          </div>
        </div>
      </form>
    </PageContainer>
  );
};
