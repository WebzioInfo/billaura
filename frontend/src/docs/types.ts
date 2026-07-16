import React from 'react';

export type HelpCategory = 
  | 'GETTING_STARTED' 
  | 'ACCOUNTING_GUIDE' 
  | 'USER_MANUAL' 
  | 'WORKFLOWS' 
  | 'TUTORIALS' 
  | 'FAQ' 
  | 'ERROR_GUIDE' 
  | 'SHORTCUTS' 
  | 'SUPPORT';

export type HelpPersona = 'ADMIN' | 'ACCOUNTANT' | 'OWNER' | 'ALL';

export interface HelpArticle {
  id: string;
  title: string;
  category: HelpCategory;
  persona: HelpPersona;
  tags: string[];
  excerpt: string;
  content: React.ReactNode; 
  relatedArticles?: string[];
  routeMapping?: string[]; // E.g., ['/customers', '/customers/new']
}

export interface DocumentationSection {
  title: string;
  content: React.ReactNode;
}
