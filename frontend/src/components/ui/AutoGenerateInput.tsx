import React from 'react';
import { Input, InputProps } from './Input';
import { Wand2 } from 'lucide-react';

interface AutoGenerateInputProps extends Omit<InputProps, 'onChange'> {
  prefix?: string;
  onGenerate: (code: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AutoGenerateInput = React.forwardRef<HTMLInputElement, AutoGenerateInputProps>(
  ({ prefix = '', onGenerate, onChange, ...props }, ref) => {
    
    const handleGenerate = () => {
      // Basic 6-digit random code generation (e.g. INV-849201)
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newCode = `${prefix}${randomCode}`;
      onGenerate(newCode);
    };

    return (
      <div className="relative">
        <Input ref={ref} onChange={onChange} {...props} />
        <button
          type="button"
          onClick={handleGenerate}
          className="absolute right-2 top-[22px] p-1 text-[10px] font-bold bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded flex items-center gap-1 transition-colors cursor-pointer"
          title="Auto Generate"
        >
          <Wand2 className="w-3 h-3" /> Auto
        </button>
      </div>
    );
  }
);

AutoGenerateInput.displayName = 'AutoGenerateInput';
