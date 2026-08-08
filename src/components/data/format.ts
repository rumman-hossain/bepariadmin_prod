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

/**
 * The zone is pinned for the same reason the locale is.
 *
 * The note above says passing `undefined` as the locale is not an option
 * because "it follows the operator's browser, so two people looking at the same
 * order saw different dates and neither could tell which was which". Leaving
 * the ZONE unset does exactly that, and the locale being fixed hides it: the
 * format agrees while the day does not.
 *
 * The backend stores UTC. A product created at 17:00 UTC is 23:00 the same day
 * in Dhaka and 02:00 the NEXT day in Tokyo — measured, on this row:
 * `WHL-00007-GT-TS-TT-006`, created `2026-06-04 17:00Z`, read as 4 June from
 * Dhaka and 5 June from a browser set to Asia/Tokyo. Roughly a quarter of every
 * day falls in that window, and an operator abroad, or on a machine whose clock
 * settings nobody checked, silently reads a different date from the colleague
 * beside them.
 *
 * This is a Bangladeshi marketplace: the business day is Dhaka's, so a
 * timestamp means what it means there, and it must read the same to everyone
 * looking at it. If operators outside Bangladesh should ever see their own
 * local time, that is a deliberate feature with a UI for it, not a default
 * inherited from whatever the browser happened to be set to.
 */
const BUSINESS_TIME_ZONE = 'Asia/Dhaka';

const DATE_PARTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
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
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);
}

/**
 * "5h", "2d", "3w" — how long ago, in the coarsest unit that still says
 * something.
 *
 * For a QUEUE, where the question is "how long has this been waiting?" and the
 * answer only has to be good enough to sort by eye. An exact timestamp answers
 * a different question and takes four times the width to do it, which is why
 * this exists rather than reusing `formatDateTime` in a narrow column.
 *
 * Deliberately not `Intl.RelativeTimeFormat`: that produces "2 days ago", which
 * is prose, and prose does not line up down a column.
 */
export function formatAge(
  value: string | number | Date | null | undefined,
  now: Date = new Date(),
): string {
  const date = toDate(value);
  if (!date) return '—';

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  // A clock skew between the browser and the server can put a just-created row
  // slightly in the future. "now" is truthful and "-3s" is not.
  if (seconds < 60) return 'now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
