// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AccountingPage } from '../pages/AccountingPage';

/**
 * The ledger is append-only, and the screen has to say so by what it does not
 * offer.
 *
 * A disabled Edit button is not append-only — it is append-only-for-now, and it
 * tells whoever wants to change a figure that the operation exists and they
 * need a different route to it. So there is no edit control and no delete
 * control on a ledger row at all. Correcting a mistake means posting an
 * adjustment, which is itself an entry in the book.
 *
 * That is a claim about absence, which nothing else in the system can check.
 * TypeScript cannot see a missing button; a guard grepping for "Delete" would
 * fire on every other screen. So it is asserted here, against a rendered
 * ledger holding real-shaped rows.
 */

const getSummary = vi.fn();
const getLedger = vi.fn();
const getExpenses = vi.fn();

vi.mock('../api/accountingApi', async () => {
  const actual = await vi.importActual<typeof import('../api/accountingApi')>(
    '../api/accountingApi',
  );
  return {
    ...actual,
    getSummary: () => getSummary(),
    getLedger: () => getLedger(),
    getExpenses: () => getExpenses(),
    createExpense: vi.fn(),
    payExpense: vi.fn(),
  };
});

const entry = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'le-1',
  entryDate: '2026-07-14',
  direction: 'out' as const,
  amountMinor: 2_500_000,
  category: 'rent',
  description: 'Warehouse rent, July',
  sourceType: 'expense',
  sourceId: 'ex-1',
  balanceAfterMinor: 48_215_000,
  createdAt: '2026-07-14T09:00:00Z',
  ...over,
});

function renderAt(search: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/accounting${search}`]}>
        <AccountingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getSummary.mockResolvedValue({
    openingMinor: 0,
    inMinor: 50_715_000,
    outMinor: 2_500_000,
    closingMinor: 48_215_000,
    byCategory: [],
  });
  getLedger.mockResolvedValue({
    data: [entry(), entry({ id: 'le-2', direction: 'in', category: 'commission', sourceType: 'settlement', description: 'Commission on settlement' })],
    meta: { total: 2, page: 1, limit: 25 },
  });
  getExpenses.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 25 } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('the ledger tab', () => {
  it('renders the entries it was given', async () => {
    renderAt('?tab=ledger');
    expect(await screen.findByText('Warehouse rent, July')).toBeTruthy();
    expect(screen.getByText('Commission on settlement')).toBeTruthy();
  });

  it('offers no way to edit or delete an entry — not even a disabled one', async () => {
    renderAt('?tab=ledger');
    await screen.findByText('Warehouse rent, July');

    // Every control on the screen, enabled or not.
    const controls = [
      ...screen.queryAllByRole('button', { hidden: true }),
      ...screen.queryAllByRole('link', { hidden: true }),
      ...screen.queryAllByRole('menuitem', { hidden: true }),
    ];
    const forbidden = /edit|delete|remove|void|reverse|amend|change/i;
    const offenders = controls
      .map((c) => `${c.textContent ?? ''} ${c.getAttribute('aria-label') ?? ''}`.trim())
      .filter((label) => forbidden.test(label));

    expect(offenders).toEqual([]);
  });

  it('says the book is append-only, so absence reads as a rule rather than an omission', async () => {
    renderAt('?tab=ledger');
    expect(await screen.findByText(/append-only/i)).toBeTruthy();
    expect(screen.getByText(/adjustment/i)).toBeTruthy();
  });

  it('shows the stored balance, not one it recomputed', async () => {
    // 48_215_000 paisa is ৳4,82,150 — and it is the value the server sent on
    // the row, not opening plus this row's amount. If the screen ever starts
    // deriving it, a row arriving out of order silently changes history.
    renderAt('?tab=ledger');
    await screen.findByText('Warehouse rent, July');
    expect(screen.getAllByText(/4,82,150/).length).toBeGreaterThan(0);
  });
});

describe('the invoices tab', () => {
  it('says why it is empty instead of showing an empty table', async () => {
    renderAt('?tab=invoices');
    // An empty table reads as "no invoices this period". Nothing issues
    // invoices at all, which is a different fact and the operator needs it.
    expect(await screen.findByText(/not issued yet/i)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('the overview tab', () => {
  it('renders server figures and does not invent a courier cost', async () => {
    renderAt('?tab=overview');
    await waitFor(() => expect(getSummary).toHaveBeenCalled());
    // The prototype multiplied an order count by a flat ৳120 and fed the
    // result into net cash flow. The absence is stated, not filled in.
    expect(await screen.findByText(/Courier costs are not in this book yet/i)).toBeTruthy();
  });
});
