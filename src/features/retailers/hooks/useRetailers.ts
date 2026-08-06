import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listRetailers,
  getRetailer,
  isNotFound,
  updateRetailer,
  createRetailer,
  suspendRetailer,
  unsuspendRetailer,
  rejectRetailer,
  deleteRetailer,
  resetRetailerPassword,
  type ListRetailersParams,
} from '../api/retailersApi';
import type { RetailerUpdate } from '../schemas/retailerSchema';

const retailerKeys = {
  all: ['retailers'] as const,
  /*
   * `lists()` exists so a mutation can refresh the directory WITHOUT touching a
   * detail query.
   *
   * `invalidateQueries({ queryKey: all })` matches by prefix, so it hits
   * `['retailers','detail',id]` too. After a delete that is a guaranteed 404 on
   * a row that no longer exists — retried three times by TanStack, on a screen
   * already navigating away. The delete comment claimed it invalidated "the
   * LIST, not this row"; the code invalidated both.
   */
  lists: () => [...retailerKeys.all, 'list'] as const,
  list: (p: ListRetailersParams) => [...retailerKeys.lists(), p] as const,
  detail: (id: string) => [...retailerKeys.all, 'detail', id] as const,
};

export function useRetailerList(params: ListRetailersParams) {
  return useQuery({
    queryKey: retailerKeys.list(params),
    queryFn: () => listRetailers(params),
    /*
     * Keep the current rows on screen while the next page loads, so the table
     * does not collapse to a skeleton and shift the page under the pointer. The
     * screen disables Next while fetching, so a second click cannot skip a page
     * the operator never saw.
     */
    placeholderData: keepPreviousData,
  });
}

export function useRetailerDetail(id: string | null) {
  return useQuery({
    queryKey: retailerKeys.detail(id ?? ''),
    queryFn: () => getRetailer(id!),
    enabled: Boolean(id),
    /*
     * A 404 is not retried.
     *
     * TanStack retries a failed query three times with backoff. For a shop that
     * has genuinely been deleted, every one of those is a request whose answer
     * is already known — four 404s in the console for one gone row, and a
     * second or two of a spinner before the screen admits it.
     *
     * Everything else keeps the default: a timeout or a 500 is worth another go.
     */
    retry: (failureCount, error) => !isNotFound(error) && failureCount < 3,
  });
}

export function useUpdateRetailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RetailerUpdate }) => updateRetailer(id, input),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: retailerKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: retailerKeys.all });
    },
  });
}

/**
 * Re-read one retailer, for work that finishes AFTER the PATCH.
 *
 * `useUpdateRetailer` already invalidates the detail — but it does so the moment
 * the PATCH returns, and a save is not over then. The documents attach next, and
 * that attach REPLACES the document rows: the server deletes by `doc_type` and
 * re-inserts, so every replaced document comes back with a new id.
 *
 * The screen was therefore built from ids the attach had just deleted, and
 * pressing View asked for a document that no longer existed. It read as a
 * missing file and cured itself a minute later, when the query refetched on its
 * own — which is the worst shape a bug can take, because it looks like the
 * server losing files.
 *
 * # Returns the promise, and the caller AWAITS it
 *
 * `invalidateQueries` only marks the query stale and starts a refetch — it does
 * not wait for one. The first version discarded the promise with `void`, and the
 * screen navigated to the detail page while the refetch was still in flight: the
 * vault rendered from the cache it already had, which is the stale one, and
 * pressing View immediately still asked for a deleted id. Measured live —
 * the wording changed and the 404 did not.
 *
 * Awaiting it means the vault is not shown until it holds rows that exist.
 */
export function useRefreshRetailerDetail(id: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: retailerKeys.detail(id) });
}

/**
 * Creating a retailer.
 *
 * Invalidates the list so the new shop appears without a manual refresh — and
 * invalidates it rather than pushing the row in by hand, because the server
 * assigns the id, the referral code and `created_by`, none of which the form
 * knows.
 */
export function useCreateRetailer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RetailerUpdate & { password: string; uploadDraftId?: string }) =>
      createRetailer(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: retailerKeys.all }),
  });
}

/**
 * Suspend, restore, reset.
 *
 * Each invalidates BOTH the list and the detail. A suspension that updates the
 * detail screen but leaves the list showing "Active" is worse than not updating
 * either — an operator checking their work sees the old answer and repeats it.
 */
export function useRetailerActions(id: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: retailerKeys.all });

  return {
    suspend: useMutation({
      mutationFn: (reason: string) => suspendRetailer(id, reason),
      onSuccess: invalidate,
    }),
    unsuspend: useMutation({ mutationFn: () => unsuspendRetailer(id), onSuccess: invalidate }),
    reject: useMutation({
      mutationFn: (reason: string) => rejectRetailer(id, reason),
      onSuccess: invalidate,
    }),
    /*
     * Deleting refreshes the LIST and deliberately leaves the detail query alone.
     *
     * This comment used to say exactly that while the code called `invalidate`,
     * which invalidates `['retailers']` — a prefix that matches the detail query
     * too. So every delete refetched the row it had just removed, got a 404, and
     * TanStack retried it three times. The comment described the intent; nothing
     * implemented it.
     *
     * `lists()` is the narrower key. The detail entry is left to expire on its
     * own once the screen unmounts: REMOVING it here would be worse, because the
     * page is still mounted at this moment and a mounted observer whose cache
     * entry disappears simply fetches again.
     */
    remove: useMutation({
      mutationFn: () => deleteRetailer(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: retailerKeys.lists() }),
    }),
    resetPassword: useMutation({
      mutationFn: (password: string) => resetRetailerPassword(id, password),
      // Deliberately no invalidation: a password change alters nothing this
      // screen displays, and refetching would imply it did.
    }),
  };
}
