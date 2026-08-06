/**
 * Status vocabulary — the tone table and the string helpers.
 *
 * Kept out of the component module so that file exports only components,
 * matching `format.ts` and keeping Fast Refresh working.
 */
export type StatusTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

/**
 * Domain status → tone.
 *
 * Keys are normalised (lowercased, non-alphanumerics collapsed to `_`) so the
 * backend's `payment_pending`, the mobile app's "Payment Pending" and a
 * hand-typed "payment pending" all land on the same entry. The previous map was
 * literal-keyed and carried both `Active` and `active` as separate rows while
 * missing `Inactive` entirely — anything unmatched fell silently to grey, which
 * is indistinguishable from a genuine neutral state.
 *
 * Covers both state machines the console drives:
 *   wholesalers — INIT → STORE_CREATED → PENDING_REVIEW → APPROVED | REJECTED
 *                 | RESUBMIT_REQUIRED → SUSPENDED
 *   orders      — pending → inventory_reserved → payment_pending → confirmed
 *                 → processing → dispatched → delivered, + cancelled | refunded
 */
const TONE_BY_STATUS: Record<string, StatusTone> = {
  // Terminal good
  approved: 'success',
  active: 'success',
  delivered: 'success',
  settled: 'success',
  confirmed: 'success',
  payment_verified: 'success',
  in_stock: 'success',
  resolved: 'success',

  // In flight
  processing: 'info',
  dispatched: 'info',
  inventory_reserved: 'info',
  supplier_accepted: 'info',
  label_generated: 'info',
  parcel_is_ready: 'info',
  store_created: 'info',

  // Waiting on someone
  pending: 'warning',
  pending_review: 'warning',
  pending_approval: 'warning',
  payment_pending: 'warning',
  awaiting_partial_payment: 'warning',
  resubmit_required: 'warning',
  review: 'warning',
  low_stock: 'warning',

  // Bad
  rejected: 'danger',
  suspended: 'danger',
  out_of_stock: 'danger',
  failed: 'danger',
  flagged: 'danger',

  // Absent rather than good or bad
  cancelled: 'neutral',
  refunded: 'neutral',
  draft: 'neutral',
  archived: 'neutral',
  inactive: 'neutral',
  init: 'neutral',
  unknown: 'neutral',
};

export function normalise(status: string): string {
  return status.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** `payment_pending` → `Payment pending`. Sentence case, not Title Case. */
export function humanise(status: string): string {
  const words = normalise(status).split('_').filter(Boolean);
  if (words.length === 0) return status;
  return words.join(' ').replace(/^./, (c) => c.toUpperCase());
}

/** The tone alone, without the chrome. */
export function statusTone(status: string): StatusTone {
  return TONE_BY_STATUS[normalise(status)] ?? 'neutral';
}
