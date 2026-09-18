import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Modal } from '@/shared/components/ui/Modal';
import { Search, Home, Users, FileText, ShoppingCart, TrendingUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';
import api from '@/core/api';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { openTab } = useWorkspaceStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await api.get<any>(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.results || []);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const runCommand = (action: () => void) => {
    action();
    setOpen(false);
    setQuery('');
  };

  const navigateTo = (path: string, label: string, id: string) => {
    runCommand(() => {
      openTab({ id, title: label, path });
      navigate(path);
    });
  };

  return (
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Command Palette" maxWidth="2xl">
      <Command className="[&_[cmdk-root]]:h-full bg-background -mx-6 -mb-6 -mt-2">
        <div className="flex items-center border-b px-4" cmdk-input-wrapper="">
          <Search className="mr-2 h-5 w-5 shrink-0 opacity-50" />
          <Command.Input 
            autoFocus
            className="flex h-14 w-full rounded-md bg-transparent py-3 text-lg outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 ring-0" 
            placeholder="Type a command or search customers, vendors, invoices..." 
            value={query}
            onValueChange={setQuery}
          />
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />}
        </div>
        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>
          
          {results.length > 0 && (
            <Command.Group heading="Global Search Results" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-primary">
              {results.map((item, idx) => (
                <Command.Item 
                  key={`${item.id}-${idx}`}
                  onSelect={() => navigateTo(item.url, item.title, `${item.type.toLowerCase()}-${item.id}`)}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
                >
                  <Search className="mr-3 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.type}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-muted-foreground">
            <Command.Item 
              onSelect={() => navigateTo('/dashboard', 'Dashboard', 'dashboard')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Home className="mr-3 h-4 w-4 text-primary" />
              <span>Executive Dashboard</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/invoices', 'Invoices', 'invoices')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <FileText className="mr-3 h-4 w-4 text-emerald-500" />
              <span>Invoices & Sales Register</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/customers', 'Customers', 'customers')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Users className="mr-3 h-4 w-4 text-blue-500" />
              <span>Customers Directory</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/bills', 'Bills & Expenses', 'bills')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <ShoppingCart className="mr-3 h-4 w-4 text-amber-500" />
              <span>Bills & Purchase Register</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/vendors', 'Vendors', 'vendors')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Users className="mr-3 h-4 w-4 text-indigo-500" />
              <span>Vendors & Suppliers</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/products', 'Products & Items', 'products')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <FileText className="mr-3 h-4 w-4 text-teal-500" />
              <span>Inventory & Products</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/chart-of-accounts', 'Chart of Accounts', 'coa')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <FileText className="mr-3 h-4 w-4 text-purple-500" />
              <span>Chart of Accounts</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/journal-entries', 'Journal Entries', 'journals')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <FileText className="mr-3 h-4 w-4 text-rose-500" />
              <span>Journal Entries & Vouchers</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/banking', 'Banking & Cash', 'banking')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <FileText className="mr-3 h-4 w-4 text-cyan-500" />
              <span>Banking & Reconciliation</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/reports', 'Financial Reports', 'reports')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <TrendingUp className="mr-3 h-4 w-4 text-amber-600" />
              <span>Financial Reports (P&L, Balance Sheet, Trial Balance)</span>
            </Command.Item>
          </Command.Group>
          
          <Command.Group heading="Quick Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-muted-foreground mt-2 border-t pt-2">
            <Command.Item 
              onSelect={() => navigateTo('/invoices/new', 'New Invoice', 'new-invoice')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <FileText className="mr-3 h-4 w-4 text-emerald-500" />
              <span>Create New Tax Invoice</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/customers/new', 'New Customer', 'new-customer')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Users className="mr-3 h-4 w-4 text-blue-500" />
              <span>Add New Customer</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/receipts/new', 'New Receipt', 'new-receipt')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <FileText className="mr-3 h-4 w-4 text-emerald-600" />
              <span>Record Customer Receipt</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/bills/new', 'New Bill', 'new-bill')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <ShoppingCart className="mr-3 h-4 w-4 text-amber-500" />
              <span>Create Vendor Bill</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/journal-entries/new', 'New Journal Voucher', 'new-journal')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <FileText className="mr-3 h-4 w-4 text-rose-500" />
              <span>New Journal Voucher</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </Modal>
  );
}
