/**
 * CLIENT state for the product list.
 *
 * This file used to be 255 lines and held the product list, the selected
 * product, a category-name lookup, two loading booleans and an error string —
 * a hand-rolled server cache whose defects were:
 *
 *   - no staleness guard at all on `fetchProducts`, so with an undebounced
 *     search box a slow response for "shi" could overwrite the results for
 *     "shirt" (I added a generation counter as a stop-gap; the query key makes
 *     it unnecessary — two searches are two cache entries);
 *   - `setCategoryNameMap` triggered a SECOND full product fetch as a side
 *     effect, so every mount of the list issued two identical requests;
 *   - `removeProduct` spliced the row out locally and then refetched the whole
 *     page anyway, so the optimism bought nothing and briefly disagreed with
 *     the server about `total`.
 *
 * All of that now lives in `queries.ts`. What remains is what was always
 * genuinely client state: the operator's filter selections and current page.
 */
import { create } from 'zustand';
import { INITIAL_FILTERS, INITIAL_PAGINATION } from './types';
import type { ProductFilters, ProductPagination } from './types';

interface ProductUiStore {
  filters: ProductFilters;
  pagination: Pick<ProductPagination, 'page' | 'limit'>;

  setFilter: (key: keyof ProductFilters, value: string | boolean) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

export const useProductStore = create<ProductUiStore>((set) => ({
  filters: { ...INITIAL_FILTERS },
  pagination: { page: INITIAL_PAGINATION.page, limit: INITIAL_PAGINATION.limit },

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
      // Changing a filter must reset to page 1 — otherwise a narrower result
      // set leaves you on a page that no longer exists, showing an empty table.
      pagination: { ...state.pagination, page: 1 },
    })),

  clearFilters: () =>
    set((state) => ({
      filters: { ...INITIAL_FILTERS },
      pagination: { ...state.pagination, page: 1 },
    })),

  setPage: (page) => set((state) => ({ pagination: { ...state.pagination, page } })),

  setLimit: (limit) => set(() => ({ pagination: { page: 1, limit } })),
}));
