import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  History,
  Building2,
  Bell,
  Settings,
  Grid,
  ChevronDown,
  User,
  LogOut,
  HelpCircle,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { useWorkspaceStore } from '@/shared/stores/workspaceStore';
import { authService } from '@/core/api';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/shared/components/ui/NotificationCenter';

interface RecentItem {
  title: string;
  path: string;
  time: string;
}

const SEARCH_MODULES = [
  { id: 'all', label: 'All' },
  { id: 'invoices', label: 'Invoices', path: '/invoices' },
  { id: 'customers', label: 'Customers', path: '/customers' },
  { id: 'quotes', label: 'Quotes', path: '/quotations' },
  { id: 'orders', label: 'Sales Orders', path: '/sales-orders' },
  { id: 'bills', label: 'Bills', path: '/bills' },
  { id: 'vendors', label: 'Vendors', path: '/vendors' },
  { id: 'items', label: 'Items', path: '/products' },
  { id: 'banking', label: 'Banking', path: '/banking' },
];

const QUICK_CREATE_GROUPS = [
  {
    title: 'General',
    items: [
      { label: 'Customer', path: '/customers/new' },
      { label: 'Vendor', path: '/vendors/new' },
      { label: 'Item / Product', path: '/products' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Invoice', path: '/invoices/new' },
      { label: 'Quote', path: '/quotations/new' },
      { label: 'Sales Order', path: '/sales-orders/new' },
      { label: 'Delivery Challan', path: '/delivery-challans/new' },
      { label: 'Payment Received', path: '/receipts/new' },
      { label: 'Credit Note', path: '/credit-notes/new' },
    ],
  },
  {
    title: 'Purchases',
    items: [
      { label: 'Bill', path: '/bills/new' },
      { label: 'Expense', path: '/expenses' },
      { label: 'Purchase Order', path: '/purchase-orders/new' },
      { label: 'Vendor Credit', path: '/debit-notes/new' },
    ],
  },
  {
    title: 'Accountant',
    items: [
      { label: 'Manual Journal', path: '/journal-entries/new' },
      { label: 'Chart of Accounts', path: '/chart-of-accounts' },
    ],
  },
];

export interface AppHeaderProps {
  onMobileMenuToggle?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onMobileMenuToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clearSession);
  const { openTab } = useWorkspaceStore();

  const [selectedModule, setSelectedModule] = useState(SEARCH_MODULES[0]);
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [appsGridOpen, setAppsGridOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const appsGridRef = useRef<HTMLDivElement>(null);

  // Recent history state
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => {
    try {
      const saved = localStorage.getItem('billaura_recent_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track page visits for history
  useEffect(() => {
    const p = location.pathname;
    if (
      p === '/' ||
      p.startsWith('/login') ||
      p.startsWith('/auth') ||
      p.startsWith('/onboard')
    ) {
      return;
    }

    const segments = p.split('/').filter(Boolean);
    const title = segments.length > 0
      ? segments[segments.length - 1].replace(/-/g, ' ').toUpperCase()
      : 'HOME';

    const newItem: RecentItem = {
      title,
      path: p + location.search,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setRecentItems((prev) => {
      const filtered = prev.filter((item) => item.path !== newItem.path);
      const updated = [newItem, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('billaura_recent_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [location.pathname, location.search]);

  // "/" Keyboard Shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (quickCreateRef.current && !quickCreateRef.current.contains(target)) {
        setQuickCreateOpen(false);
      }
      if (orgRef.current && !orgRef.current.contains(target)) {
        setOrgDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
      if (historyRef.current && !historyRef.current.contains(target)) {
        setHistoryOpen(false);
      }
      if (appsGridRef.current && !appsGridRef.current.contains(target)) {
        setAppsGridOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {}
    clearSession();
    navigate('/login');
  };

  const handleQuickCreateClick = (item: { label: string; path: string }) => {
    setQuickCreateOpen(false);
    openTab({
      id: item.path,
      title: item.label,
      path: item.path,
    });
    navigate(item.path);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (selectedModule.path) {
      navigate(`${selectedModule.path}?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const companyName = user?.companyName || 'BillAura Technologies';
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'BA';

  return (
    <header className="h-12 w-full bg-[#1E2540] text-white px-3 flex items-center justify-between shrink-0 select-none z-30 border-b border-[#2B355A]">
      {/* 1. LEFT: Logo + App Name + History Icon */}
      <div className="flex items-center gap-3">
        {/* Logo & Name */}
        <div
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-95 transition-opacity"
        >
          <img
            src="/logo.png"
            alt="BillAura"
            className="w-5 h-5 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <span className="font-bold text-sm tracking-wide text-white">
            BillAura
          </span>
        </div>

        {/* History Dropdown Icon */}
        <div className="relative" ref={historyRef}>
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className={cn(
              'p-1.5 rounded-[4px] text-[#A0AEC0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer',
              historyOpen && 'text-white bg-white/15'
            )}
            title="Recent Activity / History"
          >
            <History className="w-4 h-4" />
          </button>

          {historyOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-white text-[#2B2F36] rounded-[4px] shadow-xl border border-[#E5E7EB] py-1.5 z-50 animate-in fade-in duration-100">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB]">
                Recent Views
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[#F1F5F9]">
                {recentItems.length === 0 ? (
                  <div className="p-3 text-xs text-[#6B7280] text-center">
                    No recent history
                  </div>
                ) : (
                  recentItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setHistoryOpen(false);
                        navigate(item.path);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[#F8F9FB] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="font-medium text-[#2B2F36] truncate max-w-[150px]">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF]">{item.time}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTRE-LEFT: ONE Search box "Search in <Module> ( / )" */}
      <div className="flex-1 max-w-lg mx-4 hidden md:flex items-center">
        <form
          onSubmit={handleSearchSubmit}
          className="w-full h-8 bg-[#2A3356] border border-[#3E4973] hover:border-[#536294] focus-within:border-[#408DFB] focus-within:ring-0 focus-within:outline-none outline-none ring-0 rounded-[4px] flex items-center overflow-hidden transition-colors"
        >
          {/* Module Scope Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setModuleDropdownOpen(!moduleDropdownOpen)}
              className="h-full px-2.5 text-xs text-[#CBD5E1] hover:text-white flex items-center gap-1 border-r border-[#3E4973] cursor-pointer shrink-0 outline-none focus:outline-none focus:ring-0"
            >
              <span>{selectedModule.label}</span>
              <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
            </button>

            {moduleDropdownOpen && (
              <div className="absolute left-0 mt-1 w-36 bg-white text-[#2B2F36] rounded-[4px] shadow-lg border border-[#E5E7EB] py-1 z-50 text-xs">
                {SEARCH_MODULES.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setSelectedModule(mod);
                      setModuleDropdownOpen(false);
                      searchInputRef.current?.focus();
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 hover:bg-[#F0F5FF] cursor-pointer transition-colors outline-none',
                      selectedModule.id === mod.id && 'font-semibold text-[#408DFB]'
                    )}
                  >
                    {mod.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="flex-1 flex items-center px-2">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mr-1.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${selectedModule.label} ( / )`}
              className="w-full bg-transparent text-xs text-white placeholder-[#94A3B8] outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none shadow-none"
            />
          </div>
        </form>
      </div>

      {/* 3. RIGHT: Org Dropdown, Blue Square "+", Bell, Settings Gear, Avatar, Apps Grid */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Organisation Name with Dropdown */}
        <div className="relative" ref={orgRef}>
          <button
            type="button"
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] hover:bg-white/10 text-xs font-medium text-white transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-[#A0AEC0]" />
            <span className="truncate max-w-[140px] font-semibold">{companyName}</span>
            <ChevronDown className="w-3 h-3 text-[#A0AEC0]" />
          </button>

          {orgDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-60 bg-white text-[#2B2F36] rounded-[4px] shadow-xl border border-[#E5E7EB] py-1.5 z-50 animate-in fade-in duration-100">
              <div className="px-3.5 py-2 border-b border-[#E5E7EB]">
                <div className="font-semibold text-xs text-[#2B2F36]">{companyName}</div>
                <div className="text-[11px] text-[#6B7280]">Multi-tenant SaaS ERP</div>
              </div>
              <div className="py-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOrgDropdownOpen(false);
                    navigate('/settings?tab=company');
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#F8F9FB] text-[#2B2F36] cursor-pointer"
                >
                  Manage Organisation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrgDropdownOpen(false);
                    navigate('/branches');
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#F8F9FB] text-[#2B2F36] cursor-pointer"
                >
                  Branches & Locations
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Blue Square "+" Quick-Create Button */}
        <div className="relative" ref={quickCreateRef}>
          <button
            type="button"
            onClick={() => setQuickCreateOpen(!quickCreateOpen)}
            className="w-7 h-7 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title="Quick Create"
          >
            <Plus className="w-4 h-4" />
          </button>

          {quickCreateOpen && (
            <div className="absolute right-0 mt-1.5 w-80 bg-white text-[#2B2F36] rounded-[4px] shadow-2xl border border-[#E5E7EB] p-3 z-50 animate-in fade-in duration-100">
              <div className="grid grid-cols-2 gap-4 text-xs">
                {QUICK_CREATE_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider pb-1 border-b border-[#E5E7EB]">
                      {group.title}
                    </div>
                    <div className="space-y-0.5 pt-1">
                      {group.items.map((item) => (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => handleQuickCreateClick(item)}
                          className="w-full text-left px-1.5 py-1 rounded-[2px] text-xs text-[#2B2F36] hover:bg-[#F0F5FF] hover:text-[#408DFB] transition-colors cursor-pointer truncate"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <NotificationCenter />

        {/* Settings Gear */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="p-1.5 rounded-[4px] text-[#A0AEC0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Apps Grid Icon */}
        <div className="relative" ref={appsGridRef}>
          <button
            type="button"
            onClick={() => setAppsGridOpen(!appsGridOpen)}
            className="p-1.5 rounded-[4px] text-[#A0AEC0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Applications"
          >
            <Grid className="w-4 h-4" />
          </button>

          {appsGridOpen && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white text-[#2B2F36] rounded-[4px] shadow-xl border border-[#E5E7EB] p-3 z-50 text-xs">
              <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider pb-1.5 border-b border-[#E5E7EB]">
                BillAura Modules
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAppsGridOpen(false);
                    navigate('/invoices');
                  }}
                  className="p-2 rounded hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  <span className="font-semibold block">Sales</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppsGridOpen(false);
                    navigate('/bills');
                  }}
                  className="p-2 rounded hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  <span className="font-semibold block">Purchases</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppsGridOpen(false);
                    navigate('/inventory');
                  }}
                  className="p-2 rounded hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  <span className="font-semibold block">Inventory</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppsGridOpen(false);
                    navigate('/banking');
                  }}
                  className="p-2 rounded hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  <span className="font-semibold block">Banking</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppsGridOpen(false);
                    navigate('/accounting');
                  }}
                  className="p-2 rounded hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  <span className="font-semibold block">Accounts</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppsGridOpen(false);
                    navigate('/reports');
                  }}
                  className="p-2 rounded hover:bg-[#F0F5FF] hover:text-[#408DFB] cursor-pointer"
                >
                  <span className="font-semibold block">Reports</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="w-7 h-7 rounded-full bg-[#408DFB] text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-white/30 transition-all ml-1"
          >
            {userInitials}
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white text-[#2B2F36] rounded-[4px] shadow-xl border border-[#E5E7EB] py-1.5 z-50 animate-in fade-in duration-100">
              <div className="px-3.5 py-2 border-b border-[#E5E7EB]">
                <div className="font-semibold text-xs text-[#2B2F36] truncate">
                  {user?.name || 'Administrator'}
                </div>
                <div className="text-[11px] text-[#6B7280] truncate font-mono">
                  {user?.email}
                </div>
              </div>
              <div className="py-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#F8F9FB] flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#F8F9FB] flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    navigate('/help');
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#F8F9FB] flex items-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Help Center</span>
                </button>
              </div>
              <div className="border-t border-[#E5E7EB] pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#FEF2F2] text-[#E54B4B] flex items-center gap-2 font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
