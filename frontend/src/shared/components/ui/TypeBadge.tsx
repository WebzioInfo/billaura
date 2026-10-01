import React from 'react';
import { cn } from '@/lib/utils';

export type DocumentType =
  | 'TAX_INVOICE'
  | 'BILL_OF_SUPPLY'
  | 'PROFORMA_INVOICE'
  | 'QUOTATION'
  | 'ESTIMATE'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'PAYMENT_RECEIPT'
  | string;

export interface TypeBadgeProps {
  type: DocumentType;
  label?: string;
  className?: string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({
  type,
  label,
  className,
}) => {
  const normType = (type || '').toUpperCase().trim();

  let styleConfig = {
    bg: 'var(--doctype-tax-bg)',
    text: 'var(--doctype-tax-text)',
    border: 'var(--doctype-tax-border)',
    defaultLabel: 'Tax Invoice',
  };

  switch (normType) {
    case 'BILL_OF_SUPPLY':
      styleConfig = {
        bg: 'var(--doctype-supply-bg)',
        text: 'var(--doctype-supply-text)',
        border: 'var(--doctype-supply-border)',
        defaultLabel: 'Bill of Supply',
      };
      break;
    case 'PROFORMA_INVOICE':
      styleConfig = {
        bg: 'var(--doctype-proforma-bg)',
        text: 'var(--doctype-proforma-text)',
        border: 'var(--doctype-proforma-border)',
        defaultLabel: 'Proforma',
      };
      break;
    case 'QUOTATION':
    case 'ESTIMATE':
      styleConfig = {
        bg: 'var(--doctype-proforma-bg)',
        text: 'var(--doctype-proforma-text)',
        border: 'var(--doctype-proforma-border)',
        defaultLabel: normType === 'ESTIMATE' ? 'Estimate' : 'Quotation',
      };
      break;
    case 'CREDIT_NOTE':
      styleConfig = {
        bg: 'var(--doctype-credit-bg)',
        text: 'var(--doctype-credit-text)',
        border: 'var(--doctype-credit-border)',
        defaultLabel: 'Credit Note',
      };
      break;
    case 'DEBIT_NOTE':
      styleConfig = {
        bg: 'var(--doctype-credit-bg)',
        text: 'var(--doctype-credit-text)',
        border: 'var(--doctype-credit-border)',
        defaultLabel: 'Debit Note',
      };
      break;
    case 'PAYMENT_RECEIPT':
      styleConfig = {
        bg: 'var(--status-paid-bg)',
        text: 'var(--status-paid-text)',
        border: 'var(--status-paid-dot)',
        defaultLabel: 'Receipt',
      };
      break;
    default:
      styleConfig = {
        bg: 'var(--doctype-tax-bg)',
        text: 'var(--doctype-tax-text)',
        border: 'var(--doctype-tax-border)',
        defaultLabel: 'Tax Invoice',
      };
      break;
  }

  const displayLabel = label || styleConfig.defaultLabel;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium border select-none whitespace-nowrap leading-none transition-colors duration-120',
        className
      )}
      style={{
        backgroundColor: styleConfig.bg,
        color: styleConfig.text,
        borderColor: styleConfig.border,
      }}
    >
      {displayLabel}
    </span>
  );
};
