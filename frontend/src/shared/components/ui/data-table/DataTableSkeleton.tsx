import React from 'react';
import { TableSkeleton, TableSkeletonProps } from '../TableSkeleton';

export type DataTableSkeletonProps = TableSkeletonProps;

export const DataTableSkeleton: React.FC<DataTableSkeletonProps> = (props) => {
  return <TableSkeleton {...props} />;
};
