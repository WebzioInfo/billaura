import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, MoreHorizontal, Plus, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from '@/shared/components/ui/IconButton';

export interface AccountRowActionsProps {
  account: any;
  onEdit: (account: any) => void;
  onAddSubAccount: (parentAccount: any) => void;
  onToggleActive?: (account: any) => void;
  onDelete: (account: any) => void;
  className?: string;
}

const SYSTEM_ACCOUNT_NAMES = [
  'Cash',
  'Bank Accounts',
  'Accounts Receivable',
  'Accounts Payable',
  'Cost of Goods Sold',
  'Retained Earnings',
  'Opening Balance Equity',
  'Owners Capital',
  'GST Payable',
];

export const AccountRowActions: React.FC<AccountRowActionsProps> = ({
  account,
  onEdit,
  onAddSubAccount,
  onToggleActive,
  onDelete,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSystemAccount = Boolean(
    account.isSystem || SYSTEM_ACCOUNT_NAMES.includes(account.name)
  );

  const handleOpenMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className={cn('flex items-center justify-end gap-1 select-none pr-4', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Direct Edit icon button */}
      <IconButton
        icon={Pencil}
        aria-label="Edit account"
        tooltip="Edit Account"
        size="dense"
        variant="ghost"
        onClick={() => onEdit(account)}
      />

      {/* 2. Portal "⋯" dropdown trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpenMenu}
        className={cn(
          'w-7 h-7 rounded-[6px] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#EDEDED] hover:bg-[#F3F4F6] dark:hover:bg-[#26262A] flex items-center justify-center cursor-pointer transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34303F]',
          isOpen && 'bg-[#E5E7EB] dark:bg-[#374151] text-[#111827]'
        )}
        title="More actions"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* 3. Portal Dropdown rendered outside of any overflow-hidden tables */}
      {isOpen &&
        menuCoords &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuCoords.top}px`,
              right: `${menuCoords.right}px`,
              zIndex: 9999,
            }}
            className="w-48 bg-surface dark:bg-[#1E1C26] rounded-xl border border-border shadow-premium py-1.5 text-[13px] animate-fadeIn"
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onEdit(account);
              }}
              className="w-full px-3 py-1.5 text-left text-foreground hover:bg-[#F3F4F6] dark:hover:bg-[#2A2833] flex items-center gap-2 cursor-pointer transition-colors font-medium"
            >
              <Pencil className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddSubAccount(account);
              }}
              className="w-full px-3 py-1.5 text-left text-foreground hover:bg-[#F3F4F6] dark:hover:bg-[#2A2833] flex items-center gap-2 cursor-pointer transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Add sub-account</span>
            </button>

            {onToggleActive && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onToggleActive(account);
                }}
                className="w-full px-3 py-1.5 text-left text-foreground hover:bg-[#F3F4F6] dark:hover:bg-[#2A2833] flex items-center gap-2 cursor-pointer transition-colors font-medium"
              >
                {account.isActive === false ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Activate</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>Deactivate</span>
                  </>
                )}
              </button>
            )}

            <div className="h-[1px] bg-border/60 my-1" />

            {isSystemAccount ? (
              <div
                className="w-full px-3 py-1.5 text-left text-[#9CA3AF] cursor-not-allowed flex items-center gap-2"
                title="System account cannot be deleted"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span className="flex-1">Delete</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9CA3AF] bg-muted/60 px-1.5 py-0.5 rounded">
                  System
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onDelete(account);
                }}
                className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 cursor-pointer transition-colors font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete</span>
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
