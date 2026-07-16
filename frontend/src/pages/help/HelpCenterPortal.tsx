import React, { useState } from 'react';
import { helpArticles, searchHelpArticles } from '@/docs/registry';
import { HelpCategory } from '@/docs/types';
import { Search, Book, HelpCircle, AlertTriangle, Lightbulb, Keyboard, BookOpen, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS: Record<HelpCategory, React.ReactNode> = {
  GETTING_STARTED: <Lightbulb className="w-5 h-5" />,
  ACCOUNTING_GUIDE: <Book className="w-5 h-5" />,
  USER_MANUAL: <BookOpen className="w-5 h-5" />,
  WORKFLOWS: <Layers className="w-5 h-5" />,
  TUTORIALS: <HelpCircle className="w-5 h-5" />,
  FAQ: <HelpCircle className="w-5 h-5" />,
  ERROR_GUIDE: <AlertTriangle className="w-5 h-5" />,
  SHORTCUTS: <Keyboard className="w-5 h-5" />,
  SUPPORT: <HelpCircle className="w-5 h-5" />
};

const CATEGORY_LABELS: Record<HelpCategory, string> = {
  GETTING_STARTED: 'Getting Started',
  ACCOUNTING_GUIDE: 'Accounting Guide',
  USER_MANUAL: 'User Manual',
  WORKFLOWS: 'Workflows',
  TUTORIALS: 'Tutorials',
  FAQ: 'FAQs',
  ERROR_GUIDE: 'Error Guide',
  SHORTCUTS: 'Shortcuts',
  SUPPORT: 'Support'
};

export default function HelpCenterPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<HelpCategory | 'ALL'>('ALL');
  const navigate = useNavigate();

  const searchResults = searchQuery ? searchHelpArticles(searchQuery) : [];
  
  const filteredArticles = helpArticles.filter(article => 
    activeCategory === 'ALL' || article.category === activeCategory
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col h-full flex-none">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent" />
            Knowledge Base
          </h2>
        </div>
        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeCategory === 'ALL' ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            All Topics
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key as HelpCategory)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeCategory === key ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {CATEGORY_ICONS[key as HelpCategory]}
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero / Search */}
          <div className="text-center space-y-6 py-12">
            <h1 className="text-4xl font-bold text-foreground">How can we help you today?</h1>
            <p className="text-muted-foreground">Search through our documentation, FAQs, and accounting guides.</p>
            
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search for 'Invoices', 'Trial Balance', or 'Errors'..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-full pl-12 pr-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
              />
            </div>
          </div>

          {/* Results Area */}
          {searchQuery ? (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Search Results for "{searchQuery}" ({searchResults.length})</h3>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map(article => (
                    <div key={article.id} className="p-6 bg-surface border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold uppercase px-2 py-1 bg-accent/10 text-accent rounded-full">
                          {CATEGORY_LABELS[article.category]}
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-foreground mb-2">{article.title}</h4>
                      <p className="text-muted-foreground mb-4">{article.excerpt}</p>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground border-t border-border pt-4 mt-4">
                        {article.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No matching documentation found. Try a different keyword.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold border-b border-border pb-2">
                {activeCategory === 'ALL' ? 'Featured Guides' : CATEGORY_LABELS[activeCategory]}
              </h3>
              
              <div className="grid grid-cols-1 gap-8">
                {filteredArticles.map(article => (
                  <div key={article.id} className="p-8 bg-surface border border-border rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      {CATEGORY_ICONS[article.category]}
                      <span className="text-xs font-bold uppercase px-2 py-1 bg-accent/10 text-accent rounded-full">
                        {CATEGORY_LABELS[article.category]}
                      </span>
                    </div>
                    <h4 className="text-2xl font-bold text-foreground mb-3">{article.title}</h4>
                    <p className="text-muted-foreground mb-6 text-lg">{article.excerpt}</p>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      {article.content}
                    </div>
                  </div>
                ))}
                
                {filteredArticles.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No articles found in this category yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
