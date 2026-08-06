import { describe, it, expect } from 'vitest';
import {
  ORDER_STATUS_META,
  statusMeta,
  allowedTransitions,
  isTerminal,
  orderHistory,
} from '../orderStatus';
import { ORDER_STATUSES, type Order } from '../types';

const ORDER: Order = {
  id: 'ord_01HQ',
  retailerId: 'ret_88',
  status: 'shipped',
  totalAmount: 482150,
  discountAmount: 0,
  finalAmount: 482150,
  paymentMethod: 'bkash',
  createdAt: '2026-07-01T09:00:00.000Z',
  updatedAt: '2026-07-04T14:30:00.000Z',
};

describe('order status — the table the screens read instead of branching', () => {
  it('covers every status the API can send', () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_META[status]).toBeDefined();
    }
  });

  it('renders an unknown status instead of dropping or mislabelling it', () => {
    /*
     * `status` is a bare string on the wire. A value added server-side reaches
     * this console before the console knows about it, and showing it as
     * "Pending" — the shape a `?? ORDER_STATUS_META.pending` fallback would
     * give — would be a lie about an order's actual state.
     */
    const meta = statusMeta('awaiting_customs');
    expect(meta.label).toBe('awaiting_customs');
    expect(meta.tone).toBe('neutral');
    expect(meta.next).toEqual([]);
  });

  it('falls back to a readable label for an empty status', () => {
    expect(statusMeta('').label).toBe('Unknown');
  });
});

describe('order status — transitions', () => {
  it('offers only reachable next states', () => {
    expect(allowedTransitions('pending')).toEqual(['confirmed', 'cancelled']);
    expect(allowedTransitions('shipped')).toEqual(['delivered']);
  });

  it('never offers a transition back into an earlier state', () => {
    // A cycle here would let an operator walk an order backwards through the
    // funnel, and the backend would reject it on the second hop.
    const order = ORDER_STATUSES.indexOf.bind(ORDER_STATUSES);
    for (const from of ORDER_STATUSES) {
      for (const to of allowedTransitions(from)) {
        if (to === 'cancelled') continue; // cancelling is allowed from anywhere live
        expect(order(to)).toBeGreaterThan(order(from));
      }
    }
  });

  it('treats delivered and cancelled as terminal', () => {
    expect(isTerminal('delivered')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('pending')).toBe(false);
  });

  it('treats an unrecognised status as terminal, so no control is offered', () => {
    // Guessing a transition map for a status we do not know is how an operator
    // ends up clicking a button the server refuses.
    expect(isTerminal('awaiting_customs')).toBe(true);
  });

  it('can cancel from every non-terminal state', () => {
    for (const status of ORDER_STATUSES) {
      if (isTerminal(status) || status === 'shipped') continue;
      expect(allowedTransitions(status)).toContain('cancelled');
    }
  });
});

describe('order history', () => {
  it('records placement from createdAt', () => {
    const events = orderHistory(ORDER);
    expect(events[0]).toMatchObject({ id: 'placed', at: ORDER.createdAt });
    expect(events[0]!.detail).toContain('bkash');
  });

  it('adds the current state when the order has moved', () => {
    const events = orderHistory(ORDER);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ title: 'Shipped', at: ORDER.updatedAt, tone: 'brass' });
  });

  it('shows one event for an order that has never changed', () => {
    /*
     * The honest floor. The backend stores no event log, so a never-updated
     * order genuinely has one recorded moment — and inventing "Confirmed" and
     * "Processing" rows with made-up timestamps would put fiction on an audit
     * screen.
     */
    const fresh = { ...ORDER, status: 'pending', updatedAt: ORDER.createdAt };
    expect(orderHistory(fresh)).toHaveLength(1);
  });

  it('never fabricates the intermediate steps a delivered order passed through', () => {
    const delivered = { ...ORDER, status: 'delivered' };
    const titles = orderHistory(delivered).map((e) => e.title);
    expect(titles).not.toContain('Confirmed');
    expect(titles).not.toContain('Processing');
    expect(titles).not.toContain('Shipped');
  });
});
