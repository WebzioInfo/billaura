/**
 * Centralized Business Rule Engine for Bill Aura ERP
 * Provides enterprise-grade validation helpers for GST, PAN, HSN, Financials, and Product Types.
 */

// GSTIN Regex Format: 2 digits (State code), 10 char PAN, 1 digit (Entity number), 1 letter ('Z' default), 1 char (Check digit)
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Indian PAN Format: 5 letters, 4 digits, 1 letter
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// HSN Code: 4, 6, or 8 digits
export const HSN_REGEX = /^[0-9]{4}([0-9]{2})?([0-9]{2})?$/;

// SAC Code: 6 digits starting with 99
export const SAC_REGEX = /^99[0-9]{4}$/;

/**
 * Validates GSTIN structure
 */
export function isValidGstin(gstin: string): boolean {
  if (!gstin) return true;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

/**
 * Validates PAN structure
 */
export function isValidPan(pan: string): boolean {
  if (!pan) return true;
  return PAN_REGEX.test(pan.trim().toUpperCase());
}

/**
 * Validates HSN/SAC code structure
 */
export function isValidHsnOrSac(code: string, isService: boolean = false): boolean {
  if (!code) return true;
  const clean = code.trim();
  if (isService) {
    return SAC_REGEX.test(clean) || HSN_REGEX.test(clean);
  }
  return HSN_REGEX.test(clean);
}

/**
 * Extract PAN from GSTIN (Characters 3 to 12)
 */
export function extractPanFromGstin(gstin: string): string | null {
  if (isValidGstin(gstin)) {
    return gstin.trim().substring(2, 12).toUpperCase();
  }
  return null;
}

/**
 * Product Type Business Rules
 */
export interface ProductTypeConfig {
  isInventoryItem: boolean;
  isService: boolean;
  isAsset: boolean;
  isExpense: boolean;
  isDigital: boolean;
  isTrackStock: boolean;
  isPurchasable: boolean;
  isSellable: boolean;
}

export const PRODUCT_TYPE_CONFIGS: Record<string, ProductTypeConfig> = {
  INVENTORY: { isInventoryItem: true, isService: false, isAsset: false, isExpense: false, isDigital: false, isTrackStock: true, isPurchasable: true, isSellable: true },
  NON_INVENTORY: { isInventoryItem: false, isService: false, isAsset: false, isExpense: false, isDigital: false, isTrackStock: false, isPurchasable: true, isSellable: true },
  SERVICE: { isInventoryItem: false, isService: true, isAsset: false, isExpense: false, isDigital: false, isTrackStock: false, isPurchasable: true, isSellable: true },
  RAW_MATERIAL: { isInventoryItem: true, isService: false, isAsset: false, isExpense: false, isDigital: false, isTrackStock: true, isPurchasable: true, isSellable: false },
  FINISHED_GOOD: { isInventoryItem: true, isService: false, isAsset: false, isExpense: false, isDigital: false, isTrackStock: true, isPurchasable: false, isSellable: true },
  ASSET: { isInventoryItem: true, isService: false, isAsset: true, isExpense: false, isDigital: false, isTrackStock: true, isPurchasable: true, isSellable: false },
  EXPENSE: { isInventoryItem: false, isService: false, isAsset: false, isExpense: true, isDigital: false, isTrackStock: false, isPurchasable: true, isSellable: false },
  DIGITAL: { isInventoryItem: false, isService: false, isAsset: false, isExpense: false, isDigital: true, isTrackStock: false, isPurchasable: false, isSellable: true },
};
