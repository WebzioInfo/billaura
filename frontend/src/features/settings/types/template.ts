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

export interface DocumentTemplate {
  id: string;
  companyId: string;
  name: string;
  type: string;
  htmlContent: string | null;
  isSystem: boolean;
  isDefault: boolean;
  theme: string;
  colors: TemplateColors;
  typography: TemplateTypography;
  layout: TemplateLayout;
  elements: TemplateElements;
  terms: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
