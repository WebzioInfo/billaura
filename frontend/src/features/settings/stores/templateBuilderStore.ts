import { create } from 'zustand';
import { DocumentTemplate, TemplateColors, TemplateTypography, TemplateLayout, TemplateElements } from '@/features/settings/types/template';

interface TemplateBuilderState {
  template: Partial<DocumentTemplate>;
  isPreviewMode: boolean;
  activeTab: 'theme' | 'layout' | 'elements' | 'content';
  
  // Actions
  setTemplate: (template: Partial<DocumentTemplate>) => void;
  updateColors: (colors: Partial<TemplateColors>) => void;
  updateTypography: (typography: Partial<TemplateTypography>) => void;
  updateLayout: (layout: Partial<TemplateLayout>) => void;
  updateElements: (elements: Partial<TemplateElements>) => void;
  updateMetadata: (data: Partial<DocumentTemplate>) => void;
  setPreviewMode: (mode: boolean) => void;
  setActiveTab: (tab: 'theme' | 'layout' | 'elements' | 'content') => void;
  reset: () => void;
}

const defaultColors: TemplateColors = {
  primary: '#0f172a',
  secondary: '#64748b',
  text: '#1e293b',
  background: '#ffffff',
};

const defaultTypography: TemplateTypography = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '14px',
  headerSize: '24px',
};

const defaultLayout: TemplateLayout = {
  margins: '20px',
  paperSize: 'A4',
  orientation: 'PORTRAIT',
};

const defaultElements: TemplateElements = {
  showLogo: true,
  showGstin: true,
  showPan: false,
  showHsn: true,
  showTaxBreakup: true,
  showBankDetails: true,
  showTerms: true,
  showSignature: true,
  showQrCode: false,
};

const defaultTemplate: Partial<DocumentTemplate> = {
  theme: 'classic',
  colors: defaultColors,
  typography: defaultTypography,
  layout: defaultLayout,
  elements: defaultElements,
  type: 'INVOICE',
};

export const useTemplateBuilderStore = create<TemplateBuilderState>((set) => ({
  template: defaultTemplate,
  isPreviewMode: false,
  activeTab: 'theme',

  setTemplate: (template) => set({ template }),
  
  updateColors: (colors) => set((state) => ({
    template: {
      ...state.template,
      colors: { ...state.template.colors!, ...colors }
    }
  })),

  updateTypography: (typography) => set((state) => ({
    template: {
      ...state.template,
      typography: { ...state.template.typography!, ...typography }
    }
  })),

  updateLayout: (layout) => set((state) => ({
    template: {
      ...state.template,
      layout: { ...state.template.layout!, ...layout }
    }
  })),

  updateElements: (elements) => set((state) => ({
    template: {
      ...state.template,
      elements: { ...state.template.elements!, ...elements }
    }
  })),

  updateMetadata: (data) => set((state) => ({
    template: {
      ...state.template,
      ...data
    }
  })),

  setPreviewMode: (mode) => set({ isPreviewMode: mode }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),

  reset: () => set({ template: defaultTemplate, isPreviewMode: false, activeTab: 'theme' })
}));
