import React from 'react';
import { HelpArticle } from './types';
import { Link } from 'react-router-dom';

export const helpArticles: HelpArticle[] = [
  {
    id: 'getting-started-quickstart',
    title: 'Quick Start Guide',
    category: 'GETTING_STARTED',
    persona: 'ALL',
    tags: ['start', 'login', 'setup', 'onboarding'],
    excerpt: 'The essential first steps to get your company up and running on Bill Aura.',
    routeMapping: ['/dashboard'],
    content: (
      <div className="space-y-4 text-sm">
        <h2 className="text-xl font-bold">Welcome to Bill Aura ERP</h2>
        <p>This guide covers the 4 essential steps to start billing immediately.</p>
        
        <div className="bg-muted/30 p-4 rounded-lg border border-border mt-4">
          <h3 className="font-bold text-accent mb-2">1. Company Profile</h3>
          <p>Navigate to <strong>Settings &gt; Company Profile</strong>. Ensure your GSTIN, PAN, and Billing Address are correct, as these will appear on all your invoices.</p>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border border-border mt-4">
          <h3 className="font-bold text-accent mb-2">2. Financial Year</h3>
          <p>Go to <strong>Accounting &gt; Financial Years</strong>. Make sure your current financial year is active. You cannot post transactions outside of an active financial year.</p>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border border-border mt-4">
          <h3 className="font-bold text-accent mb-2">3. Add Customers & Vendors</h3>
          <p>Before invoicing, add your trading partners in the <strong>CRM</strong> or <strong>Purchases</strong> modules.</p>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border border-border mt-4">
          <h3 className="font-bold text-accent mb-2">4. Your First Invoice</h3>
          <p>Navigate to <Link to="/invoices/new" className="text-blue-500 hover:underline">Sales &gt; Invoices &gt; New</Link> to generate your first tax invoice.</p>
        </div>
      </div>
    )
  },
  {
    id: 'accounting-double-entry',
    title: 'Double-Entry Accounting Basics',
    category: 'ACCOUNTING_GUIDE',
    persona: 'ACCOUNTANT',
    tags: ['accounting', 'debit', 'credit', 'journal', 'ledger'],
    excerpt: 'Understand how Bill Aura handles Debits and Credits automatically behind the scenes.',
    routeMapping: ['/accounting', '/journal-entries'],
    content: (
      <div className="space-y-4 text-sm">
        <h2 className="text-xl font-bold">Debits and Credits Explained</h2>
        <p>Bill Aura is a strict double-entry accounting system. Every transaction affects at least two ledgers, ensuring the accounting equation (Assets = Liabilities + Equity) always remains balanced.</p>
        
        <h3 className="font-bold text-accent mt-4">The Golden Rules</h3>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
          <li><strong>Assets:</strong> Debit increases, Credit decreases</li>
          <li><strong>Liabilities:</strong> Credit increases, Debit decreases</li>
          <li><strong>Income:</strong> Credit increases, Debit decreases</li>
          <li><strong>Expenses:</strong> Debit increases, Credit decreases</li>
        </ul>

        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg mt-6">
          <h4 className="font-bold text-blue-700 dark:text-blue-400">Example: Sales Invoice</h4>
          <p className="mt-2">When you create a Sales Invoice for ₹1,180 (including 18% GST):</p>
          <ul className="mt-2 space-y-1">
            <li className="text-green-600 dark:text-green-400">Debit: Accounts Receivable (Customer) ... ₹1,180</li>
            <li className="text-red-600 dark:text-red-400">Credit: Sales Revenue ... ₹1,000</li>
            <li className="text-red-600 dark:text-red-400">Credit: IGST Output Liability ... ₹180</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'manual-customers',
    title: 'Managing Customers',
    category: 'USER_MANUAL',
    persona: 'ALL',
    tags: ['customer', 'crm', 'client', 'receivables'],
    excerpt: 'How to create, edit, and manage customer profiles and credit limits.',
    routeMapping: ['/customers', '/customers/new', '/customers/:id'],
    content: (
      <div className="space-y-4 text-sm">
        <h2 className="text-xl font-bold">Customer Management</h2>
        <p>The Customer module tracks all individuals and companies you sell to. It acts as a unified CRM and Accounts Receivable sub-ledger.</p>
        
        <h3 className="font-bold text-accent mt-4">Important Fields</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 border-b border-border pb-2">
            <div className="font-semibold">GSTIN</div>
            <div className="col-span-2 text-muted-foreground">Required for B2B transactions. Determines Place of Supply for IGST vs CGST/SGST calculation.</div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b border-border pb-2">
            <div className="font-semibold">Credit Limit</div>
            <div className="col-span-2 text-muted-foreground">The maximum outstanding balance allowed before the system blocks new invoices. Set to 0 for unlimited.</div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b border-border pb-2">
            <div className="font-semibold">Opening Balance</div>
            <div className="col-span-2 text-muted-foreground">If migrating from another software, enter the pending amount here. It automatically posts an opening journal entry.</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'faq-trial-balance',
    title: 'Why is my Trial Balance not balanced?',
    category: 'FAQ',
    persona: 'ACCOUNTANT',
    tags: ['trial balance', 'error', 'mismatch', 'reporting'],
    excerpt: 'Troubleshooting steps if your Debit and Credit totals do not match in the Trial Balance.',
    routeMapping: ['/trial-balance'],
    content: (
      <div className="space-y-4 text-sm">
        <h2 className="text-xl font-bold">Troubleshooting Trial Balance Mismatches</h2>
        <p>By design, Bill Aura prevents unbalanced journal entries from being posted. If your Trial Balance shows a mismatch, it is usually due to one of the following reasons:</p>
        
        <ol className="list-decimal pl-5 space-y-3 mt-4 text-muted-foreground">
          <li>
            <strong className="text-foreground">Unbalanced Opening Balances:</strong> 
            If you migrated data and entered Opening Balances for Ledgers or Customers/Vendors, ensure the total Debits equal total Credits. The difference is usually parked in a "Suspense Account" or "Retained Earnings".
          </li>
          <li>
            <strong className="text-foreground">Date Filtering:</strong> 
            Ensure you are running the Trial Balance for a date range that includes all historical transactions, or that Opening Balances are being rolled forward correctly.
          </li>
          <li>
            <strong className="text-foreground">Draft Transactions:</strong> 
            Draft invoices or draft journals do not affect the general ledger. Ensure all relevant documents are posted.
          </li>
        </ol>
      </div>
    )
  },
  {
    id: 'shortcuts-guide',
    title: 'Keyboard Shortcuts Guide',
    category: 'SHORTCUTS',
    persona: 'ALL',
    tags: ['keyboard', 'shortcuts', 'navigation', 'speed'],
    excerpt: 'Master Bill Aura using keyboard shortcuts for lightning-fast navigation.',
    content: (
      <div className="space-y-4 text-sm">
        <h2 className="text-xl font-bold">Global Keyboard Shortcuts</h2>
        <p>Press these keys from anywhere in the application.</p>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center justify-between bg-muted/30 p-3 rounded border border-border">
            <span>Global Search / Command Palette</span>
            <kbd className="px-2 py-1 bg-background border border-border rounded text-xs font-mono">Ctrl + K</kbd>
          </div>
          <div className="flex items-center justify-between bg-muted/30 p-3 rounded border border-border">
            <span>Help Center</span>
            <kbd className="px-2 py-1 bg-background border border-border rounded text-xs font-mono">F1</kbd>
          </div>
          <div className="flex items-center justify-between bg-muted/30 p-3 rounded border border-border">
            <span>Save / Submit Form</span>
            <kbd className="px-2 py-1 bg-background border border-border rounded text-xs font-mono">Ctrl + S</kbd>
          </div>
          <div className="flex items-center justify-between bg-muted/30 p-3 rounded border border-border">
            <span>Close Modal / Drawer</span>
            <kbd className="px-2 py-1 bg-background border border-border rounded text-xs font-mono">Esc</kbd>
          </div>
          <div className="flex items-center justify-between bg-muted/30 p-3 rounded border border-border">
            <span>New Document / Transaction</span>
            <kbd className="px-2 py-1 bg-background border border-border rounded text-xs font-mono">Alt + N</kbd>
          </div>
        </div>
      </div>
    )
  }
];

export const searchHelpArticles = (query: string): HelpArticle[] => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();
  
  return helpArticles.filter(article => {
    if (article.title.toLowerCase().includes(lowerQuery)) return true;
    if (article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;
    if (article.excerpt.toLowerCase().includes(lowerQuery)) return true;
    return false;
  });
};

export const getArticleByRoute = (path: string): HelpArticle | undefined => {
  // Simple matching for now. In production, this would use a proper path-to-regexp matcher
  return helpArticles.find(article => 
    article.routeMapping?.some(route => {
      // Exact match
      if (route === path) return true;
      // Match base path (e.g., /customers matches /customers/new)
      if (path.startsWith(route) && route !== '/') return true;
      return false;
    })
  );
};
