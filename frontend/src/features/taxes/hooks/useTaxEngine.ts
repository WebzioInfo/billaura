import { useMemo } from 'react';

export type TaxMode = 'INCLUDING_TAX' | 'EXCLUDING_TAX';
export type TaxType = 'GST' | 'IGST' | 'CGST_SGST';

export interface TaxCalculationResult {
  taxableAmount: number;
  totalAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  taxType: TaxType;
}

export function useTaxEngine(
  amount: number,
  taxRate: number,
  mode: TaxMode,
  vendorState?: string,
  companyState?: string,
  cessRate: number = 0
): TaxCalculationResult {
  return useMemo(() => {
    let taxableAmount = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    const rate = Number(taxRate) || 0;
    const cess = Number(cessRate) || 0;
    const totalPercentage = rate + cess;

    if (mode === 'INCLUDING_TAX') {
      totalAmount = Number(amount) || 0;
      taxableAmount = totalAmount / (1 + totalPercentage / 100);
      taxAmount = totalAmount - taxableAmount;
    } else {
      taxableAmount = Number(amount) || 0;
      taxAmount = taxableAmount * (totalPercentage / 100);
      totalAmount = taxableAmount + taxAmount;
    }

    let taxType: TaxType = 'CGST_SGST';
    if (vendorState && companyState && vendorState !== companyState) {
      taxType = 'IGST';
    }

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    const cessAmount = taxableAmount * (cess / 100);
    const gstAmount = taxableAmount * (rate / 100);

    if (taxType === 'IGST') {
      igstAmount = gstAmount;
    } else {
      cgstAmount = gstAmount / 2;
      sgstAmount = gstAmount / 2;
    }

    const round = (num: number) => Math.round(num * 100) / 100;

    return {
      taxableAmount: round(taxableAmount),
      totalAmount: round(totalAmount),
      taxAmount: round(taxAmount),
      cgstAmount: round(cgstAmount),
      sgstAmount: round(sgstAmount),
      igstAmount: round(igstAmount),
      cessAmount: round(cessAmount),
      taxType,
    };
  }, [amount, taxRate, mode, vendorState, companyState, cessRate]);
}
