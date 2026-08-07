import { QueryClient } from '@tanstack/react-query';

/**
 * Shared query client.
 *
 * This replaces three hand-rolled server caches (products, wholesalers,
 * dashboard) that between them had:
 *
 *   - no cache key and no TTL — "invalidation" was a `?_=<Date.now()>` cache-
 *     busting query param, and `updateWholesalerFromForm` simply forgot to
 *     refetch, so the list went stale after every edit;
 *   - two partial de-duplication mechanisms (an in-flight Map in api/client.ts
 *     for GETs, another in the wholesaler store for detail fetches) that did
 *     not cover the general case — `listWholesalers` was called from five
 *     places, three of them fetching the entire supplier table to resolve a
 *     single name;
 *   - three different maturity levels of race handling across three stores,
 *     one of which had none at all.
 *
 * Zustand stays, but only for genuine CLIENT state: filter selections and the
 * add-product wizard draft. Nothing that came from the server lives there now.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * Admin data is operational, not real-time. 30s means switching between
       * screens is instant and a refocus after a coffee re-fetches, without
       * hammering the backend.
       */
      staleTime: 30_000,
      gcTime: 5 * 60_000,

      // The list is re-fetched when the operator comes back to the tab. This
      // is also what the dashboard's `visibilitychange` handling does by hand.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,

      /**
       * Do not retry authentication or authorisation failures — retrying a 401
       * three times just delays the redirect to the login form, and api/client
       * already handles token refresh and the single 401 retry itself.
       */
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      // A failed write must never be replayed automatically — the same reason
      // api/client.ts only retries idempotent methods.
      retry: false,
    },
  },
});

/**
 * Query keys in one place, so an invalidation can never miss a cache because
 * two call sites spelled the key differently.
 */
export const queryKeys = {
  wholesalers: {
    all: ['wholesalers'] as const,
    list: () => [...queryKeys.wholesalers.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.wholesalers.all, 'detail', id] as const,
    /*
     * `activity` is gone. It keyed a query over four functions in `api/stubs.ts`
     * that returned `[]` and `null` unconditionally — orders, payouts, stats and
     * accept/reject history. The supplier detail screen gave two thirds of its
     * width to panels built on them and apologised for the emptiness five times.
     *
     * A supplier's products come from `queryKeys.products.list` with a
     * `wholesalerId`, which is a real endpoint. Orders and payouts get their own
     * keys when the endpoints exist.
     */
  },
  products: {
    all: ['products'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.products.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
    /*
     * The BACK-OFFICE list, keyed separately from `list`.
     *
     * Both nest under `products.all`, so one invalidation after a lifecycle
     * change refreshes whichever is mounted. They are not the same query
     * though: `list` hits the catalogue route and sees approved+public only,
     * while this one hits /admin/products and sees every state. Sharing a key
     * would let a catalogue response answer an admin screen — the same class
     * of bug as the two category hooks that shared a key and returned
     * different shapes.
     */
    adminList: (params: Record<string, unknown>) =>
      [...queryKeys.products.all, 'admin-list', params] as const,
    audit: (id: string) => [...queryKeys.products.all, 'audit', id] as const,
  },
  catalog: {
    all: ['catalog'] as const,
    categories: () => [...queryKeys.catalog.all, 'categories'] as const,
    subCategories: (categoryId: string) =>
      [...queryKeys.catalog.all, 'sub-categories', categoryId] as const,
    productGroups: (subCategoryId: string) =>
      [...queryKeys.catalog.all, 'product-groups', subCategoryId] as const,
    classifications: (productGroupId: string) =>
      [...queryKeys.catalog.all, 'classifications', productGroupId] as const,
    sizeConfig: (productGroupId: string) =>
      [...queryKeys.catalog.all, 'size-config', productGroupId] as const,
    platformMargin: () => [...queryKeys.catalog.all, 'platform-margin'] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
  },
} as const;
