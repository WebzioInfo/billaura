import React from 'react';
import { cn } from '@/lib/utils';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onChange?: (checked: boolean, e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ checked = false, onChange, label, className, disabled, id, ...props }, ref) => {
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
            ref={ref}
            type="radio"
            id={id}
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />
          {/* Custom Radio: 14px, white bg, 1px #C9CED6 border, full circle */}
          <span
            className={cn(
              'w-3.5 h-3.5 rounded-full border transition-colors flex items-center justify-center',
              checked
                ? 'border-[#408DFB] bg-white'
                : 'bg-white border-[#C9CED6] hover:border-[#94A3B8]',
              disabled && 'bg-[#F3F4F6] border-[#E5E7EB]'
            )}
          >
            {checked && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#408DFB]" />
            )}
          </span>
        </span>
        {label && <span className="text-[13px] text-[#2B2F36] leading-none">{label}</span>}
      </label>
    );
  }
);

Radio.displayName = 'Radio';
export default Radio;
