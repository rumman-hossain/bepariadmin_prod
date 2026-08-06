import { describe, it, expect, vi, beforeEach } from 'vitest';

/*
 * The other side of the seam.
 *
 * The screen tests mock `ordersApi` and so cannot catch a wrong URL or a
 * mis-named query parameter. This file checks exactly that, against the shapes
 * in `internal/order/handler.go`:
 *
 *   GET   /api/v1/orders?page&limit&status   (AdminOnly)  → { data, meta }
 *   GET   /api/v1/orders/{id}                (shared)     → { data }
 *   GET   /api/v1/orders/stats               (AdminOnly)
 *   PATCH /api/v1/orders/{id}/status         (AdminOnly)
 */

type RequestArgs = [method: string, path: string, options?: { auth?: boolean; body?: unknown }];

const request = vi.fn((..._args: RequestArgs) =>
  Promise.resolve({ ok: true, status: 200, data: {} }),
);
vi.mock('@/src/api/client', () => ({ request: (...a: RequestArgs) => request(...a) }));

const { listOrders, getOrder, getOrderStats, updateOrderStatus } = await import('../api/ordersApi');

beforeEach(() => request.mockClear());

/** The path this call asked for. */
const call = () => request.mock.calls[0]!;
const path = () => call()[1];

describe('ordersApi — list', () => {
  it('hits the admin collection', () => {
    void listOrders();
    expect(call()[0]).toBe('GET');
    expect(path()).toBe('/api/v1/orders');
  });

  it('passes paging through under the names the handler reads', () => {
    void listOrders({ page: 3, limit: 50 });
    expect(path()).toBe('/api/v1/orders?page=3&limit=50');
  });

  it('omits the status parameter entirely when showing everything', () => {
    /*
     * `status=All` would reach `q.Get("status")` as the literal string "All"
     * and filter every order out. The sentinel is a UI concept and must not
     * cross the wire.
     */
    void listOrders({ page: 1, limit: 20, status: 'All' });
    expect(path()).toBe('/api/v1/orders?page=1&limit=20');
  });

  it('sends a real status when one is chosen', () => {
    void listOrders({ page: 1, limit: 20, status: 'delivered' });
    expect(path()).toContain('status=delivered');
  });

  it('drops page 0, which the server would clamp anyway', () => {
    // `pagination.Page(0)` returns 1 server-side; sending it is noise. `limit`
    // is unaffected and still goes.
    void listOrders({ page: 0, limit: 20 });
    expect(path()).toBe('/api/v1/orders?limit=20');
  });

  it('authenticates', () => {
    void listOrders();
    expect(call()[2]).toMatchObject({ auth: true });
  });
});

describe('ordersApi — single order', () => {
  it('reads one order by id', () => {
    void getOrder('ord_1');
    expect(path()).toBe('/api/v1/orders/ord_1');
  });

  it('reads the stats endpoint, not an order called "stats"', () => {
    // The handler registers /stats before /{id} for exactly this reason.
    void getOrderStats();
    expect(path()).toBe('/api/v1/orders/stats');
  });
});

describe('ordersApi — status transition', () => {
  it('PATCHes the status sub-resource with the new value in the body', () => {
    void updateOrderStatus('ord_1', 'shipped');
    const [method, url, options] = call();
    expect(method).toBe('PATCH');
    expect(url).toBe('/api/v1/orders/ord_1/status');
    expect(options).toMatchObject({ auth: true, body: { status: 'shipped' } });
  });
});
