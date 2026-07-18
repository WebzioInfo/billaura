import React, { useState, useEffect } from 'react';
import { Search, FileText, User, Box, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer } from '@/shared/components/ui/LayoutComponents';
import { Input } from '@/shared/components/ui/Input';
import { Card } from '@/shared/components/ui/Card';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

export const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  // Simulated search results for demo purposes
  const getSimulatedResults = (query: string) => {
    if (!query) return [];
    const q = query.toLowerCase();
    const results = [];
    
    if ('invoice'.includes(q) || 'inv-'.includes(q)) {
      results.push({ id: 1, type: 'Invoice', title: 'INV-2023-001', subtitle: 'Acme Corp - ₹50,000', icon: FileText, path: '/invoices/1' });
    }
    if ('customer'.includes(q) || 'acme'.includes(q)) {
      results.push({ id: 2, type: 'Customer', title: 'Acme Corporation', subtitle: 'GST: 22AAAAA0000A1Z5', icon: User, path: '/customers/1' });
    }
    if ('product'.includes(q) || 'laptop'.includes(q)) {
      results.push({ id: 3, type: 'Product', title: 'Dell XPS 15', subtitle: 'Stock: 45 units', icon: Box, path: '/products' });
    }
    return results;
  };

  const results = getSimulatedResults(debouncedSearch);

  useEffect(() => {
    if (searchTerm !== debouncedSearch) setIsSearching(true);
    else setIsSearching(false);
  }, [searchTerm, debouncedSearch]);

  return (
    <PageContainer maxWidth="4xl">
      <PageHeader 
        title="Global Search" 
        description="Search across all modules, documents, and records instantly."
      />

      <div className="mt-8">
        <div className="relative">
          <Search className={`w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 ${isSearching ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          <Input 
            autoFocus
            placeholder="Search for invoices, customers, products, settings..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 py-6 text-lg bg-surface shadow-sm rounded-2xl border-border"
          />
        </div>

        <div className="mt-8">
          {searchTerm && results.length === 0 && !isSearching && (
            <div className="text-center py-12 text-muted-foreground">
              No results found for "{searchTerm}"
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Results</h4>
              {results.map((result) => (
                <Card 
                  key={result.id} 
                  className="p-4 flex items-center justify-between hover:border-primary/50 cursor-pointer transition-colors group bg-surface border-border shadow-sm"
                  onClick={() => navigate(result.path)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <result.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{result.title}</h4>
                      <p className="text-sm text-muted-foreground">{result.type} • {result.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                </Card>
              ))}
            </div>
          )}

          {!searchTerm && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {['Invoices', 'Customers', 'Products', 'Reports'].map(suggestion => (
                <button 
                  key={suggestion}
                  onClick={() => setSearchTerm(suggestion.toLowerCase())}
                  className="p-4 rounded-xl border border-border bg-surface text-center hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
