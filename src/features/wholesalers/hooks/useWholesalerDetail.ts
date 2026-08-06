import { useWholesalerQuery } from '../queries';
import { useWholesalerNavigation } from './useWholesalerNavigation';
import { toWholesalerApiError } from '../api/errors';
import type { Wholesaler } from '@/src/types/domain';

/**
 * One wholesaler, by id.
 *
 * The store version needed a `selectedId` staleness guard and a hand-rolled
 * in-flight promise map to stop a slow response for wholesaler A overwriting a
 * newer one for B — because it kept a single `selectedWholesaler` slot for
 * whichever detail was last requested. Keying the cache by id removes the whole
 * problem: two ids are two cache entries, and there is nothing to race over.
 */
export function useWholesalerDetail(wholesalerId: string | null) {
  const { goBackToList, goToEdit, navigate } = useWholesalerNavigation();
  const { data, isPending, error, refetch } = useWholesalerQuery(wholesalerId ?? undefined);

  const wholesaler: Wholesaler | null = wholesalerId ? (data ?? null) : null;

  return {
    wholesaler,
    isLoading: Boolean(wholesalerId) && isPending,
    error: error ? toWholesalerApiError(error).message : null,
    refetch,
    goBack: goBackToList,
    goToEdit,
    navigate,
  };
}
