import { describe, it, expect } from 'vitest';
import { lifecycleFor } from './deleteAffordance';

/**
 * Which controls a status earns — the rule the detail header renders.
 *
 * Delete is the reason this is a function rather than six JSX conditions.
 * Spreading it across the markup is how "Delete permanently" ends up on a screen
 * it was never meant to appear on, and nothing would catch it.
 */
describe('lifecycleFor', () => {
  it('a suspended shop can be deleted, and the delete only HIDES', () => {
    const can = lifecycleFor('suspended');
    expect(can.canDelete).toBe(true);
    // A suspended shop has almost always traded. Its orders and payments are
    // not ours to erase, so the button must not offer to.
    expect(can.deleteIsPermanent).toBe(false);
    expect(can.primary).toBe('restore');
  });

  it('a rejected application can be deleted PERMANENTLY', () => {
    const can = lifecycleFor('rejected');
    expect(can.canDelete).toBe(true);
    expect(can.deleteIsPermanent).toBe(true);
    // Nothing to approve or restore: rejecting is the end of that road.
    expect(can.primary).toBeNull();
  });

  it('an ACTIVE shop offers no delete at all', () => {
    /*
     * Absent, not present-and-refusing. A button that exists only to say no
     * teaches an operator to stop reading buttons — and Delete sits one
     * mis-click from the row they meant to open.
     */
    const can = lifecycleFor('active');
    expect(can.canDelete).toBe(false);
    expect(can.canSuspend).toBe(true);
  });

  it('a PENDING application offers no delete either — reject it first', () => {
    const can = lifecycleFor('pending');
    expect(can.canDelete).toBe(false);
    expect(can.canReject).toBe(true);
    expect(can.primary).toBe('approve');
  });

  it('only pending can be rejected', () => {
    // The restriction IS the safety: `rejected` is the one status a permanent
    // delete is reachable from, so rejecting an ACTIVE shop would make
    // "reject, then delete" a two-click route to erasing a trading shop.
    for (const status of ['active', 'suspended', 'rejected']) {
      expect(lifecycleFor(status).canReject).toBe(false);
    }
  });

  it('only active can be suspended', () => {
    for (const status of ['pending', 'suspended', 'rejected']) {
      expect(lifecycleFor(status).canSuspend).toBe(false);
    }
  });

  it('an unknown status offers nothing destructive', () => {
    /*
     * Fail closed. A state added to the database and not handled here must not
     * fall through to a delete button — somebody adds the case deliberately.
     */
    for (const status of ['', 'archived', 'ACTIVE', 'deleted', 'dormant']) {
      const can = lifecycleFor(status);
      expect(can.canDelete).toBe(false);
      expect(can.canSuspend).toBe(false);
      expect(can.canReject).toBe(false);
    }
  });

  it('no status offers both suspend and delete', () => {
    // They are consecutive steps, not alternatives. Offering both would let an
    // operator skip the one that makes the decision deliberate.
    for (const status of ['active', 'pending', 'suspended', 'rejected']) {
      const can = lifecycleFor(status);
      expect(can.canSuspend && can.canDelete).toBe(false);
    }
  });
});
