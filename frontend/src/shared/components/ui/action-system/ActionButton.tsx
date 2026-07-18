import React from 'react';
import { Button, ButtonProps } from '../Button';

export interface ActionButtonProps extends ButtonProps {
  icon?: React.ReactNode;
  label: string;
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ icon, label, className = '', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={`gap-1.5 whitespace-nowrap ${className}`}
        {...props}
      >
        {icon} 
        <span className="hidden sm:inline">{label}</span>
      </Button>
    );
  }
);

ActionButton.displayName = 'ActionButton';
