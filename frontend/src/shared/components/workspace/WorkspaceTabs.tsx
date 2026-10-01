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
      data-active={isActive ? 'true' : 'false'}
      onPointerDown={(e) => {
        if (!(e.target as HTMLElement).closest('.tab-action')) {
          onSelect(tab.id, tab.path);
        }
      }}
      className={cn(
        "group relative flex items-center min-w-max h-9 px-3 first:pl-0 gap-2 text-[13px] shrink-0 select-none cursor-pointer transition-colors duration-120 whitespace-nowrap",
        isActive 
          ? "text-[#111827] dark:text-[#F3F4F6] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#111827] dark:after:bg-[#F3F4F6]" 
          : "text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] font-medium",
        isDragging && "opacity-50"
      )}
    >
      <div className="tracking-tight whitespace-nowrap">{tab.title}</div>
      
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity tab-action">
        {tab.isPinned ? (
          <button
            type="button"
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Unpin Tab"
            onPointerDown={(e) => { e.stopPropagation(); onPin(e as any, tab.id, true); }}
          >
            <PinOff className="w-3 h-3" />
          </button>
        ) : (
          <button
            type="button"
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Pin Tab"
            onPointerDown={(e) => { e.stopPropagation(); onPin(e as any, tab.id, false); }}
          >
            <Pin className="w-3 h-3" />
          </button>
        )}
        {!tab.isPinned && (
          <button
            type="button"
            className="p-0.5 rounded text-muted-foreground hover:text-rose-600 transition-colors ml-0.5"
            title="Close Tab"
            onPointerDown={(e) => { e.stopPropagation(); onClose(e as any, tab.id); }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {tab.isPinned && !isActive && (
        <Pin className="w-2.5 h-2.5 text-muted-foreground/40 absolute right-2 opacity-100 group-hover:opacity-0 pointer-events-none" />
      )}
    </div>
  );
}

export function WorkspaceTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab, pinTab, unpinTab, reorderTabs } = useWorkspaceStore();
  const navigate = useNavigate();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Horizontal mousewheel scroll
  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Auto-scroll active tab into view
  React.useEffect(() => {
    if (!activeTabId || !scrollContainerRef.current) return;
    const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

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
    if (activeTabId === id) {
      const tabIndex = tabs.findIndex(t => t.id === id);
      const remainingTabs = tabs.filter(t => t.id !== id);
      if (remainingTabs.length > 0) {
        const nextIndex = Math.max(0, tabIndex - 1);
        const nextTab = remainingTabs[nextIndex];
        setActiveTab(nextTab.id);
        navigate(nextTab.path);
      } else {
        navigate('/dashboard');
      }
    }
    closeTab(id);
  };

  const handlePin = (e: React.MouseEvent, id: string, isPinned: boolean) => {
    e.stopPropagation();
    if (isPinned) unpinTab(id);
    else pinTab(id);
  };

  return (
    <div className="relative w-full h-9 flex items-center overflow-hidden">
      <div
        ref={scrollContainerRef}
        className="flex bg-transparent overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none h-9 items-center gap-1 w-full"
      >
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
    </div>
  );
}
