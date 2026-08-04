import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSessionStore } from '../../auth/stores/sessionStore';
import { apiClient } from '../../../core/api/apiClient';
import toast from 'react-hot-toast';
import { Paintbrush, FileText, Upload } from 'lucide-react';

export function InvoiceBrandingSettings() {
  const { user, setSession } = useSessionStore();
  const companyData = (user as any)?.company;
  const settings = companyData?.settings || {};
  const invoiceConfig = settings.invoiceConfig || {};

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      primaryColor: invoiceConfig.primaryColor || '#000000',
      secondaryColor: invoiceConfig.secondaryColor || '#555555',
      fontFamily: invoiceConfig.fontFamily || 'Helvetica',
      templateType: invoiceConfig.templateType || 'classic',
      showQR: invoiceConfig.showQR !== undefined ? invoiceConfig.showQR : true,
      footerNotes: invoiceConfig.footerNotes || '',
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState<string | null>(settings.digitalSignatureUrl || null);
  const [companySeal, setCompanySeal] = useState<string | null>(settings.companySealUrl || null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const payload = {
        invoiceConfig: {
          ...data,
        },
        digitalSignatureUrl: digitalSignature,
        companySealUrl: companySeal,
      };

      const res = await apiClient.patch('/auth/company', payload);
      if (res.data) {
        setSession({ ...useSessionStore.getState(), user: { ...user, company: res.data } } as any);
        toast.success('Invoice branding updated');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Paintbrush className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Invoice Template & Branding</h2>
            <p className="text-sm text-muted-foreground">Customize how your invoices look to your clients</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-medium text-foreground flex items-center gap-2 border-b border-border pb-2"><FileText className="w-4 h-4"/> Layout & Colors</h3>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Template Style</label>
              <select {...register('templateType')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="classic">Classic GST (Default)</option>
                <option value="modern">Modern Minimal</option>
                <option value="corporate">Corporate Standard</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" {...register('primaryColor')} className="h-8 w-12 rounded border border-border bg-background cursor-pointer" />
                  <span className="text-xs text-muted-foreground uppercase">{/* Will display color val in real app */}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" {...register('secondaryColor')} className="h-8 w-12 rounded border border-border bg-background cursor-pointer" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Typography / Font</label>
              <select {...register('fontFamily')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="Helvetica">Helvetica (Standard)</option>
                <option value="Times-Roman">Times Roman</option>
                <option value="Courier">Courier</option>
              </select>
            </div>

            <div className="flex items-center mt-4">
              <input type="checkbox" {...register('showQR')} className="mr-2 h-4 w-4 rounded border-border bg-background text-accent cursor-pointer" />
              <label className="text-sm font-medium text-foreground cursor-pointer">Generate & Display Dynamic UPI QR on Invoices</label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">Ensure you have added a default Bank Account with a UPI ID.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-foreground flex items-center gap-2 border-b border-border pb-2"><Upload className="w-4 h-4"/> Signatures & Seals</h3>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Authorized Digital Signature</label>
              <div className="flex items-center gap-4">
                {digitalSignature && (
                  <img src={digitalSignature} alt="Signature" className="h-16 w-32 object-contain bg-background border border-border rounded p-1" />
                )}
                <label className="cursor-pointer bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded text-sm border border-border transition-colors">
                  Upload Image
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, setDigitalSignature)} />
                </label>
                {digitalSignature && <button type="button" onClick={() => setDigitalSignature(null)} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button>}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-foreground mb-1">Company Seal / Stamp</label>
              <div className="flex items-center gap-4">
                {companySeal && (
                  <img src={companySeal} alt="Seal" className="h-16 w-16 object-contain bg-background border border-border rounded p-1" />
                )}
                <label className="cursor-pointer bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded text-sm border border-border transition-colors">
                  Upload Image
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, setCompanySeal)} />
                </label>
                {companySeal && <button type="button" onClick={() => setCompanySeal(null)} className="text-xs text-red-500 hover:underline cursor-pointer">Remove</button>}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-foreground mb-1">Footer Notes / Declaration</label>
              <textarea 
                {...register('footerNotes')} 
                rows={3}
                placeholder="e.g. Thanks for your business!"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

          </div>
        </div>

        <div className="flex justify-end pt-6 mt-6 border-t border-border">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-accent text-accent-foreground px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Saving...' : 'Save Branding Settings'}
          </button>
        </div>
      </div>
    </form>
  );
}
