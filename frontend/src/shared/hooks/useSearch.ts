import { useState, useMemo } from 'react';

export function useSearch<T>(items: T[], searchFn: (item: T, query: string) => boolean) {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!query) return items;
    return items.filter((item) => searchFn(item, query));
  }, [items, query, searchFn]);

  return { query, setQuery, filteredItems };
}
