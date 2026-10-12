import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'secondary';
  isLoading?: boolean;
  loadingText?: string;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading: externalLoading = false,
  loadingText,
}: ConfirmDialogProps) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isBusy = externalLoading || internalLoading;

  const handleConfirm = async () => {
    if (isBusy) return;
    setInternalLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setInternalLoading(false);
    }
  };

  const defaultLoadingText = variant === 'danger' ? 'Deleting...' : 'Processing...';

  return (
    <Modal isOpen={isOpen} onClose={isBusy ? () => {} : onClose} title={title} maxWidth="sm">
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground leading-relaxed">
          {message}
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isBusy}
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant} 
            onClick={handleConfirm} 
            isLoading={isBusy}
            loadingText={loadingText || defaultLoadingText}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
