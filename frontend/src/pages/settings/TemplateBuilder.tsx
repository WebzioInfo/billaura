import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Upload,
  Trash2,
  Eye,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { templateService } from '@/features/settings/services/templateService';
import { DocumentTemplate } from '@/features/settings/types/template';
import { DocumentRenderer } from '@/shared/components/documents/DocumentRenderer';
import notification from '@/core/services/NotificationService';

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  quote: 'Quotation',
  sales_order: 'Sales Order',
  credit_note: 'Credit Note',
  receipt: 'Payment Receipt',
  purchase_order: 'Purchase Order',
  bill: 'Bill',
  delivery_challan: 'Delivery Challan',
};

const COLOR_PRESETS = [
  '#408dfb', // Zoho Blue
  '#2563eb', // Royal Blue
  '#0f766e', // Teal
  '#16a34a', // Emerald Green
  '#7c3aed', // Purple
  '#e11d48', // Crimson Rose
  '#ea580c', // Orange
  '#1e293b', // Slate Charcoal
];

const FONT_OPTIONS = ['Inter', 'Roboto', 'Helvetica', 'Arial', 'Georgia'];

export default function TemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryType = searchParams.get('type') || 'invoice';
  const isNew = !id || id === 'new';

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Template State
  const [name, setName] = useState('New Template');
  const [docType, setDocType] = useState(queryType);
  const [isDefault, setIsDefault] = useState(false);
  const [isSystem, setIsSystem] = useState(false);

  // 1. Header & Logo
  const [useOrgLogo, setUseOrgLogo] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showLogo, setShowLogo] = useState(true);
  const [logoPosition, setLogoPosition] = useState<'left' | 'center' | 'right'>('left');
  const [logoWidth, setLogoWidth] = useState(140);
  const [showOrgName, setShowOrgName] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showGstin, setShowGstin] = useState(true);
  const [showPan, setShowPan] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [showWebsite, setShowWebsite] = useState(true);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // 2. Document details
  const [documentTitle, setDocumentTitle] = useState('TAX INVOICE');
  const [numberingLabel, setNumberingLabel] = useState('Invoice#');
  const [showDueDate, setShowDueDate] = useState(true);
  const [showPlaceOfSupply, setShowPlaceOfSupply] = useState(true);
  const [showPoNumber, setShowPoNumber] = useState(true);

  // 3. Party details
  const [showBillTo, setShowBillTo] = useState(true);
  const [showShipTo, setShowShipTo] = useState(true);

  // 4. Line items table
  const [columns, setColumns] = useState({
    item: { visible: true, label: 'Item & Description' },
    hsn: { visible: true, label: 'HSN/SAC' },
    qty: { visible: true, label: 'Qty' },
    rate: { visible: true, label: 'Rate' },
    discount: { visible: true, label: 'Discount' },
    tax: { visible: true, label: 'Tax %' },
    amount: { visible: true, label: 'Amount' },
  });
  const [tableHeaderBg, setTableHeaderBg] = useState('#f8fafc');
  const [tableHeaderText, setTableHeaderText] = useState('#1e293b');

  // 5. Totals
  const [showSubTotal, setShowSubTotal] = useState(true);
  const [showDiscount, setShowDiscount] = useState(true);
  const [showTaxBreakup, setShowTaxBreakup] = useState(true);
  const [showRoundOff, setShowRoundOff] = useState(true);
  const [showTotalInWords, setShowTotalInWords] = useState(true);

  // 6. Footer
  const [notes, setNotes] = useState('Thank you for your business.');
  const [terms, setTerms] = useState(
    '1. Payment due upon receipt.\n2. Goods once sold will not be taken back.\n3. Subject to local jurisdiction.'
  );
  const [showNotes, setShowNotes] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [showPoweredBy, setShowPoweredBy] = useState(false);

  // 7. Style
  const [primaryColor, setPrimaryColor] = useState('#408dfb');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState('13px');
  const [paperSize, setPaperSize] = useState<'A4' | 'LETTER' | 'LEGAL'>('A4');
  const [orientation, setOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [margins, setMargins] = useState('24px');

  // Accordion collapsed state (only Header open initially)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    header: true,
    docDetails: false,
    parties: false,
    lineItems: false,
    totals: false,
    footer: false,
    style: false,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load existing template if editing
  useEffect(() => {
    if (!isNew && id) {
      loadTemplate(id);
    } else {
      // Default initial title based on queryType
      const label = DOC_TYPE_LABELS[queryType] || 'Invoice';
      setName(`Custom ${label} Template`);
      setDocType(queryType);
      setDocumentTitle(label.toUpperCase());
      setNumberingLabel(`${label}#`);
    }
  }, [id, isNew, queryType]);

  const loadTemplate = async (templateId: string) => {
    setIsLoading(true);
    try {
      const data = await templateService.getTemplate(templateId);
      setName(data.name || 'Untitled Template');
      const loadedDocType = data.docType || data.type || 'invoice';
      setDocType(loadedDocType);
      setIsDefault(Boolean(data.isDefault));
      setIsSystem(Boolean(data.isSystem));

      // Logo
      if (data.logoSettings) {
        setUseOrgLogo(data.logoSettings.useOrgLogo !== false);
        setShowLogo(data.logoSettings.showLogo !== false);
        setLogoPosition(data.logoSettings.position || 'left');
        setLogoWidth(data.logoSettings.width || 140);
      }
      setLogoUrl(data.logoUrl || null);

      // Elements
      if (data.elements) {
        setShowGstin(data.elements.showGstin !== false);
        setShowPan(data.elements.showPan !== false);
        setShowBankDetails(data.elements.showBankDetails !== false);
        setShowTerms(data.elements.showTerms !== false);
        setShowSignature(data.elements.showSignature !== false);
        setShowTaxBreakup(data.elements.showTaxBreakup !== false);
      }

      // Config
      if (data.config) {
        if (data.config.documentTitle) setDocumentTitle(data.config.documentTitle);
        if (data.config.numberingLabel) setNumberingLabel(data.config.numberingLabel);
        setShowDueDate(data.config.showDueDate !== false);
        setShowPlaceOfSupply(data.config.showPlaceOfSupply !== false);
        setShowPoNumber(data.config.showPoNumber !== false);
        setShowBillTo(data.config.showBillTo !== false);
        setShowShipTo(data.config.showShipTo !== false);

        if (data.config.columns) {
          setColumns((prev) => ({ ...prev, ...data.config!.columns }));
        }
        if (data.config.tableHeaderBg) setTableHeaderBg(data.config.tableHeaderBg);
        if (data.config.tableHeaderText) setTableHeaderText(data.config.tableHeaderText);

        if (data.config.totals) {
          setShowSubTotal(data.config.totals.showSubTotal !== false);
          setShowDiscount(data.config.totals.showDiscount !== false);
          setShowRoundOff(data.config.totals.showRoundOff !== false);
          setShowTotalInWords(data.config.totals.showTotalInWords !== false);
        }

        if (data.config.footer) {
          setShowNotes(data.config.footer.showNotes !== false);
          setShowPoweredBy(Boolean(data.config.footer.showPoweredBy));
        }
      }

      if (data.terms !== null && data.terms !== undefined) setTerms(data.terms);
      if (data.notes !== null && data.notes !== undefined) setNotes(data.notes);

      // Colors & Styling
      if (data.colors?.primary) setPrimaryColor(data.colors.primary);
      if (data.typography?.fontFamily) setFontFamily(data.typography.fontFamily);
      if (data.typography?.fontSize) setFontSize(data.typography.fontSize);
      if (data.layout?.paperSize) setPaperSize(data.layout.paperSize);
      if (data.layout?.orientation) setOrientation(data.layout.orientation);
      if (data.layout?.margins) setMargins(data.layout.margins);
    } catch (err: any) {
      notification.error('Failed to load template.');
      navigate('/settings/templates');
    } finally {
      setIsLoading(false);
    }
  };

  // Unsaved changes listener
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const markDirty = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  // File Upload Handling
  const handleLogoUpload = async (file: File) => {
    setLogoUploadError(null);

    // Validate size (max 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('File size exceeds the maximum limit of 2 MB.');
      return;
    }

    // Validate type
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setLogoUploadError('Only PNG, JPG, SVG, and WEBP images are supported.');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const uploadedUrl = await templateService.uploadLogo(file);
      setLogoUrl(uploadedUrl);
      setUseOrgLogo(false);
      markDirty();
      notification.success('Logo uploaded successfully.');
    } catch (err: any) {
      setLogoUploadError(err?.response?.data?.message || 'Failed to upload logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Compile active template snapshot for DocumentRenderer
  const currentTemplateSnapshot: Partial<DocumentTemplate> = {
    name,
    docType,
    type: docType,
    isDefault,
    isSystem,
    logoUrl,
    logoSettings: {
      showLogo,
      useOrgLogo,
      position: logoPosition,
      width: logoWidth,
    },
    colors: {
      primary: primaryColor,
      secondary: '#1e293b',
      text: '#333333',
      background: '#ffffff',
    },
    typography: {
      fontFamily,
      fontSize,
      headerSize: '20px',
    },
    layout: {
      orientation,
      paperSize,
      margins,
    },
    elements: {
      showLogo,
      showGstin,
      showPan,
      showBankDetails,
      showTerms,
      showSignature,
      showTaxBreakup,
      showHsn: columns.hsn?.visible !== false,
      showQrCode: false,
    },
    config: {
      documentTitle,
      numberingLabel,
      showDueDate,
      showPlaceOfSupply,
      showPoNumber,
      showBillTo,
      showShipTo,
      columns,
      tableHeaderBg,
      tableHeaderText,
      totals: {
        showSubTotal,
        showDiscount,
        showTaxBreakup,
        showRoundOff,
        showTotalInWords,
      },
      footer: {
        showNotes,
        showTerms,
        showBankDetails,
        showSignature,
        showPoweredBy,
      },
    },
    terms,
    notes,
  };

  // Save Template Action
  const handleSave = async (shouldSetDefault: boolean = false) => {
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Template name is required.');
      notification.error('Template name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: trimmedName,
        docType,
        type: docType,
        isDefault: shouldSetDefault ? true : isDefault,
        logoUrl: useOrgLogo ? null : logoUrl,
        logoSettings: {
          showLogo,
          useOrgLogo,
          position: logoPosition,
          width: logoWidth,
        },
        colors: {
          primary: primaryColor,
          secondary: '#1e293b',
          text: '#333333',
          background: '#ffffff',
        },
        typography: {
          fontFamily,
          fontSize,
          headerSize: '20px',
        },
        layout: {
          orientation,
          paperSize,
          margins,
        },
        elements: {
          showLogo,
          showGstin,
          showPan,
          showBankDetails,
          showTerms,
          showSignature,
          showTaxBreakup,
          showHsn: columns.hsn?.visible !== false,
          showQrCode: false,
        },
        config: {
          documentTitle,
          numberingLabel,
          showDueDate,
          showPlaceOfSupply,
          showPoNumber,
          showBillTo,
          showShipTo,
          columns,
          tableHeaderBg,
          tableHeaderText,
          totals: {
            showSubTotal,
            showDiscount,
            showTaxBreakup,
            showRoundOff,
            showTotalInWords,
          },
          footer: {
            showNotes,
            showTerms,
            showBankDetails,
            showSignature,
            showPoweredBy,
          },
        },
        terms,
        notes,
      };

      if (!isNew && id) {
        await templateService.updateTemplate(id, payload);
        if (shouldSetDefault && !isDefault) {
          await templateService.setDefault(id);
          setIsDefault(true);
        }
        notification.success('Template saved successfully.');
      } else {
        const created = await templateService.createTemplate(payload);
        if (shouldSetDefault) {
          await templateService.setDefault(created.id);
        }
        notification.success('Template created successfully.');
        navigate(`/settings/templates/${created.id}/edit`, { replace: true });
      }

      setHasUnsavedChanges(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save template.';
      setErrorMessage(msg);
      notification.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard and return to templates?')) {
        return;
      }
    }
    navigate(`/settings/templates?type=${docType}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#408dfb]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f5f6fa] text-[#333333] font-sans overflow-hidden">
      {/* Fixed Topbar C2 */}
      <header className="flex-none h-14 bg-white border-b border-[#e5e7eb] px-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="p-1.5 hover:bg-[#f1f3f5] text-[#6c7380] hover:text-[#333333] rounded-[4px] transition-colors cursor-pointer"
            title="Back to Templates"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                markDirty();
              }}
              placeholder="Template Name"
              className="text-[16px] font-semibold text-[#1e293b] bg-transparent border-b border-transparent hover:border-[#cbd5e1] focus:border-[#408dfb] px-1 py-0.5 outline-none transition-colors"
            />
            <span className="px-2 py-0.5 bg-[#f1f3f5] text-[#6c7380] text-[11px] font-medium rounded-[3px]">
              {DOC_TYPE_LABELS[docType] || docType}
            </span>
            {isDefault && (
              <span className="px-2 py-0.5 bg-[#e8f5e9] text-[#2e7d32] text-[11px] font-medium rounded-[3px]">
                Default
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {errorMessage && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#dc2626] mr-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleCancel}
            className="h-8 px-3.5 bg-white border border-[#d9dce3] hover:bg-[#f8fafc] text-[#333333] text-[13px] font-medium rounded-[4px] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="h-8 px-4 bg-[#408dfb] hover:bg-[#327ae0] disabled:opacity-60 text-white text-[13px] font-medium rounded-[4px] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="h-8 px-4 bg-[#1e293b] hover:bg-[#0f172a] disabled:opacity-60 text-white text-[13px] font-medium rounded-[4px] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>Save & Set as Default</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (Left Settings 340px + Right Live Preview) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Settings Panel */}
        <aside className="w-[340px] flex-none bg-white border-r border-[#e5e7eb] overflow-y-auto select-none">
          {/* Section 1: Header and Logo */}
          <div className="border-b border-[#e5e7eb]">
            <button
              onClick={() => toggleSection('header')}
              className="w-full px-4 py-3 bg-[#fafbfc] hover:bg-[#f1f3f5] flex items-center justify-between text-left cursor-pointer transition-colors"
            >
              <span className="text-[13px] font-semibold text-[#1e293b]">1. Header & Logo</span>
              {openSections.header ? <ChevronDown className="w-4 h-4 text-[#6c7380]" /> : <ChevronRight className="w-4 h-4 text-[#6c7380]" />}
            </button>

            {openSections.header && (
              <div className="p-4 space-y-4 text-[13px]">
                {/* Logo Show / Hide Toggle */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#333333]">Show Logo</span>
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => {
                      setShowLogo(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </div>

                {showLogo && (
                  <>
                    {/* Organization logo toggle */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#333333]">Use organization logo</span>
                        <input
                          type="checkbox"
                          checked={useOrgLogo}
                          onChange={(e) => {
                            setUseOrgLogo(e.target.checked);
                            markDirty();
                          }}
                          className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                        />
                      </div>
                      <p className="text-[11px] text-[#6c7380]">
                        {useOrgLogo
                          ? 'Uses your official company profile logo.'
                          : 'Use a custom template-specific logo below.'}
                      </p>
                    </div>

                    {/* Template Specific Logo Upload Zone */}
                    {!useOrgLogo && (
                      <div className="space-y-2">
                        <label className="block text-[12px] font-medium text-[#333333]">
                          Template Logo
                        </label>
                        {logoUrl ? (
                          <div className="border border-[#e5e7eb] rounded-[4px] p-2 flex items-center justify-between bg-[#f8fafc]">
                            <img
                              src={logoUrl}
                              alt="Template Logo"
                              className="h-10 max-w-[120px] object-contain"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-2 py-1 text-[11px] bg-white border border-[#d9dce3] hover:bg-[#f1f3f5] rounded text-[#333333] cursor-pointer"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setLogoUrl(null);
                                  markDirty();
                                }}
                                className="p-1 hover:bg-[#fee2e2] text-[#dc2626] rounded cursor-pointer"
                                title="Remove Logo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-[#cbd5e1] hover:border-[#408dfb] rounded-[6px] p-4 text-center cursor-pointer bg-[#fafbfc] transition-colors"
                          >
                            <Upload className="w-6 h-6 mx-auto text-[#94a3b8] mb-1.5" />
                            <p className="text-[12px] font-medium text-[#333333]">Click to upload logo</p>
                            <p className="text-[11px] text-[#64748b]">PNG, JPG, SVG, WEBP (Max 2 MB)</p>
                          </div>
                        )}

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }}
                        />

                        {isUploadingLogo && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#408dfb]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Uploading logo...</span>
                          </div>
                        )}

                        {logoUploadError && (
                          <p className="text-[11px] text-[#dc2626]">{logoUploadError}</p>
                        )}
                      </div>
                    )}

                    {/* Logo Position Segmented Control */}
                    <div>
                      <label className="block text-[12px] font-medium text-[#333333] mb-1">
                        Logo Position
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-[#f1f3f5] p-1 rounded-[4px]">
                        {(['left', 'center', 'right'] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => {
                              setLogoPosition(pos);
                              markDirty();
                            }}
                            className={`py-1 text-[12px] font-medium rounded capitalize cursor-pointer transition-colors ${
                              logoPosition === pos
                                ? 'bg-white text-[#1e293b] shadow-xs'
                                : 'text-[#64748b] hover:text-[#1e293b]'
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Logo Width Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[12px] font-medium text-[#333333]">
                          Logo Width (px)
                        </label>
                        <input
                          type="number"
                          min={40}
                          max={240}
                          value={logoWidth}
                          onChange={(e) => {
                            setLogoWidth(Number(e.target.value));
                            markDirty();
                          }}
                          className="w-14 h-6 px-1.5 text-[11px] text-right border border-[#d9dce3] rounded outline-none focus:border-[#408dfb]"
                        />
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={240}
                        value={logoWidth}
                        onChange={(e) => {
                          setLogoWidth(Number(e.target.value));
                          markDirty();
                        }}
                        className="w-full accent-[#408dfb] cursor-pointer"
                      />
                    </div>
                  </>
                )}

                {/* Company details toggles */}
                <div className="pt-2 border-t border-[#f1f3f5] space-y-2">
                  <span className="block text-[12px] font-semibold text-[#1e293b]">Header Details</span>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[#333333]">GSTIN</span>
                    <input
                      type="checkbox"
                      checked={showGstin}
                      onChange={(e) => {
                        setShowGstin(e.target.checked);
                        markDirty();
                      }}
                      className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[#333333]">PAN</span>
                    <input
                      type="checkbox"
                      checked={showPan}
                      onChange={(e) => {
                        setShowPan(e.target.checked);
                        markDirty();
                      }}
                      className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Document Details */}
          <div className="border-b border-[#e5e7eb]">
            <button
              onClick={() => toggleSection('docDetails')}
              className="w-full px-4 py-3 bg-[#fafbfc] hover:bg-[#f1f3f5] flex items-center justify-between text-left cursor-pointer transition-colors"
            >
              <span className="text-[13px] font-semibold text-[#1e293b]">2. Document Details</span>
              {openSections.docDetails ? <ChevronDown className="w-4 h-4 text-[#6c7380]" /> : <ChevronRight className="w-4 h-4 text-[#6c7380]" />}
            </button>

            {openSections.docDetails && (
              <div className="p-4 space-y-3 text-[13px]">
                <div>
                  <label className="block text-[12px] font-medium text-[#333333] mb-1">
                    Document Title Text
                  </label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => {
                      setDocumentTitle(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. TAX INVOICE"
                    className="w-full h-8 px-2.5 border border-[#d9dce3] rounded-[4px] text-[13px] outline-none focus:border-[#408dfb]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#333333] mb-1">
                    Numbering Label
                  </label>
                  <input
                    type="text"
                    value={numberingLabel}
                    onChange={(e) => {
                      setNumberingLabel(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. Invoice#"
                    className="w-full h-8 px-2.5 border border-[#d9dce3] rounded-[4px] text-[13px] outline-none focus:border-[#408dfb]"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Show Due Date</span>
                    <input
                      type="checkbox"
                      checked={showDueDate}
                      onChange={(e) => {
                        setShowDueDate(e.target.checked);
                        markDirty();
                      }}
                      className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Show Place of Supply</span>
                    <input
                      type="checkbox"
                      checked={showPlaceOfSupply}
                      onChange={(e) => {
                        setShowPlaceOfSupply(e.target.checked);
                        markDirty();
                      }}
                      className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Show P.O. / Ref#</span>
                    <input
                      type="checkbox"
                      checked={showPoNumber}
                      onChange={(e) => {
                        setShowPoNumber(e.target.checked);
                        markDirty();
                      }}
                      className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Party Details */}
          <div className="border-b border-[#e5e7eb]">
            <button
              onClick={() => toggleSection('parties')}
              className="w-full px-4 py-3 bg-[#fafbfc] hover:bg-[#f1f3f5] flex items-center justify-between text-left cursor-pointer transition-colors"
            >
              <span className="text-[13px] font-semibold text-[#1e293b]">3. Party Details</span>
              {openSections.parties ? <ChevronDown className="w-4 h-4 text-[#6c7380]" /> : <ChevronRight className="w-4 h-4 text-[#6c7380]" />}
            </button>

            {openSections.parties && (
              <div className="p-4 space-y-2 text-[13px]">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Show "Billed To" block</span>
                  <input
                    type="checkbox"
                    checked={showBillTo}
                    onChange={(e) => {
                      setShowBillTo(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Show "Shipped To" block</span>
                  <input
                    type="checkbox"
                    checked={showShipTo}
                    onChange={(e) => {
                      setShowShipTo(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Section 4: Line Items Table */}
          <div className="border-b border-[#e5e7eb]">
            <button
              onClick={() => toggleSection('lineItems')}
              className="w-full px-4 py-3 bg-[#fafbfc] hover:bg-[#f1f3f5] flex items-center justify-between text-left cursor-pointer transition-colors"
            >
              <span className="text-[13px] font-semibold text-[#1e293b]">4. Line Items Table</span>
              {openSections.lineItems ? <ChevronDown className="w-4 h-4 text-[#6c7380]" /> : <ChevronRight className="w-4 h-4 text-[#6c7380]" />}
            </button>

            {openSections.lineItems && (
              <div className="p-4 space-y-3 text-[13px]">
                <span className="block text-[12px] font-medium text-[#333333]">Table Columns</span>
                <div className="space-y-2">
                  {Object.entries(columns).map(([colKey, colVal]) => (
                    <div key={colKey} className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={colVal.visible !== false}
                          onChange={(e) => {
                            setColumns((prev: any) => ({
                              ...prev,
                              [colKey]: { ...prev[colKey], visible: e.target.checked },
                            }));
                            markDirty();
                          }}
                          className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                        />
                        <span className="capitalize">{colKey}</span>
                      </label>
                      <input
                        type="text"
                        value={colVal.label}
                        onChange={(e) => {
                          setColumns((prev: any) => ({
                            ...prev,
                            [colKey]: { ...prev[colKey], label: e.target.value },
                          }));
                          markDirty();
                        }}
                        className="w-36 h-6 px-1.5 text-[11px] border border-[#d9dce3] rounded outline-none focus:border-[#408dfb]"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#f1f3f5] grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-[#64748b] mb-1">Header Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tableHeaderBg}
                        onChange={(e) => {
                          setTableHeaderBg(e.target.value);
                          markDirty();
                        }}
                        className="w-7 h-7 p-0 border border-[#d9dce3] rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-[#64748b]">{tableHeaderBg}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748b] mb-1">Header Text</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tableHeaderText}
                        onChange={(e) => {
                          setTableHeaderText(e.target.value);
                          markDirty();
                        }}
                        className="w-7 h-7 p-0 border border-[#d9dce3] rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-[#64748b]">{tableHeaderText}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Totals */}
          <div className="border-b border-[#e5e7eb]">
            <button
              onClick={() => toggleSection('totals')}
              className="w-full px-4 py-3 bg-[#fafbfc] hover:bg-[#f1f3f5] flex items-center justify-between text-left cursor-pointer transition-colors"
            >
              <span className="text-[13px] font-semibold text-[#1e293b]">5. Totals</span>
              {openSections.totals ? <ChevronDown className="w-4 h-4 text-[#6c7380]" /> : <ChevronRight className="w-4 h-4 text-[#6c7380]" />}
            </button>

            {openSections.totals && (
              <div className="p-4 space-y-2 text-[13px]">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Sub Total</span>
                  <input
                    type="checkbox"
                    checked={showSubTotal}
                    onChange={(e) => {
                      setShowSubTotal(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Discount</span>
                  <input
                    type="checkbox"
                    checked={showDiscount}
                    onChange={(e) => {
                      setShowDiscount(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Tax Breakup (CGST / SGST / IGST)</span>
                  <input
                    type="checkbox"
                    checked={showTaxBreakup}
                    onChange={(e) => {
                      setShowTaxBreakup(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Round Off</span>
                  <input
                    type="checkbox"
                    checked={showRoundOff}
                    onChange={(e) => {
                      setShowRoundOff(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Total in Words</span>
                  <input
                    type="checkbox"
                    checked={showTotalInWords}
                    onChange={(e) => {
                      setShowTotalInWords(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Section 6: Footer */}
          <div className="border-b border-[#e5e7eb]">
            <button
              onClick={() => toggleSection('footer')}
              className="w-full px-4 py-3 bg-[#fafbfc] hover:bg-[#f1f3f5] flex items-center justify-between text-left cursor-pointer transition-colors"
            >
              <span className="text-[13px] font-semibold text-[#1e293b]">6. Footer</span>
              {openSections.footer ? <ChevronDown className="w-4 h-4 text-[#6c7380]" /> : <ChevronRight className="w-4 h-4 text-[#6c7380]" />}
            </button>

            {openSections.footer && (
              <div className="p-4 space-y-3 text-[13px]">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Show Customer Notes</span>
                  <input
                    type="checkbox"
                    checked={showNotes}
                    onChange={(e) => {
                      setShowNotes(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>
                {showNotes && (
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      markDirty();
                    }}
                    placeholder="Notes..."
                    className="w-full p-2 text-[12px] border border-[#d9dce3] rounded outline-none focus:border-[#408dfb]"
                  />
                )}

                <label className="flex items-center justify-between cursor-pointer pt-1">
                  <span>Show Terms & Conditions</span>
                  <input
                    type="checkbox"
                    checked={showTerms}
                    onChange={(e) => {
                      setShowTerms(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>
                {showTerms && (
                  <textarea
                    rows={3}
                    value={terms}
                    onChange={(e) => {
                      setTerms(e.target.value);
                      markDirty();
                    }}
                    placeholder="Terms..."
                    className="w-full p-2 text-[12px] border border-[#d9dce3] rounded outline-none focus:border-[#408dfb]"
                  />
                )}

                <label className="flex items-center justify-between cursor-pointer pt-1">
                  <span>Show Bank Details</span>
                  <input
                    type="checkbox"
                    checked={showBankDetails}
                    onChange={(e) => {
                      setShowBankDetails(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span>Show Signature Block</span>
                  <input
                    type="checkbox"
                    checked={showSignature}
                    onChange={(e) => {
                      setShowSignature(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span>"Powered by" Branding</span>
                  <input
                    type="checkbox"
                    checked={showPoweredBy}
                    onChange={(e) => {
                      setShowPoweredBy(e.target.checked);
                      markDirty();
                    }}
                    className="h-4 w-4 text-[#408dfb] rounded focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Section 7: Style */}
          <div className="border-b border-[#e5e7eb]">
            <button
              onClick={() => toggleSection('style')}
              className="w-full px-4 py-3 bg-[#fafbfc] hover:bg-[#f1f3f5] flex items-center justify-between text-left cursor-pointer transition-colors"
            >
              <span className="text-[13px] font-semibold text-[#1e293b]">7. Style</span>
              {openSections.style ? <ChevronDown className="w-4 h-4 text-[#6c7380]" /> : <ChevronRight className="w-4 h-4 text-[#6c7380]" />}
            </button>

            {openSections.style && (
              <div className="p-4 space-y-4 text-[13px]">
                {/* Accent Color */}
                <div>
                  <label className="block text-[12px] font-medium text-[#333333] mb-1.5">
                    Accent Colour
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {COLOR_PRESETS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          setPrimaryColor(col);
                          markDirty();
                        }}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-full cursor-pointer flex items-center justify-center transition-transform ${
                          primaryColor === col ? 'ring-2 ring-offset-1 ring-[#408dfb] scale-110' : ''
                        }`}
                      >
                        {primaryColor === col && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        markDirty();
                      }}
                      className="w-8 h-8 p-0 border border-[#d9dce3] rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        markDirty();
                      }}
                      className="w-24 h-7 px-2 text-[12px] font-mono border border-[#d9dce3] rounded outline-none focus:border-[#408dfb]"
                    />
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <label className="block text-[12px] font-medium text-[#333333] mb-1">
                    Font Family
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => {
                      setFontFamily(e.target.value);
                      markDirty();
                    }}
                    className="w-full h-8 px-2 border border-[#d9dce3] rounded-[4px] text-[13px] outline-none focus:border-[#408dfb] cursor-pointer"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Paper Size & Orientation */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[12px] font-medium text-[#333333] mb-1">
                      Paper Size
                    </label>
                    <select
                      value={paperSize}
                      onChange={(e) => {
                        setPaperSize(e.target.value as any);
                        markDirty();
                      }}
                      className="w-full h-8 px-2 border border-[#d9dce3] rounded-[4px] text-[13px] outline-none focus:border-[#408dfb] cursor-pointer"
                    >
                      <option value="A4">A4</option>
                      <option value="LETTER">Letter</option>
                      <option value="LEGAL">Legal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#333333] mb-1">
                      Orientation
                    </label>
                    <select
                      value={orientation}
                      onChange={(e) => {
                        setOrientation(e.target.value as any);
                        markDirty();
                      }}
                      className="w-full h-8 px-2 border border-[#d9dce3] rounded-[4px] text-[13px] outline-none focus:border-[#408dfb] cursor-pointer"
                    >
                      <option value="PORTRAIT">Portrait</option>
                      <option value="LANDSCAPE">Landscape</option>
                    </select>
                  </div>
                </div>

                {/* Margins */}
                <div>
                  <label className="block text-[12px] font-medium text-[#333333] mb-1">
                    Margins
                  </label>
                  <select
                    value={margins}
                    onChange={(e) => {
                      setMargins(e.target.value);
                      markDirty();
                    }}
                    className="w-full h-8 px-2 border border-[#d9dce3] rounded-[4px] text-[13px] outline-none focus:border-[#408dfb] cursor-pointer"
                  >
                    <option value="16px">Compact (16px)</option>
                    <option value="24px">Normal (24px)</option>
                    <option value="32px">Spacious (32px)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Live Preview Canvas C4 */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#f5f6fa] flex justify-center">
          <div className="transition-all duration-150">
            <DocumentRenderer
              template={currentTemplateSnapshot}
              data={{
                companyName: 'Bill Aura ERP Pvt Ltd',
                invoiceNo: 'INV-2026-0042',
                date: '16/10/2026',
                customerName: 'Global Enterprises Inc.',
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
