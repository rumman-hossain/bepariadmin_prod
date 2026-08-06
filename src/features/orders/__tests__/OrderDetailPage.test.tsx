// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Order } from '../types';

const getOrder = vi.fn();
const updateOrderStatus = vi.fn();
vi.mock('../api/ordersApi', () => ({
  getOrder: (...a: unknown[]) => getOrder(...a),
  updateOrderStatus: (...a: unknown[]) => updateOrderStatus(...a),
  listOrders: vi.fn(),
  getOrderStats: vi.fn(),
}));

const { OrderDetailPage } = await import('../pages/OrderDetailPage');

const ORDER: Order = {
  id: 'ord_9f2a1c7d4088',
  retailerId: 'ret_karim_traders',
  wholesalerId: 'whl_elegant',
  status: 'processing',
  totalAmount: 482150,
  discountAmount: 5000,
  finalAmount: 477150,
  paymentMethod: 'bkash',
  shippingAddress: { line1: '14 Bangabandhu Ave', area: 'Motijheel', district: 'Dhaka' },
  createdAt: '2026-07-01T09:00:00.000Z',
  updatedAt: '2026-07-04T14:30:00.000Z',
  items: [
    { productId: 'p_denim', productName: 'Denim roll', variationName: 'Indigo / 12oz', unitPrice: 4821.5, quantity: 100, subtotal: 482150 },
  ],
};

const ok = <T,>(data: T) => Promise.resolve({ ok: true, status: 200, data });

function renderDetail(id = ORDER.id) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/orders/${id}`]}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/orders" element={<p>Orders list</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getOrder.mockReset();
  updateOrderStatus.mockReset();
  getOrder.mockReturnValue(ok({ data: ORDER }));
});
afterEach(cleanup);

describe('OrderDetailPage — the order', () => {
  it('shows the line items with unit price and subtotal', async () => {
    renderDetail();
    expect(await screen.findByText('Denim roll')).toBeTruthy();
    expect(screen.getByText('Indigo / 12oz')).toBeTruthy();
    // Paisa, because qty x unit must visibly equal the subtotal beside it.
    expect(screen.getByText('৳4,821.50')).toBeTruthy();
    expect(screen.getAllByText('৳4,82,150.00').length).toBeGreaterThan(0);
  });

  it('renders the discount as a negative, not as a bare figure', async () => {
    // ৳5,000 next to "Discount" is ambiguous — it reads as an amount charged.
    renderDetail();
    expect(await screen.findByText('-৳5,000.00')).toBeTruthy();
  });

  it('flattens the free-form shipping address into something legible', async () => {
    renderDetail();
    expect(await screen.findByText('14 Bangabandhu Ave, Motijheel, Dhaka')).toBeTruthy();
  });

  it('says why a field is empty rather than showing a bare dash', async () => {
    getOrder.mockReturnValue(ok({ data: { ...ORDER, trackingId: undefined } }));
    renderDetail();
    const tracking = await screen.findByText('Tracking');
    const row = tracking.closest('div');
    expect(within(row!).getByText(/not yet dispatched/i)).toBeTruthy();
  });

  it('builds the history from the timestamps that exist, and no others', async () => {
    renderDetail();
    expect(await screen.findByText('Order placed')).toBeTruthy();
    expect(screen.getByText('Processing')).toBeTruthy();
    // Not invented: the order must have been confirmed, but nothing records when.
    expect(screen.queryByText('Confirmed')).toBeNull();
  });
});

describe('OrderDetailPage — moving the status', () => {
  it('offers only the transitions the backend accepts', async () => {
    renderDetail();
    const select = (await screen.findByLabelText('Move to')) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value).filter(Boolean);
    expect(options).toEqual(['shipped', 'cancelled']);
  });

  it('offers no control at all on a delivered order', async () => {
    /*
     * A disabled dropdown with nothing in it invites the operator to keep
     * clicking. A terminal order shows its state as a badge instead.
     */
    getOrder.mockReturnValue(ok({ data: { ...ORDER, status: 'delivered' } }));
    renderDetail();
    await screen.findByText('Denim roll');
    expect(screen.queryByLabelText('Move to')).toBeNull();
  });

  it('confirms before sending, and sends nothing if the operator backs out', async () => {
    renderDetail();
    const select = await screen.findByLabelText('Move to');
    fireEvent.change(select, { target: { value: 'shipped' } });

    expect(await screen.findByText('Move to Shipped?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByText('Move to Shipped?')).toBeNull());
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it('sends the transition once confirmed', async () => {
    updateOrderStatus.mockReturnValue(ok({ data: { ...ORDER, status: 'shipped' } }));
    renderDetail();
    fireEvent.change(await screen.findByLabelText('Move to'), { target: { value: 'shipped' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Move to Shipped' }));

    await waitFor(() => {
      expect(updateOrderStatus).toHaveBeenCalledWith(ORDER.id, 'shipped');
    });
  });

  it('warns specifically about cancellation, which releases stock', async () => {
    renderDetail();
    fireEvent.change(await screen.findByLabelText('Move to'), { target: { value: 'cancelled' } });
    expect(await screen.findByText(/releases the committed stock/i)).toBeTruthy();
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy();
  });

  it('says the order did not move when the server rejects the change', async () => {
    /*
     * The failure mode this pins: an optimistic UI that shows "Shipped" after a
     * rejected PATCH. The operator then stops chasing an order the supplier
     * never dispatched.
     */
    updateOrderStatus.mockRejectedValue(new Error('409'));
    renderDetail();
    fireEvent.change(await screen.findByLabelText('Move to'), { target: { value: 'shipped' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Move to Shipped' }));

    expect(await screen.findByText('The status was not changed')).toBeTruthy();
    expect(screen.getByText(/still processing/i)).toBeTruthy();
    // And never the raw server text.
    expect(screen.queryByText(/409/)).toBeNull();
  });
});

describe('OrderDetailPage — the states that are not data', () => {
  it('announces the load rather than showing silent grey bars', async () => {
    getOrder.mockReturnValue(new Promise(() => {}));
    renderDetail();
    expect(screen.getByRole('status', { name: /loading/i })).toBeTruthy();
  });

  it('offers a retry when the order will not load', async () => {
    getOrder.mockRejectedValue(new Error('boom'));
    renderDetail();
    expect(await screen.findByText('Order could not be loaded')).toBeTruthy();
    expect(screen.getByRole('button', { name: /retry|try again/i })).toBeTruthy();
    expect(screen.queryByText(/boom/)).toBeNull();
  });
});
