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

  if (dispatchTime.includes('D')) {
    return { value: dispatchTime.replace(/D/gi, '').trim(), unit: 'D' };
  }

  if (/H/i.test(dispatchTime)) {
    return { value: dispatchTime.replace(/H/gi, '').trim(), unit: 'H' };
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
  if (parsed.unit === 'H') {
    return n === 1 ? '1 hour' : `${n} hours`;
  }
  return n === 1 ? '1 day' : `${n} days`;
}
