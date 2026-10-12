import React from 'react';
import { ConfirmDialog } from './ConfirmDialog';

export interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  entityName: string;
  entityId?: string;
  warningText?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export const DeleteDialog = ({
  isOpen,
  onClose,
  onConfirm,
  entityName,
  entityId,
  warningText = 'This action cannot be undone.',
  isLoading,
  loadingText = 'Deleting...',
}: DeleteDialogProps) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      loadingText={loadingText}
      title={`Delete ${entityName}`}
      variant="danger"
      confirmText="Delete"
      message={
        <div className="space-y-3">
          <p className="text-base text-foreground">
            Are you sure you want to delete this {entityName.toLowerCase()}
            {entityId ? <span className="font-bold"> {entityId}</span> : ''}?
          </p>
          <p className="font-medium text-red-600 dark:text-red-400">
            {warningText}
          </p>
        </div>
      }
    />
  );
};
