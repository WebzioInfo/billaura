import React, { useState, useEffect, useRef, useLayoutEffect, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';
import { FormErrorDisplay } from './FormErrorDisplay';

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

export interface LedgerSearchSelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (value: string, item?: any) => void;
  placeholder?: string;
  allowedAccountTypes?: string; // e.g. "ASSET,LIABILITY"
  allowedTypes?: string; // e.g. "Bank,Cash"
  disabled?: boolean;
  required?: boolean;
  queryKey?: string; // Custom key suffix (e.g. "receipt-bank")
}

export const LedgerSearchSelect = ({
  label,
  error,
  helperText,
  value,
  onChange,
  placeholder = 'Search ledger...',
  allowedAccountTypes,
  allowedTypes,
  disabled = false,
  required = false,
  queryKey,
}: LedgerSearchSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Construct queryKey as requested: ['ledger-search', searchTerm, custom_suffix]
  const cacheKey = ['ledger-search', debouncedSearch, queryKey || (allowedAccountTypes || '') + '-' + (allowedTypes || '')];

  // Fetch options via global lookup search
  const { data: response, isLoading } = useQuery({
    queryKey: cacheKey,
    queryFn: async ({ signal }) => {
      const res = await apiClient.get('/lookup/search', {
        params: {
          entity: 'ledger',
          q: debouncedSearch,
          allowedAccountTypes,
          allowedTypes,
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

  // Sync selected item details
  const [selectedLabel, setSelectedLabel] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const updatePosition = () => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 320; // max-h-80 (20rem = 320px)
      
      const isUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      setDropdownStyle({
        position: 'fixed',
        top: isUp ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        maxHeight: `${dropdownHeight}px`,
      });
    }
  };

  useLayoutEffect(() => {
    updatePosition();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (value && options.length > 0) {
      const found = options.find((opt: any) => opt.id === value);
      if (found) {
        setSelectedLabel(found.name);
        setSelectedDetail(found);
      }
    }
  }, [value, options]);

  // Fetch initial details if not loaded/found in search options
  const { data: singleDetail } = useQuery({
    queryKey: ['ledger-detail-single', value, allowedTypes],
    queryFn: async () => {
      if (!value) return null;
      // If we are looking up bank/cash accounts, fetch all and search
      if (allowedTypes && (allowedTypes.toLowerCase().includes('bank') || allowedTypes.toLowerCase().includes('cash'))) {
        const res = await apiClient.get('/bank-accounts');
        const list = res.data?.items || res.items || [];
        return list.find((b: any) => b.id === value) || null;
      } else {
        const res = await apiClient.get(`/accounts/${value}`);
        return res.data || res;
      }
    },
    enabled: !!value && !selectedDetail,
  });

  useEffect(() => {
    if (singleDetail) {
      setSelectedLabel(singleDetail.name);
      setSelectedDetail(singleDetail);
    }
  }, [singleDetail]);

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
        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-sans">
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

      {isOpen && createPortal(
        <div 
          className="bg-surface border border-border rounded-xl shadow-xl flex flex-col overflow-hidden"
          style={dropdownStyle}
        >
          <div className="p-2 border-b border-border relative shrink-0">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              ref={inputRef}
              autoFocus
              placeholder="Type to search ledger..."
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-accent text-foreground"
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
                <p className="text-xs text-muted-foreground font-sans">Type to search ledger...</p>
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
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground font-sans">
                      <span className="font-medium text-muted-foreground">
                        {groupName}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-muted-foreground mb-2 font-sans">
                  {allowedTypes && (allowedTypes.toLowerCase().includes('bank') || allowedTypes.toLowerCase().includes('cash'))
                    ? 'No matching bank ledger found.'
                    : 'No matching ledger found.'}
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {error && (
        <div className="mt-1.5 text-xs text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 font-sans">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}
      {helperText && !error && <p className="mt-1.5 text-xs text-muted-foreground font-sans">{helperText}</p>}
    </div>
  );
};
