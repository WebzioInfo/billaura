export type UniversalTaxPreference =
  | 'TAXABLE'
  | 'EXEMPT'
  | 'NIL_RATED'
  | 'ZERO_RATED'
  | 'NON_GST'
  | 'NOT_APPLICABLE'
  | 'COMPOSITION'
  | 'REVERSE_CHARGE';

export interface GSTCalculationInput {
  taxableAmount: number;
  gstRate: number; // e.g. 0, 3, 5, 12, 18, 28
  cessRate?: number; // e.g. 0, 12
  taxPreference: UniversalTaxPreference | string;
  companyStateCode?: string;
  customerStateCode?: string;
}

export interface GSTCalculationResult {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
  grandTotal: number;
  taxPreference: UniversalTaxPreference;
  gstBreakup: {
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    cessRate: number;
    cessAmount: number;
    taxPreference: string;
  };
}

export class GSTEngine {
  /**
   * Authoritative backend tax engine for all Universal Document types.
   * Resolves tax liability per Indian GST rules and non-taxable / exempt classifications.
   */
  static calculate(input: GSTCalculationInput): GSTCalculationResult {
    const {
      taxableAmount,
      gstRate = 0,
      cessRate = 0,
      taxPreference = 'TAXABLE',
      companyStateCode,
      customerStateCode,
    } = input;

    const normalizedPref = (taxPreference || 'TAXABLE').toUpperCase() as UniversalTaxPreference;

    // Non-taxable treatments: EXEMPT, NIL_RATED, ZERO_RATED (exports without tax), NON_GST, NOT_APPLICABLE
    const isZeroTax =
      normalizedPref === 'EXEMPT' ||
      normalizedPref === 'NIL_RATED' ||
      normalizedPref === 'ZERO_RATED' ||
      normalizedPref === 'NON_GST' ||
      normalizedPref === 'NOT_APPLICABLE' ||
      gstRate === 0;

    if (isZeroTax) {
      return {
        taxableAmount: Number(taxableAmount.toFixed(2)),
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        cessAmount: 0,
        totalTax: 0,
        grandTotal: Number(taxableAmount.toFixed(2)),
        taxPreference: normalizedPref,
        gstBreakup: {
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0,
          cessRate: 0,
          cessAmount: 0,
          taxPreference: normalizedPref,
        },
      };
    }

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let cessAmount = 0;

    const baseTax = (taxableAmount * gstRate) / 100;
    if (cessRate > 0) {
      cessAmount = (taxableAmount * cessRate) / 100;
    }

    // Determine Intra-State vs Inter-State GST
    const isSameState =
      !customerStateCode ||
      !companyStateCode ||
      companyStateCode.trim().toLowerCase() === customerStateCode.trim().toLowerCase();

    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;

    if (isSameState) {
      // Intra-state: Split GST 50/50 into CGST and SGST
      cgstRate = gstRate / 2;
      sgstRate = gstRate / 2;
      cgstAmount = baseTax / 2;
      sgstAmount = baseTax / 2;
    } else {
      // Inter-state: 100% IGST
      igstRate = gstRate;
      igstAmount = baseTax;
    }

    const totalTax = cgstAmount + sgstAmount + igstAmount + cessAmount;
    const grandTotal = taxableAmount + totalTax;

    return {
      taxableAmount: Number(taxableAmount.toFixed(2)),
      cgstAmount: Number(cgstAmount.toFixed(2)),
      sgstAmount: Number(sgstAmount.toFixed(2)),
      igstAmount: Number(igstAmount.toFixed(2)),
      cessAmount: Number(cessAmount.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      taxPreference: normalizedPref,
      gstBreakup: {
        cgstRate,
        cgstAmount: Number(cgstAmount.toFixed(2)),
        sgstRate,
        sgstAmount: Number(sgstAmount.toFixed(2)),
        igstRate,
        igstAmount: Number(igstAmount.toFixed(2)),
        cessRate,
        cessAmount: Number(cessAmount.toFixed(2)),
        taxPreference: normalizedPref,
      },
    };
  }
}
