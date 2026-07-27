import React, { useState } from 'react';
import { Download, Upload, Plus, FileText, CheckCircle2, Circle } from 'lucide-react';
import { Button, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EmptyState } from '@/shared/components/ui/LayoutComponents';

interface MigrationTableProps {
  historicalInvoices: any[];
}

export const MigrationTable: React.FC<MigrationTableProps> = ({ historicalInvoices }) => {
  if (!historicalInvoices || historicalInvoices.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-border bg-muted/10 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-foreground">Historical Invoices</h3>
            <p className="text-xs text-muted-foreground">Migrate past invoices for accurate aging and ledger history.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-1.5" /> Import CSV
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Add Invoice
            </Button>
          </div>
        </div>
        <EmptyState 
          icon={<FileText className="w-10 h-10 text-muted-foreground/40" />}
          title="No Historical Invoices" 
          description="Import past invoices to build customer history and outstanding balances."
        />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden mt-6">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-foreground">Historical Invoices</h3>
          <p className="text-xs text-muted-foreground">Managed migrated invoices from previous systems.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Invoice
          </Button>
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead>Invoice #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historicalInvoices.map((inv, idx) => {
            const outstanding = Number(inv.total) - Number(inv.paidAmount || 0);
            const isPaid = outstanding <= 0;
            return (
              <TableRow key={idx}>
                <TableCell className="font-medium text-foreground">{inv.invoiceNumber}</TableCell>
                <TableCell>{formatDate(inv.date)}</TableCell>
                <TableCell>{formatDate(inv.dueDate)}</TableCell>
                <TableCell className="text-right">{formatCurrency(inv.total)}</TableCell>
                <TableCell className="text-right">{formatCurrency(inv.paidAmount || 0)}</TableCell>
                <TableCell className="text-right font-semibold text-destructive">
                  {formatCurrency(outstanding)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={isPaid ? 'success' : 'default'} className="inline-flex items-center gap-1">
                    {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                    {isPaid ? 'PAID' : 'OPEN'}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
