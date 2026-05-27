import { useEffect, useMemo, useState } from 'react';
import { useProductStore } from '../store';
import { getCategories } from '@/src/api/products';
import { listWholesalers } from '@/src/features/wholesalers/api/wholesalerApi';
import { STOCK_LOW_THRESHOLD } from '../constants';
import type { Product, ProductFilters, ProductPagination } from '../types';

export interface FilterOption {
  label: string;
  value: string;
}

export function useProductList(): {
  products: Product[];
  filteredProducts: Product[];
  filters: ProductFilters;
  pagination: ProductPagination;
  categoryOptions: FilterOption[];
  wholesalerOptions: FilterOption[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setFilter: (key: keyof ProductFilters, value: string | boolean) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  removeProduct: (id: string) => Promise<void>;
  showsApiDefaultFilters: boolean;
} {
  const products = useProductStore((s) => s.products);
  const filters = useProductStore((s) => s.filters);
  const pagination = useProductStore((s) => s.pagination);
  const isLoading = useProductStore((s) => s.isLoading);
  const error = useProductStore((s) => s.error);
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  const setFilter = useProductStore((s) => s.setFilter);
  const clearFilters = useProductStore((s) => s.clearFilters);
  const setPage = useProductStore((s) => s.setPage);
  const setCategoryNameMap = useProductStore((s) => s.setCategoryNameMap);
  const removeProduct = useProductStore((s) => s.removeProduct);

  const [categoryOptions, setCategoryOptions] = useState<FilterOption[]>([
    { label: 'All Categories', value: 'All' },
  ]);
  const [wholesalerOptions, setWholesalerOptions] = useState<FilterOption[]>([
    { label: 'All Wholesalers', value: 'All' },
  ]);

  useEffect(() => {
    void getCategories()
      .then((res) => {
        if (!res.ok || !Array.isArray(res.data)) return;
        const map: Record<string, string> = {};
        const options: FilterOption[] = [{ label: 'All Categories', value: 'All' }];
        for (const cat of res.data) {
          map[cat.id] = cat.name;
          options.push({ label: cat.name, value: cat.id });
        }
        setCategoryNameMap(map);
        setCategoryOptions(options);
      });
  }, [setCategoryNameMap]);

  useEffect(() => {
    void listWholesalers({ search: '', category: 'All', location: 'All', recentlyAdded: false }).then(
      (items) => {
        setWholesalerOptions([
          { label: 'All Wholesalers', value: 'All' },
          ...items.map((w) => ({ label: w.companyName || w.id, value: w.id })),
        ]);
      },
    );
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [
    filters.search,
    filters.category,
    filters.status,
    filters.visibility,
    pagination.page,
    pagination.limit,
    fetchProducts,
  ]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (filters.wholesalerId !== 'All') {
      result = result.filter((p) => p.wholesalerId === filters.wholesalerId);
    }
    if (filters.lowStock) {
      result = result.filter((p) => (p.availableStock ?? p.stock) <= STOCK_LOW_THRESHOLD);
    }
    return result;
  }, [products, filters.wholesalerId, filters.lowStock]);

  const showsApiDefaultFilters = filters.status === 'All' && filters.visibility === 'All';

  return {
    products,
    filteredProducts,
    filters,
    pagination,
    categoryOptions,
    wholesalerOptions,
    isLoading,
    error,
    refetch: fetchProducts,
    setFilter,
    clearFilters,
    setPage,
    removeProduct,
    showsApiDefaultFilters,
  };
}
