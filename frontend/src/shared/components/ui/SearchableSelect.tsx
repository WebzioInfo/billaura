import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, Check, ChevronDown, X, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ensureArray } from '../../../core/api/apiClient';

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

export interface SearchableSelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string | number | null;
  onChange?: (value: string, item?: any) => void;
  onValueChange?: (value: string, item?: any) => void;
  options?: any[];
  mapOption?: (item: any) => {
    label: string;
    value: string;
    description?: string;
    subLabel?: string;
    searchKeywords?: string[];
  };
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  clearable?: boolean;
  isLoading?: boolean;
  loading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
  triggerClassName?: string;
  onCreate?: () => void;
  onCreateNew?: () => void;
  createLabel?: string;
  createNewText?: string;
  name?: string;
}

export const SearchableSelect = ({
  label,
  error,
  helperText,
  value,
  onChange,
  onValueChange,
  options = [],
  mapOption,
  placeholder = 'Select...',
  searchPlaceholder = 'Type to search...',
  emptyMessage,
  disabled = false,
  required = false,
  allowClear = false,
  clearable = false,
  isLoading = false,
  loading = false,
  isError = false,
  onRetry,
  className = '',
  triggerClassName = '',
  onCreate,
  onCreateNew,
  createLabel,
  createNewText = 'Create New',
  name,
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isActuallyLoading = isLoading || loading;
  const showClear = (allowClear || clearable) && !!value && !disabled;
  const handleCreate = onCreate || onCreateNew;
  const createButtonText = createLabel || createNewText;

  // Normalized safe array of options
  const rawOptions = useMemo(() => {
    return ensureArray(options);
  }, [options]);

  const handleSelectValue = useCallback((val: string, item?: any) => {
    if (onChange) onChange(val, item);
    if (onValueChange) onValueChange(val, item);
  }, [onChange, onValueChange]);

  // Default option mapper supporting rich meta
  const resolveOption = useCallback((item: any) => {
    if (mapOption) {
      const mapped = mapOption(item);
      const val = String(mapped.value ?? '');
      const lbl = String(mapped.label ?? val);
      const desc = mapped.description || (mapped as any).subLabel || undefined;
      const searchKeywords = (mapped as any).searchKeywords || (mapped as any).keywords || undefined;
      return { label: lbl, value: val, description: desc, searchKeywords };
    }
    if (item === null || item === undefined) {
      return { label: '', value: '', description: undefined, searchKeywords: undefined };
    }
    if (typeof item === 'string' || typeof item === 'number') {
      return { label: String(item), value: String(item), description: undefined, searchKeywords: undefined };
    }
    const val = String(item.value ?? item.id ?? item.code ?? '');
    const lbl = String(item.label ?? item.name ?? item.title ?? item.companyName ?? val);
    const desc = item.description || item.subLabel || item.code || item.email || item.phone || item.sku || item.hsnCode || item.gstin || item.gstNumber || undefined;
    return { label: lbl, value: val, description: desc, searchKeywords: undefined };
  }, [mapOption]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 120);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Dynamic positioning
  const updatePosition = useCallback(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 280; // max-h-[280px]
      
      const isUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      setDropdownStyle({
        position: 'fixed',
        top: isUp ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        width: Math.max(200, rect.width),
        zIndex: 9999,
        maxHeight: `${dropdownHeight}px`,
      });
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    if (!isOpen) return undefined;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options with smart multi-field matching
  const filteredOptions = useMemo(() => {
    if (!debouncedSearch.trim()) return rawOptions;
    const searchLower = debouncedSearch.trim().toLowerCase();

    return rawOptions.filter((opt) => {
      const mapped = resolveOption(opt);
      if (mapped.label && mapped.label.toLowerCase().includes(searchLower)) return true;
      if (mapped.description && mapped.description.toLowerCase().includes(searchLower)) return true;
      
      if (Array.isArray(mapped.searchKeywords)) {
        for (const kw of mapped.searchKeywords) {
          if (kw && String(kw).toLowerCase().includes(searchLower)) return true;
        }
      }

      // Also search extra raw object keys if present
      if (typeof opt === 'object' && opt !== null) {
        const extraFields = [
          opt.code, opt.sku, opt.email, opt.phone, opt.hsnCode,
          opt.gstin, opt.gstNumber, opt.customerCode, opt.vendorCode,
          opt.accountNumber, opt.state, opt.city, opt.pan, opt.alias
        ];
        for (const f of extraFields) {
          if (f && String(f).toLowerCase().includes(searchLower)) return true;
        }
      }
      return false;
    });
  }, [rawOptions, debouncedSearch, resolveOption]);

  // Reset active index when filtered options change
  useEffect(() => {
    setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions]);

  // Selected item lookup
  const selectedItem = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    const strVal = String(value);
    return rawOptions.find((opt: any) => resolveOption(opt).value === strVal) || null;
  }, [value, rawOptions, resolveOption]);

  const selectedDisplayLabel = selectedItem ? resolveOption(selectedItem).label : '';

  // Keyboard navigation
  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      if (rowVirtualizer && activeIndex >= 0) {
        rowVirtualizer.scrollToIndex(Math.min(filteredOptions.length - 1, activeIndex + 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
      if (rowVirtualizer && activeIndex >= 0) {
        rowVirtualizer.scrollToIndex(Math.max(0, activeIndex - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        const chosen = filteredOptions[activeIndex];
        const mapped = resolveOption(chosen);
        handleSelectValue(mapped.value, chosen);
        setIsOpen(false);
        setSearchTerm('');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  // Virtualizer for smooth rendering of large datasets
  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 44,
    overscan: 5,
  });

  const entityName = label ? label.toLowerCase().replace(/[*:]/g, '').trim() : 'options';

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 select-none">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Hidden input for form integration / name attributes if provided */}
      {name && <input type="hidden" name={name} value={value ? String(value) : ''} />}

      <div
        className={`relative w-full bg-background border rounded-xl flex items-center justify-between px-3.5 py-2 text-sm cursor-pointer transition-all select-none ${
          error ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/20' : 'border-border hover:border-border/80 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-muted/20' : ''} ${triggerClassName}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleTriggerKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex-1 truncate pr-2 text-foreground">
          {selectedDisplayLabel ? (
            <span className="font-medium text-foreground">{selectedDisplayLabel}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {showClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectValue('', null);
              }}
              className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent' : ''}`} />
        </div>
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={dropdownStyle}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-border/80 relative shrink-0 bg-surface">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              autoFocus
              placeholder={searchPlaceholder}
              className="w-full bg-background border border-border/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleInputKeyDown}
            />
          </div>

          {/* Options Virtualized List with differentiated states */}
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto p-1 flex-1 relative custom-scrollbar"
            style={{ minHeight: '120px' }}
            role="listbox"
          >
            {isActuallyLoading ? (
              <div className="flex flex-col justify-center items-center py-6 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <span className="text-xs">Loading {entityName}...</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col justify-center items-center py-6 gap-2 text-muted-foreground text-center px-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-xs text-red-500 font-medium">Unable to load {entityName}.</span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-accent/10 text-accent hover:bg-accent/20 rounded-md transition-colors cursor-pointer mt-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            ) : rawOptions.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-6 px-4 gap-2 text-center text-muted-foreground">
                <span className="text-xs">No {entityName} found.</span>
                {handleCreate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      handleCreate();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-sm transition-colors cursor-pointer mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {createButtonText}
                  </button>
                )}
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground px-4">
                {emptyMessage || `No ${entityName} match "${searchTerm.trim()}".`}
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const opt = filteredOptions[virtualRow.index];
                  const { label: optLabel, value: optValue, description } = resolveOption(opt);
                  const isSelected = String(value) === optValue;
                  const isActive = virtualRow.index === activeIndex;

                  return (
                    <div
                      key={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="px-0.5"
                    >
                      <div
                        className={`flex flex-col px-3 h-[42px] justify-center cursor-pointer rounded-lg transition-colors select-none ${
                          isSelected ? 'bg-accent/15 text-accent font-semibold' : ''
                        } ${isActive && !isSelected ? 'bg-muted/70 text-foreground' : 'text-foreground hover:bg-muted/40'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectValue(optValue, opt);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        onMouseEnter={() => setActiveIndex(virtualRow.index)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs truncate font-medium">
                            <HighlightMatch text={optLabel} match={searchTerm} />
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-accent shrink-0 ml-2" />}
                        </div>
                        {description && (
                          <span className="text-[10px] text-muted-foreground truncate leading-tight">
                            <HighlightMatch text={description} match={searchTerm} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional Inline Quick Create Bottom Bar */}
          {handleCreate && rawOptions.length > 0 && (
            <div className="p-1.5 border-t border-border/80 bg-muted/20 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  handleCreate();
                }}
                className="flex items-center w-full gap-2 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {createButtonText}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      {error && (
        <div className="mt-1.5 text-xs text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}
      {helperText && !error && <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
};
