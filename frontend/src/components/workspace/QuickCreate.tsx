import React, { useState, useRef, useEffect } from 'react';
import { Plus, FileText, Users, Receipt, ShoppingCart, Truck, Landmark } from 'lucide-react';


export function QuickCreate() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="h-8 w-8 rounded-full shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only">Quick Create</span>
      </button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-popover rounded-md shadow-md border border-border py-1 z-50">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border mb-1">
            Quick Create
          </div>
          
          <div className="py-1">
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Invoice</span>
            </button>
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span>Sales Order</span>
            </button>
          </div>
          
          <div className="border-t border-border py-1">
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span>Bill</span>
            </button>
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span>Purchase Order</span>
            </button>
          </div>

          <div className="border-t border-border py-1">
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Customer</span>
            </button>
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 cursor-pointer transition-colors">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <span>Journal Entry</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
