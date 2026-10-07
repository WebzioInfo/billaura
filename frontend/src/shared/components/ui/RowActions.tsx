import React, { useState, useRef, useEffect, useLayoutEffect, useId } from 'react';
import ReactDOM from 'react-dom';
import {
  Eye,
  Download,
  Printer,
  MoreHorizontal,
  Edit2,
  Copy,
  CreditCard,
  Bell,
  Share2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RowActionCustomItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface RowActionsProps {
  onView: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
  onPrint: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onRecordPayment?: () => void;
  onSendReminder?: () => void;
  onShareLink?: () => void;
  onCancel?: () => void;
  customActions?: RowActionCustomItem[];
  className?: string;
}

const MENU_CLOSE_EVENT = 'bill-aura-close-row-menu';

export const RowActions: React.FC<RowActionsProps> = ({
  onView,
  onDownload,
  isDownloading = false,
  onPrint,
  onEdit,
  onDuplicate,
  onRecordPayment,
  onSendReminder,
  onShareLink,
  onCancel,
  customActions,
  className,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'bottom' | 'top' }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });

  // Collect primary actions
  const standardPrimaryActions = [
    onEdit && {
      key: 'edit',
      label: 'Edit',
      icon: <Edit2 className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />,
      onClick: onEdit,
    },
    onDuplicate && {
      key: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />,
      onClick: onDuplicate,
    },
    onRecordPayment && {
      key: 'payment',
      label: 'Record payment',
      icon: <CreditCard className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#22C55E]" />,
      onClick: onRecordPayment,
    },
    onSendReminder && {
      key: 'reminder',
      label: 'Send reminder',
      icon: <Bell className="w-3.5 h-3.5 text-[#D97706] dark:text-[#F59E0B]" />,
      onClick: onSendReminder,
    },
    onShareLink && {
      key: 'share',
      label: 'Copy link',
      icon: <Share2 className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />,
      onClick: onShareLink,
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  }>;

  // Custom actions
  const customPrimary = (customActions || [])
    .filter((a) => a.variant !== 'danger')
    .map((a, i) => ({
      key: `custom-${i}`,
      label: a.label,
      icon: a.icon || <MoreHorizontal className="w-3.5 h-3.5 text-[#6B7280]" />,
      onClick: a.onClick,
      disabled: a.disabled,
    }));

  const customDanger = (customActions || [])
    .filter((a) => a.variant === 'danger')
    .map((a, i) => ({
      key: `custom-danger-${i}`,
      label: a.label,
      icon: a.icon || <Trash2 className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF4444]" />,
      onClick: a.onClick,
      disabled: a.disabled,
    }));

  const allPrimaryActions = [...standardPrimaryActions, ...customPrimary];

  // Danger actions
  const dangerActions = [
    onCancel && {
      key: 'cancel',
      label: 'Delete',
      icon: <Trash2 className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF4444]" />,
      onClick: onCancel,
    },
    ...customDanger,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
  }>;

  const hasOverflowActions = allPrimaryActions.length > 0 || dangerActions.length > 0;

  // Reposition calculation
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const menuWidth = 164;
    const estimatedHeight = menuRef.current?.offsetHeight || 160;

    // Check vertical space
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenAbove = spaceBelow < estimatedHeight + 8 && spaceAbove > spaceBelow;

    let top = shouldOpenAbove ? rect.top - estimatedHeight - 4 : rect.bottom + 4;
    // Align right edge of menu with right edge of 3-dot button
    let left = rect.right - menuWidth;

    // Boundary constraints
    if (left < 8) left = 8;
    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }
    if (top < 8) top = 8;
    if (top + estimatedHeight > viewportHeight - 8) {
      top = viewportHeight - estimatedHeight - 8;
    }

    setCoords({
      top,
      left,
      placement: shouldOpenAbove ? 'top' : 'bottom',
    });
  };

  // Recompute position on open and after DOM rendering
  useLayoutEffect(() => {
    if (!isMenuOpen) return;
    updatePosition();
  }, [isMenuOpen]);

  // Handle outside click, escape key, and scroll/resize
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isMenuOpen]);

  // Close when another row opens its menu
  useEffect(() => {
    const handleCloseOthers = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail !== menuId) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener(MENU_CLOSE_EVENT, handleCloseOthers as EventListener);
    return () => {
      window.removeEventListener(MENU_CLOSE_EVENT, handleCloseOthers as EventListener);
    };
  }, [menuId]);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => {
      const nextState = !prev;
      if (nextState) {
        // Broadcast to close all other row menus
        window.dispatchEvent(
          new CustomEvent(MENU_CLOSE_EVENT, { detail: menuId })
        );
      }
      return nextState;
    });
  };

  const handleActionClick = (actionFn: () => void) => {
    setIsMenuOpen(false);
    actionFn();
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-end gap-1 transition-opacity duration-120',
        isMenuOpen
          ? 'opacity-100'
          : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100',
        className
      )}
    >
      {/* View Eye (30px) */}
      <button
        type="button"
        onClick={onView}
        className="w-[30px] h-[30px] rounded-[6px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#E5E7EB] dark:hover:bg-[#374151] flex items-center justify-center cursor-pointer transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34303F]"
        title="View details"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>

      {/* Download (30px) */}
      <button
        type="button"
        onClick={onDownload}
        disabled={isDownloading}
        className="w-[30px] h-[30px] rounded-[6px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#E5E7EB] dark:hover:bg-[#374151] flex items-center justify-center cursor-pointer transition-colors duration-120 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34303F]"
        title="Download PDF"
      >
        {isDownloading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#111827] dark:text-[#EDEDED]" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Print (30px) */}
      <button
        type="button"
        onClick={onPrint}
        className="w-[30px] h-[30px] rounded-[6px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#E5E7EB] dark:hover:bg-[#374151] flex items-center justify-center cursor-pointer transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34303F]"
        title="Print document"
      >
        <Printer className="w-3.5 h-3.5" />
      </button>

      {/* Overflow "⋯" (30px) */}
      {hasOverflowActions && (
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleMenu}
            className={cn(
              'w-[30px] h-[30px] rounded-[6px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#E5E7EB] dark:hover:bg-[#374151] flex items-center justify-center cursor-pointer transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34303F]',
              isMenuOpen && 'bg-[#E5E7EB] dark:bg-[#374151] text-[#111827] dark:text-[#EDEDED]'
            )}
            title="More actions"
            aria-expanded={isMenuOpen}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen &&
            ReactDOM.createPortal(
              <div
                ref={menuRef}
                style={{
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  width: '164px',
                  zIndex: 99999,
                }}
                className={cn(
                  'bg-white dark:bg-[#1E1C26] rounded-[8px] border border-[#E5E7EB] dark:border-[#2D2B38] shadow-lg shadow-black/10 dark:shadow-black/50 p-1 select-none text-[12px] font-sans animate-in fade-in zoom-in-95 duration-100 ease-out'
                )}
                role="menu"
              >
                {allPrimaryActions.length > 0 && (
                  <div className="space-y-0.5">
                    {allPrimaryActions.map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => handleActionClick(action.onClick)}
                        disabled={'disabled' in action ? action.disabled : false}
                        className="w-full px-2.5 py-1.5 text-left text-[#111827] dark:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#282634] rounded-[5px] flex items-center gap-2 cursor-pointer transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        role="menuitem"
                      >
                        {action.icon}
                        <span className="truncate">{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {allPrimaryActions.length > 0 && dangerActions.length > 0 && (
                  <div className="my-1 border-t border-[#F0F0F3] dark:border-[#2D2B38]" />
                )}

                {dangerActions.length > 0 && (
                  <div className="space-y-0.5">
                    {dangerActions.map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => handleActionClick(action.onClick)}
                        disabled={'disabled' in action ? action.disabled : false}
                        className="w-full px-2.5 py-1.5 text-left text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D]/25 rounded-[5px] flex items-center gap-2 cursor-pointer transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        role="menuitem"
                      >
                        {action.icon}
                        <span className="truncate">{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>,
              document.body
            )}
        </div>
      )}
    </div>
  );
};
