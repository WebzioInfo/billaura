import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  User,
  Building2,
  Building,
  Tag,
  Calendar,
  CalendarCheck,
  DoorOpen,
  DollarSign,
  FileText,
  RefreshCw,
  Receipt,
  BarChart3,
  Box,
  Binary,
  Wrench,
  Truck,
  MessageSquare,
  FileSpreadsheet,
  CreditCard,
  Clock,
  BookOpen,
  PlusCircle,
  TrendingUp,
  Shield,
  ShieldCheck,
  Database,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  Settings,
  Sliders,
  LogOut,
  HelpCircle,
  ArrowUpDown,
  CheckCheck,
  Wallet,
  Coins,
  Landmark,
  Banknote,
  Percent,
  Hash,
  Calculator,
  Package,
  Bookmark,
  Scale,
  Warehouse,
  ArrowLeftRight,
  FileMinus,
  FilePlus,
  PackageCheck,
  ClipboardList,
  BookMarked,
  FileSignature,
  GitBranch,
  DatabaseBackup,
  PieChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { useWorkspaceStore } from '@/shared/stores/workspaceStore';
import { authService } from '@/core/api';

// ============================================================================
// NAVIGATION STRUCTURE
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

// ============================================================================
// COMPONENT
// ============================================================================

interface AppSidebarProps {
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
  const clearSession = useSessionStore(state => state.clearSession);
  const openTab = useWorkspaceStore(state => state.openTab);

  const userRole = user?.globalRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : (user?.role || 'ADMIN');

  // Find which group contains the current route so it is expanded by default
  const activeGroupId = useMemo(() => {
    const current = location.pathname;
    for (const group of SIDEBAR_NAVIGATION) {
      if (group.items.some(item => current === item.path || (item.path !== '/' && current.startsWith(item.path)))) {
        return group.id;
      }
    }
    return 'overview';
  }, [location.pathname]);

  // Expanded groups state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    [activeGroupId]: true,
    sales: true,
  });

  // Auto-expand group when route changes
  useEffect(() => {
    if (activeGroupId) {
      setExpandedGroups(prev => ({ ...prev, [activeGroupId]: true }));
    }
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) {
      onToggleCollapse(); // Auto-expand sidebar if clicked while collapsed
      setExpandedGroups({ [groupId]: true });
      return;
    }
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleItemClick = (item: SidebarSubItem) => {
    openTab({
      id: item.path,
      title: item.label,
      path: item.path,
    });
    if (isMobileOpen) {
      onMobileClose();
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue cleanup on network fail
    } finally {
      clearSession();
      navigate('/login');
    }
  };

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

  const companyDisplayName = user?.companyName || 'Bill Aura ERP';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity lg:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-surface border-r border-border transition-all duration-300 ease-in-out select-none",
          isCollapsed ? "w-[68px]" : "w-[260px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* 1. TOP HEADER: Logo & Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/70 shrink-0">
          <div 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 cursor-pointer group overflow-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <img
                src="/logo.png"
                alt="Bill Aura"
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  // Fallback to text icon if logo image not found
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-foreground">
                    BILL AURA
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary">
                    ERP
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate font-medium max-w-[160px]">
                  {companyDisplayName}
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. TENANT / BRANCH MINI PILL (when expanded) */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="p-2 px-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-semibold text-foreground truncate">
                  {companyDisplayName}
                </span>
              </div>
              <span className="inline-flex items-center w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active Organization" />
            </div>
          </div>
        )}

        {/* 3. NAVIGATION SCROLL AREA */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-border">
          {filteredNavigation.map((group) => {
            const isGroupExpanded = !!expandedGroups[group.id];
            const GroupIcon = group.icon;

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header */}
                {!isCollapsed ? (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <GroupIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>{group.label}</span>
                    </div>
                    {isGroupExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    )}
                  </button>
                ) : (
                  <div className="w-full flex justify-center py-1.5 border-b border-border/30 mb-1" title={group.label}>
                    <GroupIcon className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                )}

                {/* Sub Items */}
                {(isGroupExpanded || isCollapsed) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));

                      return (
                        <NavLink
                          key={item.id}
                          to={item.path}
                          onClick={() => handleItemClick(item)}
                          title={isCollapsed ? item.label : undefined}
                          className={cn(
                            "group relative flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl transition-all duration-150 select-none",
                            isActive
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                            isCollapsed ? "justify-center px-2" : ""
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                              isActive
                                ? "text-primary-foreground"
                                : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />

                          {!isCollapsed && (
                            <span className="truncate flex-1">{item.label}</span>
                          )}

                          {!isCollapsed && item.badge && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-accent text-accent-foreground">
                              {item.badge}
                            </span>
                          )}

                          {/* Collapsed Tooltip Flyout */}
                          {isCollapsed && (
                            <div className="absolute left-full ml-2 px-2.5 py-1 bg-foreground text-background text-xs font-semibold rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                              {item.label}
                            </div>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. BOTTOM USER & COLLAPSE CONTROLS */}
        <div className="p-3 border-t border-border/70 bg-muted/10 shrink-0 space-y-2">
          {/* User Profile Card */}
          <div
            onClick={() => navigate('/profile')}
            className={cn(
              "flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer group",
              isCollapsed ? "justify-center p-1.5" : ""
            )}
            title={user?.email || 'My Profile'}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary shrink-0">
              {user?.name
                ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                : 'U'}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {user?.name || 'Authorized User'}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {user?.email || userRole}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hidden lg:flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-colors cursor-pointer",
              isCollapsed ? "justify-center px-2" : "justify-between"
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {!isCollapsed && <span className="text-[11px] font-medium">Collapse Menu</span>}
            {isCollapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <ChevronsLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
