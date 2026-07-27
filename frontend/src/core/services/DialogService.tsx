import React, { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { Trash2, AlertTriangle, Info, BadgeCheck, Shield, KeyRound, LogOut, Save, Loader2, X } from 'lucide-react';

export type DialogType = 
  | 'confirm' 
  | 'delete' 
  | 'warning' 
  | 'info' 
  | 'success' 
  | 'danger' 
  | 'permission' 
  | 'logout' 
  | 'save' 
  | 'discard' 
  | 'archive' 
  | 'restore'
  | 'prompt';

interface DialogOptions {
  title: string;
  body: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  showInput?: boolean;
  inputValue?: string;
  inputPlaceholder?: string;
  clickOutsideToClose?: boolean;
}

interface DialogState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  body: string;
  confirmText: string;
  cancelText: string;
  showInput: boolean;
  inputValue: string;
  inputPlaceholder: string;
  resolve: ((value: any) => void) | null;
  isLoading: boolean;
  clickOutsideToClose: boolean;
  
  openDialog: (options: DialogOptions) => Promise<any>;
  closeDialog: (confirmed: boolean, value?: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  isOpen: false,
  type: 'confirm',
  title: '',
  body: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  showInput: false,
  inputValue: '',
  inputPlaceholder: '',
  resolve: null,
  isLoading: false,
  clickOutsideToClose: true,

  openDialog: (options) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        type: options.type || 'confirm',
        title: options.title || '',
        body: options.body || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        showInput: !!options.showInput,
        inputValue: options.inputValue || '',
        inputPlaceholder: options.inputPlaceholder || '',
        resolve: resolve as any,
        isLoading: false,
        clickOutsideToClose: options.clickOutsideToClose !== false,
      });
    });
  },

  closeDialog: (confirmed, value) => {
    const { resolve, showInput } = get();
    if (resolve) {
      if (confirmed) {
        resolve(showInput ? value : true);
      } else {
        resolve(showInput ? null : false);
      }
    }
    set({ isOpen: false, resolve: null, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

export const dialog = {
  confirm: (title: string, body: string, options: Partial<DialogOptions> = {}) => 
    useDialogStore.getState().openDialog({ ...options, title, body, type: 'confirm' }),
  
  alert: (title: string, body: string, options: Partial<DialogOptions> = {}) =>
    useDialogStore.getState().openDialog({ ...options, title, body, type: 'info', confirmText: 'OK', cancelText: '' }),

  prompt: (title: string, defaultValue = '', placeholder = '', options: Partial<DialogOptions> = {}) =>
    useDialogStore.getState().openDialog({ ...options, title, body: '', showInput: true, inputValue: defaultValue, inputPlaceholder: placeholder, type: 'prompt' }),

  confirmDelete: (title: string, body: string, options: Partial<DialogOptions> = {}) =>
    useDialogStore.getState().openDialog({ ...options, title, body, type: 'delete', confirmText: options.confirmText || 'Delete', cancelText: options.cancelText || 'Cancel' }),

  confirmDanger: (title: string, body: string, options: Partial<DialogOptions> = {}) =>
    useDialogStore.getState().openDialog({ ...options, title, body, type: 'danger', confirmText: options.confirmText || 'Yes, Proceed', cancelText: options.cancelText || 'Cancel' }),

  confirmLogout: (options: Partial<DialogOptions> = {}) =>
    useDialogStore.getState().openDialog({
      title: 'Logout?',
      body: 'You will need to login again.',
      confirmText: 'Logout',
      cancelText: 'Stay Logged In',
      type: 'logout',
      ...options
    }),

  confirmPermission: (options: Partial<DialogOptions> = {}) =>
    useDialogStore.getState().openDialog({
      title: 'Access Denied',
      body: "You don't have permission to perform this action. Contact your administrator if access is required.",
      confirmText: 'Close',
      cancelText: '',
      type: 'permission',
      ...options
    }),

  confirmDiscard: (options: Partial<DialogOptions> = {}) =>
    useDialogStore.getState().openDialog({
      title: 'Unsaved Changes',
      body: 'You have unsaved changes. Do you want to save before leaving?',
      confirmText: 'Save',
      cancelText: 'Cancel',
      type: 'discard',
      ...options
    }),
};

// Global Dialog Modal Component
export const GlobalDialog: React.FC = () => {
  const { 
    isOpen, type, title, body, confirmText, cancelText, 
    showInput, inputValue, inputPlaceholder, isLoading, clickOutsideToClose,
    closeDialog 
  } = useDialogStore();

  const [promptVal, setPromptVal] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const okBtnRef = useRef<HTMLButtonElement>(null);

  // Sync state for prompt
  useEffect(() => {
    if (isOpen) {
      setPromptVal(inputValue);
      // Accessibility focus trap
      setTimeout(() => {
        okBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen, inputValue]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        closeDialog(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, closeDialog]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    closeDialog(true, showInput ? promptVal : undefined);
  };

  const handleCancel = () => {
    closeDialog(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (clickOutsideToClose && !isLoading && e.target === e.currentTarget) {
      closeDialog(false);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'delete':
      case 'danger':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500">
            <Trash2 className="h-6 h-6" />
          </div>
        );
      case 'warning':
      case 'discard':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500">
            <AlertTriangle className="h-6 h-6" />
          </div>
        );
      case 'success':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-500">
            <BadgeCheck className="h-6 h-6" />
          </div>
        );
      case 'permission':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500">
            <Shield className="h-6 h-6" />
          </div>
        );
      case 'logout':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500">
            <LogOut className="h-6 h-6" />
          </div>
        );
      case 'save':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500">
            <Save className="h-6 h-6" />
          </div>
        );
      default:
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500">
            <Info className="h-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    if (type === 'delete' || type === 'danger' || type === 'logout') {
      return 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50';
    }
    return 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50';
  };

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        ref={dialogRef}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-surface border border-border shadow-premium p-6 text-center animate-in zoom-in-95 duration-200"
      >
        <div className="flex justify-between items-start mb-2">
          <div className="w-6" /> {/* spacer */}
          {getIcon()}
          <button 
            onClick={handleCancel}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-muted disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 text-center sm:mt-5">
          <h3 className="text-lg font-bold leading-6 text-foreground">
            {title}
          </h3>
          {body && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {body}
              </p>
            </div>
          )}
        </div>

        {showInput && (
          <div className="mt-4">
            <input
              type="text"
              value={promptVal}
              onChange={(e) => setPromptVal(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-transparent text-sm border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-foreground disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              autoFocus
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-center gap-2">
          {cancelText && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            ref={okBtnRef}
            onClick={handleConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto px-5 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${getConfirmButtonClass()}`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
