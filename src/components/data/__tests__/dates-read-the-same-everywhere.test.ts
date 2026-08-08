import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatTime } from '../format';

/**
 * A TIMESTAMP MEANS THE SAME THING TO EVERY OPERATOR.
 *
 * `format.ts` pins the LOCALE with an explicit note: passing `undefined`
 * "follows the operator's browser, so two people looking at the same order saw
 * different dates and neither could tell which was which". The zone was left
 * following the browser, which reproduces precisely that — and the fixed locale
 * hides it, because the format agrees while the day does not.
 *
 * Found on a real row while adding the created/edited column to the product
 * list: `WHL-00007-GT-TS-TT-006`, stored `2026-06-04 17:00Z`, showing 4 June in
 * Dhaka and 5 June on a browser set to Asia/Tokyo.
 *
 * These run under whatever zone the test process has, and the expectations are
 * written out literally rather than derived from a second `Intl` call — a
 * hand-built oracle would be a bare date formatter, which guard G's
 * `no-bare-date-format` forbids for the same reason this bug exists. Literals
 * are also the stronger statement: "4 Jun 2026" is only correct if the zone is
 * pinned, whatever machine runs it. Verified by unpinning the zone and running
 * under both `TZ=Asia/Tokyo` (ahead of Dhaka) and `TZ=UTC` (behind it) — each
 * direction fails a different assertion.
 */

/** 17:00 UTC — 23:00 the same day in Dhaka, 02:00 the NEXT day in Tokyo. */
const LATE_IN_UTC = '2026-06-04T17:00:00Z';
/** 20:00 UTC — already the next day in Dhaka (02:00). */
const NEXT_DAY_IN_DHAKA = '2026-06-04T20:00:00Z';

describe('dates are rendered in the business timezone', () => {
  it('reads a late-UTC timestamp as the Dhaka day', () => {
    expect(formatDate(LATE_IN_UTC)).toBe('4 Jun 2026');
  });

  it('rolls over when Dhaka rolls over, not when UTC does', () => {
    expect(formatDate(NEXT_DAY_IN_DHAKA)).toBe('5 Jun 2026');
  });

  it('applies to the time of day as well', () => {
    // 17:00Z is 23:00 in Dhaka. A time rendered in the reader's own zone is the
    // same defect one unit smaller, and it is the one that misreads a dispatch
    // cut-off.
    expect(formatTime(LATE_IN_UTC)).toBe('23:00');
    expect(formatDateTime(LATE_IN_UTC)).toContain('4 Jun 2026');
    expect(formatDateTime(LATE_IN_UTC)).toContain('23:00');
  });
});
