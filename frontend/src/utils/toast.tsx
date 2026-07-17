import React from 'react';
import { toast as sonnerToast, ExternalToast } from 'sonner';
import { Loader2, Check, AlertTriangle, Info, XCircle } from 'lucide-react';

const CustomLoader = () => (
  <div className="relative flex items-center justify-center w-5 h-5">
    <svg className="animate-spin text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

export const toast = {
  success: (message: string, data?: ExternalToast) => {
    return sonnerToast.success(message, {
      icon: <Check className="w-4 h-4 text-emerald-600" />,
      ...data,
    });
  },
  error: (message: string, data?: ExternalToast) => {
    return sonnerToast.error(message, {
      icon: <XCircle className="w-4 h-4 text-red-600" />,
      ...data,
    });
  },
  warning: (message: string, data?: ExternalToast) => {
    return sonnerToast.warning(message, {
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      ...data,
    });
  },
  info: (message: string, data?: ExternalToast) => {
    return sonnerToast.info(message, {
      icon: <Info className="w-4 h-4 text-blue-600" />,
      ...data,
    });
  },
  loading: (message: string, data?: ExternalToast) => {
    return sonnerToast.loading(message, {
      icon: <CustomLoader />,
      ...data,
    });
  },
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
};
