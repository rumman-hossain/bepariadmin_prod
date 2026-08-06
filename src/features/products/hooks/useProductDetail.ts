import { useCategoryNamesQuery, useProductQuery } from '../queries';
import type { Product } from '../types';

/**
 * One product, by id.
 *
 * The store version kept a single `selectedProduct` slot for whichever detail
 * was last requested, which is why it needed an effect to clear the selection
 * and had no protection against a slow response for product A landing after a
 * newer one for B. Keying the cache by id removes the problem: two ids are two
 * cache entries, and there is nothing to race over.
 *
 * The effect it used also had an incomplete dependency array (`[productId]`
 * while calling `fetchProductDetail` and `clearSelection`), which is one of the
 * `exhaustive-deps` warnings this deletes.
 */
export function useProductDetail(productId: string | null): {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { data: categoryNames = {} } = useCategoryNamesQuery();
  const { data, isPending, error, refetch } = useProductQuery(productId ?? undefined, categoryNames);

  return {
    product: productId ? (data ?? null) : null,
    isLoading: Boolean(productId) && isPending,
    error: error ? error.message : null,
    refetch: () => void refetch(),
  };
}
