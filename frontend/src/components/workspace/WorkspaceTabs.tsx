import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { X, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function WorkspaceTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab, pinTab, unpinTab } = useWorkspaceStore();
  const navigate = useNavigate();

  const handleTabClick = (id: string, path: string) => {
    setActiveTab(id);
    navigate(path);
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeTab(id);
    // Zustand store will handle making the previous tab active, 
    // but we need to listen to the store for active tab change in the Layout to navigate.
  };

  const handlePin = (e: React.MouseEvent, id: string, isPinned: boolean) => {
    e.stopPropagation();
    if (isPinned) unpinTab(id);
    else pinTab(id);
  };

  return (
    <div className="flex bg-muted/30 border-b border-border overflow-x-auto overflow-y-hidden scrollbar-hide select-none h-10 items-end px-2">
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab.id, tab.path)}
            className={cn(
              "group relative flex items-center min-w-[120px] max-w-[200px] h-9 px-3 gap-2 border-r border-t border-l rounded-t-md cursor-pointer transition-colors text-sm shrink-0",
              isActive 
                ? "bg-background border-border text-foreground z-10 before:absolute before:bottom-[-1px] before:left-0 before:right-0 before:h-[1px] before:bg-background" 
                : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
            )}
            style={{ 
              marginLeft: isActive ? '-1px' : '0px', 
              marginRight: isActive ? '-1px' : '0px'
            }}
          >
            <div className="truncate flex-1 font-medium">{tab.title}</div>
            
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              {tab.isPinned ? (
                <PinOff 
                  className="w-3 h-3 hover:text-foreground text-muted-foreground mr-1" 
                  onClick={(e) => handlePin(e, tab.id, true)} 
                />
              ) : (
                <Pin 
                  className="w-3 h-3 hover:text-foreground text-muted-foreground mr-1" 
                  onClick={(e) => handlePin(e, tab.id, false)} 
                />
              )}
              {!tab.isPinned && (
                <X 
                  className="w-3.5 h-3.5 hover:bg-muted-foreground/20 rounded-sm hover:text-foreground text-muted-foreground p-[1px]" 
                  onClick={(e) => handleClose(e, tab.id)} 
                />
              )}
            </div>
            
            {/* Always show pin icon if pinned, even if not hovered */}
            {tab.isPinned && !isActive && (
              <Pin className="w-3 h-3 text-muted-foreground/50 absolute right-2 opacity-100 group-hover:opacity-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
