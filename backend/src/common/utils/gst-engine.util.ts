import { TaxPreference } from '@prisma/client';

export interface GSTCalculationInput {
  taxableAmount: number;
  gstRate: number; // e.g. 0, 3, 5, 12, 18, 28
  taxPreference: TaxPreference;
  companyStateCode: string;
  customerStateCode: string;
}

export interface GSTCalculationResult {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
}

export class GSTEngine {
  
  /**
   * Calculates the exact GST components based on business rules.
   * State code comparison determines if it's Inter-state (IGST) or Intra-state (CGST+SGST).
   */
  static calculate(input: GSTCalculationInput): GSTCalculationResult {
    const { taxableAmount, gstRate, taxPreference, companyStateCode, customerStateCode } = input;
    
    // If not taxable, return 0 tax
    if (
      taxPreference === 'EXEMPT' || 
      taxPreference === 'NIL_RATED' || 
      taxPreference === 'NON_GST' ||
      gstRate === 0
    ) {
      return {
        taxableAmount,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
        grandTotal: taxableAmount
      };
    }

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const totalTax = (taxableAmount * gstRate) / 100;

    // Check if Inter-state or Intra-state
    // If either state code is missing, we default to Intra-state (CGST+SGST) for safety, 
    // though in production state codes should be mandatory.
    const isSameState = !customerStateCode || (companyStateCode === customerStateCode);

    if (isSameState) {
      // Intra-state: Split 50/50
      cgstAmount = totalTax / 2;
      sgstAmount = totalTax / 2;
    } else {
      // Inter-state: Full IGST
      igstAmount = totalTax;
    }

    return {
      taxableAmount,
      cgstAmount: Number(cgstAmount.toFixed(2)),
      sgstAmount: Number(sgstAmount.toFixed(2)),
      igstAmount: Number(igstAmount.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      grandTotal: Number((taxableAmount + totalTax).toFixed(2))
    };
  }
}
