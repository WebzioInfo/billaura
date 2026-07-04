import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Check, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api';

export interface AsyncSelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (value: string, item?: any) => void;
  apiPath: string; // e.g. '/accounts/lookup'
  queryKeyPrefix: string;
  placeholder?: string;
  defaultOptions?: any[];
  mapOption: (item: any) => { label: string; value: string; description?: string };
  additionalParams?: Record<string, any>;
  disabled?: boolean;
}

export const AsyncSelect = ({
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
}: AsyncSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: results, isLoading } = useQuery({
    queryKey: [queryKeyPrefix, debouncedSearch, additionalParams],
    queryFn: async () => {
      if (!isOpen && !value) return [];
      const res = await apiClient.get(apiPath, {
        params: { search: debouncedSearch, limit: 50, ...additionalParams }
      });
      return res.data?.data || res.data || [];
    },
    enabled: isOpen || !!value,
  });

  const options = Array.isArray(results) ? results : [];

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

  const selectedItem = value 
    ? options.find((opt: any) => mapOption(opt).value === value) || defaultOptions.find(opt => mapOption(opt).value === value)
    : null;

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {label}
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

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-xl shadow-xl max-h-64 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border relative">
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
          
          <div className="overflow-y-auto p-1 flex-1">
            {isLoading ? (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : options.length > 0 ? (
              options.map((opt: any) => {
                const { label: optLabel, value: optValue, description } = mapOption(opt);
                const isSelected = value === optValue;
                return (
                  <div
                    key={optValue}
                    className={`flex flex-col px-3 py-2 cursor-pointer rounded-lg mb-1 transition-colors ${
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
                      <span className="font-semibold text-sm">{optLabel}</span>
                      {isSelected && <Check className="w-4 h-4 text-accent" />}
                    </div>
                    {description && (
                      <span className="text-xs text-muted-foreground mt-0.5">{description}</span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No results found.
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
};
