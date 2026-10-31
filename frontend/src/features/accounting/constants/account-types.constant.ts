export type MainAccountGroup = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type FinancialStatement = 'BALANCE_SHEET' | 'PROFIT_AND_LOSS';
export type TermClassification = 'CURRENT' | 'NON_CURRENT' | 'EQUITY' | 'OPERATING' | 'NON_OPERATING' | 'DIRECT';

export interface AccountTypeMetadata {
  id: string;
  displayName: string;
  mainGroup: MainAccountGroup;
  mainGroupLabel: string;
  normalBalance: NormalBalance;
  normalBalanceLabel: string;
  statement: FinancialStatement;
  classification: TermClassification;
  description: string;
}

export interface MainGroupDefinition {
  id: MainAccountGroup;
  label: string;
  normalBalance: NormalBalance;
  types: AccountTypeMetadata[];
}

export const MAIN_ACCOUNT_GROUPS: { id: MainAccountGroup; label: string; normalBalance: NormalBalance }[] = [
  { id: 'ASSET', label: 'Asset', normalBalance: 'DEBIT' },
  { id: 'LIABILITY', label: 'Liability', normalBalance: 'CREDIT' },
  { id: 'EQUITY', label: 'Equity', normalBalance: 'CREDIT' },
  { id: 'REVENUE', label: 'Income / Revenue', normalBalance: 'CREDIT' },
  { id: 'EXPENSE', label: 'Expense', normalBalance: 'DEBIT' },
];

export const ACCOUNT_TYPES_METADATA: Record<string, AccountTypeMetadata> = {
  // --- ASSETS ---
  OTHER_ASSET: {
    id: 'OTHER_ASSET',
    displayName: 'Other Asset',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'NON_CURRENT',
    description: 'Tracks resources of economic value owned by the business that cannot be categorized under standard current or fixed asset accounts.',
  },
  OTHER_CURRENT_ASSET: {
    id: 'OTHER_CURRENT_ASSET',
    displayName: 'Other Current Asset',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'CURRENT',
    description: 'Any short-term asset expected to be converted into cash, consumed, or liquidated within twelve months, such as prepaid expenses and security deposits.',
  },
  CASH: {
    id: 'CASH',
    displayName: 'Cash',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'CURRENT',
    description: 'Physical currency, petty cash registers, and cash floats held on premises for day-to-day operational transactions.',
  },
  BANK: {
    id: 'BANK',
    displayName: 'Bank',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'CURRENT',
    description: 'Commercial checking, savings, current, or money market bank accounts maintained with registered financial institutions.',
  },
  FIXED_ASSET: {
    id: 'FIXED_ASSET',
    displayName: 'Fixed Asset',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'NON_CURRENT',
    description: 'Long-term tangible assets held for productive operational use, including land, buildings, heavy machinery, motor vehicles, and IT equipment.',
  },
  STOCK: {
    id: 'STOCK',
    displayName: 'Stock',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'CURRENT',
    description: 'Inventory holdings including raw materials, work in progress, and finished goods ready for customer fulfillment.',
  },
  PAYMENT_CLEARING_ACCOUNT: {
    id: 'PAYMENT_CLEARING_ACCOUNT',
    displayName: 'Payment Clearing Account',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'CURRENT',
    description: 'Intermediary transit account used to hold payment gateway, card processor, or POS collections prior to bank deposit reconciliation.',
  },
  INTANGIBLE_ASSET: {
    id: 'INTANGIBLE_ASSET',
    displayName: 'Intangible Asset',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'NON_CURRENT',
    description: 'Non-monetary identifiable assets without physical substance, such as registered patents, industrial trademarks, software licenses, and acquired goodwill.',
  },
  NON_CURRENT_ASSET: {
    id: 'NON_CURRENT_ASSET',
    displayName: 'Non Current Asset',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'NON_CURRENT',
    description: 'Long-term investments, government bonds, promissory notes, and economic assets retained for periods exceeding one operating fiscal year.',
  },
  DEFERRED_TAX_ASSET: {
    id: 'DEFERRED_TAX_ASSET',
    displayName: 'Deferred Tax Asset',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'NON_CURRENT',
    description: 'Recognized tax benefits recoverable in future fiscal periods arising from deductible temporary timing differences between accounting and taxable profits.',
  },
  CAPITAL_WORK_IN_PROGRESS: {
    id: 'CAPITAL_WORK_IN_PROGRESS',
    displayName: 'Capital Work In Progress',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'NON_CURRENT',
    description: 'Accumulated construction, installation, assembly, and architectural costs of physical assets before they are ready for commercial operation.',
  },
  INTANGIBLE_ASSETS_UNDER_DEVELOPMENT: {
    id: 'INTANGIBLE_ASSETS_UNDER_DEVELOPMENT',
    displayName: 'Intangible Assets Under Development',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'NON_CURRENT',
    description: 'Capitalized research and development expenditures incurred in the technical creation of proprietary internal software or intellectual property.',
  },
  ACCOUNTS_RECEIVABLE: {
    id: 'ACCOUNTS_RECEIVABLE',
    displayName: 'Accounts Receivable',
    mainGroup: 'ASSET',
    mainGroupLabel: 'Asset',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'BALANCE_SHEET',
    classification: 'CURRENT',
    description: 'Legally enforceable claims for payment owed by customers for delivered goods or rendered services billed on commercial credit terms.',
  },

  // --- LIABILITIES ---
  OTHER_CURRENT_LIABILITY: {
    id: 'OTHER_CURRENT_LIABILITY',
    displayName: 'Other Current Liability',
    mainGroup: 'LIABILITY',
    mainGroupLabel: 'Liability',
    normalBalance: 'CREDIT',
    normalBalanceLabel: 'Credit (Cr)',
    statement: 'BALANCE_SHEET',
    classification: 'CURRENT',
    description: 'Short-term financial obligations due within one year, such as statutory taxes, accrued payroll overheads, and customer advances.',
  },
  CREDIT_CARD: {
    id: 'CREDIT_CARD',
    displayName: 'Credit Card',
    mainGroup: 'LIABILITY',
    mainGroupLabel: 'Liability',
    normalBalance: 'CREDIT',
    normalBalanceLabel: 'Credit (Cr)',
    statement: 'BALANCE_SHEET',
    classification: 'CURRENT',
    description: 'Revolving lines of credit and corporate purchase cards provided by financial institutions for corporate expenditures.',
  },
  NON_CURRENT_LIABILITY: {
    id: 'NON_CURRENT_LIABILITY',
    displayName: 'Non Current Liability',
    mainGroup: 'LIABILITY',
    mainGroupLabel: 'Liability',
    normalBalance: 'CREDIT',
    normalBalanceLabel: 'Credit (Cr)',
    statement: 'BALANCE_SHEET',
    classification: 'NON_CURRENT',
    description: 'Long-term borrowings, commercial mortgages, equipment debentures, and institutional bank loans maturing after more than twelve months.',
  },
  OTHER_LIABILITY: {
    id: 'OTHER_LIABILITY',
    displayName: 'Other Liability',
    mainGroup: 'LIABILITY',
    mainGroupLabel: 'Liability',
    normalBalance: 'CREDIT',
    normalBalanceLabel: 'Credit (Cr)',
    statement: 'BALANCE_SHEET',
    classification: 'NON_CURRENT',
    description: 'General financial commitments and liabilities that do not strictly classify under standard operational trade debt or bank loans.',
  },
  OVERSEAS_TAX_PAYABLE: {
    id: 'OVERSEAS_TAX_PAYABLE',
    displayName: 'Overseas Tax Payable',
    mainGroup: 'LIABILITY',
    mainGroupLabel: 'Liability',
    normalBalance: 'CREDIT',
    normalBalanceLabel: 'Credit (Cr)',
    statement: 'BALANCE_SHEET',
    classification: 'CURRENT',
    description: 'Statutory cross-border withholding taxes, foreign VAT/GST, and customs excise duties owed to international government revenue authorities.',
  },
  DEFERRED_TAX_LIABILITY: {
    id: 'DEFERRED_TAX_LIABILITY',
    displayName: 'Deferred Tax Liability',
    mainGroup: 'LIABILITY',
    mainGroupLabel: 'Liability',
    normalBalance: 'CREDIT',
    normalBalanceLabel: 'Credit (Cr)',
    statement: 'BALANCE_SHEET',
    classification: 'NON_CURRENT',
    description: 'Taxes payable in future accounting periods arising from taxable temporary differences between book accounting and tax reporting.',
  },
  ACCOUNTS_PAYABLE: {
    id: 'ACCOUNTS_PAYABLE',
    displayName: 'Accounts Payable',
    mainGroup: 'LIABILITY',
    mainGroupLabel: 'Liability',
    normalBalance: 'CREDIT',
    normalBalanceLabel: 'Credit (Cr)',
    statement: 'BALANCE_SHEET',
    classification: 'CURRENT',
    description: 'Outstanding short-term commercial obligations owed to trade suppliers and vendors for raw materials, supplies, and services procured on credit.',
  },

  // --- EQUITY ---
  EQUITY: {
    id: 'EQUITY',
    displayName: 'Equity',
    mainGroup: 'EQUITY',
    mainGroupLabel: 'Equity',
    normalBalance: 'CREDIT',
    normalBalanceLabel: 'Credit (Cr)',
    statement: 'BALANCE_SHEET',
    classification: 'EQUITY',
    description: "Represents owners' paid-in capital, retained earnings, shareholder stock, and partner drawings reflecting residual interest in enterprise net assets.",
  },

  // --- INCOME / REVENUE ---
  INCOME: {
    id: 'INCOME',
    displayName: 'Income',
    mainGroup: 'REVENUE',
    mainGroupLabel: 'Income / Revenue',
    normalBalance: 'CREDIT',
    normalBalanceLabel: 'Credit (Cr)',
    statement: 'PROFIT_AND_LOSS',
    classification: 'OPERATING',
    description: 'Gross inflows of economic benefits generated from primary core commercial activities, such as merchandise sales and professional services.',
  },
  OTHER_INCOME: {
    id: 'OTHER_INCOME',
    displayName: 'Other Income',
    mainGroup: 'REVENUE',
    mainGroupLabel: 'Income / Revenue',
    normalBalance: 'CREDIT',
    normalBalanceLabel: 'Credit (Cr)',
    statement: 'PROFIT_AND_LOSS',
    classification: 'NON_OPERATING',
    description: 'Incidental earnings derived from non-core operations, including treasury interest, dividend yields, asset salvage gains, and currency exchange profits.',
  },

  // --- EXPENSES ---
  EXPENSE: {
    id: 'EXPENSE',
    displayName: 'Expense',
    mainGroup: 'EXPENSE',
    mainGroupLabel: 'Expense',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'PROFIT_AND_LOSS',
    classification: 'OPERATING',
    description: 'Ordinary expenditures incurred in running administrative and general operations, such as staff salaries, premises rent, utilities, insurance, and travel.',
  },
  COST_OF_GOODS_SOLD: {
    id: 'COST_OF_GOODS_SOLD',
    displayName: 'Cost Of Goods Sold',
    mainGroup: 'EXPENSE',
    mainGroupLabel: 'Expense',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'PROFIT_AND_LOSS',
    classification: 'DIRECT',
    description: 'Direct expenditures directly tied to the manufacturing, procurement, or direct fulfillment of products and services sold to customers.',
  },
  OTHER_EXPENSE: {
    id: 'OTHER_EXPENSE',
    displayName: 'Other Expense',
    mainGroup: 'EXPENSE',
    mainGroupLabel: 'Expense',
    normalBalance: 'DEBIT',
    normalBalanceLabel: 'Debit (Dr)',
    statement: 'PROFIT_AND_LOSS',
    classification: 'NON_OPERATING',
    description: 'Non-operational expenditures outside primary business operations, such as corporate loan interest charges, penalties, and foreign currency devaluation losses.',
  },
};

/**
 * Grouped structure for searchable UI dropdown matching Zoho Books.
 */
export const GROUPED_ACCOUNT_TYPES: MainGroupDefinition[] = [
  {
    id: 'ASSET',
    label: 'Asset',
    normalBalance: 'DEBIT',
    types: [
      ACCOUNT_TYPES_METADATA.OTHER_ASSET,
      ACCOUNT_TYPES_METADATA.OTHER_CURRENT_ASSET,
      ACCOUNT_TYPES_METADATA.CASH,
      ACCOUNT_TYPES_METADATA.BANK,
      ACCOUNT_TYPES_METADATA.FIXED_ASSET,
      ACCOUNT_TYPES_METADATA.STOCK,
      ACCOUNT_TYPES_METADATA.PAYMENT_CLEARING_ACCOUNT,
      ACCOUNT_TYPES_METADATA.INTANGIBLE_ASSET,
      ACCOUNT_TYPES_METADATA.NON_CURRENT_ASSET,
      ACCOUNT_TYPES_METADATA.DEFERRED_TAX_ASSET,
      ACCOUNT_TYPES_METADATA.CAPITAL_WORK_IN_PROGRESS,
      ACCOUNT_TYPES_METADATA.INTANGIBLE_ASSETS_UNDER_DEVELOPMENT,
      ACCOUNT_TYPES_METADATA.ACCOUNTS_RECEIVABLE,
    ],
  },
  {
    id: 'LIABILITY',
    label: 'Liability',
    normalBalance: 'CREDIT',
    types: [
      ACCOUNT_TYPES_METADATA.OTHER_CURRENT_LIABILITY,
      ACCOUNT_TYPES_METADATA.CREDIT_CARD,
      ACCOUNT_TYPES_METADATA.NON_CURRENT_LIABILITY,
      ACCOUNT_TYPES_METADATA.OTHER_LIABILITY,
      ACCOUNT_TYPES_METADATA.OVERSEAS_TAX_PAYABLE,
      ACCOUNT_TYPES_METADATA.DEFERRED_TAX_LIABILITY,
      ACCOUNT_TYPES_METADATA.ACCOUNTS_PAYABLE,
    ],
  },
  {
    id: 'EQUITY',
    label: 'Equity',
    normalBalance: 'CREDIT',
    types: [
      ACCOUNT_TYPES_METADATA.EQUITY,
    ],
  },
  {
    id: 'REVENUE',
    label: 'Income / Revenue',
    normalBalance: 'CREDIT',
    types: [
      ACCOUNT_TYPES_METADATA.INCOME,
      ACCOUNT_TYPES_METADATA.OTHER_INCOME,
    ],
  },
  {
    id: 'EXPENSE',
    label: 'Expense',
    normalBalance: 'DEBIT',
    types: [
      ACCOUNT_TYPES_METADATA.EXPENSE,
      ACCOUNT_TYPES_METADATA.COST_OF_GOODS_SOLD,
      ACCOUNT_TYPES_METADATA.OTHER_EXPENSE,
    ],
  },
];

export function getAccountTypeMetadata(typeOrCategory?: string): AccountTypeMetadata | null {
  if (!typeOrCategory) return null;
  const normalized = typeOrCategory.toUpperCase().trim().replace(/[\s-]+/g, '_');

  if (ACCOUNT_TYPES_METADATA[normalized]) {
    return ACCOUNT_TYPES_METADATA[normalized];
  }

  // Aliases and fallback
  switch (normalized) {
    case 'CURRENT_ASSET':
      return ACCOUNT_TYPES_METADATA.OTHER_CURRENT_ASSET;
    case 'CURRENT_LIABILITY':
      return ACCOUNT_TYPES_METADATA.OTHER_CURRENT_LIABILITY;
    case 'LONG_TERM_LIABILITY':
      return ACCOUNT_TYPES_METADATA.NON_CURRENT_LIABILITY;
    case 'SALES_REVENUE':
    case 'SERVICE_REVENUE':
    case 'SALES_RETURNS':
    case 'SALES_DISCOUNTS':
      return ACCOUNT_TYPES_METADATA.INCOME;
    case 'COGS':
      return ACCOUNT_TYPES_METADATA.COST_OF_GOODS_SOLD;
    case 'OPERATING_EXPENSE':
      return ACCOUNT_TYPES_METADATA.EXPENSE;
    case 'ASSET':
      return ACCOUNT_TYPES_METADATA.OTHER_CURRENT_ASSET;
    case 'LIABILITY':
      return ACCOUNT_TYPES_METADATA.OTHER_CURRENT_LIABILITY;
    case 'REVENUE':
      return ACCOUNT_TYPES_METADATA.INCOME;
    default:
      return null;
  }
}

