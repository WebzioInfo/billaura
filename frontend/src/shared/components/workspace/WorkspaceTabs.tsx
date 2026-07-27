import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { X, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTabProps {
  tab: { id: string; title: string; path: string; isPinned?: boolean };
  isActive: boolean;
  onSelect: (id: string, path: string) => void;
  onClose: (e: React.MouseEvent, id: string) => void;
  onPin: (e: React.MouseEvent, id: string, isPinned: boolean) => void;
}

function SortableTab({ tab, isActive, onSelect, onClose, onPin }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: isActive ? '-1px' : '0px', 
    marginRight: isActive ? '-1px' : '0px',
    zIndex: isDragging ? 50 : isActive ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        // Only trigger selection if not clicking a button (close/pin)
        if (!(e.target as HTMLElement).closest('.tab-action')) {
          onSelect(tab.id, tab.path);
        }
      }}
      className={cn(
        "group relative flex items-center min-w-[100px] max-w-[180px] h-7 px-2.5 gap-1.5 border-r border-t border-l rounded-t-sm transition-colors text-[11px] shrink-0 touch-none",
        isActive 
          ? "bg-background border-border text-foreground before:absolute before:bottom-[-1px] before:left-0 before:right-0 before:h-[1px] before:bg-background" 
          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted",
        isDragging && "opacity-50 shadow-md"
      )}
    >
      <div className="truncate flex-1 font-semibold cursor-default">{tab.title}</div>
      
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity tab-action cursor-pointer">
        {tab.isPinned ? (
          <PinOff 
            className="w-2.5 h-2.5 hover:text-foreground text-muted-foreground mr-0.5" 
            onPointerDown={(e) => { e.stopPropagation(); onPin(e as any, tab.id, true); }} 
          />
        ) : (
          <Pin 
            className="w-2.5 h-2.5 hover:text-foreground text-muted-foreground mr-0.5" 
            onPointerDown={(e) => { e.stopPropagation(); onPin(e as any, tab.id, false); }} 
          />
        )}
        {!tab.isPinned && (
          <X 
            className="w-3 h-3 hover:bg-muted-foreground/20 rounded-sm hover:text-foreground text-muted-foreground p-[1px]" 
            onPointerDown={(e) => { e.stopPropagation(); onClose(e as any, tab.id); }} 
          />
        )}
      </div>
      
      {tab.isPinned && !isActive && (
        <Pin className="w-2.5 h-2.5 text-muted-foreground/50 absolute right-2 opacity-100 group-hover:opacity-0 pointer-events-none" />
      )}
    </div>
  );
}

export function WorkspaceTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab, pinTab, unpinTab, reorderTabs } = useWorkspaceStore();
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px movement before drag starts (allows clicks)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);
      reorderTabs(oldIndex, newIndex);
    }
  };

  const handleTabClick = (id: string, path: string) => {
    setActiveTab(id);
    navigate(path);
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeTab(id);
  };

  const handlePin = (e: React.MouseEvent, id: string, isPinned: boolean) => {
    e.stopPropagation();
    if (isPinned) unpinTab(id);
    else pinTab(id);
  };

  return (
    <div className="flex bg-muted/30 border-b border-border overflow-x-auto overflow-y-hidden scrollbar-hide select-none h-8 items-end px-1.5 w-full">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={tabs.map(t => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          {tabs.map((tab) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onSelect={handleTabClick}
              onClose={handleClose}
              onPin={handlePin}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
