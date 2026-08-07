import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/app/queryClient';
import { useCategoryQuery } from '@/src/hooks/useCategoryOptions';
import { getProductById, deleteProduct } from '@/src/api/products';
import {
  listAdminProducts,
  approveProduct,
  rejectProduct,
  publishProduct,
  takeDownProduct,
  getProductAudit,
} from '@/src/api/adminProducts';
import { productResponseSchema } from './schemas/productSchema';
import type { Product } from './types';
import type {
  AdminProductListParams,
  AdminProductListResult,
} from './types/adminProduct';

/**
 * The category id → name lookup the product list needs to render.
 *
 * Its own query rather than a field on the product store. Previously
 * `setCategoryNameMap` triggered a SECOND full product fetch as a side effect,
 * so every mount of the list issued two identical requests: one from the list
 * effect and one from the category effect landing.
 */
/**
 * The category id → name lookup, PROJECTED from the one categories fetch.
 *
 * This used to be a second `queryFn` on the same cache key as
 * `useCategoryOptions`, returning a `Record` where that one returns an array.
 * One key, two shapes: whichever mounted first won, and the loser read the
 * other's data without ever noticing. Suppliers → Products blanked the whole
 * console that way (React #31 — a category object reaching an `<option>`).
 *
 * `select` runs over the SHARED cached array, so the two can no longer
 * disagree. It also silently swallowed a wrong payload shape by returning `{}`,
 * which is why the Products screen showed `2a7be0ef…` instead of category
 * names; `normalise()` in the shared hook handles all three payload shapes
 * properly.
 */
export function useCategoryNamesQuery() {
  return useCategoryQuery({
    select: (categories) =>
      Object.fromEntries(categories.map((c) => [c.id, c.name])) as Record<string, string>,
  });
}

/*
 * `useProductsQuery` USED TO BE HERE, reading the catalogue route.
 *
 * It is gone with its last caller. The list moved to `useAdminProductsQuery`
 * below, and what remained was a hook nothing rendered — still exercised by a
 * full test file, which is the shape that reads as coverage while covering a
 * screen that no longer exists. `queryKeys.products.list` stays, because the
 * race test asserts the admin key does not collide with it.
 *
 * `getProductById` is untouched and still used by the detail page and the
 * variant panel: fetching ONE product by id is not state-filtered, so the
 * catalogue route answers correctly for staff on any state.
 */

export function useProductQuery(id: string | undefined, categoryNames: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: async (): Promise<Product> => {
      const res = await getProductById(id!, { categoryNames, resolveCatalog: true });
      if (!res.ok || !res.data?.data) {
        throw Object.assign(new Error(`Failed to load product (${res.status})`), {
          status: res.status,
        });
      }
      const parsed = productResponseSchema.safeParse(res.data.data);
      if (!parsed.success) {
        throw new Error('The server returned product data in an unexpected shape.');
      }
      return parsed.data as unknown as Product;
    },
    enabled: Boolean(id),
  });
}

/** Invalidates every product list page plus the affected detail. */
function useInvalidateProducts() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: queryKeys.products.all });
    if (id) void qc.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
  };
}

/*
 * ─── THE BACK-OFFICE LIST ────────────────────────────────────────────────
 *
 * Reads `/api/v1/admin/products`, which returns every state plus the counts.
 *
 * What it replaced read the CATALOGUE route — shared with retailers and
 * defaulting to approved+public — so the old screen's "All Statuses" silently
 * meant "approved only" and hid every product waiting for review.
 */
export function useAdminProductsQuery(params: AdminProductListParams) {
  return useQuery({
    queryKey: queryKeys.products.adminList({ ...params }),
    queryFn: async (): Promise<AdminProductListResult> => {
      const res = await listAdminProducts(params);
      if (!res.ok) {
        throw Object.assign(new Error(`Failed to load products (${res.status})`), {
          status: res.status,
        });
      }
      return res.data;
    },
    // Keeps the previous page on screen while the next loads, so switching a
    // state tab does not flash an empty table.
    placeholderData: (previous) => previous,
  });
}

export function useProductAuditQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.audit(id ?? ''),
    queryFn: async () => {
      const res = await getProductAudit(id!);
      if (!res.ok) {
        throw Object.assign(new Error(`Failed to load history (${res.status})`), {
          status: res.status,
        });
      }
      return res.data;
    },
    enabled: Boolean(id),
  });
}

/*
 * ─── LIFECYCLE ───────────────────────────────────────────────────────────
 *
 * One mutation per verb, replacing `useUpdateProductStatus`, which posted to
 * `PATCH /products/:id/status` — a route that now answers 410 Gone. A single
 * status field could not express the guards: reject and take-down require a
 * reason, publish requires an image, approve refuses self-approval.
 *
 * Each invalidates `products.all`, which covers the admin list, the catalogue
 * list and the detail — a state change moves a product between tabs, so the
 * counts must be refetched too, not just the row.
 */
function useLifecycleMutation<TArgs extends { id: string }>(
  fn: (args: TArgs) => Promise<{ ok: boolean; status: number }>,
) {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: async (args: TArgs) => {
      const res = await fn(args);
      if (!res.ok) {
        throw Object.assign(new Error(`Action failed (${res.status})`), { status: res.status });
      }
      return res;
    },
    onSuccess: (_r, args) => invalidate(args.id),
  });
}

export const useApproveProduct = () =>
  useLifecycleMutation<{ id: string }>(({ id }) => approveProduct(id));

export const useRejectProduct = () =>
  useLifecycleMutation<{ id: string; reason: string }>(({ id, reason }) =>
    rejectProduct(id, reason),
  );

export const usePublishProduct = () =>
  useLifecycleMutation<{ id: string }>(({ id }) => publishProduct(id));

export const useTakeDownProduct = () =>
  useLifecycleMutation<{ id: string; reason: string }>(({ id, reason }) =>
    takeDownProduct(id, reason),
  );

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    // Deliberately NOT an optimistic splice. The old store removed the row
    // locally and then refetched the whole page anyway, so the optimism bought
    // nothing and left the list briefly disagreeing with the server on `total`.
    onSuccess: () => invalidate(),
  });
}
