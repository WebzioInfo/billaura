import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Receipt,
  ClipboardList,
  Landmark,
  BookOpen,
  BarChart3,
  Users,
  Folder,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { useWorkspaceStore } from '@/shared/stores/workspaceStore';

export interface ZohoSidebarChild {
  id: string;
  label: string;
  path: string;
  newPath?: string;
  roles?: string[];
}

export interface ZohoSidebarGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string; // If single-item group like Home
  items?: ZohoSidebarChild[];
  roles?: string[];
}

export const ZOHO_SIDEBAR_NAVIGATION: ZohoSidebarGroup[] = [
  {
    id: 'home',
    label: 'Home',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'items',
    label: 'Items',
    icon: Package,
    items: [
      { id: 'products', label: 'Items', path: '/products', newPath: '/products' },
      { id: 'units', label: 'Units', path: '/units' },
      { id: 'categories', label: 'Categories', path: '/categories' },
      { id: 'brands', label: 'Brands', path: '/brands' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Layers,
    items: [
      { id: 'inventory-stock', label: 'Inventory Adjustments', path: '/inventory', newPath: '/inventory/adjustments/new' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: Receipt,
    items: [
      { id: 'customers', label: 'Customers', path: '/customers', newPath: '/customers/new' },
      { id: 'quotations', label: 'Quotes', path: '/quotations', newPath: '/quotations/new' },
      { id: 'sales-orders', label: 'Sales Orders', path: '/sales-orders', newPath: '/sales-orders/new' },
      { id: 'invoices', label: 'Invoices', path: '/invoices', newPath: '/invoices/new' },
      { id: 'recurring-invoices', label: 'Recurring Invoices', path: '/recurring-invoices' },
      { id: 'delivery-challans', label: 'Delivery Challans', path: '/delivery-challans', newPath: '/delivery-challans/new' },
      { id: 'receipts', label: 'Payments Received', path: '/receipts', newPath: '/receipts/new' },
      { id: 'credit-notes', label: 'Credit Notes', path: '/credit-notes', newPath: '/credit-notes/new' },
    ],
  },
  {
    id: 'purchases',
    label: 'Purchases',
    icon: ClipboardList,
    items: [
      { id: 'vendors', label: 'Vendors', path: '/vendors', newPath: '/vendors/new' },
      { id: 'expenses', label: 'Expenses', path: '/expenses' },
      { id: 'purchase-orders', label: 'Purchase Orders', path: '/purchase-orders', newPath: '/purchase-orders/new' },
      { id: 'bills', label: 'Bills', path: '/bills', newPath: '/bills/new' },
      { id: 'vendor-payments', label: 'Payments Made', path: '/vendor-payments' },
      { id: 'debit-notes', label: 'Vendor Credits', path: '/debit-notes', newPath: '/debit-notes/new' },
    ],
  },
  {
    id: 'banking',
    label: 'Banking',
    icon: Landmark,
    items: [
      { id: 'cash-bank', label: 'Banking', path: '/banking' },
      { id: 'bank-transactions', label: 'Bank Transactions', path: '/bank-transactions' },
      { id: 'reconciliation', label: 'Reconciliation', path: '/reconciliation' },
    ],
  },
  {
    id: 'accountant',
    label: 'Accountant',
    icon: BookOpen,
    items: [
      { id: 'journal-entries', label: 'Manual Journals', path: '/journal-entries', newPath: '/journal-entries/new' },
      { id: 'chart-of-accounts', label: 'Chart of Accounts', path: '/chart-of-accounts' },
      { id: 'capital', label: 'Capital', path: '/capital' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
  },
  {
    id: 'hr',
    label: 'People & HR',
    icon: Users,
    items: [
      { id: 'employees', label: 'Employees', path: '/employees' },
      { id: 'payroll', label: 'Payroll', path: '/payroll' },
      { id: 'attendance', label: 'Attendance', path: '/attendance' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: Folder,
    items: [
      { id: 'templates', label: 'Templates', path: '/settings/templates' },
    ],
  },
];

export const SIDEBAR_NAVIGATION = ZOHO_SIDEBAR_NAVIGATION;

export interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { openTab } = useWorkspaceStore();
  const user = useSessionStore((state) => state.user);

  // Open group states: ALL groups start collapsed on first load and refresh
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Floating flyout state for collapsed icon rail mode
  const [flyout, setFlyout] = useState<{
    group: ZohoSidebarGroup;
    top: number;
  } | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Close flyout on outside click
  useEffect(() => {
    if (!flyout) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyout(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [flyout]);

  // Close flyout when collapsed state changes or route changes
  useEffect(() => {
    setFlyout(null);
  }, [isCollapsed, location.pathname]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isChildActive = (path: string) => {
    if (location.pathname === path) return true;
    if (path !== '/' && path !== '/dashboard') {
      return location.pathname.startsWith(path + '/');
    }
    return false;
  };

  const isParentActive = (group: ZohoSidebarGroup) => {
    if (group.path) {
      if (group.id === 'reports') {
        return location.pathname.startsWith('/reports');
      }
      if (group.path === '/dashboard') {
        return location.pathname === '/dashboard' || location.pathname === '/';
      }
      return location.pathname === group.path || location.pathname.startsWith(group.path + '/');
    }
    return (
      group.items?.some(
        (item) =>
          location.pathname === item.path ||
          location.pathname.startsWith(item.path + '/')
      ) ?? false
    );
  };

  const handleNavigate = (path: string, label: string) => {
    openTab({
      id: path,
      title: label,
      path,
    });
    navigate(path);
  };

  const handleNewClick = (e: React.MouseEvent, newPath?: string, label?: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!newPath) return;
    openTab({
      id: newPath,
      title: `New ${label || 'Record'}`,
      path: newPath,
    });
    navigate(newPath);
  };

  const handleRailButtonClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    group: ZohoSidebarGroup
  ) => {
    if (!group.items || group.items.length === 0) {
      setFlyout(null);
      handleNavigate(group.path || '/dashboard', group.label);
      return;
    }

    if (flyout?.group.id === group.id) {
      setFlyout(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setFlyout({
      group,
      top: rect.top,
    });
  };

  return (
    <aside
      className={cn(
        'bg-white border-r border-[#E5E7EB] flex flex-col h-full shrink-0 select-none transition-all duration-200 z-20',
        isCollapsed ? 'w-16' : 'w-56',
        isMobileOpen
          ? 'fixed inset-y-0 left-0 z-50 shadow-2xl w-64'
          : 'hidden lg:flex'
      )}
    >
      {/* Scrollable Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {ZOHO_SIDEBAR_NAVIGATION.map((group) => {
          const Icon = group.icon;
          const parentActive = isParentActive(group);
          const isOpen = openGroups[group.id] ?? false;

          // 1. Narrow Rail View (ONLY when manually collapsed by user)
          if (isCollapsed) {
            const isFlyoutOpen = flyout?.group.id === group.id;
            return (
              <div key={group.id} className="flex flex-col items-center py-1">
                <button
                  type="button"
                  onClick={(e) => handleRailButtonClick(e, group)}
                  className={cn(
                    'w-11 h-11 rounded-[4px] flex flex-col items-center justify-center transition-colors cursor-pointer text-center relative',
                    (parentActive || isFlyoutOpen)
                      ? 'bg-[#408DFB] text-white font-medium'
                      : 'text-[#4B5563] hover:bg-[#F8F9FB] hover:text-[#2B2F36]'
                  )}
                  title={group.label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] truncate max-w-[42px] leading-tight mt-0.5">
                    {group.label}
                  </span>
                </button>
              </div>
            );
          }

          // 2. Full Expanded Zoho Hierarchy View
          // If group is a single link without children (e.g. Home, Reports)
          if (!group.items) {
            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => handleNavigate(group.path || '/dashboard', group.label)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 h-[32px] rounded-[4px] text-[13px] font-medium transition-colors cursor-pointer text-left',
                    parentActive
                      ? 'bg-[#408DFB] text-white'
                      : 'text-[#2B2F36] hover:bg-[#F8F9FB]'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{group.label}</span>
                </button>
              </div>
            );
          }

          // Parent Row with Expandable Children (13px weight 500 with icon)
          // Highlight parent group row if current page is one of its children AND group is closed
          const shouldHighlightParent = parentActive && !isOpen;
          return (
            <div key={group.id} className="space-y-0.5">
              {/* Parent Row */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 h-[32px] rounded-[4px] text-[13px] font-medium transition-colors cursor-pointer text-left',
                  shouldHighlightParent
                    ? 'bg-[#EEF4FF] text-[#408DFB] font-semibold'
                    : 'text-[#2B2F36] hover:bg-[#F8F9FB]'
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0',
                      shouldHighlightParent ? 'text-[#408DFB]' : 'text-[#6B7280]'
                    )}
                  />
                  <span className="truncate">{group.label}</span>
                </div>
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 transition-transform duration-150',
                    shouldHighlightParent ? 'text-[#408DFB]' : 'text-[#6B7280]',
                    isOpen && 'rotate-90'
                  )}
                />
              </button>

              {/* Child Rows (Indented, No Icon, 13px weight 400, 32px row height, Active = Solid Blue Pill with "+") */}
              {isOpen && (
                <div className="pl-6 space-y-0.5 pt-0.5">
                  {group.items.map((child) => {
                    const childActive = isChildActive(child.path);
                    return (
                      <div
                        key={child.id}
                        onClick={() => handleNavigate(child.path, child.label)}
                        className={cn(
                          'group/child flex items-center justify-between px-3 h-[32px] rounded-[4px] text-[13px] font-normal transition-colors cursor-pointer select-none',
                          childActive
                            ? 'bg-[#408DFB] text-white font-medium'
                            : 'text-[#4B5563] hover:bg-[#F8F9FB] hover:text-[#2B2F36]'
                        )}
                      >
                        <span className="truncate">{child.label}</span>

                        {/* Solid blue pill "+" button on active or on child hover if newPath exists */}
                        {child.newPath && (
                          <button
                            type="button"
                            onClick={(e) => handleNewClick(e, child.newPath, child.label)}
                            className={cn(
                              'w-4 h-4 rounded-[2px] flex items-center justify-center transition-opacity cursor-pointer',
                              childActive
                                ? 'text-white hover:bg-white/20'
                                : 'opacity-0 group-hover/child:opacity-100 text-[#408DFB] hover:bg-[#EDF2F7]'
                            )}
                            title={`New ${child.label}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Flyout Popover for Collapsed Icon Rail */}
      {isCollapsed && flyout && (
        <div
          ref={flyoutRef}
          style={{
            top: Math.max(8, Math.min(flyout.top, window.innerHeight - 340)),
          }}
          className="fixed left-16 z-50 w-52 bg-white rounded-md shadow-xl border border-[#E5E7EB] py-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider border-b border-[#F1F3F5] mb-1">
            {flyout.group.label}
          </div>
          <div className="max-h-[70vh] overflow-y-auto space-y-0.5 px-1.5">
            {flyout.group.items?.map((child) => {
              const childActive = isChildActive(child.path);
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    handleNavigate(child.path, child.label);
                    setFlyout(null);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 h-8 rounded text-[13px] font-normal transition-colors cursor-pointer text-left',
                    childActive
                      ? 'bg-[#408DFB] text-white font-medium'
                      : 'text-[#333333] hover:bg-[#F8F9FB] hover:text-[#408DFB]'
                  )}
                >
                  <span className="truncate">{child.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapse / Expand Toggle Button at Bottom */}
      <div className="p-2 border-t border-[#E5E7EB] bg-[#F8F9FB] flex items-center justify-center shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-[#6B7280] hover:text-[#2B2F36] hover:bg-white rounded-[4px] border border-transparent hover:border-[#E5E7EB] transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronsLeft className="w-4 h-4" />
              <span className="text-[11px] font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
