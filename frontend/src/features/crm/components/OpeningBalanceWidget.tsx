import React, { useState } from 'react';
import { IndianRupee, ArrowRight, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Input, Select, Badge, Button } from '@/shared/components/ui';

interface OpeningBalanceWidgetProps {
  initialAmount?: string;
  initialType?: string;
  customerName: string;
  onSave?: (amount: number, type: string) => void;
  isDashboardView?: boolean;
}

export const OpeningBalanceWidget: React.FC<OpeningBalanceWidgetProps> = ({
  initialAmount = '0',
  initialType = 'NONE',
  customerName,
  onSave,
  isDashboardView = true
}) => {
  const [amount, setAmount] = useState(initialAmount);
  const [type, setType] = useState(initialType);
  const [isEditing, setIsEditing] = useState(false);

  const numAmount = Number(amount) || 0;

  const isDebit = type === 'DEBIT_BALANCE' || type === 'RECEIVABLE';
  const isCredit = type === 'CREDIT_BALANCE' || type === 'PAYABLE';
  
  const handleSave = () => {
    setIsEditing(false);
    if (onSave) onSave(numAmount, type);
  };

  if (isDashboardView && !isEditing && initialType === 'NONE') {
    return (
      <div className="bg-muted/10 border border-dashed border-border/80 rounded-xl p-6 text-center">
        <p className="text-muted-foreground mb-3 text-sm">No opening balance has been set for {customerName}.</p>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Set Opening Balance</Button>
      </div>
    );
  }

  if (isDashboardView && !isEditing) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opening Balance</p>
            <p className="text-2xl font-bold text-foreground mt-1 flex items-center gap-2">
              {formatCurrency(numAmount)}
              <Badge variant={isDebit ? 'danger' : 'success'} className="text-xs uppercase">
                {isDebit ? 'Receivable (Dr)' : 'Payable (Cr)'}
              </Badge>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
        </div>
        <div className="bg-muted/20 rounded-lg p-3 border border-border/50 text-sm">
          <p className="font-medium text-foreground mb-2 flex items-center gap-1.5 text-xs uppercase text-muted-foreground tracking-wider">
            Journal Preview
          </p>
          <div className="grid grid-cols-[1fr,80px,80px] gap-4">
            <span className="text-muted-foreground font-semibold border-b border-border/40 pb-1">Ledger Account</span>
            <span className="text-right text-muted-foreground font-semibold border-b border-border/40 pb-1">Debit</span>
            <span className="text-right text-muted-foreground font-semibold border-b border-border/40 pb-1">Credit</span>
            
            {isDebit ? (
              <>
                <span>{customerName} (Customer)</span>
                <span className="text-right">{formatCurrency(numAmount)}</span>
                <span className="text-right">-</span>
                
                <span>Opening Balance Equity</span>
                <span className="text-right">-</span>
                <span className="text-right">{formatCurrency(numAmount)}</span>
              </>
            ) : (
              <>
                <span>Opening Balance Equity</span>
                <span className="text-right">{formatCurrency(numAmount)}</span>
                <span className="text-right">-</span>
                
                <span>{customerName} (Customer)</span>
                <span className="text-right">-</span>
                <span className="text-right">{formatCurrency(numAmount)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-semibold text-foreground">Set Opening Balance</h3>
        {isDashboardView && <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Balance Type</label>
          <Select 
            value={type} 
            onChange={(e: any) => setType(e.target.value)} 
            className="w-full"
            options={[
              { value: 'NONE', label: 'No Opening Balance' },
              { value: 'DEBIT_BALANCE', label: 'Debit Balance (Receivable from Customer)' },
              { value: 'CREDIT_BALANCE', label: 'Credit Balance (Payable to Customer)' }
            ]}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Amount</label>
          <div className="relative">
            <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="number" 
              className="pl-9" 
              value={amount} 
              onChange={(e: any) => setAmount(e.target.value)} 
              disabled={type === 'NONE'}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {type !== 'NONE' && numAmount > 0 && (
        <div className="bg-accent/5 rounded-lg p-4 border border-accent/20">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-accent mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Live Accounting Preview
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 bg-background border border-border rounded shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs">Dr</span>
                <span className="font-medium">{isDebit ? customerName : 'Opening Balance Equity'}</span>
              </div>
              <span className="font-bold text-foreground">{formatCurrency(numAmount)}</span>
            </div>
            
            <div className="flex items-center justify-between p-2.5 bg-background border border-border rounded shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs">Cr</span>
                <span className="font-medium">{isDebit ? 'Opening Balance Equity' : customerName}</span>
              </div>
              <span className="font-bold text-foreground">{formatCurrency(numAmount)}</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            This will immediately post a Journal Entry dated today.
          </p>
        </div>
      )}

      {isDashboardView && (
        <div className="pt-3 border-t border-border flex justify-end">
          <Button variant="primary" onClick={handleSave} disabled={type !== 'NONE' && numAmount <= 0}>
            Save Balance & Post Journal
          </Button>
        </div>
      )}
    </div>
  );
};
