import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useCommandPaletteStore } from '@/store/commandPaletteStore';
import { 
  Users, Building2, FileText, ShoppingCart, Activity, 
  Settings, UserPlus, FilePlus, DollarSign, BookOpen,
  LogOut, LayoutDashboard, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { TokenService } from '@/services/auth/TokenService';

export function CommandPalette() {
  const { isOpen, closePalette } = useCommandPaletteStore();
  const navigate = useNavigate();
  const clearSession = useSessionStore(state => state.clearSession);

  // Global Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useCommandPaletteStore.getState().togglePalette();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    closePalette();
    command();
  };

  const handleLogout = () => {
    TokenService.clearTokens();
    clearSession();
    navigate('/login');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
      <Command 
        className="w-full max-w-2xl bg-surface rounded-xl border border-border shadow-premium overflow-hidden flex flex-col"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            closePalette();
          }
        }}
      >
        <div className="flex items-center px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
          <Command.Input 
            autoFocus
            placeholder="Type a command or search..."
            className="flex-1 h-14 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground" 
          />
        </div>
        
        <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
            <Command.Item onSelect={() => runCommand(() => navigate('/app'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/app/customers'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <Users className="w-4 h-4" /> Customers
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/app/vendors'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <Building2 className="w-4 h-4" /> Vendors
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/app/sales/invoices'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <FileText className="w-4 h-4" /> Invoices
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/app/purchases'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <ShoppingCart className="w-4 h-4" /> Purchases
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/app/accounting/journals'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <BookOpen className="w-4 h-4" /> Journal Entries
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/app/reports/profit-loss'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <Activity className="w-4 h-4" /> Reports
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/app/settings'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Quick Actions" className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider mt-2">
            <Command.Item onSelect={() => runCommand(() => navigate('/app/customers/new'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <UserPlus className="w-4 h-4" /> Create Customer
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/app/sales/invoices/new'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <FilePlus className="w-4 h-4" /> Create Invoice
            </Command.Item>
            <Command.Item onSelect={() => runCommand(() => navigate('/app/receipts/new'))} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 rounded-lg cursor-pointer aria-selected:bg-accent/10 aria-selected:text-accent transition-colors">
              <DollarSign className="w-4 h-4" /> Create Receipt
            </Command.Item>
          </Command.Group>
          
          <Command.Group heading="System" className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider mt-2">
            <Command.Item onSelect={() => runCommand(handleLogout)} className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg cursor-pointer aria-selected:bg-red-500/10 aria-selected:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
      
      {/* Click outside to close */}
      <div className="fixed inset-0 -z-10" onClick={closePalette} />
    </div>
  );
}
