import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, FileText, Users, Receipt, ShoppingCart, Truck, 
  Landmark, Building2, Package, Calculator, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/shared/stores/workspaceStore';

interface QuickAction {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const QUICK_ACTIONS: { category: string; actions: QuickAction[] }[] = [
  {
    category: 'Sales & Revenue',
    actions: [
      { label: 'New Tax Invoice', path: '/invoices/new', icon: FileText, description: 'Client billing & tax invoice' },
      { label: 'New Customer', path: '/customers/new', icon: Users, description: 'Register buyer / lead' },
      { label: 'New Quotation', path: '/quotations/new', icon: FileText, description: 'Sales estimate / proposal' },
      { label: 'New Sales Order', path: '/sales-orders/new', icon: ShoppingCart, description: 'Confirmed customer order' },
      { label: 'Record Receipt', path: '/receipts/new', icon: Receipt, description: 'Collect customer payment' },
    ],
  },
  {
    category: 'Purchases & Vendors',
    actions: [
      { label: 'New Vendor Bill', path: '/bills/new', icon: Receipt, description: 'Record supplier invoice' },
      { label: 'New Vendor', path: '/vendors/new', icon: Building2, description: 'Add new supplier account' },
      { label: 'New Purchase Order', path: '/purchase-orders/new', icon: Truck, description: 'Order raw materials / stock' },
    ],
  },
  {
    category: 'Accounting & Operations',
    actions: [
      { label: 'New Journal Entry', path: '/journal-entries/new', icon: Landmark, description: 'Debit / Credit journal voucher' },
      { label: 'New Product / Item', path: '/products', icon: Package, description: 'Inventory catalog management' },
    ],
  },
];

export function QuickCreate() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { openTab } = useWorkspaceStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleActionClick = (action: QuickAction) => {
    setOpen(false);
    openTab({
      id: action.path,
      title: action.label,
      path: action.path,
    });
    navigate(action.path);
  };

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="h-8 px-3 rounded-lg shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
        title="Quick Create New Record"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Create</span>
      </button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-surface rounded-xl shadow-2xl border border-border py-1.5 z-50 animate-slideDown overflow-hidden">
          <div className="px-3.5 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/70 flex items-center justify-between">
            <span>Quick Actions</span>
            <span className="text-[10px] lowercase font-normal text-muted-foreground">shortcut</span>
          </div>
          
          <div className="max-h-[80vh] overflow-y-auto divide-y divide-border/40">
            {QUICK_ACTIONS.map((group) => (
              <div key={group.category} className="py-1">
                <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.category}
                </div>
                {group.actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.path}
                      onClick={() => handleActionClick(action)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 flex items-center justify-between gap-2.5 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-muted/80 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {action.label}
                          </div>
                          {action.description && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              {action.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
