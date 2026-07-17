import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, Check, ChevronDown } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface SearchableSelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (value: string, item?: any) => void;
  options: any[];
  mapOption: (item: any) => { label: string; value: string; description?: string };
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableSelect = ({
  label,
  error,
  helperText,
  value,
  onChange,
  options = [],
  mapOption,
  placeholder = 'Search...',
  disabled = false,
  required = false,
}: SearchableSelectProps & { required?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle position
  const updatePosition = () => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 256; // max-h-64 (16rem = 256px)
      
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

  // Filter options
  const filteredOptions = options.filter(opt => {
    if (!debouncedSearch) return true;
    const mapped = mapOption(opt);
    return mapped.label.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
           (mapped.description && mapped.description.toLowerCase().includes(debouncedSearch.toLowerCase()));
  });

  const emptyMessage = searchTerm.trim()
    ? `No results match '${searchTerm.trim()}'.`
    : 'No options available.';
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
    ? options.find((opt: any) => mapOption(opt).value === value)
    : null;

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div 
        className={`relative w-full bg-background border rounded-xl flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
          error ? 'border-red-500' : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate pr-4 text-foreground">
          {selectedItem ? mapOption(selectedItem).label : <span className="text-muted-foreground">{placeholder}</span>}
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="bg-surface border border-border rounded-xl shadow-xl flex flex-col overflow-hidden"
          style={dropdownStyle}
        >
          <div className="p-2 border-b border-border relative shrink-0">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Type to search..."
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="overflow-y-auto p-1 flex-1 relative"
            style={{ minHeight: '100px' }}
          >
            {filteredOptions.length > 0 ? (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const opt = filteredOptions[virtualRow.index];
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
                          isSelected ? 'bg-accent/10 text-accent' : 'hover:bg-muted text-foreground'
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
              <div className="py-4 text-center text-xs text-muted-foreground">
                {emptyMessage}
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
    </div>
  );
};

