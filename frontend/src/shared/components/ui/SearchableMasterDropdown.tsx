import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, Check, ChevronDown, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import apiClient, { ensureArray } from '@/core/api';
import { QuickCreateModal } from '../quick-create/QuickCreateModal';
import { QUICK_CREATE_REGISTRY, QuickCreateEntityType } from '../quick-create/quickCreateRegistry';
import { useQuickCreatePermission } from '../quick-create/useQuickCreatePermission';

export interface SearchableMasterDropdownProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (value: string, item?: any) => void;
  apiPath: string; // e.g. '/inventory/categories'
  queryKeyPrefix: string;
  placeholder?: string;
  defaultOptions?: any[];
  mapOption: (item: any) => { label: string; value: string; description?: string };
  additionalParams?: Record<string, any>;
  disabled?: boolean;
  required?: boolean;
  onCreateNew?: () => void;
  createNewText?: string;
  quickCreateEntity?: QuickCreateEntityType;
  quickCreateDefaultValues?: Record<string, any>;
  onQuickCreated?: (item: any) => void;
  quickCreatePosition?: 'above' | 'header-right' | 'none';
}

export const SearchableMasterDropdown = ({
  label,
  error,
  helperText,
  value,
  onChange,
  apiPath,
  queryKeyPrefix,
  placeholder = 'Search...',
  defaultOptions = [],
  mapOption,
  additionalParams = {},
  disabled = false,
  required = false,
  onCreateNew,
  createNewText = 'Create New',
  quickCreateEntity,
  quickCreateDefaultValues,
  onQuickCreated,
  quickCreatePosition = 'above',
}: SearchableMasterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateInitialValues, setQuickCreateInitialValues] = useState<Record<string, any>>({});
  const [localCreatedOptions, setLocalCreatedOptions] = useState<any[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const hasQuickCreatePermission = useQuickCreatePermission(quickCreateEntity);
  const quickEntityConfig = quickCreateEntity ? QUICK_CREATE_REGISTRY[quickCreateEntity] : null;
  
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle position
  const updatePosition = useCallback(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 256; // max-h-64 (16rem = 256px)
      
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

  // Query options
  const { data: fetchedOptions = [], isLoading } = useQuery({
    queryKey: [queryKeyPrefix, debouncedSearch, additionalParams],
    queryFn: async () => {
      const params: Record<string, any> = { ...additionalParams };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      const res = await apiClient.get(apiPath, { params });
      return ensureArray(res);
    },
    enabled: isOpen || !!value,
    staleTime: 60 * 1000,
  });

  const options = useMemo(() => {
    const combined = [...localCreatedOptions, ...fetchedOptions];
    if (combined.length === 0 && defaultOptions.length > 0) {
      return [...localCreatedOptions, ...defaultOptions];
    }
    return combined;
  }, [localCreatedOptions, fetchedOptions, defaultOptions]);

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

  const selectedItem = value 
    ? options.find((opt: any) => mapOption(opt).value === value) || defaultOptions.find(opt => mapOption(opt).value === value)
    : null;

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: options.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  const openQuickCreate = (initialName?: string) => {
    if (!quickCreateEntity) return;
    setQuickCreateInitialValues({
      ...(quickCreateDefaultValues || {}),
      name: initialName !== undefined ? initialName : searchTerm.trim(),
    });
    setIsOpen(false);
    setIsQuickCreateOpen(true);
  };

  const handleCreateAction = () => {
    if (quickCreateEntity && hasQuickCreatePermission) {
      openQuickCreate(searchTerm.trim());
    } else if (onCreateNew) {
      setIsOpen(false);
      onCreateNew();
    }
  };

  const handleQuickCreateSuccess = (createdItem: any) => {
    setLocalCreatedOptions((prev) => [createdItem, ...prev]);
    const val = String(createdItem.id || createdItem.value || createdItem.code || '');
    onChange(val, createdItem);
    queryClient.invalidateQueries({ queryKey: [queryKeyPrefix], exact: false });
    if (onQuickCreated) onQuickCreated(createdItem);
  };

  const entityTitle = quickEntityConfig?.title || createNewText;

  return (
    <div className="w-full relative" ref={containerRef}>
      {(label || (quickCreateEntity && hasQuickCreatePermission && !disabled)) && (
        <div className={`mb-1.5 ${quickCreatePosition === 'header-right' ? 'flex items-center justify-between' : 'flex flex-col gap-1'}`}>
          {label && (
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {quickCreateEntity && hasQuickCreatePermission && !disabled && quickCreatePosition !== 'none' && (
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openQuickCreate();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-accent hover:text-accent/90 bg-accent/10 hover:bg-accent/15 border border-accent/25 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title={`Create ${entityTitle}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create {entityTitle}</span>
              </button>
            </div>
          )}
        </div>
      )}
      
      <div 
        className={`relative w-full bg-background border rounded-xl flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
          error ? 'border-red-500' : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }
          if (e.key === 'Escape') setIsOpen(false);
        }}
      >
        <div className="flex-1 truncate pr-4 text-foreground">
          {selectedItem ? mapOption(selectedItem).label : <span className="text-muted-foreground">{placeholder}</span>}
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="bg-surface border border-border rounded-xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={dropdownStyle}
        >
          <div className="p-2 border-b border-border relative shrink-0">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Type to search..."
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="overflow-y-auto p-1 flex-1 relative custom-scrollbar"
            style={{ minHeight: '100px' }}
          >
            {isLoading ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              </div>
            ) : options.length > 0 ? (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const opt = options[virtualRow.index];
                  const { label: optLabel, value: optValue, description } = mapOption(opt);
                  const isSelected = value === optValue;
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
                      className="px-1"
                    >
                      <div
                        className={`flex flex-col px-3 h-[44px] justify-center cursor-pointer rounded-lg transition-colors ${
                          isSelected ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-muted text-foreground'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange(optValue, opt);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm truncate">{optLabel}</span>
                          {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                        </div>
                        {description && (
                          <span className="text-xs text-muted-foreground mt-0.5 truncate">{description}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground px-4 flex flex-col items-center gap-2">
                <span>No results found{searchTerm ? ` for "${searchTerm}"` : ''}.</span>
                {(quickCreateEntity || onCreateNew) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateAction();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg shadow-sm transition-colors cursor-pointer mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create "{searchTerm.trim() || entityTitle}"</span>
                  </button>
                )}
              </div>
            )}
          </div>
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

      {quickCreateEntity && isQuickCreateOpen && (
        <QuickCreateModal
          isOpen={isQuickCreateOpen}
          onClose={() => setIsQuickCreateOpen(false)}
          entity={quickCreateEntity}
          initialValues={quickCreateInitialValues}
          onSuccess={handleQuickCreateSuccess}
        />
      )}
    </div>
  );
};
