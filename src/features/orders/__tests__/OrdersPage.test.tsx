// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Order } from '../types';

/*
 * The API module is the seam.
 *
 * Mocking `request` would test the client too; mocking the four functions in
 * `ordersApi` tests exactly this screen against the contract it was written to
 * — and that contract is checked separately, against the Go handler, in
 * `ordersApi.test.ts`.
 */
const listOrders = vi.fn();
const getOrderStats = vi.fn();
vi.mock('../api/ordersApi', () => ({
  listOrders: (...a: unknown[]) => listOrders(...a),
  getOrderStats: (...a: unknown[]) => getOrderStats(...a),
  getOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

const { OrdersPage } = await import('../pages/OrdersPage');

const ORDERS: Order[] = [
  {
    id: 'ord_9f2a1c7d40',
    retailerId: 'ret_karim_traders',
    status: 'pending',
    totalAmount: 482150,
    discountAmount: 0,
    finalAmount: 482150,
    paymentMethod: 'bkash',
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-01T09:00:00.000Z',
    items: [
      { productId: 'p1', productName: 'Denim roll', unitPrice: 4821.5, quantity: 100, subtotal: 482150 },
    ],
  },
  {
    id: 'ord_3b8e5a1f22',
    retailerId: 'ret_rahman',
    status: 'delivered',
    totalAmount: 12000,
    discountAmount: 500,
    finalAmount: 11500,
    paymentMethod: 'cod',
    createdAt: '2026-06-20T11:00:00.000Z',
    updatedAt: '2026-06-25T08:00:00.000Z',
    items: [],
  },
];

const ok = <T,>(data: T) => Promise.resolve({ ok: true, status: 200, data });

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  listOrders.mockReset();
  getOrderStats.mockReset();
  // Field names taken from internal/order/model.go, not from what the UI
  // happens to read — a fixture built from the component's assumptions can only
  // ever confirm that assumption.
  getOrderStats.mockReturnValue(
    ok({ data: { totalOrders: 2, pendingOrders: 1, totalRevenue: 493650, period: '7d' } }),
  );
});
afterEach(cleanup);

describe('OrdersPage — populated', () => {
  beforeEach(() => {
    listOrders.mockReturnValue(ok({ data: ORDERS, meta: { total: 2, page: 1, limit: 20 } }));
  });

  it('renders a row per order with money in the South Asian grouping', async () => {
    renderPage();
    const rows = await screen.findAllByRole('row');
    // One header row plus one per order.
    expect(rows).toHaveLength(3);
    // ৳4,82,150 — 2-2-3, not ৳482,150.
    expect(screen.getByText('৳4,82,150')).toBeTruthy();
    expect(screen.getByText('৳11,500')).toBeTruthy();
  });

  it('labels each status from the shared table', async () => {
    renderPage();
    expect(await screen.findByText('Pending')).toBeTruthy();
    expect(screen.getByText('Delivered')).toBeTruthy();
  });

  it('makes every row a real link, so orders open in a new tab', async () => {
    /*
     * The reason `rowHref` exists rather than `onRowClick`. An operator working
     * a queue middle-clicks rows; a div with a click handler silently does
     * nothing, and there is no way to tell from the UI that it will.
     */
    renderPage();
    const link = await screen.findByRole('link', { name: 'Order ord_9f2a1c7d40' });
    expect(link.getAttribute('href')).toBe('/orders/ord_9f2a1c7d40');
  });

  it('renders the summary figures above the table', async () => {
    renderPage();
    expect(await screen.findByText(/^Revenue/)).toBeTruthy();
    expect(screen.getByText('৳4,93,650')).toBeTruthy();
  });

  it('names the window the figures cover', async () => {
    /*
     * The endpoint is period-scoped and defaults to 7 days. Labelling the count
     * "Total orders" claimed an all-time figure the server never returned — a
     * platform with 87 orders showing "2" reads as data loss rather than as a
     * week's activity.
     */
    renderPage();
    expect(await screen.findByText('Orders (last 7 days)')).toBeTruthy();
    expect(screen.getByText('Pending (last 7 days)')).toBeTruthy();
  });

  it('reads the field names the server actually sends', async () => {
    /*
     * The regression this pins. The type declared total / pending / delivered /
     * revenue; the server sends totalOrders / pendingOrders / totalRevenue.
     * Every field was optional, so TypeScript was satisfied and all four tiles
     * silently rendered empty.
     */
    renderPage();

    /** The figure rendered inside the tile carrying this label. */
    const tileValue = (label: RegExp) => {
      const labelEl = screen.getByText(label);
      return labelEl.parentElement?.textContent?.replace(labelEl.textContent ?? '', '').trim();
    };

    await screen.findByText(/^Orders \(/);
    expect(tileValue(/^Orders \(/)).toBe('2');        // totalOrders
    expect(tileValue(/^Pending \(/)).toBe('1');       // pendingOrders
    expect(tileValue(/^Revenue \(/)).toBe('৳4,93,650'); // totalRevenue

    // No tile for a figure the payload does not contain — a "Delivered" tile
    // read empty on every load because the server never sends that count.
    expect(screen.queryByText(/^Delivered \(/)).toBeNull();
  });
});

describe('OrdersPage — the filter', () => {
  beforeEach(() => {
    listOrders.mockReturnValue(ok({ data: ORDERS, meta: { total: 2, page: 1, limit: 20 } }));
  });

  it('sends the chosen status to the server and drops the page number', async () => {
    /*
     * The bug this pins: filtering while on page 3 kept `page: 3`, so a filter
     * matching four orders showed an empty table and the operator concluded
     * there were none.
     */
    renderPage();
    await screen.findAllByRole('row');

    fireEvent.click(screen.getByRole('radio', { name: 'Delivered' }));

    await waitFor(() => {
      expect(listOrders).toHaveBeenLastCalledWith({ page: 1, limit: 20, status: 'delivered' });
    });
  });

  it('asks for no status at all when showing everything', async () => {
    renderPage();
    await waitFor(() => {
      expect(listOrders).toHaveBeenCalledWith({ page: 1, limit: 20, status: 'All' });
    });
  });
});

describe('OrdersPage — the states that are not data', () => {
  it('shows a skeleton while the first page loads', () => {
    listOrders.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelector('[aria-busy="true"], [role="status"]')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('offers a retry when the list fails, and does not blame the operator', async () => {
    listOrders.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('Orders could not be loaded')).toBeTruthy();
    expect(screen.getByRole('button', { name: /retry|try again/i })).toBeTruthy();
    // Never the raw error.
    expect(screen.queryByText(/boom/)).toBeNull();
  });

  it('distinguishes "no orders at all" from "none match this filter"', async () => {
    /*
     * Conflating these tells an operator the platform has no orders when in
     * fact they filtered to `cancelled` and there are none — two different
     * facts, and only one of them means something is wrong.
     */
    listOrders.mockReturnValue(ok({ data: [], meta: { total: 0, page: 1, limit: 20 } }));
    renderPage();
    expect(await screen.findByText('No orders yet')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: 'Cancelled' }));
    expect(await screen.findByText('No cancelled orders')).toBeTruthy();
  });
});

describe('OrdersPage — paging', () => {
  it('disables Previous on the first page and Next on the last', async () => {
    listOrders.mockReturnValue(ok({ data: ORDERS, meta: { total: 2, page: 1, limit: 20 } }));
    renderPage();
    await screen.findAllByRole('row');
    expect(screen.getByRole('button', { name: 'Previous' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(true);
  });

  it('advances the page and asks the server for it', async () => {
    listOrders.mockReturnValue(ok({ data: ORDERS, meta: { total: 45, page: 1, limit: 20 } }));
    renderPage();
    await screen.findAllByRole('row');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(listOrders).toHaveBeenLastCalledWith({ page: 2, limit: 20, status: 'All' });
    });
  });

  it('holds Next while a page is in flight, so no page is skipped unseen', async () => {
    /*
     * `placeholderData` keeps the current rows on screen while the next page
     * loads. Without this hold, a second click would advance to page 3 while
     * page 1 is still displayed — the operator would step over a page of orders
     * they never saw. The hold is why the walk below needs `advance()`.
     */
    listOrders.mockReturnValue(ok({ data: ORDERS, meta: { total: 45, page: 1, limit: 20 } }));
    renderPage();
    await screen.findAllByRole('row');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('never lets the page run past the last one', async () => {
    // 45 orders at 20 a page is 3 pages. Clicking Next on 3 must not ask for 4.
    listOrders.mockReturnValue(ok({ data: ORDERS, meta: { total: 45, page: 1, limit: 20 } }));
    renderPage();
    await screen.findAllByRole('row');

    /** Clicks Next once the previous page has settled. */
    const advance = async (expected: number) => {
      const next = () => screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement;
      await waitFor(() => expect(next().disabled).toBe(false));
      fireEvent.click(next());
      await waitFor(() =>
        expect(listOrders).toHaveBeenLastCalledWith(expect.objectContaining({ page: expected })),
      );
    };

    await advance(2);
    await advance(3);

    // Page 3 of 3 — Next stays disabled for good, not just while fetching.
    await waitFor(() => {
      expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
    });
    expect(listOrders).not.toHaveBeenCalledWith(expect.objectContaining({ page: 4 }));
  });
});

describe('OrdersPage — the table itself', () => {
  it('carries a caption naming the current filter', async () => {
    listOrders.mockReturnValue(ok({ data: ORDERS, meta: { total: 2, page: 1, limit: 20 } }));
    renderPage();
    const table = await screen.findByRole('table');
    expect(within(table).getByText(/all statuses/i)).toBeTruthy();
  });
});
