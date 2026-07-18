import { WorkspaceTabs } from "@/shared/components/workspace/WorkspaceTabs";
import { NotificationCenter } from "../shared/components/ui/NotificationCenter";
import { Search, Command, HelpCircle } from "lucide-react";
import { useCommandPaletteStore } from "@/store/commandPaletteStore";
import { useHelpStore } from "@/shared/stores/helpStore";

export function TopNavigation() {
  const openPalette = useCommandPaletteStore(state => state.openPalette);

  return (
    <header className="flex flex-col border-b border-border bg-surface">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="font-bold text-foreground tracking-tight flex items-center gap-2">
            <img src="/logo.png" alt="Bill Aura" className="w-6 h-6 object-contain" />
            Bill Aura
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={openPalette}
            className="hidden md:flex items-center gap-2 bg-muted/50 hover:bg-muted border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="hidden lg:flex items-center gap-1 font-sans ml-4 px-1.5 py-0.5 bg-background rounded border border-border text-[10px]">
              <Command className="w-3 h-3" /> K
            </kbd>
          </button>
          
          <button 
            onClick={() => useHelpStore.getState().toggleHelp()}
            className="p-2 hover:bg-muted rounded-full transition-colors relative"
            title="Help Center (F1)"
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
          
          <NotificationCenter />
        </div>
      </div>
      <WorkspaceTabs />
    </header>
  );
}

