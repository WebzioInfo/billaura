import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type AccountingTabId = 'coa' | 'journal' | 'trial' | 'pl' | 'bs' | 'cf';

interface AccountingSubNavProps {
  activeTab?: AccountingTabId;
  onTabChange?: (tab: AccountingTabId) => void;
  className?: string;
}

const TABS: { id: AccountingTabId; label: string; path: string }[] = [
  { id: 'coa', label: 'Chart of Accounts', path: '/chart-of-accounts' },
  { id: 'journal', label: 'Journal Entries', path: '/journal-entries' },
  { id: 'trial', label: 'Trial Balance', path: '/trial-balance' },
  { id: 'pl', label: 'Profit & Loss', path: '/profit-loss' },
  { id: 'bs', label: 'Balance Sheet', path: '/balance-sheet' },
  { id: 'cf', label: 'Cash Flow', path: '/cash-flow' },
];

export const AccountingSubNav: React.FC<AccountingSubNavProps> = ({
  activeTab: controlledActiveTab,
  onTabChange,
  className,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from location if not passed explicitly
  const activeTab: AccountingTabId = controlledActiveTab || (() => {
    const p = location.pathname;
    if (p.includes('/journal-entries')) return 'journal';
    if (p.includes('/trial-balance')) return 'trial';
    if (p.includes('/profit-loss')) return 'pl';
    if (p.includes('/balance-sheet')) return 'bs';
    if (p.includes('/cash-flow')) return 'cf';
    return 'coa';
  })();

  const handleTabClick = (tab: typeof TABS[0]) => {
    if (onTabChange) {
      onTabChange(tab.id);
    } else {
      navigate(tab.path);
    }
  };

  return (
    <nav
      className={cn(
        'h-8 flex items-center gap-5 border-b border-[#E5E7EB] dark:border-[#26262A] shrink-0 select-none overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
      aria-label="Accounting Sub-navigation"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={cn(
              'relative h-8 inline-flex items-center text-[13px] whitespace-nowrap transition-colors cursor-pointer',
              isActive
                ? 'font-semibold text-[#111827] dark:text-[#F3F4F6] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#111827] dark:after:bg-[#F3F4F6]'
                : 'font-medium text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};
