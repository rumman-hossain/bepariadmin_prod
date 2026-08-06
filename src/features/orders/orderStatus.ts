import type { BadgeTone } from '@/src/components/data';
import type { Order, OrderStatus } from './types';

/**
 * Order status as data, not as branching inside a component.
 *
 * Everything a screen needs to know about a status — how it reads, what colour
 * it carries, and where it can go next — lives here as a lookup table. The
 * screens then contain no `if (status === 'shipped')` at all, which is what
 * keeps them from growing into the 375-line detail pages elsewhere in this
 * codebase.
 *
 * The transitions mirror the backend's own map. Offering an operator a button
 * the server will reject is worse than not offering it: the failure arrives
 * after the click, out of context, as a toast.
 */

interface StatusMeta {
  label: string;
  tone: BadgeTone;
  /** What this status means, for the detail screen. */
  meaning: string;
  /** Statuses reachable from here. Empty means terminal. */
  next: readonly OrderStatus[];
}

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending: {
    label: 'Pending',
    tone: 'warn',
    meaning: 'Placed by the retailer, not yet accepted by the supplier.',
    next: ['confirmed', 'cancelled'],
  },
  confirmed: {
    label: 'Confirmed',
    tone: 'note',
    meaning: 'Accepted by the supplier. Stock is committed.',
    next: ['processing', 'cancelled'],
  },
  processing: {
    label: 'Processing',
    tone: 'note',
    meaning: 'Being picked and packed.',
    next: ['shipped', 'cancelled'],
  },
  shipped: {
    label: 'Shipped',
    tone: 'brass',
    meaning: 'Handed to the courier. Tracking should be available.',
    next: ['delivered'],
  },
  delivered: {
    label: 'Delivered',
    tone: 'ok',
    meaning: 'Received by the retailer. The order is closed.',
    next: [],
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'bad',
    meaning: 'Stopped before delivery. Any committed stock is released.',
    next: [],
  },
};

const FALLBACK: StatusMeta = {
  label: 'Unknown',
  tone: 'neutral',
  meaning: 'The server reported a status this console does not recognise.',
  next: [],
};

/**
 * Resolves a status the server sent.
 *
 * Deliberately total. The API types `status` as a bare string, so a value added
 * server-side reaches this console before the console knows about it — and the
 * right answer then is to render it plainly, not to crash the row or silently
 * show it as pending.
 */
export function statusMeta(status: string): StatusMeta {
  return ORDER_STATUS_META[status as OrderStatus] ?? { ...FALLBACK, label: status || 'Unknown' };
}

/** Statuses an operator may move this order to. Empty disables the control. */
export function allowedTransitions(status: string): readonly OrderStatus[] {
  return statusMeta(status).next;
}

/**
 * Whether the order is finished, either way.
 *
 * Used to decide if the status control appears at all, so a delivered order
 * does not show a disabled dropdown with nothing in it.
 */
export function isTerminal(status: string): boolean {
  return statusMeta(status).next.length === 0;
}

/**
 * The order's own history, as timeline events.
 *
 * The backend does not expose an event log — it stores `createdAt`, `updatedAt`
 * and the current status, and that is all there is to draw on. So this builds
 * exactly what those three fields support and no more: placed, then the current
 * state as of the last update. It does NOT invent the intermediate steps an
 * order must have passed through, because their timestamps are not recorded and
 * a plausible-looking fabricated history is worse than a short honest one.
 *
 * When `GET /orders/{id}/events` lands (tracked in ADMIN_API_GAPS.md) this
 * function is replaced by the server's log.
 */
export function orderHistory(order: Order): Array<{
  id: string;
  title: string;
  at: string;
  detail?: string;
  tone: BadgeTone;
}> {
  const meta = statusMeta(order.status);
  const events = [
    {
      id: 'placed',
      title: 'Order placed',
      at: order.createdAt,
      detail: order.paymentMethod ? `Payment method: ${order.paymentMethod}` : undefined,
      tone: 'neutral' as BadgeTone,
    },
  ];

  // Only a second entry, and only when the row actually changed after creation.
  if (order.updatedAt && order.updatedAt !== order.createdAt) {
    events.push({
      id: 'current',
      title: meta.label,
      at: order.updatedAt,
      detail: meta.meaning,
      tone: meta.tone,
    });
  }

  return events;
}
