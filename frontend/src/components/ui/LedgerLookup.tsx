import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Search, Loader2, Check, ChevronDown, PlusCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api';
import { toast } from 'sonner';

const HighlightMatch = ({ text, match }: { text: string; match: string }) => {
  if (!text) return null;
  if (!match.trim()) return <>{text}</>;

  const escapedMatch = match.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedMatch})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-accent/20 text-accent font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export interface LedgerLookupProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (value: string, item?: any) => void;
  placeholder?: string;
  allowedAccountTypes?: string; // Comma-separated categories/subcategories
  disabled?: boolean;
  required?: boolean;
}

export const LedgerLookup = ({
  label,
  error,
  helperText,
  value,
  onChange,
  placeholder = 'Search ledger...',
  allowedAccountTypes,
  disabled = false,
  required = false,
}: LedgerLookupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch options via global lookup search
  const { data: response, isLoading } = useQuery({
    queryKey: ['ledger-search', debouncedSearch, allowedAccountTypes],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get('/lookup/search', {
        params: {
          entity: 'ledger',
          q: debouncedSearch,
          allowedAccountTypes,
          limit: 30,
        },
        signal,
      });
      return res;
    },
    enabled: debouncedSearch.length > 0,
  });

  const options = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);

  // Reset active index when options change
  useEffect(() => {
    setActiveIndex(-1);
  }, [options]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync selected item label
  const [selectedLabel, setSelectedLabel] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

  useEffect(() => {
    if (value && options.length > 0) {
      const found = options.find((opt: any) => opt.id === value);
      if (found) {
        setSelectedLabel(found.name);
        setSelectedDetail(found);
      }
    }
  }, [value, options]);

  // If initial value isn't loaded/found in options, fetch it specifically
  const { data: singleAccount } = useQuery({
    queryKey: ['account-single', value],
    queryFn: async () => {
      const res = await apiClient.get(`/accounts/${value}`);
      return res.data;
    },
    enabled: !!value && !selectedDetail,
  });

  useEffect(() => {
    if (singleAccount) {
      setSelectedLabel(singleAccount.name);
      setSelectedDetail(singleAccount);
    }
  }, [singleAccount]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > -1 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < options.length) {
          const selected = options[activeIndex];
          onChange(selected.id, selected);
          setSelectedLabel(selected.name);
          setSelectedDetail(selected);
          setIsOpen(false);
          setSearchTerm('');
        } else if (options.length === 0 && searchTerm) {
          setShowCreateModal(true);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleSelect = (opt: any) => {
    onChange(opt.id, opt);
    setSelectedLabel(opt.name);
    setSelectedDetail(opt);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="w-full relative" ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={`relative w-full bg-background border rounded-xl flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
          error ? 'border-red-500' : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
      >
        <div className="flex-1 truncate pr-4 text-foreground">
          {selectedLabel ? (
            <span className="font-semibold">{selectedLabel}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-xl shadow-xl max-h-80 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              ref={inputRef}
              autoFocus
              placeholder="Type to search ledger..."
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="overflow-y-auto p-1 flex-1 max-h-56">
            {isLoading ? (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : !debouncedSearch ? (
              <div className="py-4 text-center">
                <p className="text-xs text-muted-foreground">Type to search ledger...</p>
              </div>
            ) : options.length > 0 ? (
              options.map((opt: any, index: number) => {
                const isSelected = value === opt.id;
                const isActive = index === activeIndex;
                const groupName = opt.parent?.name || (opt.accountType ? opt.accountType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : '');
                return (
                  <div
                    key={opt.id}
                    className={`flex flex-col px-3 py-2 cursor-pointer rounded-lg mb-1 transition-colors ${
                      isSelected ? 'bg-accent/10 text-accent font-semibold' : ''
                    } ${isActive ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/50'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(opt);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          <HighlightMatch text={opt.name} match={searchTerm} />
                        </span>
                        {opt.code && (
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                            <HighlightMatch text={opt.code} match={searchTerm} />
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-accent" />}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                      <span className="font-medium text-muted-foreground">
                        {groupName}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">No ledger found.</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateModal(true);
                  }}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create "{searchTerm || 'New Ledger'}"
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>}

      {/* Inline Account Creation Modal */}
      {showCreateModal && (
        <CreateLedgerDialog
          initialName={searchTerm}
          defaultCategory={allowedAccountTypes?.split(',')[0]}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newAcc) => {
            handleSelect(newAcc);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

// Sub-component: dialog modal for quick ledger creation
interface CreateDialogProps {
  initialName: string;
  defaultCategory?: string;
  onClose: () => void;
  onSuccess: (newAccount: any) => void;
}

const CreateLedgerDialog = ({
  initialName,
  defaultCategory,
  onClose,
  onSuccess,
}: CreateDialogProps) => {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(
    ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(defaultCategory || '')
      ? defaultCategory || 'EXPENSE'
      : 'EXPENSE'
  );
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/accounts', {
        name: name.trim(),
        category,
        code: code.trim() || undefined,
        isGroup: false,
      });

      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-lookup'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-master-data'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-search'] });

      onSuccess(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create ledger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden text-left">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background bg-opacity-35">
          <h3 className="font-bold text-sm text-foreground">Quick Create Ledger</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Ledger Name *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Ledger Code / Alias</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent font-mono"
              placeholder="e.g. 400100"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Account Category *</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="EXPENSE">Expense</option>
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="REVENUE">Revenue</option>
              <option value="EQUITY">Equity</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-muted-foreground hover:bg-background rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-opacity-95 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Save Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
