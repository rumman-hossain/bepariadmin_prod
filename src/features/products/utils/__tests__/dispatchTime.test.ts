import { describe, it, expect } from 'vitest';
import {
  DISPATCH_QUICK_OPTIONS,
  formatDispatchDisplay,
  formatDispatchTime,
  isQuickDispatchOption,
  parseDispatchTime,
} from '../dispatchTime';

/**
 * Dispatch time is stored as a single opaque string — either a quick-pick label
 * like "2 Day" or an encoded value like "5D".
 *
 * `DispatchTimeField` now derives both of its inputs from that one string
 * rather than mirroring it into local state, which means the parse/format
 * round-trip is load-bearing: if it is lossy, the operator's typing is silently
 * altered as they type. It had no tests at all.
 */

describe('parse/format round-trip', () => {
  it.each([
    ['1', 'H'],
    ['12', 'H'],
    ['1', 'D'],
    ['30', 'D'],
    ['999', 'D'],
  ] as const)('survives a round-trip for %s%s', (value, unit) => {
    const encoded = formatDispatchTime(value, unit);
    expect(parseDispatchTime(encoded)).toEqual({ value, unit });
  });

  it('round-trips every quick option back to a usable value', () => {
    // The quick picks are stored as their label, not as an encoded value, so
    // they take a different branch on the way back out.
    for (const option of DISPATCH_QUICK_OPTIONS) {
      const parsed = parseDispatchTime(option);
      expect(parsed.value).toMatch(/^\d+$/);
      expect(['H', 'D']).toContain(parsed.unit);
    }
  });
});

describe('formatDispatchTime', () => {
  it('encodes the unit as a suffix', () => {
    expect(formatDispatchTime('5', 'D')).toBe('5D');
    expect(formatDispatchTime('6', 'H')).toBe('6H');
  });

  it('returns an empty string for an empty value', () => {
    /*
     * This is why `DispatchTimeField` keeps one piece of local state. A unit
     * chosen before any number is typed has nowhere to be stored, because the
     * encoded form of "no number" is the empty string regardless of unit.
     */
    expect(formatDispatchTime('', 'D')).toBe('');
    expect(formatDispatchTime('', 'H')).toBe('');
  });
});

describe('parseDispatchTime', () => {
  it('defaults an empty value to hours with no number', () => {
    expect(parseDispatchTime('')).toEqual({ value: '', unit: 'H' });
  });

  it('maps each quick label to its numeric equivalent', () => {
    expect(parseDispatchTime('1 Day')).toEqual({ value: '1', unit: 'D' });
    expect(parseDispatchTime('3 Day')).toEqual({ value: '3', unit: 'D' });
    // A week is stored as seven days, not as its own unit.
    expect(parseDispatchTime('1 Week')).toEqual({ value: '7', unit: 'D' });
  });

  it('reads a day suffix in either case', () => {
    expect(parseDispatchTime('5D')).toEqual({ value: '5', unit: 'D' });
    expect(parseDispatchTime('5d')).toEqual({ value: '5', unit: 'D' });
  });

  it('reads an hour suffix in either case', () => {
    expect(parseDispatchTime('8H')).toEqual({ value: '8', unit: 'H' });
    expect(parseDispatchTime('8h')).toEqual({ value: '8', unit: 'H' });
  });

  it('refuses a malformed value rather than guessing at it', () => {
    // "2DH" has two unit markers and no single correct reading. Returning an
    // empty value makes the caller show the raw stored string, which tells the
    // operator what to fix — guessing a unit would quietly change the meaning
    // of a supplier's dispatch commitment.
    expect(parseDispatchTime('2DH')).toEqual({ value: '', unit: 'H' });
    expect(formatDispatchDisplay('2DH')).toBe('2DH');
  });

  it('ignores surrounding whitespace', () => {
    expect(parseDispatchTime(' 5D ')).toEqual({ value: '5', unit: 'D' });
    expect(parseDispatchTime('5 D')).toEqual({ value: '5', unit: 'D' });
  });

  it('does not treat an arbitrary word containing "h" as hours', () => {
    /*
     * The bug this replaced: `/H/i` matched any text containing the letter, so
     * "Same day dispatch" had the "h" stripped and the remainder was parsed as
     * a number — rendering as "NaN hours" on the product detail screen.
     */
    expect(parseDispatchTime('Same day dispatch')).toEqual({ value: '', unit: 'H' });
    expect(formatDispatchDisplay('Same day dispatch')).toBe('Same day dispatch');
  });

  it('returns no value for something it cannot read', () => {
    // Better an empty field the operator refills than a wrong number they
    // do not notice.
    expect(parseDispatchTime('soon')).toEqual({ value: '', unit: 'H' });
    expect(parseDispatchTime('!!')).toEqual({ value: '', unit: 'H' });
  });
});

describe('isQuickDispatchOption', () => {
  it('recognises every quick option', () => {
    for (const option of DISPATCH_QUICK_OPTIONS) {
      expect(isQuickDispatchOption(option)).toBe(true);
    }
  });

  it('rejects an encoded value and anything else', () => {
    // The field uses this to decide whether to clear the custom input, so a
    // false positive would blank a number the operator just typed.
    for (const value of ['5D', '2 Days', '1 day', '', 'Tomorrow']) {
      expect(isQuickDispatchOption(value)).toBe(false);
    }
  });
});

describe('formatDispatchDisplay', () => {
  it('shows an em dash when nothing is set', () => {
    expect(formatDispatchDisplay('')).toBe('—');
  });

  it('passes a quick label through as written', () => {
    expect(formatDispatchDisplay('2 Day')).toBe('2 Day');
  });

  it('expands an encoded value into words', () => {
    expect(formatDispatchDisplay('5D')).toBe('5 days');
    expect(formatDispatchDisplay('8H')).toBe('8 hours');
  });

  it('uses the singular for exactly one', () => {
    expect(formatDispatchDisplay('1D')).toBe('1 day');
    expect(formatDispatchDisplay('1H')).toBe('1 hour');
  });

  it('shows an unreadable value verbatim rather than pretending', () => {
    // Showing "0 hours" for a value we could not parse would be worse than
    // showing the operator what is actually stored.
    expect(formatDispatchDisplay('whenever')).toBe('whenever');
  });
});
