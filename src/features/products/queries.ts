import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/app/queryClient';
import { useCategoryQuery } from '@/src/hooks/useCategoryOptions';
import {
  getProducts,
  getProductById,
  updateProductStatus,
  deleteProduct,
} from '@/src/api/products';
import { productListResponseSchema, productResponseSchema } from './schemas/productSchema';
import type { Product, ProductStatus } from './types';

export interface ProductListParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  status?: string;
  visibility?: string;
  wholesalerId?: string;
}

export interface ProductListResult {
  products: Product[];
  page: number;
  limit: number;
  total: number;
}

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

/**
 * Paginated, filtered product list.
 *
 * The params are part of the query key, which is what removes the race the
 * store needed a hand-rolled generation counter for: a response for
 * `search: "shi"` can no longer overwrite `search: "shirt"`, because they are
 * different cache entries. `placeholderData` keeps the previous page on screen
 * while the next one loads instead of flashing an empty table.
 */
export function useProductsQuery(params: ProductListParams, categoryNames: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.products.list({ ...params }),
    queryFn: async (): Promise<ProductListResult> => {
      const res = await getProducts(params, { categoryNames });
      if (!res.ok) {
        throw Object.assign(
          new Error(`Failed to load products (${res.status})`),
          { status: res.status },
        );
      }
      const parsed = productListResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error('The server returned product data in an unexpected shape.');
      }
      return parsed.data;
    },
    placeholderData: (previous) => previous,
  });
}

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

export function useUpdateProductStatus() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: ProductStatus; reason?: string }) =>
      updateProductStatus(id, status, reason),
    onSuccess: (_result, { id }) => invalidate(id),
  });
}

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
