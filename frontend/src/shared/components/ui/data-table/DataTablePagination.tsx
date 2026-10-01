import React from 'react';
import { Pagination, PaginationProps } from '../Pagination';

export type DataTablePaginationProps = PaginationProps;

export const DataTablePagination: React.FC<DataTablePaginationProps> = (props) => {
  return <Pagination {...props} />;
};
