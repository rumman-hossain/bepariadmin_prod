import { describe, it, expect } from 'vitest';
import { submissionSummary } from '../submissionSummary';

/**
 * The case this function exists for is the third one.
 *
 * A valid form with an unattached NID refused to submit and announced
 * "0 fields need attention — they are marked below". Nothing was marked, no
 * request was sent, and the operator was looking at a button that appeared to
 * do nothing.
 */
describe('submissionSummary', () => {
  it('names one bad field', () => {
    expect(submissionSummary(1, [])).toBe('One field needs attention — marked below.');
  });

  it('counts several bad fields', () => {
    expect(submissionSummary(3, [])).toBe('3 fields need attention — marked below.');
  });

  it('NEVER reports a count of zero when documents are what is missing', () => {
    const msg = submissionSummary(0, ['Owner NID']);
    expect(msg).not.toMatch(/\b0\b/);
    expect(msg).toContain('Owner NID');
    expect(msg).toContain('still needs to be uploaded');
  });

  it('names every missing document rather than counting them', () => {
    const msg = submissionSummary(0, ['Owner NID', 'Trade Licence']);
    expect(msg).toContain('Owner NID and Trade Licence');
    expect(msg).toContain('still need to be uploaded');
  });

  it('reports fields and documents together, not whichever it noticed first', () => {
    const msg = submissionSummary(2, ['Owner NID']);
    expect(msg).toContain('2 fields need attention');
    expect(msg).toContain('Owner NID');
  });

  it('never claims there is nothing wrong', () => {
    // Should not be reachable — the summary only renders on a blocked submit —
    // but silence here would recreate the original bug.
    expect(submissionSummary(0, [])).toMatch(/could not be submitted/i);
  });
});
