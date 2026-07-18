import React from 'react';
import { Input, InputProps } from './Input';
import { Wand2, Loader2 } from 'lucide-react';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';

interface AutoGenerateInputProps extends Omit<InputProps, 'onChange'> {
  documentType: string;
  onGenerate: (code: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AutoGenerateInput = React.forwardRef<HTMLInputElement, AutoGenerateInputProps>(
  ({ documentType, onGenerate, onChange, ...props }, ref) => {
    const [loading, setLoading] = React.useState(false);

    const handleGenerate = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/sequences/next/${documentType}`);
        const newCode = res.data?.data?.nextSequence || res.data?.nextSequence;
        if (newCode) {
          onGenerate(newCode);
        } else {
          throw new Error('Failed to fetch sequence');
        }
      } catch (err) {
        notification.error('Failed to auto-generate code');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="relative">
        <Input ref={ref} onChange={onChange} {...props} />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="absolute right-2 top-[22px] p-1 text-[10px] font-bold bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
          title="Auto Generate"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Auto
        </button>
      </div>
    );
  }
);

AutoGenerateInput.displayName = 'AutoGenerateInput';
