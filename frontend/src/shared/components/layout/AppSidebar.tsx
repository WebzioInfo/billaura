import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  FileText,
  Receipt,
  BarChart3,
  MessageSquare,
  CreditCard,
  BookOpen,
  TrendingUp,
  ShieldCheck,
  Layers,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Settings,
  HelpCircle,
  Wallet,
  Landmark,
  Percent,
  Calculator,
  Package,
  ClipboardList,
  FileSignature,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { useWorkspaceStore } from '@/shared/stores/workspaceStore';

// ============================================================================
// NAVIGATION STRUCTURE (EXACT CONFIG PRESERVED)
// ============================================================================

export interface SidebarSubItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<any>;
  roles?: string[];
  badge?: string;
}

export interface SidebarGroup {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: SidebarSubItem[];
  roles?: string[];
}

export const SIDEBAR_NAVIGATION: SidebarGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { id: 'platform', label: 'Platform Admin', path: '/platform/dashboard', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: Receipt,
    items: [
      { id: 'invoices', label: 'Invoices', path: '/invoices', icon: Receipt },
      { id: 'customers', label: 'Customers', path: '/customers', icon: Users },
      { id: 'receipts', label: 'Payments Received', path: '/receipts', icon: CreditCard },
      { id: 'quotations', label: 'Quotations', path: '/quotations', icon: MessageSquare },
    ],
  },
  {
    id: 'purchases',
    label: 'Purchases & Expenses',
    icon: ClipboardList,
    items: [
      { id: 'bills', label: 'Bills', path: '/bills', icon: FileText },
      { id: 'expenses', label: 'Expenses', path: '/expenses', icon: Wallet },
      { id: 'vendors', label: 'Vendors', path: '/vendors', icon: Building2 },
      { id: 'purchase-orders', label: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardList },
    ],
  },
  {
    id: 'inventory',
    label: 'Items & Stock',
    icon: Package,
    items: [
      { id: 'products', label: 'Products & Services', path: '/products', icon: Package },
      { id: 'inventory-stock', label: 'Stock Overview', path: '/inventory', icon: Layers },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting & Banking',
    icon: BookOpen,
    items: [
      { id: 'banking', label: 'Cash & Bank', path: '/banking', icon: Landmark },
      { id: 'chart-of-accounts', label: 'Chart of Accounts', path: '/chart-of-accounts', icon: BookOpen },
      { id: 'journal-entries', label: 'Journal Entries', path: '/journal-entries', icon: FileSignature },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    items: [
      { id: 'financial-reports', label: 'Financial Reports', path: '/reports/financial', icon: BarChart3 },
      { id: 'day-book', label: 'Day Book', path: '/day-book', icon: Calendar },
      { id: 'profit-loss', label: 'Profit & Loss', path: '/profit-loss', icon: TrendingUp },
      { id: 'gst-taxes', label: 'Taxes & GST', path: '/taxes', icon: Percent },
    ],
  },
  {
    id: 'people',
    label: 'People & HR',
    icon: Users,
    items: [
      { id: 'employees', label: 'Employees', path: '/employees', icon: Users },
      { id: 'payroll', label: 'Payroll', path: '/payroll', icon: Calculator },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { id: 'company-settings', label: 'Company & Settings', path: '/settings', icon: Settings },
      { id: 'invoice-engine', label: 'Invoice Templates', path: '/invoice-engine', icon: FileText },
      { id: 'help', label: 'Help Center', path: '/help', icon: HelpCircle },
    ],
  },
];

// Helper: Check if a child item is active (including nested sub-routes)
export const isChildItemActive = (itemPath: string, currentPath: string): boolean => {
  if (currentPath === itemPath) return true;
  if (itemPath !== '/' && itemPath !== '/dashboard') {
    return currentPath.startsWith(itemPath + '/') || currentPath === itemPath;
  }
  return false;
};

// Helper: Check if any item in a group is active
export const isGroupActive = (group: SidebarGroup, currentPath: string): boolean => {
  return group.items.some(item => isChildItemActive(item.path, currentPath));
};

// ============================================================================
// SUBCOMPONENT 1: SidebarOrgBlock (Top Zone, Fixed)
// ============================================================================

export interface SidebarOrgBlockProps {
  isCollapsed: boolean;
  companyName: string;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onNavigateHome: () => void;
}

export const SidebarOrgBlock: React.FC<SidebarOrgBlockProps> = ({
  isCollapsed,
  companyName,
  isMobileOpen,
  onMobileClose,
  onNavigateHome,
}) => {
  return (
    <div className="h-[60px] flex items-center justify-between px-3.5 border-b border-sidebar-border shrink-0 bg-sidebar-bg">
      <div
        onClick={onNavigateHome}
        className={cn(
          "flex items-center gap-3 cursor-pointer group overflow-hidden w-full",
          isCollapsed ? "justify-center" : ""
        )}
        title="Bill Aura ERP - Home"
      >
        {/* Logo Mark */}
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <img
            src="/logo.png"
            alt="Bill Aura"
            className="w-5.5 h-5.5 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Brand Titles */}
        {!isCollapsed && (
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-[13px] tracking-tight text-foreground">
                BILL AURA
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary leading-none">
                ERP
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground truncate font-medium mt-1">
              {companyName}
            </span>
          </div>
        )}
      </div>

      {/* Mobile Close Button */}
      {isMobileOpen && (
        <button
          onClick={onMobileClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-item-hover lg:hidden cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT 2: SidebarItem (Indented Child Row with Tree Connector)
// ============================================================================

export interface SidebarItemProps {
  item: SidebarSubItem;
  isActive: boolean;
  onItemClick: (item: SidebarSubItem) => void;
  activeItemRef?: React.Ref<HTMLAnchorElement>;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  isActive,
  onItemClick,
  activeItemRef,
}) => {
  const ItemIcon = item.icon;

  return (
    <li className="relative">
      <NavLink
        to={item.path}
        ref={isActive ? activeItemRef : undefined}
        onClick={() => onItemClick(item)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 px-3 h-[34px] text-[14px] rounded-lg transition-colors select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34303F] active:bg-[#ECEEF2] dark:active:bg-[#26252C]",
          isActive
            ? "bg-sidebar-active-bg text-sidebar-active-text font-medium shadow-2xs"
            : "text-sidebar-item-text hover:text-[#111827] dark:hover:text-white hover:bg-sidebar-item-hover font-normal"
        )}
      >
        {/* Tree horizontal tick connector (8-10px) */}
        <span
          className={cn(
            "absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-[1px] pointer-events-none transition-colors",
            isActive ? "bg-sidebar-guide-active" : "bg-sidebar-guide"
          )}
          aria-hidden="true"
        />

        <ItemIcon
          className={cn(
            "w-[15px] h-[15px] shrink-0 transition-colors",
            isActive
              ? "text-sidebar-active-text"
              : "text-[#9CA3AF] dark:text-[#6B7280] group-hover:text-[#4B5563] dark:group-hover:text-[#D1D5DB]"
          )}
          aria-hidden="true"
        />

        <span className="truncate flex-1 tracking-tight leading-none">
          {item.label}
        </span>

        {item.badge && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-foreground leading-none">
            {item.badge}
          </span>
        )}
      </NavLink>
    </li>
  );
};

// ============================================================================
// SUBCOMPONENT 3: SidebarGroup (Group Row / Expandable or Single Top-Level)
// ============================================================================

export interface SidebarGroupProps {
  group: SidebarGroup;
  isCollapsed: boolean;
  isExpanded: boolean;
  isLastGroup: boolean;
  currentPath: string;
  onToggle: (groupId: string) => void;
  onItemClick: (item: SidebarSubItem) => void;
  onMouseEnterCollapsed: (group: SidebarGroup, e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeaveCollapsed: () => void;
  activeItemRef: React.MutableRefObject<HTMLAnchorElement | null>;
}

export const SidebarGroupComponent: React.FC<SidebarGroupProps> = ({
  group,
  isCollapsed,
  isExpanded,
  isLastGroup,
  currentPath,
  onToggle,
  onItemClick,
  onMouseEnterCollapsed,
  onMouseLeaveCollapsed,
  activeItemRef,
}) => {
  const GroupIcon = group.icon;
  const hasActiveChild = isGroupActive(group, currentPath);
  const isSingleLink = group.items.length === 1;
  const singleItem = group.items[0];

  return (
    <li className="relative">
      {/* ----------------------------------------------------------------- */}
      {/* EXPANDED VIEW                                                     */}
      {/* ----------------------------------------------------------------- */}
      {!isCollapsed ? (
        <div>
          {/* CASE A: Single Direct Link (e.g. Dashboard if only 1 item) */}
          {isSingleLink ? (
            <NavLink
              to={singleItem.path}
              ref={hasActiveChild ? (el) => { activeItemRef.current = el; } : undefined}
              onClick={() => onItemClick(singleItem)}
              aria-current={hasActiveChild ? 'page' : undefined}
              className={cn(
                "w-full h-9 flex items-center gap-2.5 px-2.5 rounded-lg text-xs font-semibold uppercase tracking-[0.04em] transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34303F]",
                hasActiveChild
                  ? "bg-sidebar-active-bg text-sidebar-active-text font-bold shadow-2xs"
                  : "text-[#374151] dark:text-[#D1D5DB] hover:text-[#111827] dark:hover:text-white hover:bg-sidebar-item-hover"
              )}
            >
              <GroupIcon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  hasActiveChild
                    ? "text-sidebar-active-text"
                    : "text-[#6B7280] dark:text-[#9CA3AF] group-hover:text-foreground"
                )}
                aria-hidden="true"
              />
              <span className="truncate flex-1">{singleItem.label}</span>
              {singleItem.badge && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-foreground leading-none">
                  {singleItem.badge}
                </span>
              )}
            </NavLink>
          ) : (
            /* CASE B: Expandable Multi-Item Group Header */
            <div>
              <button
                type="button"
                onClick={() => onToggle(group.id)}
                aria-expanded={isExpanded}
                aria-controls={`subnav-${group.id}`}
                className={cn(
                  "w-full h-9 flex items-center justify-between px-2.5 rounded-lg text-xs font-semibold uppercase tracking-[0.04em] transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34303F]",
                  hasActiveChild
                    ? "text-[#111827] dark:text-[#F3F4F6] font-bold"
                    : "text-[#374151] dark:text-[#D1D5DB] hover:text-[#111827] dark:hover:text-white hover:bg-sidebar-item-hover"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <GroupIcon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      hasActiveChild
                        ? "text-[#111827] dark:text-white"
                        : "text-[#6B7280] dark:text-[#9CA3AF] group-hover:text-foreground"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{group.label}</span>
                </div>

                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] transition-transform duration-150 shrink-0",
                    isExpanded && "rotate-90"
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Child Links with Hierarchy Tree Guide Line */}
              {isExpanded && (
                <ul
                  id={`subnav-${group.id}`}
                  role="region"
                  className="relative mt-1 ml-[18px] pl-3 border-l space-y-0.5 animate-fadeIn"
                  style={{
                    borderColor: hasActiveChild ? 'var(--sidebar-guide-active)' : 'var(--sidebar-guide)',
                  }}
                >
                  {group.items.map((item) => {
                    const isActive = isChildItemActive(item.path, currentPath);
                    return (
                      <SidebarItem
                        key={item.id}
                        item={item}
                        isActive={isActive}
                        onItemClick={onItemClick}
                        activeItemRef={isActive ? (el) => { activeItemRef.current = el; } : undefined}
                      />
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ----------------------------------------------------------------- */
        /* COLLAPSED VIEW: Centered 40px Icon Button                         */
        /* ----------------------------------------------------------------- */
        <div
          className="flex justify-center"
          onMouseEnter={!isSingleLink ? (e) => onMouseEnterCollapsed(group, e) : undefined}
          onMouseLeave={!isSingleLink ? onMouseLeaveCollapsed : undefined}
        >
          {isSingleLink ? (
            <NavLink
              to={singleItem.path}
              onClick={() => onItemClick(singleItem)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34303F]",
                hasActiveChild
                  ? "bg-sidebar-active-bg text-sidebar-active-text shadow-xs"
                  : "text-[#6B7280] dark:text-[#9CA3AF] hover:text-foreground hover:bg-sidebar-item-hover"
              )}
              aria-label={singleItem.label}
              title={singleItem.label}
            >
              <GroupIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={() => onToggle(group.id)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34303F]",
                hasActiveChild
                  ? "bg-sidebar-active-bg text-sidebar-active-text shadow-xs"
                  : "text-[#6B7280] dark:text-[#9CA3AF] hover:text-foreground hover:bg-sidebar-item-hover"
              )}
              aria-label={group.label}
              title={group.label}
            >
              <GroupIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* 1px Hairline Divider with 8px margin between groups */}
      {!isLastGroup && (
        <div className="pt-2" aria-hidden="true">
          <div
            className={cn(
              "h-[1px] bg-[#EEF0F3] dark:bg-[#23222A]",
              isCollapsed ? "w-6 mx-auto" : "w-full"
            )}
          />
        </div>
      )}
    </li>
  );
};

// ============================================================================
// SUBCOMPONENT 4: SidebarFlyout (Portal Popover for Collapsed State)
// ============================================================================

export interface SidebarFlyoutProps {
  group: SidebarGroup;
  coords: { top: number; left: number };
  currentPath: string;
  onItemClick: (item: SidebarSubItem) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const SidebarFlyout: React.FC<SidebarFlyoutProps> = ({
  group,
  coords,
  currentPath,
  onItemClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 9999,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="min-w-[200px] max-w-[260px] bg-sidebar-bg rounded-[10px] border border-sidebar-border shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-2 animate-fadeIn select-none font-sans"
      role="menu"
      aria-label={group.label}
    >
      {/* Popover Header */}
      <div className="px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.04em] text-[#374151] dark:text-[#D1D5DB] border-b border-sidebar-border/60 mb-1">
        {group.label}
      </div>

      {/* Child Links */}
      <div className="space-y-0.5">
        {group.items.map((item) => {
          const ItemIcon = item.icon;
          const isActive = isChildItemActive(item.path, currentPath);

          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => onItemClick(item)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 h-[34px] text-[13px] rounded-lg transition-colors text-left cursor-pointer",
                isActive
                  ? "bg-sidebar-active-bg text-sidebar-active-text font-medium"
                  : "text-sidebar-item-text hover:text-[#111827] dark:hover:text-white hover:bg-sidebar-item-hover font-normal"
              )}
            >
              <ItemIcon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-sidebar-active-text" : "text-[#9CA3AF] dark:text-[#6B7280]"
                )}
                aria-hidden="true"
              />
              <span className="truncate flex-1">{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-foreground leading-none">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// SUBCOMPONENT 5: SidebarFooter (Bottom Zone, Fixed)
// ============================================================================

export interface SidebarFooterProps {
  isCollapsed: boolean;
  user: any;
  userRole: string;
  onNavigateProfile: () => void;
  onToggleCollapse: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  isCollapsed,
  user,
  userRole,
  onNavigateProfile,
  onToggleCollapse,
}) => {
  const avatarInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="p-3 border-t border-sidebar-border bg-sidebar-bg shrink-0 space-y-2">
      {/* User Profile Card */}
      <div
        onClick={onNavigateProfile}
        className={cn(
          "flex items-center gap-2.5 p-2 rounded-xl hover:bg-sidebar-item-hover transition-colors cursor-pointer group",
          isCollapsed ? "justify-center p-1" : ""
        )}
        title={user?.email || 'My Profile'}
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary shrink-0">
          {avatarInitials}
        </div>

        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {user?.name || 'Authorized User'}
            </div>
            <div className="text-[12px] text-muted-foreground truncate">
              {user?.email || userRole}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Collapse / Expand Toggle Button */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className={cn(
          "hidden lg:flex w-full items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-item-hover rounded-lg transition-colors cursor-pointer",
          isCollapsed ? "justify-center" : "justify-between"
        )}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {!isCollapsed && <span className="text-[12px] font-medium">Collapse Menu</span>}
        {isCollapsed ? (
          <ChevronsRight className="w-4 h-4" />
        ) : (
          <ChevronsLeft className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT 6: SidebarNav (Middle Scroll Zone with Hierarchy & Fades)
// ============================================================================

export interface SidebarNavProps {
  filteredNavigation: SidebarGroup[];
  isCollapsed: boolean;
  expandedGroups: Record<string, boolean>;
  currentPath: string;
  onToggleGroup: (groupId: string) => void;
  onItemClick: (item: SidebarSubItem) => void;
  areAllExpanded: boolean;
  onToggleExpandAll: () => void;
  onMouseEnterCollapsed: (group: SidebarGroup, e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeaveCollapsed: () => void;
  onCloseFlyout: () => void;
  activeItemRef: React.MutableRefObject<HTMLAnchorElement | null>;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  filteredNavigation,
  isCollapsed,
  expandedGroups,
  currentPath,
  onToggleGroup,
  onItemClick,
  areAllExpanded,
  onToggleExpandAll,
  onMouseEnterCollapsed,
  onMouseLeaveCollapsed,
  onCloseFlyout,
  activeItemRef,
}) => {
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  // Check scroll offsets for top and bottom fade masks
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setShowTopFade(target.scrollTop > 8);
    setShowBottomFade(target.scrollHeight - target.scrollTop - target.clientHeight > 8);
  };

  // Keyboard navigation within the nav zone
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const focusable = navContainerRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href]:not([disabled])'
    );
    if (!focusable || focusable.length === 0) return;
    const elements = Array.from(focusable);
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
      elements[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
      elements[prevIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      elements[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      elements[elements.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      onCloseFlyout();
    }
  };

  return (
    <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
      {/* Top Edge Fade Mask */}
      <div
        className={cn(
          "pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-sidebar-bg to-transparent z-10 transition-opacity duration-200",
          showTopFade ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />

      {/* Quick Header Toggle Action (Expanded Mode only) */}
      {!isCollapsed && (
        <div className="px-3 pt-2 pb-1 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onToggleExpandAll}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-sidebar-item-hover transition-colors cursor-pointer"
            title={areAllExpanded ? 'Collapse all sections' : 'Expand all sections'}
          >
            <ChevronsUpDown className="w-3 h-3" />
            <span>{areAllExpanded ? 'Collapse all' : 'Expand all'}</span>
          </button>
        </div>
      )}

      {/* Internal Scroll Area with Overlay Scrollbar */}
      <nav
        ref={navContainerRef}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-1 scrollbar-overlay"
        aria-label="Main"
      >
        <ul className="space-y-3">
          {filteredNavigation.map((group, groupIndex) => {
            const isExpanded = !!expandedGroups[group.id];
            const isLastGroup = groupIndex === filteredNavigation.length - 1;

            return (
              <SidebarGroupComponent
                key={group.id}
                group={group}
                isCollapsed={isCollapsed}
                isExpanded={isExpanded}
                isLastGroup={isLastGroup}
                currentPath={currentPath}
                onToggle={onToggleGroup}
                onItemClick={onItemClick}
                onMouseEnterCollapsed={onMouseEnterCollapsed}
                onMouseLeaveCollapsed={onMouseLeaveCollapsed}
                activeItemRef={activeItemRef}
              />
            );
          })}
        </ul>
      </nav>

      {/* Bottom Edge Fade Mask */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-sidebar-bg to-transparent z-10 transition-opacity duration-200",
          showBottomFade ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: AppSidebar
// ============================================================================

export interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSessionStore(state => state.user);
  const openTab = useWorkspaceStore(state => state.openTab);

  const userRole = user?.globalRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : (user?.role || 'ADMIN');
  const companyDisplayName = user?.companyName || 'Bill Aura ERP';

  // Filter groups and items by user role
  const filteredNavigation = useMemo(() => {
    return SIDEBAR_NAVIGATION.filter(group => {
      if (group.roles && !group.roles.includes(userRole)) return false;
      return true;
    }).map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.roles && !item.roles.includes(userRole)) return false;
        return true;
      }),
    })).filter(group => group.items.length > 0);
  }, [userRole]);

  // Find active group for current route
  const activeGroupId = useMemo(() => {
    for (const group of filteredNavigation) {
      if (isGroupActive(group, location.pathname)) {
        return group.id;
      }
    }
    return 'overview';
  }, [filteredNavigation, location.pathname]);

  // Persistent expanded groups state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('billaura_sidebar_expanded_groups');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fall back to defaults
    }
    return {
      overview: true,
      sales: true,
      [activeGroupId]: true,
    };
  });

  // Keep expanded groups persisted
  const updateExpandedGroups = (newGroups: Record<string, boolean>) => {
    setExpandedGroups(newGroups);
    try {
      localStorage.setItem('billaura_sidebar_expanded_groups', JSON.stringify(newGroups));
    } catch {
      // Ignore write errors
    }
  };

  // Auto-expand group containing active route on route change
  useEffect(() => {
    if (activeGroupId && !expandedGroups[activeGroupId]) {
      updateExpandedGroups({
        ...expandedGroups,
        [activeGroupId]: true,
      });
    }
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) {
      onToggleCollapse();
      updateExpandedGroups({
        ...expandedGroups,
        [groupId]: true,
      });
      return;
    }
    updateExpandedGroups({
      ...expandedGroups,
      [groupId]: !expandedGroups[groupId],
    });
  };

  // Expand all / Collapse all toggle
  const areAllExpanded = useMemo(() => {
    return filteredNavigation.every(g => expandedGroups[g.id]);
  }, [filteredNavigation, expandedGroups]);

  const handleToggleExpandAll = () => {
    const nextState: Record<string, boolean> = {};
    const target = !areAllExpanded;
    filteredNavigation.forEach(g => {
      nextState[g.id] = target;
    });
    // Ensure active group stays open even when collapsing all
    if (!target && activeGroupId) {
      nextState[activeGroupId] = true;
    }
    updateExpandedGroups(nextState);
  };

  // Active item reference for scrolling into view
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [location.pathname]);

  // Collapsed Popover Flyout State
  const [flyoutGroup, setFlyoutGroup] = useState<SidebarGroup | null>(null);
  const [flyoutCoords, setFlyoutCoords] = useState<{ top: number; left: number } | null>(null);
  const flyoutTimerRef = useRef<any>(null);

  // Close flyout on global Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFlyoutGroup(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleMouseEnterCollapsed = (group: SidebarGroup, e: React.MouseEvent<HTMLElement>) => {
    if (!isCollapsed) return;
    clearTimeout(flyoutTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyoutCoords({
      top: Math.max(12, Math.min(rect.top, window.innerHeight - 320)),
      left: rect.right + 8,
    });
    setFlyoutGroup(group);
  };

  const handleMouseLeaveCollapsed = () => {
    if (!isCollapsed) return;
    flyoutTimerRef.current = setTimeout(() => {
      setFlyoutGroup(null);
    }, 150);
  };

  const handleFlyoutMouseEnter = () => {
    clearTimeout(flyoutTimerRef.current);
  };

  const handleFlyoutMouseLeave = () => {
    flyoutTimerRef.current = setTimeout(() => {
      setFlyoutGroup(null);
    }, 150);
  };

  // Handle child navigation item click
  const handleItemClick = (item: SidebarSubItem) => {
    openTab({
      id: item.path,
      title: item.label,
      path: item.path,
    });
    setFlyoutGroup(null);
    if (isMobileOpen) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity lg:hidden animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-sidebar-bg border-r border-sidebar-border transition-all duration-300 ease-in-out select-none font-sans",
          isCollapsed ? "w-[68px]" : "w-[260px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Main Navigation"
      >
        {/* Zone 1: Top Org Block (Fixed) */}
        <SidebarOrgBlock
          isCollapsed={isCollapsed}
          companyName={companyDisplayName}
          isMobileOpen={isMobileOpen}
          onMobileClose={onMobileClose}
          onNavigateHome={() => navigate('/dashboard')}
        />

        {/* Zone 2: Navigation Zone (Internal Scrollable with Hierarchy Guides & Edge Fades) */}
        <SidebarNav
          filteredNavigation={filteredNavigation}
          isCollapsed={isCollapsed}
          expandedGroups={expandedGroups}
          currentPath={location.pathname}
          onToggleGroup={toggleGroup}
          onItemClick={handleItemClick}
          areAllExpanded={areAllExpanded}
          onToggleExpandAll={handleToggleExpandAll}
          onMouseEnterCollapsed={handleMouseEnterCollapsed}
          onMouseLeaveCollapsed={handleMouseLeaveCollapsed}
          onCloseFlyout={() => setFlyoutGroup(null)}
          activeItemRef={activeItemRef}
        />

        {/* Zone 3: Bottom Zone (Fixed User Card + Collapse Toggle) */}
        <SidebarFooter
          isCollapsed={isCollapsed}
          user={user}
          userRole={userRole}
          onNavigateProfile={() => navigate('/profile')}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {/* Zone 4: Collapsed Flyout Popover (Portal to body) */}
      {isCollapsed && flyoutGroup && flyoutCoords && (
        <SidebarFlyout
          group={flyoutGroup}
          coords={flyoutCoords}
          currentPath={location.pathname}
          onItemClick={handleItemClick}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
        />
      )}
    </>
  );
};
