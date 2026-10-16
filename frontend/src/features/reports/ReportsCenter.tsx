import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Star, Folder, Home, X } from 'lucide-react';
import { REPORT_CATALOG, REPORT_CATEGORIES } from './reportRegistry';

const FAVORITES_STORAGE_KEY = 'billaura_reports_favorites';
const LAST_VISITED_STORAGE_KEY = 'billaura_reports_last_visited';

export const ReportsCenter: React.FC = () => {
  const navigate = useNavigate();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Selected folder: 'home' | 'favorites' | category string
  const [selectedFolder, setSelectedFolder] = useState<string>('home');

  // Favorites state (Set of report keys)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set(['profit-and-loss', 'balance-sheet', 'general-ledger']);
    } catch {
      return new Set(['profit-and-loss', 'balance-sheet', 'general-ledger']);
    }
  });

  // Last visited state (Map of report key -> ISO timestamp string)
  const [lastVisitedMap, setLastVisitedMap] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(LAST_VISITED_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
    } catch (e) {
      console.error('Failed to save favorites to localStorage', e);
    }
  }, [favorites]);

  const toggleFavorite = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    e.preventDefault();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleOpenReport = (key: string) => {
    // Record last visited timestamp
    const nowStr = new Date().toISOString();
    const updatedMap = { ...lastVisitedMap, [key]: nowStr };
    setLastVisitedMap(updatedMap);
    try {
      localStorage.setItem(LAST_VISITED_STORAGE_KEY, JSON.stringify(updatedMap));
    } catch (e) {
      console.error('Failed to save last visited to localStorage', e);
    }

    navigate(`/reports/${key}`);
  };

  const formatLastVisited = (isoString?: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hourStr = String(hours).padStart(2, '0');

    return `${day}/${month}/${year} ${hourStr}:${minutes} ${ampm}`;
  };

  // Filter reports
  const filteredReports = useMemo(() => {
    return REPORT_CATALOG.filter((report) => {
      // Folder category filter
      if (selectedFolder === 'favorites') {
        if (!favorites.has(report.key)) return false;
      } else if (selectedFolder !== 'home') {
        if (report.category !== selectedFolder) return false;
      }

      // Search keyword filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = report.title.toLowerCase().includes(q);
        const matchCat = report.category.toLowerCase().includes(q);
        const matchDesc = report.description.toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchDesc) return false;
      }

      return true;
    });
  }, [selectedFolder, searchTerm, favorites]);

  const currentFolderHeading = useMemo(() => {
    if (selectedFolder === 'favorites') return 'Favorite Reports';
    if (selectedFolder === 'home') return 'All Reports';
    return `${selectedFolder} Reports`;
  }, [selectedFolder]);

  return (
    <div className="flex flex-col h-screen w-full bg-white text-[#333333] font-sans antialiased overflow-hidden select-text">
      {/* 1. Top Header Row */}
      <header className="shrink-0 flex items-center justify-between px-6 h-14 border-b border-[#e5e7eb] bg-white sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-[20px] font-semibold text-[#333333] tracking-tight">
            Reports Center
          </h1>
        </div>

        {/* Centered Search Box */}
        <div className="relative w-80 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#6c7380] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reports"
            className="w-full h-8 pl-8 pr-7 text-[12px] text-[#333333] bg-[#f9f9fb] border border-[#d9dce3] rounded placeholder:text-[#999999] focus:outline-none focus:border-[#408dfb] focus:bg-white transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#333333]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="w-20" />
      </header>

      {/* 2. Main Two-Column Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Category Nav Panel */}
        <aside className="w-[240px] shrink-0 border-r border-[#e5e7eb] bg-white overflow-y-auto p-3 space-y-1 select-none">
          {/* Home */}
          <button
            type="button"
            onClick={() => setSelectedFolder('home')}
            className={`w-full flex items-center gap-2.5 px-3 h-8 rounded text-[13px] font-medium transition-colors text-left ${
              selectedFolder === 'home'
                ? 'bg-[#eef4ff] text-[#408dfb] font-semibold'
                : 'text-[#333333] hover:bg-[#f9f9fb]'
            }`}
          >
            <Home className="w-4 h-4 shrink-0 text-[#6c7380]" />
            <span>Home</span>
          </button>

          {/* Favorites */}
          <button
            type="button"
            onClick={() => setSelectedFolder('favorites')}
            className={`w-full flex items-center justify-between px-3 h-8 rounded text-[13px] font-medium transition-colors text-left ${
              selectedFolder === 'favorites'
                ? 'bg-[#eef4ff] text-[#408dfb] font-semibold'
                : 'text-[#333333] hover:bg-[#f9f9fb]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 shrink-0 text-[#f59e0b] fill-[#f59e0b]" />
              <span>Favorites</span>
            </div>
            {favorites.size > 0 && (
              <span className="text-[11px] text-[#6c7380] font-normal">{favorites.size}</span>
            )}
          </button>

          <div className="pt-4 pb-1 px-3">
            <span className="text-[11px] font-semibold text-[#6c7380] uppercase tracking-wider">
              Report Category
            </span>
          </div>

          {/* Categories List */}
          {REPORT_CATEGORIES.map((category) => {
            const count = REPORT_CATALOG.filter((r) => r.category === category).length;
            if (count === 0) return null;

            const isSelected = selectedFolder === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedFolder(category)}
                className={`w-full flex items-center justify-between px-3 h-8 rounded text-[13px] font-medium transition-colors text-left ${
                  isSelected
                    ? 'bg-[#eef4ff] text-[#408dfb] font-semibold'
                    : 'text-[#333333] hover:bg-[#f9f9fb]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Folder
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-[#408dfb]' : 'text-[#6c7380]'
                    }`}
                  />
                  <span className="truncate">{category}</span>
                </div>
                <span className="text-[11px] text-[#999999] font-normal ml-1 shrink-0">
                  {count}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Right Reports Table Panel */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
          {/* Table Header Row with Title and Count */}
          <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-[#e5e7eb] bg-white">
            <h2 className="text-[15px] font-semibold text-[#333333]">
              {currentFolderHeading}
            </h2>
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-medium text-[#6c7380] bg-[#f1f3f7] rounded-full">
              {filteredReports.length}
            </span>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="sticky top-0 z-10 bg-[#f9f9fb] border-b border-[#e5e7eb]">
                <tr className="h-10 text-[11px] uppercase tracking-wider font-semibold text-[#6c7380]">
                  <th className="pl-6 pr-3 py-2 w-[340px]">Report Name</th>
                  <th className="px-3 py-2 w-[220px]">Report Category</th>
                  <th className="px-3 py-2 w-[180px]">Created By</th>
                  <th className="pr-6 pl-3 py-2 w-[200px]">Last Visited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0f4]">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16 text-[#6c7380] text-[13px]">
                      No reports found.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const isFav = favorites.has(report.key);
                    const lastVisited = lastVisitedMap[report.key];

                    return (
                      <tr
                        key={report.key}
                        onClick={() => handleOpenReport(report.key)}
                        className="h-[38px] hover:bg-[#f7f9ff] transition-colors cursor-pointer group"
                      >
                        {/* Report Name with Favorite Star */}
                        <td className="pl-6 pr-3 py-1.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(e, report.key)}
                              className="p-0.5 text-[#999999] hover:text-[#f59e0b] transition-colors"
                              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  isFav
                                    ? 'text-[#f59e0b] fill-[#f59e0b]'
                                    : 'text-[#b0b5c0] hover:text-[#f59e0b]'
                                }`}
                              />
                            </button>
                            <span className="text-[#408dfb] font-medium group-hover:underline">
                              {report.title}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-3 py-1.5 whitespace-nowrap text-[#6c7380]">
                          {report.category}
                        </td>

                        {/* Created By */}
                        <td className="px-3 py-1.5 whitespace-nowrap text-[#6c7380]">
                          System Generated
                        </td>

                        {/* Last Visited */}
                        <td className="pr-6 pl-3 py-1.5 whitespace-nowrap text-[#6c7380] text-[12px]">
                          {formatLastVisited(lastVisited)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsCenter;
