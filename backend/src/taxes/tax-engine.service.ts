import { Injectable } from '@nestjs/common';

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

@Injectable()
export class TaxEngineService {
  /**
   * Centralized Tax Calculation Engine
   * @param amount The base or total amount depending on the mode
   * @param taxRate Total Tax % (e.g. 18)
   * @param mode EXCLUDING_TAX (amount is taxable) or INCLUDING_TAX (amount is total)
   * @param vendorState State code of vendor (optional)
   * @param companyState State code of company (optional)
   * @param cessRate Additional Cess %
   */
  calculateTax(
    amount: number,
    taxRate: number,
    mode: TaxMode,
    vendorState?: string,
    companyState?: string,
    cessRate: number = 0,
  ): TaxCalculationResult {
    let taxableAmount: number;
    let taxAmount: number;
    let totalAmount: number;

    const rate = Number(taxRate) || 0;
    const cess = Number(cessRate) || 0;
    const totalPercentage = rate + cess;

    if (mode === 'INCLUDING_TAX') {
      totalAmount = amount;
      taxableAmount = totalAmount / (1 + totalPercentage / 100);
      taxAmount = totalAmount - taxableAmount;
    } else {
      taxableAmount = amount;
      taxAmount = taxableAmount * (totalPercentage / 100);
      totalAmount = taxableAmount + taxAmount;
    }

    // Determine GST Split
    // If state is not provided, default to CGST/SGST assuming intra-state
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

    // Rounding to 2 decimal places
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
  }
}
