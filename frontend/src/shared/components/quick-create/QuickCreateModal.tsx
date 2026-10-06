import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Plus, AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api';
import notification from '../../../core/services/NotificationService';
import { QUICK_CREATE_REGISTRY, QuickCreateEntityType, QuickCreateFieldDef } from './quickCreateRegistry';
import { useQuickCreatePermission } from './useQuickCreatePermission';

export interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: QuickCreateEntityType;
  initialValues?: Record<string, any>;
  onSuccess: (createdRecord: any) => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  entity,
  initialValues = {},
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const config = QUICK_CREATE_REGISTRY[entity];
  const hasPermission = useQuickCreatePermission(entity);

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  // Initialize or reset form state whenever modal opens or entity changes
  useEffect(() => {
    if (!isOpen || !config) return;

    const initial: Record<string, any> = {};
    config.fields.forEach((f) => {
      if (initialValues[f.name] !== undefined) {
        initial[f.name] = initialValues[f.name];
      } else if (f.defaultValue !== undefined) {
        initial[f.name] = f.defaultValue;
      } else {
        initial[f.name] = '';
      }
    });

    setFormValues(initial);
    setFormErrors({});
    setApiError(null);
    setIsSubmitting(false);

    // Auto-focus first input
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen, entity, config]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !config) return null;

  const handleInputChange = (fieldName: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
    if (formErrors[fieldName]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    }
    if (apiError) setApiError(null);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    config.fields.forEach((f) => {
      const val = formValues[f.name];
      if (f.required) {
        if (val === undefined || val === null || String(val).trim() === '') {
          errors[f.name] = `${f.label} is required`;
        }
      }

      if (f.type === 'email' && val && String(val).trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(val).trim())) {
          errors[f.name] = 'Please enter a valid email address';
        }
      }

      if (f.name === 'gstin' && val && String(val).trim() !== '') {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(String(val).trim().toUpperCase())) {
          errors[f.name] = 'Invalid GSTIN format (15 characters alphanumeric, e.g. 29ABCDE1234F1Z5)';
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const payload = config.transformPayload(formValues);
      const res = await apiClient.post(config.endpoint, payload);

      // Invalidate registered query keys
      await Promise.all(
        config.queryKeys.map((key) =>
          queryClient.invalidateQueries({ queryKey: key, exact: false })
        )
      );

      const mappedResult = config.extractResult(res);

      notification.success(`${config.title} created successfully`);
      onSuccess(mappedResult);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        `Failed to create ${config.title.toLowerCase()}`;
      setApiError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-create-title"
    >
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
              <Plus className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="quick-create-title" className="text-sm font-bold text-foreground">
                Quick Create {config.title}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Fill minimal required fields to create and select immediately.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body / Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
            {/* Permission warning banner if restricted */}
            {!hasPermission && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  You may have restricted permissions for creating this entity. Submission will be verified by the server.
                </span>
              </div>
            )}

            {/* API Error Banner */}
            {apiError && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-in shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1">
                  <p className="font-semibold">Creation Error</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">{apiError}</p>
                </div>
              </div>
            )}

            {/* Dynamic Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {config.fields.map((f, index) => {
                const isFirst = index === 0;
                const fieldId = `quick-field-${f.name}`;
                const val = formValues[f.name] ?? '';
                const err = formErrors[f.name];
                const colClass = f.colSpan === 2 ? 'sm:col-span-2' : 'sm:col-span-1';

                return (
                  <div key={f.name} className={colClass}>
                    <label
                      htmlFor={fieldId}
                      className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 select-none"
                    >
                      {f.label}
                      {f.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                    </label>

                    {f.type === 'select' ? (
                      <select
                        id={fieldId}
                        ref={isFirst ? (firstInputRef as any) : undefined}
                        value={val}
                        onChange={(e) => handleInputChange(f.name, e.target.value)}
                        disabled={isSubmitting}
                        className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${
                          err ? 'border-red-500' : 'border-border hover:border-border/80'
                        }`}
                      >
                        {f.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        id={fieldId}
                        ref={isFirst ? (firstInputRef as any) : undefined}
                        rows={2}
                        value={val}
                        onChange={(e) => handleInputChange(f.name, e.target.value)}
                        disabled={isSubmitting}
                        placeholder={f.placeholder}
                        className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none ${
                          err ? 'border-red-500' : 'border-border hover:border-border/80'
                        }`}
                      />
                    ) : (
                      <input
                        id={fieldId}
                        ref={isFirst ? (firstInputRef as any) : undefined}
                        type={f.type}
                        value={val}
                        onChange={(e) => {
                          const rawVal = e.target.value;
                          handleInputChange(f.name, f.uppercase ? rawVal.toUpperCase() : rawVal);
                        }}
                        disabled={isSubmitting}
                        placeholder={f.placeholder}
                        className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${
                          err ? 'border-red-500' : 'border-border hover:border-border/80'
                        }`}
                      />
                    )}

                    {err && (
                      <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {err}
                      </p>
                    )}
                    {f.helpText && !err && (
                      <p className="mt-1 text-[10px] text-muted-foreground">{f.helpText}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-border/80 bg-muted/15 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-muted-foreground hidden sm:inline flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Saves instantly & auto-selects in current form
            </span>
            <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/90 shadow-md shadow-accent/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create & Select</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
