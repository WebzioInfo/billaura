import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, X, Package } from 'lucide-react';
import apiClient, { ensureArray } from '@/core/api';

export interface ProductItem {
  id: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
  sellingPrice?: number | null;
  rate?: number | null;
  gstRate?: number | null;
  description?: string | null;
  [key: string]: any;
}

interface SearchableItemComboboxProps {
  value: string; // productId
  displayValue: string; // productName
  unit?: string;
  initialProducts?: ProductItem[];
  onSelect: (product: ProductItem | null) => void;
  placeholder?: string;
}

export const SearchableItemCombobox: React.FC<SearchableItemComboboxProps> = ({
  value,
  displayValue,
  unit,
  initialProducts = [],
  onSelect,
  placeholder = 'Type or click to select an item...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [apiResults, setApiResults] = useState<ProductItem[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounced API search when query changes
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setApiResults([]);
      setIsSearchingApi(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingApi(true);
        const res: any = await apiClient.get('/products', {
          params: { search: query.trim(), limit: 50 },
        });
        const items = ensureArray<ProductItem>(res);
        setApiResults(items);
      } catch {
        // Fallback to local filtering on error
        setApiResults([]);
      } finally {
        setIsSearchingApi(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Combined product dataset (local initialProducts + any extra returned by API search)
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    
    // Merge initialProducts with apiResults, deduplicating by ID
    const productMap = new Map<string, ProductItem>();
    initialProducts.forEach((p) => productMap.set(p.id, p));
    apiResults.forEach((p) => productMap.set(p.id, p));
    const all = Array.from(productMap.values());

    if (!q) {
      return all;
    }

    return all.filter((p) => {
      const nameMatch = p.name && p.name.toLowerCase().includes(q);
      const skuMatch = p.sku && p.sku.toLowerCase().includes(q);
      const descMatch = p.description && p.description.toLowerCase().includes(q);
      const unitMatch = p.unit && p.unit.toLowerCase().includes(q);
      return nameMatch || skuMatch || descMatch || unitMatch;
    });
  }, [initialProducts, apiResults, query]);

  // Reset highlight index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-combobox-item]');
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (prod: ProductItem) => {
    onSelect(prod);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Combobox trigger input */}
      <div
        className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] flex items-center gap-1.5 focus-within:border-[#408DFB] cursor-text"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Package className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
        
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : displayValue || ''}
          placeholder={isOpen ? 'Search by item name or SKU...' : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-xs text-[#2B2F36] placeholder:text-[#9CA3AF] outline-none truncate"
        />

        {value && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-[#9CA3AF] hover:text-[#DC2626] rounded cursor-pointer"
            title="Clear item"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
            if (!isOpen) inputRef.current?.focus();
          }}
          className="text-[#6B7280] hover:text-[#408DFB] p-0.5 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute top-9 left-0 w-full min-w-[340px] max-w-lg bg-white border border-[#CBD5E1] rounded-[4px] shadow-xl z-50 overflow-hidden">
          {/* Header search bar info */}
          <div className="px-3 py-1.5 bg-[#F8F9FB] border-b border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#6B7280]">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-[#9CA3AF]" />
              {isSearchingApi ? 'Searching catalog...' : `${filteredProducts.length} item(s) available`}
            </span>
            <span className="text-[10px] text-[#9CA3AF]">ESC to close • ↵ to select</span>
          </div>

          {/* List items */}
          <div ref={listRef} className="max-h-60 overflow-y-auto divide-y divide-[#F1F5F9]">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#6B7280]">
                {query.trim()
                  ? `No items found matching "${query.trim()}"`
                  : 'No items available in the catalog'}
              </div>
            ) : (
              filteredProducts.map((prod, index) => {
                const isSelected = prod.id === value;
                const isHighlighted = index === highlightedIndex;
                const rate = Number(prod.sellingPrice ?? prod.rate ?? 0);

                return (
                  <div
                    key={prod.id}
                    data-combobox-item
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(prod)}
                    className={`px-3 py-2 cursor-pointer transition-colors ${
                      isHighlighted
                        ? 'bg-[#EFF6FF] border-l-2 border-[#408DFB]'
                        : isSelected
                        ? 'bg-[#F0FDF4] border-l-2 border-[#22C55E]'
                        : 'hover:bg-[#F8F9FB]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-xs text-[#1E2540] truncate">
                        {prod.name}
                      </span>
                      {prod.sku && (
                        <span className="px-1.5 py-0.2 bg-[#F1F5F9] text-[#475569] text-[10px] rounded font-mono shrink-0">
                          {prod.sku}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#6B7280] mt-0.5">
                      <span>Unit: {prod.unit || 'PCS'}</span>
                      <span className="font-semibold text-[#059669]">
                        Rate: ₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
