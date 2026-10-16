import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean, e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked = false, indeterminate = false, onChange, label, className, disabled, id, ...props }, ref) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const resolvedRef = (ref || innerRef) as React.MutableRefObject<HTMLInputElement>;

    useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate, resolvedRef]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      onChange?.(e.target.checked, e);
    };

    return (
      <label
        htmlFor={id}
        className={cn(
          'inline-flex items-center gap-2 select-none cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <span className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
          <input
            ref={resolvedRef}
            type="checkbox"
            id={id}
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />
          {/* Custom Checkbox Box: 14px, white bg, 1px #C9CED6 border, 2px radius */}
          <span
            className={cn(
              'w-3.5 h-3.5 rounded-[2px] border transition-colors flex items-center justify-center',
              checked || indeterminate
                ? 'bg-[#408DFB] border-[#408DFB] text-white'
                : 'bg-white border-[#C9CED6] hover:border-[#94A3B8]',
              disabled && 'bg-[#F3F4F6] border-[#E5E7EB]'
            )}
          >
            {checked && !indeterminate && (
              <svg
                className="w-2.5 h-2.5 stroke-white fill-none"
                viewBox="0 0 12 12"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.5 6.5L4.8 9L9.5 3.5" />
              </svg>
            )}
            {indeterminate && (
              <svg
                className="w-2.5 h-2.5 stroke-white fill-none"
                viewBox="0 0 12 12"
                strokeWidth={2.5}
                strokeLinecap="round"
              >
                <path d="M2.5 6h7" />
              </svg>
            )}
          </span>
        </span>
        {label && <span className="text-[13px] text-[#2B2F36] leading-none">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
