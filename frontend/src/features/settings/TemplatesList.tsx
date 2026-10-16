import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Eye,
  CheckCircle2,
  Copy,
  Trash2,
  X,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { templateService } from './services/templateService';
import { DocumentTemplate } from './types/template';
import notification from '@/core/services/NotificationService';
import { DocumentRenderer } from '@/shared/components/documents/DocumentRenderer';

const DOC_TYPES = [
  { key: 'invoice', label: 'Invoices' },
  { key: 'quote', label: 'Quotes' },
  { key: 'sales_order', label: 'Sales Orders' },
  { key: 'credit_note', label: 'Credit Notes' },
  { key: 'receipt', label: 'Payment Receipts' },
  { key: 'purchase_order', label: 'Purchase Orders' },
  { key: 'bill', label: 'Bills' },
  { key: 'delivery_challan', label: 'Delivery Challans' },
];

export const TemplatesList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const activeDocType = searchParams.get('type') || 'invoice';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<DocumentTemplate | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // New Template dialog state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState(activeDocType);
  const [newTemplateSource, setNewTemplateSource] = useState<'starter' | 'blank' | 'clone'>('starter');
  const [cloneSourceId, setCloneSourceId] = useState<string>('');

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close 3-dot dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleTabChange = (key: string) => {
    setSearchParams({ type: key });
    setNewTemplateType(key);
    setActiveMenuId(null);
  };

  // Query templates for active docType
  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['document-templates', activeDocType],
    queryFn: () => templateService.getTemplates(activeDocType),
  });

  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return templates;
    const term = searchTerm.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(term));
  }, [templates, searchTerm]);

  // Mutations
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => templateService.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      notification.success('Default template updated.');
      setActiveMenuId(null);
    },
    onError: (err: any) => {
      notification.error(err?.response?.data?.message || 'Failed to set default template.');
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => templateService.cloneTemplate(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      notification.success(`Template cloned as "${data.name}".`);
      setActiveMenuId(null);
    },
    onError: (err: any) => {
      notification.error(err?.response?.data?.message || 'Failed to clone template.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templateService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      notification.success('Template deleted successfully.');
      setDeleteCandidate(null);
      setActiveMenuId(null);
    },
    onError: (err: any) => {
      notification.error(err?.response?.data?.message || 'Failed to delete template.');
      setDeleteCandidate(null);
    },
  });

  // Handle Create New Template from Dialog
  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      notification.error('Template name is required.');
      return;
    }

    try {
      if (newTemplateSource === 'clone' && cloneSourceId) {
        // Clone an existing template
        const cloned = await templateService.cloneTemplate(cloneSourceId);
        await templateService.updateTemplate(cloned.id, { name: newTemplateName.trim() });
        setIsNewModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['document-templates'] });
        navigate(`/settings/templates/${cloned.id}/edit`);
      } else {
        // Create new
        const starter = templates.find((t) => t.isSystem) || templates[0];
        const newPayload: any = {
          name: newTemplateName.trim(),
          docType: newTemplateType,
          isDefault: false,
          colors: newTemplateSource === 'starter' && starter ? starter.colors : { primary: '#408dfb', text: '#333333', background: '#ffffff' },
          typography: newTemplateSource === 'starter' && starter ? starter.typography : { fontFamily: 'Inter', fontSize: '13px' },
          layout: newTemplateSource === 'starter' && starter ? starter.layout : { orientation: 'PORTRAIT', paperSize: 'A4', margins: '20px' },
          elements: newTemplateSource === 'starter' && starter ? starter.elements : { showLogo: true, showGstin: true, showPan: true },
          logoSettings: newTemplateSource === 'starter' && starter ? starter.logoSettings : { showLogo: true, useOrgLogo: true, position: 'left', width: 140 },
          config: newTemplateSource === 'starter' && starter ? starter.config : {},
          terms: newTemplateSource === 'starter' && starter ? starter.terms : 'Thank you for your business.',
          notes: newTemplateSource === 'starter' && starter ? starter.notes : '',
        };
        const created = await templateService.createTemplate(newPayload);
        setIsNewModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['document-templates'] });
        navigate(`/settings/templates/${created.id}/edit`);
      }
    } catch (err: any) {
      notification.error(err?.response?.data?.message || 'Failed to create template.');
    }
  };

  const sampleDocData = {
    companyName: 'Acme Technologies Pvt Ltd',
    invoiceNo: 'INV-2026-0042',
    date: '16/10/2026',
    customerName: 'Global Enterprises Inc.',
    grandTotal: '1,18,000.00',
  };

  return (
    <div className="flex flex-col h-full bg-[#ffffff] text-[#333333] font-sans select-none">
      {/* B1. Fixed compact header ~56px */}
      <header className="flex-none h-14 bg-white border-b border-[#e5e7eb] px-6 flex items-center justify-between z-10">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1e293b] leading-tight">Templates</h1>
          <p className="text-[12px] text-[#6c7380]">Manage document layouts, styling, and logos</p>
        </div>
        <button
          onClick={() => {
            setNewTemplateName('');
            setNewTemplateType(activeDocType);
            setNewTemplateSource('starter');
            setIsNewModalOpen(true);
          }}
          className="h-8 px-4 bg-[#408dfb] hover:bg-[#327ae0] text-white text-[13px] font-medium rounded-[4px] flex items-center gap-1.5 transition-colors shadow-none cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </header>

      {/* B2. Document type tabs */}
      <div className="flex-none bg-white border-b border-[#e5e7eb] px-6 flex items-center gap-6 overflow-x-auto">
        {DOC_TYPES.map((dt) => {
          const isActive = activeDocType === dt.key;
          return (
            <button
              key={dt.key}
              onClick={() => handleTabChange(dt.key)}
              className={`py-3 text-[13px] transition-colors relative whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'text-[#333333] font-semibold'
                  : 'text-[#6c7380] hover:text-[#333333] font-normal'
              }`}
            >
              {dt.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#408dfb] rounded-t-sm" />
              )}
            </button>
          );
        })}
      </div>

      {/* Search and Count Bar */}
      <div className="flex-none bg-white px-6 py-4 flex items-center justify-between border-b border-[#f1f3f5]">
        <div className="flex items-center gap-3">
          <div className="relative w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search templates"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-9 pr-3 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] text-[#333333] placeholder-[#9ca3af] outline-none focus:border-[#408dfb] transition-colors"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[12px] text-[#408dfb] hover:underline cursor-pointer"
            >
              Clear search
            </button>
          )}
        </div>
        <div className="text-[12px] text-[#6c7380]">
          {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'}
        </div>
      </div>

      {/* B4. Content Area / Template Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#ffffff]">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-[#f8fafc] border border-[#e5e7eb] rounded-[6px] h-72" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-16 text-center text-[#6c7380]">
            <FileText className="w-10 h-10 mx-auto text-[#cbd5e1] mb-2" />
            <p className="text-[14px]">No templates found.</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-[13px] text-[#408dfb] hover:underline cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredTemplates.map((template) => {
              const primaryColor = template.colors?.primary || '#408dfb';
              const logoPos = template.logoSettings?.position || 'left';
              const hasCustomLogo = !template.logoSettings?.useOrgLogo && template.logoUrl;

              return (
                <div
                  key={template.id}
                  className="bg-white border border-[#e5e7eb] rounded-[6px] p-3 flex flex-col hover:shadow-sm transition-all relative group"
                >
                  {/* Thumbnail A4 Preview Container */}
                  <div className="relative w-full aspect-[1/1.38] bg-white border border-[#e5e7eb] rounded-[4px] overflow-hidden p-2.5 flex flex-col justify-between select-none">
                    {/* Simulated scaled header */}
                    <div>
                      {/* Logo & Header Row */}
                      <div className={`flex items-start mb-2 ${logoPos === 'right' ? 'justify-between flex-row-reverse' : logoPos === 'center' ? 'flex-col items-center text-center' : 'justify-between'}`}>
                        {template.logoSettings?.showLogo !== false && (
                          <div className="mb-1">
                            {hasCustomLogo ? (
                              <img
                                src={template.logoUrl!}
                                alt="logo"
                                className="h-4 max-w-[50px] object-contain"
                              />
                            ) : (
                              <div
                                className="h-4 px-1.5 rounded flex items-center justify-center text-[7px] font-bold text-white uppercase tracking-tight"
                                style={{ backgroundColor: primaryColor }}
                              >
                                LOGO
                              </div>
                            )}
                          </div>
                        )}
                        <div className={logoPos === 'center' ? 'text-center' : 'text-right'}>
                          <div
                            className="text-[9px] font-bold uppercase tracking-wide"
                            style={{ color: primaryColor }}
                          >
                            {template.config?.documentTitle || template.type?.toUpperCase() || 'INVOICE'}
                          </div>
                          <div className="text-[6px] text-[#64748b]">INV-0042</div>
                        </div>
                      </div>

                      {/* Accent divider line */}
                      <div className="w-full h-[1.5px] rounded-full mb-2" style={{ backgroundColor: primaryColor }} />

                      {/* Simulated Billed To */}
                      <div className="space-y-0.5 mb-2">
                        <div className="w-12 h-1.5 bg-[#e2e8f0] rounded-sm" />
                        <div className="w-20 h-1.5 bg-[#cbd5e1] rounded-sm" />
                      </div>

                      {/* Simulated Table */}
                      <div className="w-full border-t border-b border-[#f1f5f9] py-1 mb-1">
                        <div
                          className="h-2.5 px-1 rounded-sm flex items-center justify-between mb-1 text-[6px] font-medium"
                          style={{
                            backgroundColor: template.config?.tableHeaderBg || '#f8fafc',
                            color: template.config?.tableHeaderText || '#1e293b',
                          }}
                        >
                          <span>Item</span>
                          <span>Qty</span>
                          <span>Amount</span>
                        </div>
                        <div className="flex justify-between text-[6px] text-[#64748b] px-1 py-0.5">
                          <span className="w-14 truncate">Consulting Service</span>
                          <span>1</span>
                          <span>₹1,00,000</span>
                        </div>
                      </div>
                    </div>

                    {/* Simulated Totals Bottom */}
                    <div className="pt-1 border-t border-[#f1f5f9] flex justify-between items-center text-[7px] font-bold">
                      <span className="text-[#64748b]">Total</span>
                      <span style={{ color: primaryColor }}>₹1,18,000</span>
                    </div>

                    {/* Hover Overlay with Preview and Edit Buttons */}
                    <div className="absolute inset-0 bg-[#000000]/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      <button
                        onClick={() => setPreviewTemplate(template)}
                        className="px-2.5 py-1.5 bg-white hover:bg-[#f8fafc] text-[#333333] text-[11px] font-medium rounded-[4px] shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#6c7380]" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={() => navigate(`/settings/templates/${template.id}/edit`)}
                        className="px-2.5 py-1.5 bg-[#408dfb] hover:bg-[#327ae0] text-white text-[11px] font-medium rounded-[4px] shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>

                  {/* Below Preview: Name & Badges & Three-dot menu */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <span className="text-[13px] font-medium text-[#1e293b] truncate" title={template.name}>
                        {template.name}
                      </span>
                      {template.isDefault && (
                        <span className="px-1.5 py-0.5 bg-[#e8f5e9] text-[#2e7d32] text-[11px] font-medium rounded-[3px] shrink-0">
                          Default
                        </span>
                      )}
                      {template.isSystem && (
                        <span className="px-1.5 py-0.5 bg-[#f1f3f5] text-[#6c7380] text-[10px] font-medium rounded-[3px] shrink-0">
                          Built-in
                        </span>
                      )}
                    </div>

                    {/* 3-Dot Menu Button */}
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === template.id ? null : template.id);
                        }}
                        className="p-1 hover:bg-[#f1f3f5] text-[#6c7380] rounded-[4px] transition-colors cursor-pointer"
                        title="Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === template.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#e5e7eb] rounded-[6px] shadow-lg py-1 z-30 text-[13px]"
                        >
                          <button
                            onClick={() => {
                              navigate(`/settings/templates/${template.id}/edit`);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#f8fafc] text-[#333333] flex items-center gap-2 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#6c7380]" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setPreviewTemplate(template);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#f8fafc] text-[#333333] flex items-center gap-2 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#6c7380]" />
                            <span>Preview</span>
                          </button>
                          {!template.isDefault && (
                            <button
                              onClick={() => setDefaultMutation.mutate(template.id)}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#f8fafc] text-[#333333] flex items-center gap-2 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" />
                              <span>Set as Default</span>
                            </button>
                          )}
                          <button
                            onClick={() => cloneMutation.mutate(template.id)}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#f8fafc] text-[#333333] flex items-center gap-2 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-[#6c7380]" />
                            <span>Clone</span>
                          </button>

                          <div className="my-1 border-t border-[#f1f3f5]" />

                          {/* Delete option */}
                          {template.isSystem ? (
                            <div
                              className="px-3 py-1.5 text-[#9ca3af] text-[12px] cursor-not-allowed flex items-center gap-2"
                              title="Built-in templates cannot be deleted"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete (Built-in)</span>
                            </div>
                          ) : template.isDefault ? (
                            <div
                              className="px-3 py-1.5 text-[#9ca3af] text-[12px] cursor-not-allowed flex items-center gap-2"
                              title="Default template cannot be deleted"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete (Default)</span>
                            </div>
                          ) : filteredTemplates.length <= 1 ? (
                            <div
                              className="px-3 py-1.5 text-[#9ca3af] text-[12px] cursor-not-allowed flex items-center gap-2"
                              title="Cannot delete the only template for this type"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete (Last)</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setDeleteCandidate(template);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#fef2f2] text-[#dc2626] flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* C1. New Template Modal Dialog */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[6px] shadow-xl w-full max-w-md border border-[#e5e7eb] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#1e293b]">New Template</h2>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 hover:bg-[#f1f3f5] text-[#6c7380] rounded-[4px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#333333] mb-1">
                  Template Name <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Modern Professional"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] outline-none focus:border-[#408dfb]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#333333] mb-1">
                  Document Type <span className="text-[#dc2626]">*</span>
                </label>
                <select
                  value={newTemplateType}
                  onChange={(e) => {
                    setNewTemplateType(e.target.value);
                    setCloneSourceId('');
                  }}
                  className="w-full h-8 px-2.5 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] outline-none focus:border-[#408dfb] cursor-pointer"
                >
                  {DOC_TYPES.map((dt) => (
                    <option key={dt.key} value={dt.key}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#333333] mb-1">
                  Start From
                </label>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-[13px] text-[#333333] cursor-pointer">
                    <input
                      type="radio"
                      name="templateSource"
                      value="starter"
                      checked={newTemplateSource === 'starter'}
                      onChange={() => setNewTemplateSource('starter')}
                      className="text-[#408dfb] focus:ring-0"
                    />
                    <span>Built-in starter template</span>
                  </label>
                  <label className="flex items-center gap-2 text-[13px] text-[#333333] cursor-pointer">
                    <input
                      type="radio"
                      name="templateSource"
                      value="blank"
                      checked={newTemplateSource === 'blank'}
                      onChange={() => setNewTemplateSource('blank')}
                      className="text-[#408dfb] focus:ring-0"
                    />
                    <span>Blank template</span>
                  </label>
                  <label className="flex items-center gap-2 text-[13px] text-[#333333] cursor-pointer">
                    <input
                      type="radio"
                      name="templateSource"
                      value="clone"
                      checked={newTemplateSource === 'clone'}
                      onChange={() => setNewTemplateSource('clone')}
                      className="text-[#408dfb] focus:ring-0"
                    />
                    <span>Clone an existing template</span>
                  </label>
                </div>
              </div>

              {newTemplateSource === 'clone' && (
                <div>
                  <label className="block text-[12px] font-medium text-[#333333] mb-1">
                    Select template to clone
                  </label>
                  <select
                    value={cloneSourceId}
                    onChange={(e) => setCloneSourceId(e.target.value)}
                    required
                    className="w-full h-8 px-2.5 bg-white border border-[#d9dce3] rounded-[4px] text-[13px] outline-none focus:border-[#408dfb] cursor-pointer"
                  >
                    <option value="">Select template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-[#e5e7eb] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="h-8 px-3.5 bg-white border border-[#d9dce3] hover:bg-[#f8fafc] text-[#333333] text-[13px] font-medium rounded-[4px] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-[#408dfb] hover:bg-[#327ae0] text-white text-[13px] font-medium rounded-[4px] cursor-pointer transition-colors"
                >
                  Create & Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[6px] shadow-xl w-full max-w-sm border border-[#e5e7eb] p-5">
            <div className="flex items-center gap-3 text-[#dc2626] mb-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-[15px] font-semibold text-[#1e293b]">Delete Template?</h3>
            </div>
            <p className="text-[13px] text-[#6c7380] mb-5">
              Are you sure you want to delete <span className="font-semibold text-[#333333]">"{deleteCandidate.name}"</span>?
              Existing documents using this template will automatically fall back to the default template.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="h-8 px-3.5 bg-white border border-[#d9dce3] hover:bg-[#f8fafc] text-[#333333] text-[13px] font-medium rounded-[4px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteCandidate.id)}
                disabled={deleteMutation.isPending}
                className="h-8 px-4 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-[13px] font-medium rounded-[4px] cursor-pointer flex items-center gap-1.5"
              >
                {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[6px] shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-[#e5e7eb] overflow-hidden">
            <div className="px-6 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between bg-white">
              <div>
                <h3 className="text-[16px] font-semibold text-[#1e293b]">{previewTemplate.name}</h3>
                <p className="text-[12px] text-[#6c7380]">Sample Document Preview</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    navigate(`/settings/templates/${previewTemplate.id}/edit`);
                  }}
                  className="h-8 px-3.5 bg-[#408dfb] hover:bg-[#327ae0] text-white text-[13px] font-medium rounded-[4px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Template</span>
                </button>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-1 hover:bg-[#f1f3f5] text-[#6c7380] rounded-[4px] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-[#f5f6fa] flex justify-center">
              <div className="w-[210mm] min-h-[297mm] bg-white shadow-md p-8">
                <DocumentRenderer template={previewTemplate} data={sampleDocData} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesList;
