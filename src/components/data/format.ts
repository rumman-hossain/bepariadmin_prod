/**
 * Formatting helpers, kept out of the component modules so those export only
 * components (Fast Refresh, `react-refresh/only-export-components`).
 *
 * See Money.tsx for why the grouping locale is what it is.
 */

/** South Asian 2-2-3 grouping with Latin digits. */
const GROUPING_LOCALE = 'en-IN';

export interface FormatMoneyOptions {
  /** Show paisa. Default false — whole taka is how these figures are quoted. */
  decimals?: boolean;
  /** Include the ৳ sign. Default true. */
  symbol?: boolean;
}

export function formatMoney(
  amount: number | string | null | undefined,
  { decimals = false, symbol = true }: FormatMoneyOptions = {},
): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;

  // An unparseable amount must not render as "৳NaN". Callers show EmptyValue.
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';

  const digits = decimals ? 2 : 0;
  // Format the magnitude, then place the sign outside the symbol. Prefixing ৳
  // to the signed output yields "৳-5,000", which puts the minus where a digit
  // is expected and reads as part of the amount rather than as its sign.
  const body = new Intl.NumberFormat(GROUPING_LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value));

  const sign = value < 0 ? '-' : '';
  return symbol ? `${sign}৳${body}` : `${sign}${body}`;
}

/**
 * Day-first dates: "5 Jan 2026".
 *
 * `en-GB` rather than `en-BD`, which is not a locale any engine carries — it
 * falls back to plain `en` and silently produces the US month-first order. That
 * fallback is exactly how this app ended up showing "Jan 5, 2026" on the product
 * screen and "5/1/2026" on the order screen, from six separate hand-rolled
 * formatters. Bangladesh writes the day first.
 *
 * Passing `undefined` as the locale is not an option either: it follows the
 * operator's browser, so two people looking at the same order saw different
 * dates and neither could tell which was which.
 */
const DATE_LOCALE = 'en-GB';

const DATE_PARTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

/** "5 Jan 2026". Returns the input unchanged if it is not a usable date. */
export function formatDate(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return typeof value === 'string' ? value : '—';
  return new Intl.DateTimeFormat(DATE_LOCALE, DATE_PARTS).format(date);
}

/** "5 Jan 2026, 14:30". For anything where the time of day carries meaning. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return typeof value === 'string' ? value : '—';
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    ...DATE_PARTS,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** "14:30". For a same-session timestamp, where the date is not in question. */
export function formatTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(DATE_LOCALE, { hour: '2-digit', minute: '2-digit' }).format(date);
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
