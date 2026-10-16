import React from 'react';
import { InvoicesList } from './InvoicesList';

/**
 * InvoiceDetails delegates to InvoicesList which provides the unified Zoho Books
 * split-view layout with persistent left navigation panel and the rich InvoiceDetailPane.
 */
export const InvoiceDetails: React.FC = () => {
  return <InvoicesList />;
};

export default InvoiceDetails;
