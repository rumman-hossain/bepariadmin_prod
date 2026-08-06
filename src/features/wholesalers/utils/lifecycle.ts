import {
  lifecycleFor,
  NO_LIFECYCLE_AFFORDANCE,
  type LifecycleAffordance,
} from '@/src/features/retailers/utils/deleteAffordance';
import type { Wholesaler } from '@/src/types/domain';

/**
 * Which lifecycle controls a supplier's status earns.
 *
 * # One rule, two entities
 *
 * The decision itself — suspended may be removed softly, rejected permanently,
 * active must be suspended first, anything unknown offers nothing — is
 * identical for suppliers and shops, and it is already written and tested once
 * in `retailers/utils/deleteAffordance.ts`. Copying it would give the two
 * screens two answers to the same question, which is exactly how the supplier
 * lifecycle drifted away from the retailer's on the server.
 *
 * What genuinely differs is the VOCABULARY. The console maps a supplier to
 * `Active | Review | Rejected | Suspended` (`api/mapWholesaler.ts`) where a
 * retailer is `active | pending | rejected | suspended`. So this translates and
 * delegates; it does not decide.
 *
 * `Review` is the interesting one: it covers PENDING_REVIEW *and*
 * RESUBMIT_REQUIRED, both of which the server refuses to delete with
 * REJECT_FIRST — the same answer `pending` earns.
 */
export function supplierLifecycleFor(
  status: Wholesaler['status'],
  removed = false,
): LifecycleAffordance {
  /*
   * A REMOVED supplier earns nothing.
   *
   * Removal is orthogonal to status — the row keeps whatever it carried when it
   * was deleted, usually SUSPENDED — so without this a removed supplier would
   * be offered Restore access, and Delete, for a record that is already gone.
   * The server refuses all of them anyway (every lifecycle UPDATE requires
   * `deleted_at IS NULL`), so those buttons could only ever produce an error.
   *
   * Bringing a removed supplier BACK is a different act with a different
   * endpoint, and it is not this rule's to describe — note that `primary:
   * 'restore'` here already means unsuspend, which is why it is not reused.
   */
  if (removed) return NO_LIFECYCLE_AFFORDANCE;
  return lifecycleFor(status === 'Review' ? 'pending' : status.toLowerCase());
}
