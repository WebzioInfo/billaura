import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '@/features/auth/stores/sessionStore';

import { ERP_NAVIGATION } from '@/config/navigation.config';

export function Ribbon() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { openTab } = useWorkspaceStore();
  const navigate = useNavigate();
  const location = useLocation();
  const ribbonRef = useRef<HTMLDivElement>(null);
  const { user } = useSessionStore();
  
  const userRole = (user as any)?.role || 'ADMIN'; // fallback to ADMIN if not defined

  // Filter menus based on user role
  const filteredMenus = useMemo(() => {
    return ERP_NAVIGATION.filter(menu => {
      if (menu.roles && !menu.roles.includes(userRole)) return false;
      return true;
    }).map(menu => ({
      ...menu,
      items: menu.items.filter(item => {
        if (item.roles && !item.roles.includes(userRole)) return false;
        return true;
      })
    })).filter(menu => menu.items.length > 0);
  }, [userRole]);

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

  const isMenuActive = (menu: any) => {
    return menu.items.some((item: any) => location.pathname.startsWith(item.path));
  };

  return (
    <div className="bg-primary text-primary-foreground select-none relative z-50" ref={ribbonRef}>
      <div className="flex px-1 h-8 items-center border-b border-primary/10">
        {filteredMenus.map((menu) => {
          const active = isMenuActive(menu);
          return (
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
                    : active 
                      ? "text-white bg-primary-foreground/20 font-semibold border-b-2 border-accent pb-[2px]" 
                      : "text-primary-foreground/90 hover:bg-primary-foreground/10"
                )}
              >
                {menu.label}
              </button>
              
              {openMenu === menu.id && (
                <div className="absolute left-0 top-full min-w-[220px] bg-surface text-foreground border border-border shadow-md py-1">
                  {menu.items.map((item, idx) => {
                    const itemActive = location.pathname.startsWith(item.path);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleActionClick(item)}
                        className={cn(
                          "w-full text-left px-4 py-1.5 text-[13px] transition-none focus:outline-none focus:bg-accent focus:text-white",
                          itemActive ? "bg-accent/10 text-accent font-semibold border-l-2 border-accent pl-[14px]" : "hover:bg-accent hover:text-white"
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
