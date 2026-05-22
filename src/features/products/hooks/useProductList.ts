import { useEffect, useMemo } from 'react';
import { useProductStore } from '../store';
import { STOCK_LOW_THRESHOLD } from '../constants';
import type { Product } from '../types';

export function useProductList(): {
  products: Product[];
  filteredProducts: Product[];
  uniqueCategories: string[];
  uniqueWholesalerIds: string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const products = useProductStore((s) => s.products);
  const filters = useProductStore((s) => s.filters);
  const isLoading = useProductStore((s) => s.isLoading);
  const error = useProductStore((s) => s.error);
  const fetchProducts = useProductStore((s) => s.fetchProducts);

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !filters.search ||
        p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = filters.category === 'All' || p.category === filters.category;
      const matchesStatus = filters.status === 'All' || p.status === filters.status;
      const matchesWholesaler =
        filters.wholesalerId === 'All' || p.wholesalerId === filters.wholesalerId;
      const matchesVisibility =
        filters.visibility === 'All' || p.visibility === filters.visibility;
      const matchesLowStock =
        !filters.lowStock || (p.availableStock ?? p.stock) <= STOCK_LOW_THRESHOLD;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesWholesaler &&
        matchesVisibility &&
        matchesLowStock
      );
    });
  }, [products, filters]);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products],
  );

  const uniqueWholesalerIds = useMemo(
    () => Array.from(new Set(products.map((p) => p.wholesalerId))),
    [products],
  );

  return { products, filteredProducts, uniqueCategories, uniqueWholesalerIds, isLoading, error, refetch: fetchProducts };
}