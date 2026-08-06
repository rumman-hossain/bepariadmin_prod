import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/src/hooks/useDebouncedValue';
import { useProductStore } from '../store';
import { useCategoryNamesQuery, useDeleteProduct, useProductsQuery } from '../queries';
import { listSuppliersForPicker } from '@/src/features/wholesalers/api/wholesalerApi';
import { STOCK_LOW_THRESHOLD } from '../constants';
import type { ProductFilters, ProductPagination } from '../types';

export interface FilterOption {
  label: string;
  value: string;
}

export function useProductList() {
  // Client state — filter selections and the current page.
  const filters = useProductStore((s) => s.filters);
  const pagination = useProductStore((s) => s.pagination);
  const setFilter = useProductStore((s) => s.setFilter);
  const clearFilters = useProductStore((s) => s.clearFilters);
  const setPage = useProductStore((s) => s.setPage);

  // Only the search box needs debouncing — the rest are discrete selections
  // where firing immediately is the responsive, correct behaviour.
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const { data: categoryNames = {} } = useCategoryNamesQuery();

  const params = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      search: debouncedSearch || undefined,
      category: filters.category !== 'All' ? filters.category : undefined,
      status: filters.status !== 'All' ? filters.status : undefined,
      visibility: filters.visibility !== 'All' ? filters.visibility : undefined,
      wholesalerId: filters.wholesalerId !== 'All' ? filters.wholesalerId : undefined,
    }),
    [
      pagination.page,
      pagination.limit,
      debouncedSearch,
      filters.category,
      filters.status,
      filters.visibility,
      filters.wholesalerId,
    ],
  );

  const { data, isPending, isFetching, error, refetch } = useProductsQuery(params, categoryNames);
  const deleteProduct = useDeleteProduct();

  const products = useMemo(() => data?.products ?? [], [data]);

  const resolvedPagination: ProductPagination = useMemo(
    () => ({
      page: data?.page ?? pagination.page,
      limit: data?.limit ?? pagination.limit,
      total: data?.total ?? 0,
    }),
    [data, pagination.page, pagination.limit],
  );

  // Wholesaler names for the filter dropdown. Still a whole-table fetch — it is
  // the endpoint that needs pagination, not this call site.
  const [wholesalerOptions, setWholesalerOptions] = useState<FilterOption[]>([
    { label: 'All suppliers', value: 'All' },
  ]);

  useEffect(() => {
    let cancelled = false;
    listSuppliersForPicker()
      .then((items) => {
        if (cancelled) return;
        setWholesalerOptions([
          { label: 'All suppliers', value: 'All' },
          ...items.map((w) => ({ label: w.companyName || w.id, value: w.id })),
        ]);
      })
      .catch(() => {
        // Falls back to "All" rather than becoming an unhandled rejection with
        // no visible effect, which is what it used to be.
        if (!cancelled) setWholesalerOptions([{ label: 'All suppliers', value: 'All' }]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryOptions: FilterOption[] = useMemo(
    () => [
      { label: 'All Categories', value: 'All' },
      ...Object.entries(categoryNames).map(([value, label]) => ({ label, value })),
    ],
    [categoryNames],
  );

  /*
   * Only LOW STOCK is filtered here now.
   *
   * The supplier filter used to be applied twice — sent to the server AND
   * re-applied over the returned page — because the server accepted
   * `wholesaler_id` and dropped it on the floor. That is fixed
   * (`internal/product/handler.go` now reads it), so filtering again in the
   * browser narrows an already-narrowed page and, worse, made `meta.total`
   * disagree with the rows: the server counted the whole catalogue while the
   * table showed one supplier's slice of one page.
   *
   * Low stock has no server-side equivalent, so it stays and keeps its warning.
   */
  const filteredProducts = useMemo(() => {
    if (!filters.lowStock) return products;
    return products.filter((p) => (p.availableStock ?? p.stock) <= STOCK_LOW_THRESHOLD);
  }, [products, filters.lowStock]);

  /**
   * True when a filter is being applied in the browser to a page the server has
   * already truncated — so the visible count is "matches on this page", not
   * "matches overall".
   *
   * Supplier is no longer one of them: the server filters it, so its total is
   * the real total and warning about it would be false.
   */
  const isFilteringWithinPage =
    filters.lowStock && resolvedPagination.total > products.length;

  return {
    products,
    filteredProducts,
    /*
     * The LIVE name map, so a row can resolve its category when it renders.
     *
     * `mapProduct` bakes the label in at FETCH time, and the products query key
     * does not include these names — so when products resolve before categories
     * (the normal order, they are two independent requests) every row is mapped
     * against an empty map and never re-mapped. MEASURED: the Category column
     * showed `2a7be0ef…` on every row, permanently.
     */
    categoryNames,
    filters: filters as ProductFilters,
    pagination: resolvedPagination,
    categoryOptions,
    wholesalerOptions,
    /** Only the FIRST load — a background refetch keeps rows on screen. */
    isLoading: isPending,
    isFetching,
    error: error ? error.message : null,
    refetch,
    setFilter,
    clearFilters,
    setPage,
    removeProduct: (id: string) => deleteProduct.mutateAsync(id).then(() => undefined),
    isDeleting: deleteProduct.isPending,
    showsApiDefaultFilters: filters.status === 'All' && filters.visibility === 'All',
    isFilteringWithinPage,
  };
}
