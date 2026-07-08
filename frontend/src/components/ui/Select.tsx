import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, helperText, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-2.5 py-1.5 bg-background border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors ${
            error ? 'border-red-500' : 'border-border'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
