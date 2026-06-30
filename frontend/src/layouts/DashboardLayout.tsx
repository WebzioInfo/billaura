import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShoppingBag, CreditCard, Package, 
  Settings, LogOut, Menu, X, ChevronDown, User, Bell, Search, Landmark, Shield, Receipt 
} from 'lucide-react';
import { useSessionStore } from '../features/auth/stores/sessionStore';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearSession } = useSessionStore();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  // Core Navigation
  const coreNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Vendors', path: '/vendors', icon: Users },
    { name: 'Products & Services', path: '/products', icon: Package },
    { name: 'Sales', path: '/sales', icon: ShoppingBag },
    { name: 'Purchases', path: '/purchases', icon: CreditCard },
    { name: 'Banking', path: '/banking', icon: Landmark },
    { name: 'Accounting', path: '/accounting', icon: Landmark },
    { name: 'GST & Taxes', path: '/taxes', icon: Shield },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Reports', path: '/profit-loss', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Supporting Modules
  const supportingModules = [
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'HR', path: '/hr', icon: Users },
    { name: 'Attendance', path: '/attendance', icon: Users },
    { name: 'Payroll', path: '/payroll', icon: CreditCard },
  ];

  // Administration
  const adminModules = [
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Roles', path: '/roles', icon: Users },
    { name: 'Branches', path: '/branches', icon: Landmark },
    { name: 'Company', path: '/company', icon: Settings },
    { name: 'Subscription', path: '/subscription', icon: CreditCard },
  ];

  const userInitials = user?.name 
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
    : 'US';

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300">
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 glass-panel border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <Landmark className="w-5 h-5 text-accent" />
            <span>Bill <span className="text-accent">Aura</span></span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {/* Core Navigation */}
          <div className="space-y-1.5">
            {coreNavItems.map((item) => {
              const checkIsActive = (itemPath: string) => {
                const path = location.pathname;
                if (itemPath === '/dashboard') return path === '/dashboard';
                if (itemPath === '/customers') return path === '/customers' || path === '/crm';
                if (itemPath === '/sales') return ['/sales', '/quotations', '/sales-orders', '/delivery-challans', '/invoices', '/recurring-invoices', '/payments'].includes(path);
                if (itemPath === '/purchases') return ['/purchases', '/purchase-orders', '/bills', '/vendor-payments'].includes(path);
                if (itemPath === '/banking') return path === '/banking';
                if (itemPath === '/accounting') return ['/accounting', '/chart-of-accounts', '/journal-entries', '/general-ledger', '/trial-balance', '/balance-sheet', '/profit-loss', '/cash-flow'].includes(path);
                if (itemPath === '/inventory') return ['/inventory', '/warehouses', '/categories'].includes(path);
                if (itemPath === '/products') return ['/products', '/services'].includes(path);
                if (itemPath === '/taxes') return ['/taxes', '/gst'].includes(path);
                if (itemPath === '/hr') return ['/hr', '/employees'].includes(path);
                if (itemPath === '/settings') return ['/settings', '/company', '/profile'].includes(path);
                if (['/vendors', '/expenses', '/reports', '/attendance', '/payroll', '/users', '/roles', '/branches', '/subscription'].includes(itemPath)) return path === itemPath;
                return path.startsWith(itemPath);
              };
              
              const isActive = checkIsActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:bg-surface hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Supporting Modules */}
          <div>
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Supporting Modules</h3>
            <div className="space-y-1.5">
              {supportingModules.map((item) => {
                const checkIsActive = (itemPath: string) => {
                  const path = location.pathname;
                  if (itemPath === '/hr') return ['/hr', '/employees'].includes(path);
                  if (itemPath === '/inventory') return ['/inventory', '/warehouses', '/categories'].includes(path);
                  return path === itemPath;
                };
                const isActive = checkIsActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'text-muted-foreground hover:bg-surface hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Administration (Admin Only) */}
          {user?.role === 'ADMIN' && (
            <div>
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Administration</h3>
              <div className="space-y-1.5">
                {adminModules.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-muted-foreground hover:bg-surface hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-border bg-surface bg-opacity-30">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main dashboard content container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main top header */}
        <header className="h-16 border-b border-border bg-surface bg-opacity-70 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Mock */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border w-64 text-xs text-muted-foreground focus-within:border-accent">
              <Search className="w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="Search resources, reports..." 
                className="bg-transparent border-none outline-none w-full text-foreground"
                readOnly
              />
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-background transition-all cursor-pointer">
              <Bell className="w-5 h-5" />
            </button>

            {/* User Profile dropdown */}
            <div className="relative">
              <button 
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-background transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-sm">
                  {userInitials}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {userDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-surface p-2 shadow-premium z-50">
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-xs font-semibold text-foreground truncate">{user?.name || 'Accountant'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground rounded-lg hover:bg-background hover:text-foreground transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profile Settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-grow overflow-x-hidden overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
