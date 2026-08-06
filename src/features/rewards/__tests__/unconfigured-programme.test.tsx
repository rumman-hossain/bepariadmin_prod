// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RewardsPage } from '../pages/RewardsPage';

/**
 * An unconfigured programme has to say so.
 *
 * Until someone saves an earning rate there is no settings row, nothing is
 * awarded on any order, and every figure on this screen is zero. Those zeros
 * are indistinguishable from a configured programme in a quiet month — and the
 * two mean opposite things. One says trade is slow; the other says the feature
 * has never run.
 *
 * This is the same failure the `inert` nav status was invented for, and the same
 * one a fraud screen has when it shows no flags because detection is off. The
 * screen must name the cause.
 */

const getSettings = vi.fn();
const getSummary = vi.fn();
const getBalances = vi.fn();
const getPoints = vi.fn();
const getReferrals = vi.fn();

vi.mock('../api/rewardsApi', async () => {
  const actual = await vi.importActual<typeof import('../api/rewardsApi')>('../api/rewardsApi');
  return {
    ...actual,
    getSettings: () => getSettings(),
    getSummary: () => getSummary(),
    getBalances: () => getBalances(),
    getPoints: () => getPoints(),
    getReferrals: () => getReferrals(),
    saveSettings: vi.fn(),
    adjustPoints: vi.fn(),
  };
});

vi.mock('@/src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: 'super_admin' } }),
}));

const emptyList = { data: [], meta: { total: 0, page: 1, limit: 25 } };

function renderAt(search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/rewards${search}`]}>
        <RewardsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getBalances.mockResolvedValue(emptyList);
  getPoints.mockResolvedValue(emptyList);
  getReferrals.mockResolvedValue(emptyList);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('when nobody has configured the programme', () => {
  beforeEach(() => {
    // null is what the API layer returns for a 404 — not an error, and not an
    // empty settings object. An empty object would read as "configured, with
    // every rate at zero", which is a programme that runs and awards nothing.
    getSettings.mockResolvedValue(null);
    getSummary.mockResolvedValue({
      configured: false,
      membersWithPoints: 0,
      outstandingPoints: 0,
      outstandingValueMinor: 0,
      pointsEarnedTotal: 0,
      pointsRedeemedTotal: 0,
      referralsPending: 0,
      referralsRewarded: 0,
      byTier: [0, 0, 0, 0],
    });
  });

  it('says the programme is not running and why the figures are zero', async () => {
    renderAt();
    expect(await screen.findByText(/programme is not running/i)).toBeTruthy();
    expect(screen.getByText(/no points are being awarded/i)).toBeTruthy();
  });

  it('offers to set it up rather than to edit nothing', async () => {
    renderAt();
    expect(await screen.findByRole('button', { name: /set up the programme/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /edit rules/i })).toBeNull();
  });

  it('leaves the money figure absent rather than showing ৳0', async () => {
    // What outstanding points are worth depends on a redemption rate nobody has
    // set. ৳0 would be a claim; absence is the truth.
    renderAt();
    await screen.findByText(/programme is not running/i);
    const label = screen.getByText('What they are worth');
    const tile = label.closest('div');
    expect(tile?.textContent).not.toMatch(/৳/);
  });

  it('explains the empty retailer list by the cause, not by inactivity', async () => {
    renderAt('?tab=retailers');
    expect(await screen.findByText(/until the programme rules are saved/i)).toBeTruthy();
  });
});

describe('when the programme is configured', () => {
  beforeEach(() => {
    getSettings.mockResolvedValue({
      earnTakaPerPoint: 100,
      redeemPaisaPerPoint: 200,
      minRedeemPoints: 100,
      referralPoints: 500,
      silverAt: 1000,
      goldAt: 5000,
      platinumAt: 20000,
      updatedAt: '2026-08-01T00:00:00Z',
    });
    getSummary.mockResolvedValue({
      configured: true,
      membersWithPoints: 42,
      outstandingPoints: 128_500,
      // At ৳2 a point. DELIBERATELY not equal to the points figure: with a
      // 1:1 rate both render as "1,28,500" and an assertion on that string
      // cannot tell whether the screen showed the money or echoed the count.
      outstandingValueMinor: 25_700_000, // ৳2,57,000
      pointsEarnedTotal: 200_000,
      pointsRedeemedTotal: 71_500,
      referralsPending: 3,
      referralsRewarded: 11,
      byTier: [20, 15, 5, 2],
    });
  });

  it('does not warn, and offers to edit', async () => {
    renderAt();
    expect(await screen.findByRole('button', { name: /edit rules/i })).toBeTruthy();
    expect(screen.queryByText(/programme is not running/i)).toBeNull();
  });

  it('shows the liability in taka, from the server field', async () => {
    // 2,57,00,000 paisa is ৳2,57,000 — South Asian 2-2-3 grouping, and the
    // figure is the server's. The points outstanding are 1,28,500, so finding
    // 2,57,000 proves the screen rendered the money rather than the count.
    renderAt();
    await screen.findByRole('button', { name: /edit rules/i });
    expect(screen.getByText(/2,57,000/)).toBeTruthy();
    expect(screen.getByText(/1,28,500/)).toBeTruthy();
  });

  it('states the rules in the terms an operator set them in', async () => {
    renderAt();
    expect(await screen.findByText(/1 point per ৳100/)).toBeTruthy();
    expect(screen.getByText(/৳2 each/)).toBeTruthy();
  });

  it('says tier follows lifetime earnings, so redeeming cannot demote', async () => {
    // The rule most likely to be misread from the numbers alone.
    renderAt();
    expect(await screen.findByText(/spending points never moves a retailer down/i)).toBeTruthy();
  });
});
