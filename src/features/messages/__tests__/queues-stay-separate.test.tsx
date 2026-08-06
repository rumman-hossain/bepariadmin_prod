// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MessagesPage } from '../pages/MessagesPage';

/**
 * Retailer and wholesaler support never mix.
 *
 * They are different conversations with different people about different
 * things — a retailer chasing a delivery, a supplier chasing a payout. Blending
 * them makes the person on the desk context-switch on every row, and makes "how
 * long are suppliers waiting" unanswerable.
 *
 * The server refuses a list that does not name a queue, so these assertions are
 * about the screen always naming one, and about the other queue staying visible
 * while you work this one.
 */

const getThreads = vi.fn();
const getCounts = vi.fn();

vi.mock('../api/messagesApi', async () => {
  const actual = await vi.importActual<typeof import('../api/messagesApi')>('../api/messagesApi');
  return {
    ...actual,
    getThreads: (...args: unknown[]) => getThreads(...args),
    getCounts: () => getCounts(),
    claimThread: vi.fn(),
    releaseThread: vi.fn(),
    closeThread: vi.fn(),
    reopenThread: vi.fn(),
  };
});

vi.mock('@/src/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me', role: 'operations' } }) }));

const thread = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 't-1',
  type: 'retailer_admin',
  status: 'open',
  openedById: 'r-1',
  openedByName: 'Karim Stores',
  openedByKind: 'retailer',
  subject: 'Order never arrived',
  lastMessage: null,
  assignedToId: null,
  assignedToName: null,
  lastMessageAt: null,
  assignedAt: null,
  closedAt: null,
  createdAt: '2026-08-01T00:00:00Z',
  ...over,
});

function renderPage(search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/messages${search}`]}>
        <MessagesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getCounts.mockResolvedValue({ retailer: 4, wholesaler: 7 });
  getThreads.mockResolvedValue({
    data: [thread()],
    meta: { total: 1, page: 1, limit: 25 },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('the queue is always named', () => {
  it('asks for retailers by default, never for everything', async () => {
    renderPage();
    await screen.findByText('Karim Stores');
    // First argument is the audience. An empty or absent one is refused by the
    // server, and would mean a blended inbox if it were not.
    expect(getThreads).toHaveBeenCalledWith('retailer', '', '', 1);
  });

  it('asks for wholesalers when that queue is selected', async () => {
    renderPage('?for=wholesaler');
    await screen.findByText('Karim Stores');
    expect(getThreads).toHaveBeenCalledWith('wholesaler', '', '', 1);
  });

  it('falls back to retailers rather than blending when the URL is nonsense', async () => {
    renderPage('?for=everyone');
    await screen.findByText('Karim Stores');
    expect(getThreads).toHaveBeenCalledWith('retailer', '', '', 1);
  });

  it('keeps the queue when the view changes', async () => {
    renderPage('?for=wholesaler&view=closed');
    await screen.findByText('Karim Stores');
    expect(getThreads).toHaveBeenCalledWith('wholesaler', 'closed', '', 1);
  });

  it('narrows to the current user without leaving the queue', async () => {
    renderPage('?for=wholesaler&view=mine');
    await screen.findByText('Karim Stores');
    expect(getThreads).toHaveBeenCalledWith('wholesaler', '', 'me', 1);
  });
});

describe('the other queue stays visible', () => {
  it('shows both waiting counts while one queue is open', async () => {
    // Separate queues must not mean an unseen queue: an operator working
    // retailers needs to know seven suppliers are waiting.
    renderPage();
    expect(await screen.findByRole('radio', { name: /Retailers \(4\)/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Suppliers \(7\)/ })).toBeTruthy();
  });

  it('names the queue in the subtitle, so the screen is never ambiguous', async () => {
    // `?for=wholesaler` is the WIRE value and stays; the words on screen are
    // the only thing that changed.
    renderPage('?for=wholesaler');
    expect(await screen.findByText(/threads from suppliers/i)).toBeTruthy();
  });
});

describe('an empty queue', () => {
  it('blames the right queue rather than support in general', async () => {
    getThreads.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 25 } });
    renderPage('?for=wholesaler');
    expect(await screen.findByText(/opens a wholesaler support thread yet/i)).toBeTruthy();
  });
});
