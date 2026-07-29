import React from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface DeleteEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  employeeName: string;
  employeeCode: string;
}

export const DeleteEmployeeDialog: React.FC<DeleteEmployeeDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  employeeName,
  employeeCode,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Employee" maxWidth="md">
      <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold">Are you sure you want to delete this employee?</h3>
        
        <div className="bg-muted p-4 rounded-md w-full text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Employee Name:</span>
            <span className="font-semibold">{employeeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Employee Code:</span>
            <span className="font-semibold">{employeeCode}</span>
          </div>
        </div>

        <p className="text-sm text-red-600 font-medium">This action cannot be undone.</p>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          variant="destructive" 
          onClick={onConfirm} 
          isLoading={isLoading}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Delete Employee
        </Button>
      </div>
    </Modal>
  );
};
