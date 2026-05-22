import { useMemo } from 'react';
import { useWholesalerStore } from '../store';
import type { Wholesaler } from '@/src/types/domain';

export function useWholesalerList(): {
  filteredWholesalers: Wholesaler[];
  uniqueCategories: string[];
  uniqueLocations: string[];
} {
  const wholesalers = useWholesalerStore((s) => s.wholesalers);
  const filters = useWholesalerStore((s) => s.filters);

  const filteredWholesalers = useMemo(() => {
    return wholesalers.filter((w) => {
      const matchesSearch =
        !filters.search ||
        (w.companyName || '').toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory =
        filters.category === 'All' || w.category === filters.category;
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

  const uniqueCategories = useMemo(
    () => Array.from(new Set(wholesalers.map((w) => w.category))),
    [wholesalers],
  );

  const uniqueLocations = useMemo(
    () => Array.from(new Set(wholesalers.map((w) => w.location || 'Dhaka'))),
    [wholesalers],
  );

  return { filteredWholesalers, uniqueCategories, uniqueLocations };
}