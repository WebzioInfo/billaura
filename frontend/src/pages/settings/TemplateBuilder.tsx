import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTemplateBuilderStore } from '@/stores/templateBuilderStore';
import { DocumentRenderer } from '@/components/documents/DocumentRenderer';
import { templateService } from '@/services/api/templateService';
import { Loader2, Save, ArrowLeft, Palette, LayoutTemplate, ToggleLeft, FileText, Monitor, Smartphone, Printer } from 'lucide-react';
import notification from '@/services/NotificationService';

export default function TemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { template, setTemplate, activeTab, setActiveTab, updateColors, updateTypography, updateElements } = useTemplateBuilderStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'print'>('desktop');

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    setIsLoading(true);
    try {
      const data = await templateService.getTemplate(id!);
      setTemplate(data);
    } catch (error) {
      notification.error('Failed to load template');
      navigate('/settings/templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (id) {
        await templateService.updateTemplate(id, template);
        notification.success('Template updated successfully');
      } else {
        const newTemplate = await templateService.createTemplate(template);
        notification.success('Template created successfully');
        navigate(`/settings/templates/${newTemplate.id}`);
      }
    } catch (error) {
      notification.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Topbar */}
      <header className="flex-none h-16 border-b border-border bg-surface px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/settings/templates')} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-foreground">
              {template.name || 'Untitled Template'}
            </h1>
            <p className="text-xs text-muted-foreground">Document Template Builder</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
          <button 
            onClick={() => setPreviewDevice('desktop')}
            className={`p-1.5 rounded-md ${previewDevice === 'desktop' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setPreviewDevice('mobile')}
            className={`p-1.5 rounded-md ${previewDevice === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setPreviewDevice('print')}
            className={`p-1.5 rounded-md ${previewDevice === 'print' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent/90 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Template
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-80 flex-none border-r border-border bg-surface flex flex-col h-full overflow-hidden">
          <div className="flex p-2 gap-1 border-b border-border bg-muted/30">
            <button 
              onClick={() => setActiveTab('theme')}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'theme' ? 'bg-background shadow-sm text-accent' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Palette className="w-4 h-4 mb-1" /> Theme
            </button>
            <button 
              onClick={() => setActiveTab('layout')}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'layout' ? 'bg-background shadow-sm text-accent' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <LayoutTemplate className="w-4 h-4 mb-1" /> Layout
            </button>
            <button 
              onClick={() => setActiveTab('elements')}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium transition-colors ${activeTab === 'elements' ? 'bg-background shadow-sm text-accent' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <ToggleLeft className="w-4 h-4 mb-1" /> Elements
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Brand Colors</h3>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Primary Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={template.colors?.primary || '#0f172a'}
                        onChange={(e) => updateColors({ primary: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={template.colors?.primary || '#0f172a'}
                        onChange={(e) => updateColors({ primary: e.target.value })}
                        className="flex-1 bg-background border border-border rounded px-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Secondary Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={template.colors?.secondary || '#64748b'}
                        onChange={(e) => updateColors({ secondary: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={template.colors?.secondary || '#64748b'}
                        onChange={(e) => updateColors({ secondary: e.target.value })}
                        className="flex-1 bg-background border border-border rounded px-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Typography</h3>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Font Family</label>
                    <select 
                      value={template.typography?.fontFamily || 'Inter'}
                      onChange={(e) => updateTypography({ fontFamily: e.target.value })}
                      className="w-full bg-background border border-border rounded p-2 text-sm"
                    >
                      <option value="Inter">Inter (Sans Serif)</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Merriweather">Merriweather (Serif)</option>
                      <option value="Courier New">Courier New (Monospace)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Base Size</label>
                    <input 
                      type="text" 
                      value={template.typography?.fontSize || '14px'}
                      onChange={(e) => updateTypography({ fontSize: e.target.value })}
                      className="w-full bg-background border border-border rounded p-2 text-sm"
                      placeholder="e.g. 14px or 0.875rem"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'elements' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold mb-4">Toggle Document Elements</h3>
                
                {[
                  { key: 'showLogo', label: 'Company Logo' },
                  { key: 'showGstin', label: 'GSTIN Number' },
                  { key: 'showPan', label: 'PAN Number' },
                  { key: 'showHsn', label: 'HSN/SAC Column' },
                  { key: 'showTaxBreakup', label: 'Tax Breakup (CGST/SGST)' },
                  { key: 'showBankDetails', label: 'Bank Account Details' },
                  { key: 'showTerms', label: 'Terms & Conditions' },
                  { key: 'showSignature', label: 'Authorized Signature' },
                  { key: 'showQrCode', label: 'UPI / Payment QR Code' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-foreground group-hover:text-accent transition-colors">{item.label}</span>
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={template.elements?.[item.key as keyof typeof template.elements] || false}
                      onChange={(e) => updateElements({ [item.key]: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent relative"></div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Live Preview Pane */}
        <main className="flex-1 bg-muted/20 overflow-y-auto p-8 flex justify-center">
          <div style={{ transform: previewDevice === 'mobile' ? 'scale(0.8)' : 'scale(1)', transformOrigin: 'top center' }}>
            <DocumentRenderer 
              template={template} 
              data={{
                companyName: 'Bill Aura Tech Pvt Ltd',
                invoiceNo: 'INV-2023-001',
                customerName: 'Acme Corp',
                grandTotal: '1,18,000'
              }} 
            />
          </div>
        </main>
      </div>
    </div>
  );
}
