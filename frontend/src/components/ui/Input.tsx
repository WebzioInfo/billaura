import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-0.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-2.5 py-1.5 bg-background border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors ${
            error ? 'border-red-500' : 'border-border'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
