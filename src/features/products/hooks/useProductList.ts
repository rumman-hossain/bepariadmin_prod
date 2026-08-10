import { useMemo } from 'react';
import { useDebouncedValue } from '@/src/hooks/useDebouncedValue';
import { useProductStore } from '../store';
import { useCategoryNamesQuery, useAdminProductsQuery } from '../queries';
import { useSupplierPickerQuery } from '@/src/features/wholesalers/queries';
import { supplierLabel } from '@/src/features/wholesalers/utils/supplierLabel';
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

  /*
   * Supplier names for the filter dropdown, from the SHARED picker query.
   *
   * This was a fourth private `useEffect` over the same endpoint, with its own
   * cancelled flag, its own catch, and its own copy of the label format. On a
   * failure it reset the options to just "All suppliers", silently narrowing the
   * filter to nothing without saying so; React Query keeps the last good list
   * instead. Still a whole-table fetch — that is the endpoint needing
   * pagination, not this call site — but now it is fetched once for the app.
   */
  const { data: suppliers } = useSupplierPickerQuery();
  const wholesalerOptions: FilterOption[] = useMemo(
    () => [
      { label: 'All suppliers', value: 'All' },
      ...(suppliers ?? []).map((w) => ({ label: supplierLabel(w), value: w.id })),
    ],
    [suppliers],
  );

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
