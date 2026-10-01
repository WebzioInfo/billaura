import React from 'react';
import { RowActions, RowActionsProps } from '../RowActions';

export interface DataTableRowActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface DataTableRowActionsProps extends Partial<RowActionsProps> {
  customActions?: DataTableRowActionItem[];
}

export const DataTableRowActions: React.FC<DataTableRowActionsProps> = ({
  onView,
  onDownload,
  onPrint,
  ...rest
}) => {
  return (
    <RowActions
      onView={onView || (() => {})}
      onDownload={onDownload || (() => {})}
      onPrint={onPrint || (() => {})}
      {...rest}
    />
  );
};
