import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useNavigate } from 'react-router-dom';

const MENUS = [
  {
    id: 'home',
    label: 'Home',
    items: [
      { label: 'Dashboard', path: '/dashboard', id: 'dashboard' },
      { label: 'My Profile', path: '/profile', id: 'profile' },
    ]
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { label: 'Customers', path: '/customers', id: 'customers' },
      { label: 'Sales Orders', path: '/sales-orders', id: 'sales-orders' },
      { label: 'Delivery Notes', path: '/delivery-notes', id: 'delivery-notes' },
      { label: 'Invoices', path: '/invoices', id: 'invoices' },
      { label: 'Payments', path: '/payments', id: 'payments' },
    ]
  },
  {
    id: 'purchases',
    label: 'Purchases',
    items: [
      { label: 'Vendors', path: '/vendors', id: 'vendors' },
      { label: 'Purchase Orders', path: '/purchase-orders', id: 'purchase-orders' },
      { label: 'Goods Receipts', path: '/goods-receipts', id: 'goods-receipts' },
      { label: 'Bills', path: '/bills', id: 'bills' },
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { label: 'Products', path: '/products', id: 'products' },
      { label: 'Categories', path: '/categories', id: 'categories' },
      { label: 'Brands', path: '/brands', id: 'brands' },
      { label: 'Warehouses', path: '/warehouses', id: 'warehouses' },
      { label: 'Batches', path: '/batches', id: 'batches' },
      { label: 'Serial Numbers', path: '/serials', id: 'serials' },
      { label: 'BOM', path: '/bom', id: 'bom' },
      { label: 'Inventory Adjustments', path: '/inventory', id: 'inventory-adjustments' },
    ]
  },
  {
    id: 'accounting',
    label: 'Accounting',
    items: [
      { label: 'Chart of Accounts', path: '/chart-of-accounts', id: 'coa' },
      { label: 'Journal Entries', path: '/journal-entries', id: 'journals' },
      { label: 'Expenses', path: '/expenses', id: 'expenses' },
      { label: 'Banking', path: '/banking', id: 'banking' },
      { label: 'Bank Transactions', path: '/bank-transactions', id: 'bank-transactions' },
      { label: 'Reconciliation', path: '/reconciliation', id: 'reconciliation' },
      { label: 'General Ledger', path: '/general-ledger', id: 'general-ledger' },
      { label: 'Trial Balance', path: '/trial-balance', id: 'trial-balance' },
      { label: 'Profit & Loss', path: '/profit-loss', id: 'profit-loss' },
      { label: 'Balance Sheet', path: '/balance-sheet', id: 'balance-sheet' },
    ]
  },
  {
    id: 'gst',
    label: 'GST',
    items: [
      { label: 'Tax Rates', path: '/taxes', id: 'taxes' },
    ]
  },
  {
    id: 'assets-projects',
    label: 'Assets & Projects',
    items: [
      { label: 'Fixed Assets', path: '/fixed-assets', id: 'fixed-assets' },
      { label: 'Project Accounting', path: '/projects', id: 'projects' },
    ]
  },
  {
    id: 'hr-payroll',
    label: 'HR & Payroll',
    items: [
      { label: 'Employees', path: '/employees', id: 'employees' },
      { label: 'Departments', path: '/departments', id: 'departments' },
      { label: 'Payroll', path: '/payroll', id: 'payroll' },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { label: 'Company Profile', path: '/company', id: 'settings-company' },
      { label: 'Users & Roles', path: '/users', id: 'settings-users' },
      { label: 'Backup & Restore', path: '/backup-restore', id: 'settings-backup' },
    ]
  }
];

export function Ribbon() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { openTab } = useWorkspaceStore();
  const navigate = useNavigate();
  const ribbonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ribbonRef.current && !ribbonRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleActionClick = (action: any) => {
    setOpenMenu(null);
    openTab({
      id: action.id,
      title: action.label,
      path: action.path
    });
    navigate(action.path);
  };

  return (
    <div className="bg-primary text-primary-foreground select-none relative z-50" ref={ribbonRef}>
      <div className="flex px-1 h-8 items-center border-b border-primary/10">
        {MENUS.map((menu) => (
          <div key={menu.id} className="relative group h-full flex items-center">
            <button
              onClick={() => setOpenMenu(openMenu === menu.id ? null : menu.id)}
              onMouseEnter={() => {
                if (openMenu && openMenu !== menu.id) {
                  setOpenMenu(menu.id);
                }
              }}
              className={cn(
                "px-3 h-full text-[13px] font-medium tracking-tight transition-colors flex items-center",
                openMenu === menu.id
                  ? "bg-surface text-foreground"
                  : "text-primary-foreground/90 hover:bg-primary-foreground/10"
              )}
            >
              {menu.label}
            </button>
            
            {openMenu === menu.id && (
              <div className="absolute left-0 top-full min-w-[220px] bg-surface text-foreground border border-border shadow-md py-1">
                {menu.items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleActionClick(item)}
                    className="w-full text-left px-4 py-1.5 text-[13px] hover:bg-accent hover:text-white transition-none focus:outline-none focus:bg-accent focus:text-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
