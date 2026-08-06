import { describe, it, expect } from 'vitest';
import { supplierLifecycleFor } from './lifecycle';
import { lifecycleFor } from '@/src/features/retailers/utils/deleteAffordance';
import type { Wholesaler } from '@/src/types/domain';

/**
 * WHICH LIFECYCLE CONTROLS A SUPPLIER'S STATUS EARNS.
 *
 * The decision itself is the retailer's, already tested in
 * `retailers/utils/deleteAffordance.test.ts`. This tests the TRANSLATION, which
 * is the only part that is new — and the part that can silently be wrong,
 * because the two vocabularies differ:
 *
 *   supplier  Active | Review | Rejected | Suspended
 *   retailer  active | pending | rejected | suspended
 *
 * A mistranslation does not throw. It offers "Delete permanently" on a trading
 * supplier, or hides Delete from a rejected one — both of which look like a
 * considered decision to whoever reads the screen.
 */

const ALL: Wholesaler['status'][] = ['Active', 'Review', 'Rejected', 'Suspended'];

describe('supplierLifecycleFor', () => {
  it('offers a soft delete on a suspended supplier', () => {
    // Suspended has almost always traded. Its orders and payments are not ours
    // to erase, so the delete hides rather than destroys.
    const can = supplierLifecycleFor('Suspended');

    expect(can.canDelete).toBe(true);
    expect(can.deleteIsPermanent).toBe(false);
  });

  it('offers a permanent delete on a rejected application', () => {
    // "Raw": turned down, and the server still refuses if it left an order, a
    // payment or a product behind.
    const can = supplierLifecycleFor('Rejected');

    expect(can.canDelete).toBe(true);
    expect(can.deleteIsPermanent).toBe(true);
  });

  it('refuses to delete a trading supplier', () => {
    /*
     * The most important case. A Delete button on an active supplier is one
     * mis-click from the row an operator meant to open, and the server would
     * answer 409 SUSPEND_FIRST — so rendering it teaches them the screen does
     * not know its own rules.
     */
    const can = supplierLifecycleFor('Active');

    expect(can.canDelete).toBe(false);
    expect(can.canSuspend).toBe(true);
  });

  it('refuses to delete an application still under review', () => {
    // Reject it first. Deleting one nobody has ruled on discards the decision
    // along with the row.
    const can = supplierLifecycleFor('Review');

    expect(can.canDelete).toBe(false);
    expect(can.canReject).toBe(true);
  });

  it('never offers a permanent delete where it offers no delete', () => {
    // The two flags must not disagree: `deleteIsPermanent` decides the wording
    // of the confirm, and a screen that reads "Delete permanently?" over a
    // status that cannot be deleted at all is worse than no dialog.
    for (const status of ALL) {
      const can = supplierLifecycleFor(status);
      if (!can.canDelete) {
        expect(can.deleteIsPermanent, `${status} promises a permanent delete it cannot do`).toBe(false);
      }
    }
  });

  it('translates rather than reimplements — Review means pending', () => {
    /*
     * The join. `Review` covers PENDING_REVIEW *and* RESUBMIT_REQUIRED, both of
     * which the server answers with REJECT_FIRST — the same answer `pending`
     * earns. Asserting the two functions agree is what stops this drifting into
     * a second copy of the rule.
     */
    expect(supplierLifecycleFor('Review')).toEqual(lifecycleFor('pending'));
    expect(supplierLifecycleFor('Active')).toEqual(lifecycleFor('active'));
    expect(supplierLifecycleFor('Rejected')).toEqual(lifecycleFor('rejected'));
    expect(supplierLifecycleFor('Suspended')).toEqual(lifecycleFor('suspended'));
  });

  it('an unmapped status offers nothing destructive', () => {
    /*
     * Fail closed. A status added to the database and not handled here must not
     * fall through to a delete button — the operator sees a read-only screen
     * and somebody adds the case deliberately.
     *
     * Cast because the type forbids it; the SERVER does not, and `mapStatus`
     * has a `default` branch precisely because unknown values arrive.
     */
    const can = supplierLifecycleFor('Archived' as Wholesaler['status']);

    expect(can.canDelete).toBe(false);
    expect(can.canSuspend).toBe(false);
    expect(can.canReject).toBe(false);
    expect(can.primary).toBeNull();
  });

  it('every mapped status resolves to a real decision, not the fallback', () => {
    // The other direction: if the translation broke, every status would quietly
    // take the fail-closed branch and the screen would offer nothing at all —
    // which reads as "this supplier is in a strange state" rather than as a bug.
    const offeringSomething = ALL.filter((s) => {
      const can = supplierLifecycleFor(s);
      return can.canDelete || can.canSuspend || can.canReject || can.primary !== null;
    });

    expect(offeringSomething).toEqual(ALL);
  });
});

describe('a REMOVED supplier', () => {
  /*
   * Removal is orthogonal to status. A soft-deleted supplier keeps whatever it
   * carried when it was deleted — usually SUSPENDED — so reading the status
   * alone would offer it Restore access and Delete, for a record that is
   * already gone.
   *
   * The server refuses every one of them: each lifecycle UPDATE requires
   * `deleted_at IS NULL`. So those buttons could only ever produce an error,
   * and a button whose only outcome is an error teaches an operator to stop
   * reading buttons.
   */
  it('earns no lifecycle control, whatever status it kept', () => {
    for (const status of ALL) {
      const can = supplierLifecycleFor(status, true);
      expect(can.canDelete, `${status} removed`).toBe(false);
      expect(can.canSuspend, `${status} removed`).toBe(false);
      expect(can.canReject, `${status} removed`).toBe(false);
      expect(can.primary, `${status} removed`).toBeNull();
    }
  });

  it('is the REMOVAL that decides it, not the status', () => {
    // The other direction, so "everything offers nothing" cannot pass. A live
    // suspended supplier keeps its Restore-access and Delete.
    const live = supplierLifecycleFor('Suspended', false);
    expect(live.primary).toBe('restore');
    expect(live.canDelete).toBe(true);
  });

  it('defaults to NOT removed, so no existing caller changes meaning', () => {
    expect(supplierLifecycleFor('Active')).toEqual(supplierLifecycleFor('Active', false));
  });
});
