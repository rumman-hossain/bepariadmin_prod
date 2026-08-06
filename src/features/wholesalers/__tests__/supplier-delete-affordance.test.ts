import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { supplierLifecycleFor } from '../utils/lifecycle';
import type { Wholesaler } from '@/src/types/domain';

/**
 * THE RULE IS TESTED. THIS IS THE CALL SITE.
 *
 * `utils/lifecycle.test.ts` proves `supplierLifecycleFor` decides correctly.
 * That is worth nothing if the screen decides for itself — and this project
 * keeps relearning it: a rule gets a test, the one place that uses it does not,
 * and the bug ships between them.
 *
 * The specific failure this closes: the header already renders Suspend, Reject
 * and Activate from hand-written `w.status === '…'` conditions. Adding Delete
 * the same way would put "Delete permanently" one edit away from a trading
 * supplier, with the rule sitting correct and unconsulted in a file next door.
 */

const SOURCE = readFileSync(resolve(__dirname, '..', 'pages', 'DetailsPage.tsx'), 'utf8');

describe('the supplier screen consults the rule', () => {
  it('renders Delete from the affordance, not from a status comparison', () => {
    expect(SOURCE).toContain('supplierLifecycleFor');
    expect(SOURCE).toContain('can.canDelete &&');
  });

  it('takes the confirm wording from the same decision', () => {
    // Two acts, two sentences. `deleteIsPermanent` is what tells them apart, so
    // a dialog that ignores it says the wrong thing about the one action an
    // operator cannot undo.
    expect(SOURCE).toContain('can.deleteIsPermanent');
  });

  it('never hard-codes a status to decide whether to delete', () => {
    /*
     * The regression this exists for. `w.status === 'Suspended'` reads
     * perfectly and is exactly how the rule gets bypassed — the screen would
     * then disagree with the server the first time a status is added.
     */
    const deleteConditions = SOURCE.match(/w\.status === '[A-Za-z]+'[^\n]*[Dd]elete/g);
    expect(
      deleteConditions,
      `Delete is gated on a hard-coded status: ${deleteConditions?.join(', ')}`,
    ).toBeNull();
  });

  it('the check can fail', () => {
    // A guard that cannot fail reads as coverage.
    expect(SOURCE).not.toContain('aStringThatIsDefinitelyNotInThisFile');
    expect(SOURCE.length).toBeGreaterThan(1000);
  });
});

/**
 * AND THE SCREEN NEVER OFFERS WHAT THE SERVER REFUSES.
 *
 * The affordance and `wholesalerDeleteModeFor` in the Go service are two
 * halves of one rule, written in two languages. This asserts they agree on
 * every status the console can hold — the table is the contract, kept here in
 * the words the SERVER answers with so a drift is readable.
 */
describe('the console and the server agree', () => {
  const CONTRACT: Array<{
    status: Wholesaler['status'];
    serverAnswers: 'soft' | 'hard' | 'SUSPEND_FIRST' | 'REJECT_FIRST';
  }> = [
    { status: 'Suspended', serverAnswers: 'soft' },
    { status: 'Rejected', serverAnswers: 'hard' },
    { status: 'Active', serverAnswers: 'SUSPEND_FIRST' },
    { status: 'Review', serverAnswers: 'REJECT_FIRST' },
  ];

  for (const { status, serverAnswers } of CONTRACT) {
    it(`${status}: the button matches what the server would do`, () => {
      const can = supplierLifecycleFor(status);
      const serverWouldDelete = serverAnswers === 'soft' || serverAnswers === 'hard';

      expect(
        can.canDelete,
        serverWouldDelete
          ? `the screen hides Delete on ${status}, which the server would accept`
          : `the screen offers Delete on ${status}, which the server refuses with ${serverAnswers}`,
      ).toBe(serverWouldDelete);

      if (serverWouldDelete) {
        expect(
          can.deleteIsPermanent,
          `the confirm promises the wrong kind of delete for ${status}`,
        ).toBe(serverAnswers === 'hard');
      }
    });
  }
});
