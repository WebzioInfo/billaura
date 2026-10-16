export interface TemplateColors {
  primary: string;
  secondary: string;
  text: string;
  background: string;
}

export interface TemplateTypography {
  fontFamily: string;
  fontSize: string;
  headerSize: string;
}

export interface TemplateLayout {
  margins: string; // e.g. "20px 20px 20px 20px"
  paperSize: 'A4' | 'LETTER' | 'LEGAL';
  orientation: 'PORTRAIT' | 'LANDSCAPE';
}

export interface TemplateElements {
  showLogo: boolean;
  showGstin: boolean;
  showPan: boolean;
  showHsn: boolean;
  showTaxBreakup: boolean;
  showBankDetails: boolean;
  showTerms: boolean;
  showSignature: boolean;
  showQrCode: boolean;
}

export interface LogoSettings {
  showLogo: boolean;
  useOrgLogo: boolean;
  position: 'left' | 'center' | 'right';
  width: number;
}

export interface TemplateConfig {
  documentTitle?: string;
  numberingLabel?: string;
  showDueDate?: boolean;
  showPlaceOfSupply?: boolean;
  showPoNumber?: boolean;
  showBillTo?: boolean;
  showShipTo?: boolean;
  showStatusRibbon?: boolean;
  bankDetailsOverride?: string;
  signatureUrl?: string | null;
  [key: string]: any;
  columns?: {
    item?: { visible: boolean; label: string };
    hsn?: { visible: boolean; label: string };
    qty?: { visible: boolean; label: string };
    rate?: { visible: boolean; label: string };
    discount?: { visible: boolean; label: string };
    tax?: { visible: boolean; label: string };
    amount?: { visible: boolean; label: string };
  };
  tableHeaderBg?: string;
  tableHeaderText?: string;
  totals?: {
    showSubTotal?: boolean;
    showDiscount?: boolean;
    showTaxBreakup?: boolean;
    showRoundOff?: boolean;
    showTotalInWords?: boolean;
  };
  footer?: {
    showNotes?: boolean;
    showTerms?: boolean;
    showBankDetails?: boolean;
    showSignature?: boolean;
    signatureUrl?: string | null;
    showPoweredBy?: boolean;
  };
}

export interface DocumentTemplate {
  id: string;
  companyId: string;
  name: string;
  type: string;
  docType?: string;
  htmlContent: string | null;
  isSystem: boolean;
  isDefault: boolean;
  theme: string;
  colors: TemplateColors;
  typography: TemplateTypography;
  layout: TemplateLayout;
  elements: TemplateElements;
  logoUrl?: string | null;
  logoSettings?: LogoSettings;
  config?: TemplateConfig;
  terms: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

