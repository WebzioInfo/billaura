import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Building, MapPin, DollarSign, FileText, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageContainer, LoadingState } from '@/components/ui/LayoutComponents';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import apiClient from '@/services/api';
import { toast } from 'sonner';

export const VendorForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  
  // Basic
  const [vendorCode, setVendorCode] = useState('');
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [customerType, setCustomerType] = useState('UNREGISTERED');
  
  // Contact
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Tax
  const [gstin, setGstin] = useState('');
  const [panNumber, setPanNumber] = useState('');
  
  // Address
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  
  // Financial & Notes
  const [creditLimit, setCreditLimit] = useState(0);
  const [notes, setNotes] = useState('');

  // Fetch Existing Vendor
  const { data: existingVendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const res = await apiClient.get(`/vendors/${id}`);
      return res.data?.data || res.data || null;
    },
    enabled: isEditMode
  });

  useEffect(() => {
    if (existingVendor) {
      setVendorCode(existingVendor.bpCode || existingVendor.vendorCode || '');
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
      setCreditLimit(Number(existingVendor.creditLimit || 0));
      setNotes(existingVendor.notes || '');
    }
  }, [existingVendor]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditMode) {
        return apiClient.patch(`/vendors/${id}`, payload);
      }
      return apiClient.post('/vendors', payload);
    },
    onSuccess: () => {
      toast.success(isEditMode ? 'Vendor profile updated' : 'Vendor created successfully');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      navigate('/vendors');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save vendor');
    },
    onSettled: () => {
      setSaving(false);
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error('Vendor Name is required'); return; }

    setSaving(true);
    saveMutation.mutate({
      vendorCode,
      name,
      tradeName,
      customerType,
      email,
      phone,
      gstin,
      panNumber,
      address,
      state,
      pinCode,
      creditLimit,
      notes,
      bpType: 'VENDOR'
    });
  };

  if (isEditMode && isLoading) {
    return <PageContainer maxWidth="4xl"><LoadingState variant="form" /></PageContainer>;
  }

  return (
    <PageContainer maxWidth="5xl">
      <form onSubmit={handleSave} className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5 sticky top-0 bg-background z-20">
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
                {isEditMode ? 'Update vendor details and financial limits' : 'Add a new supplier to the master directory'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/vendors')}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving} className="min-w-[120px] font-bold">
              {saving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Vendor')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Info */}
            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <Building className="w-4 h-4 text-primary" /> Basic Information
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vendor Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={vendorCode}
                    onChange={(e) => setVendorCode(e.target.value.toUpperCase())}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary uppercase font-mono"
                    placeholder="e.g. VEND-001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vendor Type</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="UNREGISTERED">Unregistered / Consumer</option>
                    <option value="REGULAR">Regular (GST Registered)</option>
                    <option value="COMPOSITION">Composition</option>
                    <option value="OVERSEAS">Overseas (Import)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Primary Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="Company or Individual Name"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trade Name (Optional)</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="billing@vendor.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="+91..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billing Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary min-h-[80px]"
                    placeholder="Full street address..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Select State</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">PIN Code</label>
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="6 digits"
                  />
                </div>
              </div>
            </Card>

            {/* Notes */}
            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <FileText className="w-4 h-4 text-primary" /> Internal Notes
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary min-h-[100px]"
                placeholder="Internal remarks, preferred carrier details, etc..."
              />
            </Card>

          </div>

          {/* Right Sidebar Area */}
          <div className="space-y-6">
            
            {/* Tax Details */}
            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <DollarSign className="w-4 h-4 text-primary" /> Tax Registration
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary uppercase font-mono"
                    placeholder="15-digit GSTIN"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">PAN Number</label>
                  <input
                    type="text"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary uppercase font-mono"
                    placeholder="10-digit PAN"
                  />
                </div>
              </div>
            </Card>

            {/* Financial Limits */}
            <Card className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-6 border-b border-border/40 pb-3">
                <DollarSign className="w-4 h-4 text-primary" /> Financial Setup
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Credit Limit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Terms</label>
                  <select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
                    <option value="IMMEDIATE">Due on Receipt</option>
                    <option value="NET_15">Net 15</option>
                    <option value="NET_30">Net 30</option>
                    <option value="NET_45">Net 45</option>
                    <option value="NET_60">Net 60</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Attachments Placeholder */}
            <Card className="p-6 bg-slate-50 dark:bg-slate-900/50 border-dashed">
              <div className="flex items-center gap-2 text-foreground font-semibold mb-4">
                <Upload className="w-4 h-4 text-muted-foreground" /> Documents
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Upload GST certificate, agreements, or PAN copies.
              </p>
              <Button type="button" variant="outline" className="w-full text-xs h-8">Select Files</Button>
            </Card>

          </div>
        </div>
      </form>
    </PageContainer>
  );
};
