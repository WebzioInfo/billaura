import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, MoreVertical, RefreshCw, Download, Upload, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ZohoViewFilter {
  id: string;
  label: string;
  count?: number;
}

export type ZohoViewOption = ZohoViewFilter;

export interface ZohoPageHeaderProps {
  title: string;
  views?: ZohoViewFilter[];
  activeViewId?: string;
  onViewChange?: (viewId: string) => void;
  newAction?: {
    label: string;
    onClick: () => void;
    splitItems?: Array<{ label: string; onClick: () => void }>;
  };
  onRefresh?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onPreferences?: () => void;
  moreActions?: Array<{ label: string; onClick: () => void }>;
  className?: string;
}

export const ZohoPageHeader: React.FC<ZohoPageHeaderProps> = ({
  title,
  views = [],
  activeViewId,
  onViewChange,
  newAction,
  onRefresh,
  onExport,
  onImport,
  onPreferences,
  moreActions = [],
  className,
}) => {
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false);

  const viewRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (viewRef.current && !viewRef.current.contains(target)) {
        setViewDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuDropdownOpen(false);
      }
      if (splitRef.current && !splitRef.current.contains(target)) {
        setSplitDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeViewLabel = views.find((v) => v.id === activeViewId)?.label || title;

  return (
    <div
      className={cn(
        'h-12 px-5 bg-white border-b border-[#E5E7EB] flex items-center justify-between shrink-0 select-none',
        className
      )}
    >
      {/* LEFT: View / Filter Switcher with Chevron */}
      <div className="relative" ref={viewRef}>
        {views.length > 0 ? (
          <button
            type="button"
            onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
            className="flex items-center gap-1.5 text-base font-semibold text-[#2B2F36] hover:text-[#408DFB] transition-colors cursor-pointer"
          >
            <span>{activeViewLabel}</span>
            <ChevronDown className="w-4 h-4 text-[#6B7280]" />
          </button>
        ) : (
          <h1 className="text-base font-semibold text-[#2B2F36]">{title}</h1>
        )}

        {viewDropdownOpen && views.length > 0 && (
          <div className="absolute left-0 mt-1.5 w-56 bg-white text-[#2B2F36] rounded-[4px] shadow-xl border border-[#E5E7EB] py-1.5 z-50 text-xs animate-in fade-in duration-100">
            <div className="px-3 py-1 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB]">
              Default Filters
            </div>
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setViewDropdownOpen(false);
                  if (onViewChange) onViewChange(v.id);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-[#F0F5FF] flex items-center justify-between transition-colors cursor-pointer',
                  activeViewId === v.id && 'font-semibold text-[#408DFB] bg-[#F8F9FB]'
                )}
              >
                <span>{v.label}</span>
                {v.count !== undefined && (
                  <span className="text-[10px] text-[#6B7280]">{v.count}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Blue "+ New" Button and "..." Menu */}
      <div className="flex items-center gap-2">
        {newAction && (
          <div className="relative inline-flex items-center" ref={splitRef}>
            <button
              type="button"
              onClick={newAction.onClick}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] text-white text-xs font-semibold rounded-[4px] cursor-pointer transition-colors shadow-2xs',
                newAction.splitItems && 'rounded-r-none pr-2'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{newAction.label}</span>
            </button>

            {newAction.splitItems && (
              <>
                <button
                  type="button"
                  onClick={() => setSplitDropdownOpen(!splitDropdownOpen)}
                  className="px-1.5 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] text-white text-xs rounded-r-[4px] border-l border-[#60A5FA] cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {splitDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white text-[#2B2F36] rounded-[4px] shadow-lg border border-[#E5E7EB] py-1 z-50 text-xs">
                    {newAction.splitItems.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSplitDropdownOpen(false);
                          item.onClick();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* "…" More Actions Menu (Sort by, Import, Export, Preferences, Refresh) */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuDropdownOpen(!menuDropdownOpen)}
            className="p-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-[#6B7280] hover:text-[#2B2F36] transition-colors cursor-pointer"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white text-[#2B2F36] rounded-[4px] shadow-xl border border-[#E5E7EB] py-1.5 z-50 text-xs animate-in fade-in duration-100">
              {onRefresh && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onRefresh();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Refresh List</span>
                </button>
              )}

              {onImport && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onImport();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Import Records</span>
                </button>
              )}

              {onExport && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onExport();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Export Records</span>
                </button>
              )}

              {onPreferences && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    onPreferences();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] flex items-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Preferences</span>
                </button>
              )}

              {moreActions.map((action, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMenuDropdownOpen(false);
                    action.onClick();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F8F9FB] cursor-pointer"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
