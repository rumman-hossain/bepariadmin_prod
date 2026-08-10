import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/app/queryClient';
import {
  listWholesalers,
  getWholesaler,
  createWholesaler,
  updateWholesaler,
  updateWholesalerMargin,
  approveWholesaler,
  rejectWholesaler,
  suspendWholesaler,
  unsuspendWholesaler,
  requestResubmitWholesaler,
  deleteWholesaler,
  restoreWholesaler,
  listSuppliersForPicker,
} from './api/wholesalerApi';
import type { WholesalerFormData } from './schemas/wholesalerSchema';
import type { SupplierQuery } from './types';
import type { Wholesaler } from '@/src/types/domain';

/**
 * Server state for the supplier feature.
 *
 * Replaces the caching half of `store.ts`. What that store did by hand —
 * in-flight de-duplication, a `?_=<timestamp>` cache-buster, a `selectedId`
 * staleness guard, and manual refetching after some (but not all) mutations —
 * is now the library's job. The store keeps only the filter selections, which
 * are genuinely client state.
 *
 * The list IS filtered and paged on the server now. It used to be fetched whole
 * and narrowed in the browser, with a comment here explaining that a per-filter
 * key would be wasted because the endpoint did not paginate. It does now, so the
 * filters are part of the key and each combination is its own cache entry.
 */
export function useWholesalersQuery(query: SupplierQuery) {
  return useQuery({
    // The query is PART of the key. Without it every filter combination shared
    // one cache entry, so narrowing served the previous result for an instant
    // and then replaced it — and going back showed the wrong list entirely.
    queryKey: [...queryKeys.wholesalers.list(), query],
    queryFn: () => listWholesalers(query),
    /*
     * The previous page stays on screen while the next one loads.
     *
     * Without it the table empties on every filter change and every page step,
     * which reads as "no suppliers match" for as long as the request takes.
     */
    placeholderData: (previous) => previous,
  });
}

/**
 * The supplier list for a PICKER — the product wizard and the product filter.
 *
 * Separate from the directory query on purpose: they want a stable list to
 * choose from, so it has its own cache entry and is not invalidated or
 * re-keyed every time somebody narrows the Suppliers screen.
 */
export function useSupplierPickerQuery() {
  return useQuery({
    queryKey: [...queryKeys.wholesalers.list(), 'picker'],
    queryFn: () => listSuppliersForPicker(),
    /*
     * THE ONE PLACE THIS LIST IS FETCHED. Measured on dev: a single pass through
     * the add-product wizard issued /admin/wholesalers?limit=200 FIVE times —
     * 200 supplier rows, five times, to render one name.
     *
     * Three callers each ran their own `useEffect` + listSuppliersForPicker()
     * with no cache between them: Step1BasicInfo (keyed on wholesalerId, so it
     * refetched on every change of supplier), Step6Summary, and useProductList.
     * They all route through here now.
     *
     * The staleTime is what stops a remount refetching. Without it the shared
     * key dedupes concurrent calls but not sequential ones, and stepping 1 → 6 →
     * 1 would fetch again — which is most of what the five were.
     */
    staleTime: 10 * 60_000,
  });
}

/** Restoring a supplier that was removed. */
export function useRestoreWholesaler() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreWholesaler(id),
    onSuccess: (_r, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.wholesalers.list() });
      void qc.invalidateQueries({ queryKey: queryKeys.wholesalers.detail(id) });
    },
  });
}

export function useWholesalerQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wholesalers.detail(id ?? ''),
    queryFn: () => getWholesaler(id!),
    enabled: Boolean(id),
  });
}

/**
 * Shared invalidation for every write.
 *
 * Centralised deliberately: the old store refetched the list after `create` but
 * NOT after `update`, so an edited supplier showed stale values in the table
 * until something else happened to trigger a load. One helper means a new
 * mutation cannot forget.
 */
function useInvalidateWholesalers() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: queryKeys.wholesalers.list() });
    if (id) void qc.invalidateQueries({ queryKey: queryKeys.wholesalers.detail(id) });
  };
}

export function useCreateWholesaler() {
  const invalidate = useInvalidateWholesalers();
  return useMutation({
    mutationFn: (dto: WholesalerFormData) => createWholesaler(dto),
    onSuccess: (created: Wholesaler) => invalidate(created.id),
  });
}

/**
 * Refreshing ONE supplier, awaitably, on the caller's schedule.
 *
 * `useUpdateWholesaler` deliberately refreshes only the list. Saving an edit is
 * two requests — the PATCH, then the document attach — and the attach REPLACES
 * rows by `doc_type`, which mints new document ids and deletes the old ones. A
 * refresh fired when the PATCH resolved therefore repopulated the vault with
 * ids the attach was about to destroy, and pressing View on a certificate that
 * had just been replaced asked the server for a document that no longer existed.
 *
 * Measured on dev before this: the detail refetched at requests 496 and 497,
 * and the attach landed at 498.
 *
 * The promise is RETURNED, not voided. `invalidateQueries` only STARTS a
 * refetch; discarding its promise means the caller waits for nothing and the
 * ordering is only accidentally right. Same shape as the retailer's
 * `useRefreshRetailerDetail`, which is where this was learned.
 */
export function useRefreshWholesalerDetail() {
  const qc = useQueryClient();
  return (id: string) => qc.invalidateQueries({ queryKey: queryKeys.wholesalers.detail(id) });
}

export function useUpdateWholesaler() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: WholesalerFormData }) => updateWholesaler(id, dto),
    // The list only — see useRefreshWholesalerDetail for why the detail is the
    // caller's to refresh, and why it has to happen after the attach.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.wholesalers.list() });
    },
  });
}

export function useUpdateCommission() {
  const invalidate = useInvalidateWholesalers();
  return useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number }) => updateWholesalerMargin(id, rate),
    onSuccess: (_result, { id }) => invalidate(id),
  });
}

/**
 * Removing a supplier.
 *
 * Its own mutation rather than a sixth `StatusAction`, because it alone returns
 * something the caller must act on — whether the delete was soft or permanent —
 * and because it is the only one after which the detail page no longer exists.
 */
export function useDeleteWholesaler() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWholesaler(id),
    onSuccess: (_mode, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.wholesalers.list() });
      // The detail is REMOVED, not invalidated. Refetching a supplier that has
      // just been deleted asks the server for a 404 and shows an error banner
      // over a screen the operator is already navigating away from.
      qc.removeQueries({ queryKey: queryKeys.wholesalers.detail(id) });
    },
  });
}

type StatusAction =
  | { kind: 'approve'; id: string; reviewedBy: string }
  | { kind: 'unsuspend'; id: string; reviewedBy: string }
  | { kind: 'reject'; id: string; reviewedBy: string; reason: string }
  | { kind: 'suspend'; id: string; reviewedBy: string; reason: string }
  | { kind: 'request-resubmit'; id: string; reviewedBy: string; reason: string };

/**
 * The five KYC decisions behind one mutation.
 *
 * They were five near-identical store actions sharing a single `isMutating`
 * boolean — so approving wholesaler A put every button on the page into a
 * loading state. A discriminated union keeps each call site explicit while
 * giving each invocation its own pending state.
 */
export function useWholesalerStatusAction() {
  const invalidate = useInvalidateWholesalers();
  return useMutation({
    mutationFn: async (action: StatusAction) => {
      switch (action.kind) {
        case 'approve':
          return approveWholesaler(action.id, action.reviewedBy);
        case 'unsuspend':
          return unsuspendWholesaler(action.id, action.reviewedBy);
        case 'reject':
          return rejectWholesaler(action.id, action.reviewedBy, action.reason);
        case 'suspend':
          return suspendWholesaler(action.id, action.reviewedBy, action.reason);
        case 'request-resubmit':
          return requestResubmitWholesaler(action.id, action.reviewedBy, action.reason);
      }
    },
    onSuccess: (_result, action) => invalidate(action.id),
  });
}
