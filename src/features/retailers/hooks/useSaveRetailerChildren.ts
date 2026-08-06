import {
  updateRetailerFinancials,
  updateRetailerAddresses,
  attachRetailerDocuments,
} from '../api/retailersApi';
import type { RetailerFormValues } from '../components/RetailerForm';

/**
 * Saving the collections that hang off a retailer.
 *
 * Addresses, banks and wallets each live in their own table behind their own
 * PUT, because each is keyed by a retailer id that does not exist until create
 * returns. That makes saving a retailer up to three requests, and the reason
 * this is one function is that CREATE and EDIT must do the same three — the
 * first version wired them into create only, and an operator editing a bank
 * account would have watched it silently not save.
 *
 * # Why the failures are collected rather than thrown
 *
 * By the time these run the shop already exists. Throwing on the first failure
 * would report "could not save" over a registration that partly succeeded, and
 * the operator's next move — press Create again — hits "that phone number is
 * already registered". Naming exactly which parts did not save is the only
 * message they can act on.
 */
export async function saveRetailerChildren(
  id: string,
  values: RetailerFormValues,
  /**
   * An upload draft to bind to this shop — EDIT ONLY.
   *
   * Create claims its own draft inside the transaction that inserts the row, so
   * it must not be passed here; doing so would re-claim a draft that is already
   * bound and cost a round trip to achieve nothing.
   *
   * Edit has no such moment, and passing nothing was the bug: files uploaded
   * from the edit screen sat in a draft nobody claimed, and the operator was
   * shown a completed slot for a document bound to no shop.
   */
  uploadDraftId?: string | null,
  /**
   * Refresh the cached retailer once every child save has finished.
   *
   * # Why this is a parameter and not the caller's job afterwards
   *
   * It WAS the caller's job, implicitly, and the caller did it too early.
   * `useUpdateRetailer.onSuccess` invalidates the detail the moment the PATCH
   * returns — which is BEFORE this function runs. So the vault refetched with
   * the document rows as they stood before the attach.
   *
   * That matters because the attach REPLACES rows: `AttachRetailerDocuments`
   * deletes by `doc_type` and re-inserts, deliberately, so a corrected licence
   * replaces the wrong one rather than sitting beside it. The replacement gets a
   * NEW id. The screen was then holding ids that had just been deleted, and
   * pressing View asked the server for a document that no longer existed — a
   * 404 that looked like a missing file and cleared up by itself a minute later,
   * when the query happened to refetch.
   *
   * Passing it in puts the ordering next to the writes it has to follow, where
   * a test can hold it, instead of leaving it as something each caller has to
   * remember to do last.
   *
   * Called ONCE, at the end, and AWAITED. Refreshing straight after the attach
   * would refetch before the addresses were written and leave the district stale
   * — the same class of mistake one step further along.
   *
   * The awaiting is not decoration. `invalidateQueries` marks a query stale and
   * starts a refetch; it does not wait for one. Firing and forgetting let the
   * screen navigate to the detail page while the refetch was still in flight, so
   * the vault rendered the cache it already had — the stale one — and View still
   * asked for a deleted id. Measured live: the wording improved and the 404
   * stayed.
   */
  refresh?: () => void | Promise<unknown>,
): Promise<string[]> {
  const failed: string[] = [];

  if (uploadDraftId) {
    try {
      await attachRetailerDocuments(id, uploadDraftId);
    } catch {
      failed.push('documents');
    }
  }

  const banks = values.bankDetailsList ?? [];
  const wallets = values.digitalWallets ?? [];
  if (banks.length > 0 || wallets.length > 0) {
    try {
      await updateRetailerFinancials(id, banks, wallets);
    } catch {
      failed.push('payment details');
    }
  }

  const addresses = values.addresses ?? [];
  if (addresses.length > 0) {
    try {
      await updateRetailerAddresses(id, addresses);
    } catch {
      failed.push('addresses');
    }
  }

  /*
   * Refreshed even when something failed, and on purpose.
   *
   * A partial save still changed the row — the documents may have attached while
   * the addresses did not — and leaving the screen on pre-save data would show
   * the operator none of what DID land, next to a message telling them some of
   * it did.
   */
  await refresh?.();

  return failed;
}
