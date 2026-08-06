// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ManufacturingPage } from '../pages/ManufacturingPage';

/**
 * The pipeline only runs forwards, and the screen offers exactly one next step.
 *
 * These statuses describe physical reality — goods are either being made or they
 * are not, and they have either left the factory or they have not. Offering a
 * backwards move, or several forwards moves at once, would invite a state change
 * the server refuses and the world cannot honour.
 */

const getPurchaseOrders = vi.fn();

vi.mock('../api/manufacturingApi', async () => {
  const actual = await vi.importActual<typeof import('../api/manufacturingApi')>(
    '../api/manufacturingApi',
  );
  return {
    ...actual,
    getPurchaseOrders: (...a: unknown[]) => getPurchaseOrders(...a),
    createPurchaseOrder: vi.fn(),
    updatePurchaseOrder: vi.fn(),
  };
});

let role = 'admin';
vi.mock('@/src/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me', role } }) }));

const po = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'po-1',
  wholesalerId: 'w-1',
  wholesalerName: 'Dhaka Textiles',
  productId: null,
  productName: null,
  quantity: 500,
  unitCost: 42.5,
  totalCost: 21250,
  status: 'pending',
  expectedDate: null,
  notes: '',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  ...over,
});

function renderPage(search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/manufacturing${search}`]}>
        <ManufacturingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const rowFor = (name: string) => {
  const row = screen.getByText(name).closest('tr');
  if (!row) throw new Error(`no row for ${name}`);
  return row;
};

beforeEach(() => {
  role = 'admin';
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('each stage offers exactly its next step', () => {
  const cases: Array<[string, string]> = [
    ['pending', 'Mark in production'],
    ['in_production', 'Mark ready'],
    ['ready', 'Mark dispatched'],
  ];

  for (const [status, expected] of cases) {
    it(`${status} offers "${expected}" and nothing else`, async () => {
      getPurchaseOrders.mockResolvedValue({
        data: [po({ status })],
        meta: { total: 1, page: 1, limit: 25 },
      });
      renderPage();
      await screen.findByText('Dhaka Textiles');
      const buttons = within(rowFor('Dhaka Textiles')).getAllByRole('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].textContent).toContain(expected.replace('Mark ', ''));
    });
  }

  it('a dispatched order offers nothing — it is finished', async () => {
    // No control at all, not a disabled one: there is no next step to disable.
    getPurchaseOrders.mockResolvedValue({
      data: [po({ status: 'dispatched' })],
      meta: { total: 1, page: 1, limit: 25 },
    });
    renderPage();
    await screen.findByText('Dhaka Textiles');
    expect(within(rowFor('Dhaka Textiles')).queryAllByRole('button')).toHaveLength(0);
  });
});

describe('the total is the server figure', () => {
  it('renders totalCost rather than multiplying in the component', async () => {
    // 500 x 42.50 is 21,250 — but the screen must show the server's number, not
    // one it derived. Guard G12 forbids the arithmetic; this pins the outcome.
    getPurchaseOrders.mockResolvedValue({
      data: [po({ quantity: 3, unitCost: 11, totalCost: 99999 })],
      meta: { total: 1, page: 1, limit: 25 },
    });
    renderPage();
    await screen.findByText('Dhaka Textiles');
    // 3 x 11 is 33. If the component computed it, 99,999 would not appear.
    expect(screen.getByText(/99,999/)).toBeTruthy();
    expect(screen.queryByText(/^৳33$/)).toBeNull();
  });
});

describe('a role without write access', () => {
  it('sees the pipeline but is offered no transitions', async () => {
    role = 'viewer';
    getPurchaseOrders.mockResolvedValue({
      data: [po({ status: 'pending' })],
      meta: { total: 1, page: 1, limit: 25 },
    });
    renderPage();
    await screen.findByText('Dhaka Textiles');
    expect(within(rowFor('Dhaka Textiles')).queryAllByRole('button')).toHaveLength(0);
  });
});
