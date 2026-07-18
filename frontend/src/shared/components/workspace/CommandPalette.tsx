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
              onSelect={() => navigateTo('/app/dashboard', 'Dashboard', 'dashboard')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <Home className="mr-3 h-4 w-4" />
              <span>Go to Dashboard</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/app/customers', 'Customers', 'customers')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <Users className="mr-3 h-4 w-4" />
              <span>Customers</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/invoices', 'Invoices', 'invoices')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <FileText className="mr-3 h-4 w-4" />
              <span>Invoices</span>
            </Command.Item>
            <Command.Item 
              onSelect={() => navigateTo('/app/profit-loss', 'Profit & Loss', 'profit-loss')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <TrendingUp className="mr-3 h-4 w-4" />
              <span>Profit & Loss Statement</span>
            </Command.Item>
          </Command.Group>
          
          <Command.Group heading="Quick Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-muted-foreground mt-2 border-t pt-2">
            <Command.Item 
              onSelect={() => navigateTo('/invoices/new', 'New Invoice', 'invoices')}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-muted aria-selected:bg-muted aria-selected:text-foreground"
            >
              <ShoppingCart className="mr-3 h-4 w-4" />
              <span>Create New Invoice</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </Modal>
  );
}
