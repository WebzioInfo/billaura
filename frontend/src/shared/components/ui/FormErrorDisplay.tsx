import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormErrorDisplayProps {
  error?: string | any;
}

export function FormErrorDisplay({ error }: FormErrorDisplayProps) {
  if (!error) return null;
  
  const errorMessage = typeof error === 'string' ? error : error.message || 'Invalid value';

  return (
    <div className="flex items-center gap-1 mt-1 text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      <span className="text-xs font-medium">{errorMessage}</span>
    </div>
  );
}
