import { useMemo, useState, useEffect } from 'react';
import { useDebouncedValue } from '@/src/hooks/useDebouncedValue';
import { useProductStore } from '../store';
import { useCategoryNamesQuery, useAdminProductsQuery } from '../queries';
import { listSuppliersForPicker } from '@/src/features/wholesalers/api/wholesalerApi';
import { isProductState, type AdminProductListParams } from '../types/adminProduct';
import type { ProductFilters } from '../types';

export interface FilterOption {
  label: string;
  value: string;
}

/**
 * The product list's data.
 *
 * Reads `GET /api/v1/admin/products`, NOT the catalogue route this used to
 * call. That route is shared with retailers and narrowed to approved+public, so
 * every filter here was applied to a population that had already excluded the
 * products an operator came to find.
 *
 * Three things left with it:
 *
 *   - the client-side `lowStock` pass, which filtered one already-truncated
 *     page, so the visible count and the pager's total disagreed and nothing
 *     past the current page was considered. The server filters it now;
 *   - `isFilteringWithinPage`, the warning that existed to apologise for that;
 *   - `showsApiDefaultFilters`, which drove the banner explaining that
 *     "All Statuses" meant "approved only".
 */
export function useProductList() {
  const filters = useProductStore((s) => s.filters);
  const pagination = useProductStore((s) => s.pagination);
  const setFilter = useProductStore((s) => s.setFilter);
  const clearFilters = useProductStore((s) => s.clearFilters);
  const setPage = useProductStore((s) => s.setPage);

  // Only the search box needs debouncing — the rest are discrete selections
  // where firing immediately is the responsive, correct behaviour.
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const { data: categoryNames = {} } = useCategoryNamesQuery();

  const params = useMemo<AdminProductListParams>(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      search: debouncedSearch || undefined,
      /*
       * An unrecognised state is dropped rather than sent.
       *
       * The server answers 400 for a state it does not know, which is the right
       * call — a filter that is silently ignored is the worst kind, because the
       * answer looks right. But that means a stale value in the store (say, a
       * persisted `'Pending Approval'` from the old vocabulary) would turn the
       * whole screen into an error rather than showing everything. Guarding
       * here keeps a bad value harmless instead of fatal.
       */
      state: isProductState(filters.state) ? filters.state : undefined,
      supplierId: filters.wholesalerId !== 'All' ? filters.wholesalerId : undefined,
      categoryId: filters.category !== 'All' ? filters.category : undefined,
      hasImage: filters.hasImage,
      lowStock: filters.lowStock || undefined,
    }),
    [
      pagination.page,
      pagination.limit,
      debouncedSearch,
      filters.state,
      filters.wholesalerId,
      filters.category,
      filters.hasImage,
      filters.lowStock,
    ],
  );

  const { data, isPending, isFetching, error, refetch } = useAdminProductsQuery(params);

  const products = useMemo(() => data?.products ?? [], [data]);

  // Supplier names for the filter dropdown. Still a whole-table fetch — it is
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
          ...items.map((w) => ({
            // The code first, because it is what the SKU carries and what an
            // operator matches a row against.
            label: w.code ? `${w.code} · ${w.companyName || w.id}` : w.companyName || w.id,
            value: w.id,
          })),
        ]);
      })
      .catch(() => {
        if (!cancelled) setWholesalerOptions([{ label: 'All suppliers', value: 'All' }]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryOptions: FilterOption[] = useMemo(
    () => [
      { label: 'All categories', value: 'All' },
      ...Object.entries(categoryNames).map(([value, label]) => ({ label, value })),
    ],
    [categoryNames],
  );

  return {
    products,
    counts: data?.counts,
    filters: filters as ProductFilters,
    pagination: {
      page: data?.page ?? pagination.page,
      limit: data?.limit ?? pagination.limit,
      total: data?.total ?? 0,
    },
    categoryOptions,
    wholesalerOptions,
    /** Only the FIRST load — a background refetch keeps rows on screen. */
    isLoading: isPending,
    isFetching,
    error: error ? (error as Error).message : null,
    refetch,
    setFilter,
    clearFilters,
    setPage,
  };
}
