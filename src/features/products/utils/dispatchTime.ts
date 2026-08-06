/** Dispatch time helpers — aligned with wholesaleapp-client formatters.ts */

export type DispatchUnit = 'H' | 'D';

export interface DispatchTimeParsed {
  value: string;
  unit: DispatchUnit;
}

export const DISPATCH_QUICK_OPTIONS = ['1 Day', '2 Day', '3 Day', '5 Day', '1 Week'] as const;

const DISPATCH_LABEL_MAP: Record<string, DispatchTimeParsed> = {
  '1 Day': { value: '1', unit: 'D' },
  '2 Day': { value: '2', unit: 'D' },
  '3 Day': { value: '3', unit: 'D' },
  '5 Day': { value: '5', unit: 'D' },
  '1 Week': { value: '7', unit: 'D' },
};

export function isQuickDispatchOption(value: string): boolean {
  return DISPATCH_QUICK_OPTIONS.includes(value as (typeof DISPATCH_QUICK_OPTIONS)[number]);
}

export function parseDispatchTime(dispatchTime: string): DispatchTimeParsed {
  if (!dispatchTime) return { value: '', unit: 'H' };

  if (DISPATCH_LABEL_MAP[dispatchTime]) {
    return DISPATCH_LABEL_MAP[dispatchTime];
  }

  /*
   * Match digits followed by the unit suffix, rather than "contains the letter".
   *
   * The previous version tested `.includes('D')` — case-SENSITIVE — while the
   * hour branch used `/H/i` — case-INSENSITIVE. Two consequences, both real:
   *
   *   - `"5d"` fell past the day branch, failed the hour test, and parsed as
   *     empty. A value written in lowercase silently lost its number.
   *   - Any stored text containing the letter "h" matched the HOUR branch and
   *     had that letter stripped out. `"Same day dispatch"` became the "number"
   *     `"Same day dispatc"`, which `formatDispatchDisplay` then rendered as
   *     **"NaN hours"**.
   *
   * Requiring an actual number means anything unrecognised falls through to the
   * empty result, and callers show the raw stored value instead of arithmetic
   * on a word.
   */
  const match = /^\s*(\d+)\s*([DdHh])\s*$/.exec(dispatchTime);
  if (match) {
    return {
      value: match[1]!,
      unit: match[2]!.toUpperCase() === 'D' ? 'D' : 'H',
    };
  }

  return { value: '', unit: 'H' };
}

export function formatDispatchTime(value: string, unit: DispatchUnit): string {
  if (!value) return '';
  return `${value}${unit}`;
}

/** Human-readable label for summary/detail views */
export function formatDispatchDisplay(dispatchTime: string): string {
  if (!dispatchTime) return '—';
  if (isQuickDispatchOption(dispatchTime)) return dispatchTime;

  const parsed = parseDispatchTime(dispatchTime);
  if (!parsed.value) return dispatchTime;

  const n = Number(parsed.value);
  // Belt and braces: showing "NaN hours" is worse than showing whatever is
  // actually stored, which at least tells the operator what to correct.
  if (!Number.isFinite(n)) return dispatchTime;

  if (parsed.unit === 'H') {
    return n === 1 ? '1 hour' : `${n} hours`;
  }
  return n === 1 ? '1 day' : `${n} days`;
}
