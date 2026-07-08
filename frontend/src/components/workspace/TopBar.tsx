import React, { useEffect, useState, useRef } from 'react';
import { 
  Search, Plus, Bell, User, Building2, History, Star, ArrowRight, CornerDownLeft, X,
  LayoutDashboard, Users, Target, MessageSquare, FileSpreadsheet, 
  Truck, FileText, DollarSign, CreditCard, RefreshCw, Receipt, 
  BarChart3, Coins, Wrench, TrendingUp, Tag, Box, 
  Binary, Layers, BookOpen, Landmark, Percent, Calendar, 
  DoorOpen, Folder, Database, PlusCircle
} from 'lucide-react';
import apiClient from '@/services/api';
import { useSessionStore } from '@/features/auth/stores/sessionStore';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { searchAll, SearchItem } from './SearchRegistry';

// Lucide Icon Mapping for central registry components
const IconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  User,
  Users,
  Target,
  MessageSquare,
  FileSpreadsheet,
  Truck,
  FileText,
  DollarSign,
  CreditCard,
  RefreshCw,
  Receipt,
  BarChart3,
  Coins,
  Wrench,
  Building2,
  TrendingUp,
  Tag,
  Box,
  Binary,
  Layers,
  BookOpen,
  Landmark,
  Percent,
  Calendar,
  DoorOpen,
  Folder,
  Database,
  PlusCircle
};

// Custom component to highlight matching characters (fuzzy or contiguous)
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Contiguous match (prefer contiguous highlights)
  const index = lowerText.indexOf(lowerQuery);
  if (index !== -1) {
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    return (
      <span className="text-foreground">
        {before}
        <span className="bg-accent/25 text-accent font-black rounded-xs px-[2px]">{match}</span>
        {after}
      </span>
    );
  }
  
  // Fuzzy character match
  const elements: React.ReactNode[] = [];
  let qIdx = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (qIdx < query.length && char.toLowerCase() === lowerQuery[qIdx]) {
      elements.push(
        <span key={i} className="bg-accent/25 text-accent font-black rounded-xs px-[2px]">
          {char}
        </span>
      );
      qIdx++;
    } else {
      elements.push(char);
    }
  }
  return <span className="text-foreground">{elements}</span>;
}

export function TopBar() {
  const { user } = useSessionStore();
  const navigate = useNavigate();
  const { openTab } = useWorkspaceStore();
  
  const [companyName, setCompanyName] = useState(user?.companyName || 'My Company');
  const [logoBase64, setLogoBase64] = useState<string | null>((user as any)?.logoBase64 || null);

  // Search States
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // localStorage persistence keys
  const RECENT_KEY = 'billaura-recent-searches';
  const FREQ_KEY = 'billaura-freq-searches';

  // Master Data Hooks
  useEffect(() => {
    if ((user as any)?.companyName) setCompanyName((user as any).companyName);
    if ((user as any)?.logoBase64) setLogoBase64((user as any).logoBase64);

    const fetchCompany = async () => {
      try {
        const res = await apiClient.get<any>('/auth/me');
        if (res?.company?.companyName) {
          setCompanyName(res.company.companyName);
        }
        if (res?.company?.settings?.logoBase64) {
          setLogoBase64(res.company.settings.logoBase64);
        }
      } catch {
        // ignore
      }
    };
    fetchCompany();
  }, [user]);

  // Load history/frequently used state from browser storage
  const getRecentSearches = (): SearchItem[] => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const getFreqSearches = (): Record<string, { count: number; item: SearchItem }> => {
    try {
      const stored = localStorage.getItem(FREQ_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // Perform instant/debounced search when query changes
  useEffect(() => {
    const handleSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        setSelectedIndex(0);
        return;
      }

      // Search all static and dynamic search registry providers
      const list = await searchAll(query);
      
      // Inject frequently used frequency into sorting rank as a secondary sorting criteria
      const freq = getFreqSearches();
      const ranked = list.map(item => {
        const freqData = freq[item.id];
        return {
          ...item,
          score: (item.score || 0) + (freqData ? freqData.count * 2 : 0)
        };
      }).sort((a, b) => (b.score || 0) - (a.score || 0));

      setResults(ranked);
      setSelectedIndex(0);
    };

    const timer = setTimeout(handleSearch, 80);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside drawer close listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle page/shortcut click selection
  const handleSelect = (item: SearchItem) => {
    // 1. Save to recent history (max 10, avoiding duplicate index)
    const recents = getRecentSearches();
    const updatedRecents = [item, ...recents.filter(r => r.id !== item.id)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updatedRecents));

    // 2. Increment frequently used counter
    const freq = getFreqSearches();
    if (!freq[item.id]) {
      freq[item.id] = { count: 1, item };
    } else {
      freq[item.id].count += 1;
    }
    localStorage.setItem(FREQ_KEY, JSON.stringify(freq));

    // 3. Clear states
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();

    // 4. Navigate tab & path
    openTab({
      id: item.id,
      title: item.title,
      path: item.path
    });
    navigate(item.path);
  };

  // Keyboard navigation controller
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Get total items in active list
    const showHistory = !query.trim();
    const recentList = getRecentSearches();
    const freqObj = getFreqSearches();
    const freqList = Object.values(freqObj)
      .sort((a, b) => b.count - a.count)
      .map(f => f.item)
      .slice(0, 5);

    const activeList = showHistory 
      ? [...recentList, ...freqList]
      : results;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, activeList.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + activeList.length) % Math.max(1, activeList.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentSelection = activeList[selectedIndex];
      if (currentSelection) {
        handleSelect(currentSelection);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSelectedIndex(Math.max(0, activeList.length - 1));
    }
  };

  // Pre-calculated lists for initial focus (empty query)
  const recentSearches = getRecentSearches();
  const freqObj = getFreqSearches();
  const freqSearches = Object.values(freqObj)
    .sort((a, b) => b.count - a.count)
    .map(f => f.item)
    .slice(0, 5);

  const showHistory = !query.trim();

  // Grouped search results helper
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    results.forEach(r => {
      if (!groups[r.category]) {
        groups[r.category] = [];
      }
      groups[r.category].push(r);
    });
    return groups;
  }, [results]);

  // Helper index mapping for arrow keys on grouped results
  let linearIndex = 0;

  return (
    <div className="h-10 bg-primary text-primary-foreground flex items-center justify-between px-3 border-b border-primary/20 shrink-0">
      {/* Left: Branding & Company info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 select-none cursor-pointer" onClick={() => navigate('/dashboard')}>
          {logoBase64 ? (
            <img src={logoBase64} alt="Company Logo" className="h-6 w-auto max-w-[100px] object-contain rounded-sm" />
          ) : (
            <>
              <img src="/logo.png" alt="BillAura" className="h-6 w-auto object-contain dark:hidden" />
              <img src="/logo2.png" alt="BillAura" className="h-6 w-auto object-contain hidden dark:block" />
            </>
          )}
          {!logoBase64 && <span className="font-bold tracking-tight text-sm">BillAura</span>}
        </div>

        <div className="w-[1px] h-5 bg-primary-foreground/20"></div>

        <div className="flex items-center gap-1.5 text-xs">
          <Building2 className="w-3.5 h-3.5 text-primary-foreground/70" />
          <span className="font-medium truncate max-w-[120px]">{companyName.split(' ')[0]}</span>
          <span className="text-primary-foreground/50 text-[10px] px-1.5 py-0 bg-primary-foreground/10 rounded">FY 2026-27</span>
        </div>
      </div>

      {/* Middle: Global Search Palette */}
      <div className="flex-1 max-w-xl mx-2 relative" ref={containerRef}>
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            id="global-search-input"
            ref={inputRef}
            type="text"
            placeholder="Search transactions, customers, or press Ctrl+K..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className="w-full h-7 bg-surface text-foreground pl-8 pr-14 rounded-sm text-xs border-none outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted-foreground/70"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <kbd className="hidden sm:inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground uppercase border border-border">Ctrl K</kbd>
          </div>
        </div>

        {/* Dropdown search results palette panel - Changed from bg-card to bg-surface to ensure opacity */}
        {isOpen && (
          <div className="absolute top-[calc(100%+6px)] left-0 w-[480px] bg-surface text-foreground border border-border shadow-2xl rounded-lg z-50 flex flex-col max-h-[500px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Scrollable list content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              
              {/* Category 1: Empty Query - History & Frequent */}
              {showHistory && (
                <>
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" /> Recent Searches
                      </div>
                      <div className="space-y-0.5">
                        {recentSearches.map((item, idx) => {
                          const currentIdx = linearIndex++;
                          const isActive = selectedIndex === currentIdx;
                          const ItemIcon = IconMap[item.icon] || Search;
                          return (
                            <div
                              key={`recent-${item.id}-${idx}`}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(currentIdx)}
                              className={`flex items-center justify-between px-3 py-2 text-xs rounded-md cursor-pointer transition-all ${
                                isActive 
                                  ? 'bg-accent/15 text-accent border-l-2 border-accent pl-2.5 font-semibold' 
                                  : 'text-foreground hover:bg-muted/65'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <ItemIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div>
                                  <div className="font-semibold">{item.title}</div>
                                  <div className="text-[10px] text-muted-foreground/75 mt-0.5">{item.breadcrumb}</div>
                                </div>
                              </div>
                              {isActive && <CornerDownLeft className="w-3 h-3 text-accent opacity-80" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Frequently Used */}
                  {freqSearches.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500" /> Frequently Opened Pages
                      </div>
                      <div className="space-y-0.5">
                        {freqSearches.map((item, idx) => {
                          const currentIdx = linearIndex++;
                          const isActive = selectedIndex === currentIdx;
                          const ItemIcon = IconMap[item.icon] || Search;
                          return (
                            <div
                              key={`freq-${item.id}-${idx}`}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(currentIdx)}
                              className={`flex items-center justify-between px-3 py-2 text-xs rounded-md cursor-pointer transition-all ${
                                isActive 
                                  ? 'bg-accent/15 text-accent border-l-2 border-accent pl-2.5 font-semibold' 
                                  : 'text-foreground hover:bg-muted/65'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <ItemIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div>
                                  <div className="font-semibold">{item.title}</div>
                                  <div className="text-[10px] text-muted-foreground/75 mt-0.5">{item.breadcrumb}</div>
                                </div>
                              </div>
                              {isActive && <CornerDownLeft className="w-3 h-3 text-accent opacity-80" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Default suggestion hints if history is empty */}
                  {recentSearches.length === 0 && freqSearches.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                      <div className="w-10 h-10 rounded-full bg-primary/5 mx-auto flex items-center justify-center text-primary">
                        <Search className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-foreground">ERP Command Palette</div>
                      <p className="max-w-xs mx-auto text-[11px] leading-relaxed">Search screens, ledgers, reports, sequences or settings instantly by typing above.</p>
                    </div>
                  )}
                </>
              )}

              {/* Category 2: Grouped Matches */}
              {!showHistory && results.length > 0 && (
                <div className="space-y-3">
                  {Object.entries(groupedResults).map(([category, items]) => (
                    <div key={category} className="space-y-1">
                      <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-0.5">
                        {category}
                      </div>
                      <div className="space-y-0.5">
                        {items.map((item, idx) => {
                          const currentIdx = linearIndex++;
                          const isActive = selectedIndex === currentIdx;
                          const ItemIcon = IconMap[item.icon] || Search;
                          return (
                            <div
                              key={`result-${item.id}-${idx}`}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(currentIdx)}
                              className={`flex items-center justify-between px-3 py-2 text-xs rounded-md cursor-pointer transition-all ${
                                isActive 
                                  ? 'bg-accent/15 text-accent border-l-2 border-accent pl-2.5 font-semibold' 
                                  : 'text-foreground hover:bg-muted/65'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <ItemIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div>
                                  <div className="font-semibold text-foreground">
                                    <HighlightedText text={item.title} query={query} />
                                  </div>
                                  <div className="text-[10px] text-muted-foreground/75 mt-0.5">{item.breadcrumb}</div>
                                </div>
                              </div>
                              {isActive && <CornerDownLeft className="w-3 h-3 text-accent opacity-80" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Category 3: Empty State */}
              {!showHistory && results.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground space-y-3">
                  <div className="font-bold text-foreground">No matching pages found</div>
                  <p className="max-w-xs mx-auto text-[11px] leading-relaxed">Try typing a keyword to load different forms, pages, or accounts.</p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                    <span className="text-[10px] font-semibold">Try:</span>
                    {['Invoice', 'Customer', 'Bills', 'Products', 'Reports'].map(term => (
                      <button
                        key={term}
                        onClick={() => { setQuery(term); inputRef.current?.focus(); }}
                        className="px-2 py-0.5 bg-muted hover:bg-muted-hover border border-border/80 text-[10px] font-bold rounded-sm text-foreground cursor-pointer transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dropdown Sticky Footer instructions */}
            <div className="px-4 py-2 border-t border-border/60 bg-muted/20 text-[10px] text-muted-foreground/80 flex justify-between items-center select-none">
              <div className="flex gap-3">
                <span><kbd className="bg-muted border border-border px-1 py-0.5 rounded mr-1">↑↓</kbd> Navigate</span>
                <span><kbd className="bg-muted border border-border px-1 py-0.5 rounded mr-1">Enter</kbd> Open</span>
              </div>
              <div className="flex gap-2">
                <span><kbd className="bg-muted border border-border px-1 py-0.5 rounded mr-1">Esc</kbd> Close</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1 h-7 px-2.5 bg-accent hover:bg-accent/90 text-white text-xs font-semibold rounded-sm transition-colors">
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>

        <div className="w-[1px] h-5 bg-primary-foreground/20 mx-1"></div>

        <button className="relative p-1 text-primary-foreground/70 hover:text-white transition-colors rounded-sm hover:bg-primary-foreground/10">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-0.5 right-0.5 w-1 h-1 bg-red-500 rounded-full"></span>
        </button>

        <button
          className="flex items-center gap-1.5 p-0.5 pl-1.5 pr-0.5 ml-0.5 rounded-sm hover:bg-primary-foreground/10 transition-colors"
          onClick={() => navigate('/profile')}
        >
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium leading-none mb-0.5">{user?.name || 'Admin'}</span>
            <span className="text-[9px] text-primary-foreground/70 leading-none">Administrator</span>
          </div>
          <div className="w-6 h-6 bg-primary-foreground/10 rounded-sm flex items-center justify-center text-primary-foreground">
            <User className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    </div>
  );
}
