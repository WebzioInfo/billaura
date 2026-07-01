import React, { useEffect, useState } from 'react';
import { Search, Plus, Bell, User, Building2 } from 'lucide-react';
import apiClient from '@/services/api';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { useNavigate } from 'react-router-dom';

export function TopBar() {
  const { user } = useSessionStore();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState(user?.companyName || 'My Company');
  const [logoBase64, setLogoBase64] = useState<string | null>((user as any)?.logoBase64 || null);

  useEffect(() => {
    // Update local state if store updates
    if ((user as any)?.companyName) setCompanyName((user as any).companyName);
    if ((user as any)?.logoBase64) setLogoBase64((user as any).logoBase64);

    const fetchCompany = async () => {
      try {
        const res = await apiClient.get<any>('/auth/me');
        if (res?.company?.companyName) {
          setCompanyName(res.company.companyName);
        }
        if (res?.company?.settings?.logoBase64) {
          setLogoBase64(res.company.settings.logoBase64);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchCompany();
  }, [user]);

  return (
    <div className="h-12 bg-primary text-primary-foreground flex items-center justify-between px-4 border-b border-primary/20 shrink-0">
      {/* Left: Branding & Company info */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 select-none cursor-pointer" onClick={() => navigate('/dashboard')}>
          {logoBase64 ? (
            <img src={logoBase64} alt="Company Logo" className="h-7 w-auto max-w-[120px] object-contain rounded-sm" />
          ) : (
            <>
              <img src="/logo.png" alt="Bill Aura" className="h-7 w-auto object-contain dark:hidden" />
              <img src="/logo2.png" alt="Bill Aura" className="h-7 w-auto object-contain hidden dark:block" />
            </>
          )}
          {!logoBase64 && <span className="font-bold tracking-tight">Bill Aura</span>}
        </div>
        
        <div className="w-[1px] h-6 bg-primary-foreground/20"></div>
        
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-primary-foreground/70" />
          <span className="font-medium truncate max-w-[150px]">{companyName.split(' ')[0]}</span>
          <span className="text-primary-foreground/50 text-xs px-2 py-0.5 bg-primary-foreground/10 rounded">FY _1</span>
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search transactions, customers, or press Ctrl+K..." 
            className="w-full h-8 bg-surface text-foreground pl-9 pr-4 rounded-sm text-[13px] border-none outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted-foreground/70"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <kbd className="hidden sm:inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground uppercase border border-border">Ctrl K</kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1 h-8 px-3 bg-accent hover:bg-accent/90 text-white text-[13px] font-medium rounded-sm transition-colors">
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>

        <div className="w-[1px] h-6 bg-primary-foreground/20 mx-1"></div>

        <button className="relative p-1.5 text-primary-foreground/70 hover:text-white transition-colors rounded-sm hover:bg-primary-foreground/10">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>

        <button 
          className="flex items-center gap-2 p-1 pl-2 pr-1 ml-1 rounded-sm hover:bg-primary-foreground/10 transition-colors"
          onClick={() => navigate('/profile')}
        >
          <div className="flex flex-col items-end">
            <span className="text-[13px] font-medium leading-tight">{user?.name || 'Admin'}</span>
            <span className="text-[10px] text-primary-foreground/70 leading-tight">Administrator</span>
          </div>
          <div className="w-7 h-7 bg-primary-foreground/10 rounded-sm flex items-center justify-center text-primary-foreground">
            <User className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
