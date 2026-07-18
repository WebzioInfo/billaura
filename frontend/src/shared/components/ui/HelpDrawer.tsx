import React, { useEffect, useState } from 'react';
import { useHelpStore } from '@/shared/stores/helpStore';
import { helpArticles, searchHelpArticles, getArticleByRoute } from '@/docs/registry';
import { X, Search, BookOpen, ExternalLink, HelpCircle } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

export function HelpDrawer() {
  const { isOpen, closeHelp, currentArticleId, searchQuery, setSearchQuery } = useHelpStore();
  const location = useLocation();
  const [activeArticle, setActiveArticle] = useState(
    currentArticleId ? helpArticles.find(a => a.id === currentArticleId) : null
  );

  // Auto-detect context if no specific article is set
  useEffect(() => {
    if (isOpen && !currentArticleId && !searchQuery) {
      const contextualArticle = getArticleByRoute(location.pathname);
      if (contextualArticle) {
        setActiveArticle(contextualArticle);
      }
    }
  }, [isOpen, location.pathname, currentArticleId, searchQuery]);

  // Update active article when explicitly set
  useEffect(() => {
    if (currentArticleId) {
      setActiveArticle(helpArticles.find(a => a.id === currentArticleId) || null);
    }
  }, [currentArticleId]);

  const searchResults = searchQuery ? searchHelpArticles(searchQuery) : [];

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]" 
        onClick={closeHelp}
      />
      <div className="fixed inset-y-0 right-0 w-[400px] bg-background border-l border-border shadow-2xl z-[101] flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <HelpCircle className="w-5 h-5 text-accent" />
            Help Center
          </div>
          <button 
            onClick={closeHelp}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search documentation..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setActiveArticle(null); // Clear active article to show search results
              }}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchQuery ? (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Search Results ({searchResults.length})
              </h3>
              {searchResults.length > 0 ? (
                searchResults.map(article => (
                  <div 
                    key={article.id} 
                    className="p-4 rounded-lg border border-border bg-surface hover:border-accent cursor-pointer transition-colors"
                    onClick={() => {
                      setActiveArticle(article);
                      setSearchQuery(''); // Clear search to show article
                    }}
                  >
                    <h4 className="font-bold text-sm text-foreground mb-1">{article.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No results found for "{searchQuery}"
                </div>
              )}
            </div>
          ) : activeArticle ? (
            <div className="space-y-6">
              <button 
                onClick={() => setActiveArticle(null)}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                &larr; Back to suggestions
              </button>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-1 bg-accent/10 text-accent rounded-full">
                    {activeArticle.category.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{activeArticle.title}</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                  {activeArticle.content}
                </div>
              </div>
              <div className="pt-6 border-t border-border mt-8 flex justify-center">
                <Link 
                  to="/help" 
                  onClick={closeHelp}
                  className="text-sm text-accent hover:underline flex items-center gap-1 font-medium"
                >
                  <BookOpen className="w-4 h-4" /> Open Full Documentation
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Suggested Topics
              </h3>
              {helpArticles.slice(0, 4).map(article => (
                <div 
                  key={article.id} 
                  className="p-4 rounded-lg border border-border bg-surface hover:border-accent cursor-pointer transition-colors"
                  onClick={() => setActiveArticle(article)}
                >
                  <h4 className="font-bold text-sm text-foreground mb-1 flex items-center justify-between">
                    {article.title}
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </h4>
                  <p className="text-xs text-muted-foreground">{article.excerpt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

