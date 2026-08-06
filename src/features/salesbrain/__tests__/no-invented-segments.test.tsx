// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SalesBrainPage } from '../pages/SalesBrainPage';

/**
 * Nothing on this screen is invented.
 *
 * The prototype defaulted every retailer to 'Active Buyer' and 'Medium
 * Potential', so somebody who had never bought anything was indistinguishable
 * from the best customer on the platform — on the screen the sales team uses to
 * decide who to call. These assertions are about that never coming back.
 */

const getRetailers = vi.fn();
const getSegmentCounts = vi.fn();
const getCampaigns = vi.fn();

vi.mock('../api/salesBrainApi', async () => {
  const actual = await vi.importActual<typeof import('../api/salesBrainApi')>('../api/salesBrainApi');
  return {
    ...actual,
    getRetailers: (...a: unknown[]) => getRetailers(...a),
    getSegmentCounts: (...a: unknown[]) => getSegmentCounts(...a),
    getCampaigns: () => getCampaigns(),
    createCampaign: vi.fn(),
  };
});

const profile = (over: Partial<Record<string, unknown>> = {}) => ({
  retailerId: 'r-1',
  name: 'Karim',
  shopName: 'Karim Stores',
  district: 'Dhaka',
  phone: '01700000000',
  orderCount: 4,
  totalSpentMinor: 4_820_000,
  avgOrderMinor: 1_205_000,
  lastOrderAt: '2026-07-20T00:00:00Z',
  daysSinceOrder: 15,
  valueSegment: 'top',
  behaviourSegment: 'active',
  ...over,
});

function renderPage(search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/sales-brain${search}`]}>
        <SalesBrainPage />
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
  getSegmentCounts.mockResolvedValue({ active: 12, churn_risk: 5, inactive: 9, never_ordered: 31 });
  getCampaigns.mockResolvedValue([]);
  getRetailers.mockResolvedValue({ data: [profile()], meta: { total: 1, page: 1, limit: 25 } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('a retailer who has never ordered', () => {
  beforeEach(() => {
    getRetailers.mockResolvedValue({
      data: [
        profile({
          retailerId: 'r-2',
          shopName: 'Never Ordered Shop',
          orderCount: 0,
          totalSpentMinor: 0,
          avgOrderMinor: 0,
          lastOrderAt: null,
          daysSinceOrder: null,
          valueSegment: 'none',
          behaviourSegment: 'never_ordered',
        }),
      ],
      meta: { total: 1, page: 1, limit: 25 },
    });
  });

  it('is not shown as active', async () => {
    renderPage();
    await screen.findByText('Never Ordered Shop');
    const row = rowFor('Never Ordered Shop');
    expect(within(row).getByText('Never ordered')).toBeTruthy();
    expect(within(row).queryByText('Active')).toBeNull();
  });

  it('shows nothing rather than ৳0 for spend', async () => {
    // ৳0 is a claim about a retailer who has spent nothing; absence is the
    // truth. They read differently to someone deciding who to call.
    renderPage();
    await screen.findByText('Never Ordered Shop');
    const row = rowFor('Never Ordered Shop');
    expect(row.textContent).not.toMatch(/৳0\b/);
  });

  it('is unranked rather than placed in a spend bracket', async () => {
    renderPage();
    await screen.findByText('Never Ordered Shop');
    expect(within(rowFor('Never Ordered Shop')).getByText('Unranked')).toBeTruthy();
  });
});

describe('the activity window', () => {
  it('is sent to the server, not assumed by it', async () => {
    renderPage();
    await screen.findByText('Karim Stores');
    expect(getRetailers).toHaveBeenCalledWith(
      { activeWithinDays: 30, churnAfterDays: 90 },
      expect.anything(),
      1,
    );
  });

  it('is stated on screen, so the number and its meaning travel together', async () => {
    renderPage();
    expect(await screen.findByText(/an order in the last 30 days/i)).toBeTruthy();
  });

  it('is taken from the URL when set, and re-sent', async () => {
    renderPage('?activeDays=90');
    await screen.findByText('Karim Stores');
    expect(getRetailers).toHaveBeenCalledWith(
      { activeWithinDays: 90, churnAfterDays: 90 },
      expect.anything(),
      1,
    );
    expect(screen.getByText(/an order in the last 90 days/i)).toBeTruthy();
  });
});

describe('the segment that cannot be computed', () => {
  it('says browsing is not tracked rather than showing an empty bucket', async () => {
    // An empty "browsing not buying" would read as "nobody browses without
    // buying", which is not something anyone knows.
    renderPage();
    expect(await screen.findByText(/not available/i)).toBeTruthy();
    expect(screen.getByText(/needs product-view events/i)).toBeTruthy();
  });
});

describe('campaigns', () => {
  it('says a campaign is recorded, not sent', async () => {
    renderPage('?view=campaigns');
    expect(await screen.findByText(/recorded here, not sent/i)).toBeTruthy();
  });
});

describe('value is relative, not a guessed threshold', () => {
  it('labels brackets by position rather than by a taka figure', async () => {
    renderPage();
    await screen.findByText('Karim Stores');
    expect(within(rowFor('Karim Stores')).getByText('Top third')).toBeTruthy();
    expect(screen.getByText(/a third of this business by spend/i)).toBeTruthy();
  });
});
