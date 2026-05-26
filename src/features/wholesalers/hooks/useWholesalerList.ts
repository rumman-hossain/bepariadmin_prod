import { useEffect, useMemo, useCallback } from 'react';
import { useWholesalerStore } from '../store';

function wholesalerMatchesCategory(category: string, filter: string): boolean {
  if (filter === 'All') return true;
  return category
    .split(',')
    .map((c) => c.trim())
    .includes(filter);
}

export function useWholesalerList() {
  const wholesalers = useWholesalerStore((s) => s.wholesalers);
  const filters = useWholesalerStore((s) => s.filters);
  const isLoading = useWholesalerStore((s) => s.isLoading);
  const error = useWholesalerStore((s) => s.error);
  const fetchWholesalers = useWholesalerStore((s) => s.fetchWholesalers);

  useEffect(() => {
    fetchWholesalers();
  }, [fetchWholesalers]);

  const refetch = useCallback(
    () => fetchWholesalers({ bustCache: true }),
    [fetchWholesalers],
  );

  const filteredWholesalers = useMemo(() => {
    return wholesalers.filter((w) => {
      const matchesSearch =
        !filters.search ||
        (w.companyName || '').toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = wholesalerMatchesCategory(w.category || '', filters.category);
      const matchesLocation =
        filters.location === 'All' || w.location === filters.location;

      let matchesRecentlyAdded = true;
      if (filters.recentlyAdded && w.createdAt) {
        const createdDate = new Date(w.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        matchesRecentlyAdded = createdDate >= thirtyDaysAgo;
      }

      return matchesSearch && matchesCategory && matchesLocation && matchesRecentlyAdded;
    });
  }, [wholesalers, filters]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const w of wholesalers) {
      for (const c of (w.category || '').split(',').map((x) => x.trim()).filter(Boolean)) {
        cats.add(c);
      }
    }
    return Array.from(cats);
  }, [wholesalers]);

  const uniqueLocations = useMemo(
    () => Array.from(new Set(wholesalers.map((w) => w.location || 'Dhaka'))),
    [wholesalers],
  );

  return {
    filteredWholesalers,
    uniqueCategories,
    uniqueLocations,
    isLoading,
    error,
    refetch,
  };
}
