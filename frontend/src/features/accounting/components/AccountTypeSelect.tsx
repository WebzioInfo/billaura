import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X, ShieldAlert } from 'lucide-react';
import {
  GROUPED_ACCOUNT_TYPES,
  AccountTypeMetadata,
  getAccountTypeMetadata,
  MainAccountGroup,
} from '../constants/account-types.constant';

export interface AccountTypeSelectProps {
  value?: string; // Detailed account type ID (e.g. 'OTHER_CURRENT_ASSET') or category
  category?: MainAccountGroup;
  onChange: (type: AccountTypeMetadata) => void;
  disabled?: boolean;
  lockMainGroup?: boolean;
  lockReason?: string;
  error?: string;
}

export const AccountTypeSelect: React.FC<AccountTypeSelectProps> = ({
  value,
  category,
  onChange,
  disabled = false,
  lockMainGroup = false,
  lockReason,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected metadata resolution
  const selectedMeta = useMemo(() => {
    return getAccountTypeMetadata(value) || (category ? getAccountTypeMetadata(category) : null);
  }, [value, category]);

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter groups and types based on search
  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return GROUPED_ACCOUNT_TYPES;

    return GROUPED_ACCOUNT_TYPES.map((group) => {
      const groupMatches = group.label.toLowerCase().includes(term);
      const matchedTypes = group.types.filter(
        (t) =>
          groupMatches ||
          t.displayName.toLowerCase().includes(term) ||
          t.id.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
      );

      return {
        ...group,
        types: matchedTypes,
      };
    }).filter((group) => group.types.length > 0);
  }, [searchTerm]);

  const handleSelect = (type: AccountTypeMetadata) => {
    if (lockMainGroup && selectedMeta && type.mainGroup !== selectedMeta.mainGroup) {
      return; // Prevent changing main group when locked by accounting transactions
    }
    onChange(type);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-white border rounded text-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
          error
            ? 'border-red-400 focus:ring-1 focus:ring-red-400'
            : isOpen
            ? 'border-[#408DFB] ring-1 ring-[#408DFB]'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedMeta ? (
            <>
              <span className="font-semibold text-gray-900 truncate">
                {selectedMeta.displayName}
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-[#408DFB] border border-blue-100 shrink-0">
                {selectedMeta.mainGroupLabel}
              </span>
            </>
          ) : (
            <span className="text-gray-400">Select Account Type...</span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Group Lock Notice */}
      {lockMainGroup && lockReason && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2 py-1 rounded border border-amber-200">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>{lockReason}</span>
        </div>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full z-50 bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden flex flex-col max-h-[320px]">
          {/* Search Header */}
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-1.5 shrink-0">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search account type (e.g. Bank, Clearing, Stock)..."
              className="w-full bg-transparent text-xs text-gray-900 focus:outline-none placeholder-gray-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Grouped Options List */}
          <div className="overflow-y-auto divide-y divide-gray-100 flex-1">
            {filteredGroups.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                No matching account types found for "{searchTerm}".
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isGroupDisabled = Boolean(
                  lockMainGroup && selectedMeta && group.id !== selectedMeta.mainGroup
                );

                return (
                  <div key={group.id} className="py-1">
                    {/* Main Group Header */}
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/60 flex items-center justify-between select-none">
                      <span>{group.label}</span>
                      <span className="text-[9px] font-mono text-gray-400">
                        {group.normalBalance === 'DEBIT' ? 'Normal: Dr' : 'Normal: Cr'}
                      </span>
                    </div>

                    {/* Detailed Account Types */}
                    <div className="space-y-0.5 px-1 py-0.5">
                      {group.types.map((type) => {
                        const isSelected = selectedMeta?.id === type.id;
                        const isOptionDisabled = isGroupDisabled;

                        return (
                          <button
                            key={type.id}
                            type="button"
                            disabled={isOptionDisabled}
                            onClick={() => handleSelect(type)}
                            title={
                              isOptionDisabled
                                ? 'Classification change restricted by accounting history'
                                : type.description
                            }
                            className={`w-full px-2.5 py-1.5 text-xs rounded text-left flex items-center justify-between transition-colors ${
                              isOptionDisabled
                                ? 'opacity-40 cursor-not-allowed bg-gray-50 text-gray-400'
                                : isSelected
                                ? 'bg-blue-50 text-[#408DFB] font-semibold'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer'
                            }`}
                          >
                            <div className="flex flex-col truncate pr-2">
                              <span className="truncate">{type.displayName}</span>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[#408DFB] shrink-0" />
                            )}
                          </button>
                        );
                      })}
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

