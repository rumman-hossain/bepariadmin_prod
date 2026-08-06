// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { DASHBOARD_SUMMARY_URL } from '@/src/api/dashboard';

/**
 * Two dashboard defects that were invisible by construction, now asserted.
 *
 * 1. The de-dup guard read `isLoading && stats !== null` — false in the initial
 *    state (`true && null`) AND after loading (`false && data`). It never once
 *    prevented a duplicate fetch.
 *
 * 2. Every failure path in `refresh()` did `set({ isRefreshing: false })` and
 *    nothing else. Behind a 60s poll, the screen could show hours-old figures
 *    having silently failed every attempt — the worst outcome for a dashboard,
 *    whose whole job is to be trusted at a glance.
 */

const getDashboardStats = vi.fn();

vi.mock('@/src/api/dashboard', async (importOriginal) => ({
  // The real module is imported so DASHBOARD_SUMMARY_URL is the ACTUAL value,
  // not a copy restated in the mock. A test asserting a URL it also defines
  // proves nothing.
  ...(await importOriginal<typeof import('@/src/api/dashboard')>()),
  getDashboardStats: () => getDashboardStats(),
}));

/** The body the server actually sends, envelope included. */
function summary(gmv: number) {
  return {
    kpis: [{ key: 'gmv', label: 'GMV (30 days)', value: String(gmv), trend: 1, isCurrency: true }],
    salesChart: [],
    statusChart: [],
    alerts: [],
    recentOrders: [],
  };
}

/*
 * `WriteJSON(w, 200, map[string]any{"data": summary})` — every analytics handler
 * wraps its body. The fixture wraps it too, because a fixture shaped like the
 * schema rather than like the server tests the schema against itself.
 */
function stats(gmv: number) {
  return { ok: true, status: 200, data: { data: summary(gmv) } };
}

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Surfaces the hook's output for assertion. */
function Probe() {
  const { stats: s, error, refreshError } = useDashboardStats();
  return (
    <>
      {/*
        Distinguishes "loaded, empty" from "never arrived". Without it, an
        assertion that `error` is blank passes in the pending state too, so a
        payload the hook silently rejected reads as a clean empty dashboard.
      */}
      <div data-testid="loaded">{s ? 'yes' : 'no'}</div>
      <div data-testid="gmv">{s?.kpis[0]?.value ?? ''}</div>
      <div data-testid="error">{error ?? ''}</div>
      <div data-testid="refreshError">{refreshError ?? ''}</div>
    </>
  );
}

beforeEach(() => {
  getDashboardStats.mockReset();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});

afterEach(() => {
  cleanup();
  client.clear();
});

describe('dashboard stats', () => {
  it('issues ONE request even when two components mount the hook', async () => {
    getDashboardStats.mockResolvedValue(stats(100));

    const view = render(
      <>
        <Probe />
        <Probe />
      </>,
      { wrapper },
    );

    await waitFor(() => expect(view.getAllByTestId('gmv')[0].textContent).toBe('100'));
    expect(getDashboardStats).toHaveBeenCalledTimes(1);
  });

  it('reports a blocking error when there is nothing to show', async () => {
    getDashboardStats.mockResolvedValue({ ok: false, status: 500 });
    const view = render(<Probe />, { wrapper });
    await waitFor(() => expect(view.getByTestId('error').textContent).toMatch(/500/));
    expect(view.getByTestId('refreshError').textContent).toBe('');
  });

  it('calls a route that exists', () => {
    /*
     * The console called `/api/v1/admin/dashboard/stats`, which was never
     * registered, so every load 404'd — the error the operator was actually
     * seeing. Pinning the URL means the two halves cannot drift apart again
     * without a test saying so.
     */
    expect(DASHBOARD_SUMMARY_URL).toBe('/api/v1/analytics/dashboard/summary');
  });

  it('says a 404 is a deployment fault, not an empty database', async () => {
    /*
     * The distinction the screen exists to make. An empty marketplace is a 200
     * carrying zeros and renders as zeros; a missing endpoint is a real fault
     * and keeps the banner. Conflating them is what made "no orders yet" look
     * like "the dashboard is broken".
     */
    getDashboardStats.mockResolvedValue({ ok: false, status: 404 });
    const view = render(<Probe />, { wrapper });
    await waitFor(() => expect(view.getByTestId('error').textContent).toMatch(/missing on the server/i));
    expect(view.getByTestId('error').textContent).toMatch(/not an empty database/i);
  });

  it('unwraps the {data:…} envelope the server sends', async () => {
    /*
     * The blocking defect. The handler wraps the body, the hook parsed
     * `res.data` — `{data:{kpis:…}}` — against a schema requiring `kpis` at the
     * top level, so every 200 became "the server returned dashboard data in an
     * unexpected shape". A working endpoint rendered as a broken one.
     *
     * Latent until the endpoint existed: while it 404'd, this line never ran.
     */
    getDashboardStats.mockResolvedValue(stats(4200));
    const view = render(<Probe />, { wrapper });
    await waitFor(() => expect(view.getByTestId('loaded').textContent).toBe('yes'));
    expect(view.getByTestId('gmv').textContent).toBe('4200');
    expect(view.getByTestId('error').textContent).toBe('');
  });

  it('does NOT accept a bare, unenveloped payload', async () => {
    /*
     * The other half of the contract. Without this, moving the envelope into
     * the schema could be undone by making the schema accept both, which would
     * put us back to guessing which shape arrived.
     */
    getDashboardStats.mockResolvedValue({ ok: true, status: 200, data: summary(1) });
    const view = render(<Probe />, { wrapper });
    await waitFor(() => expect(view.getByTestId('error').textContent).toMatch(/unexpected shape/i));
    expect(view.getByTestId('loaded').textContent).toBe('no');
  });

  it('renders zeros rather than an error when the marketplace is empty', async () => {
    /*
     * The prototype reduced over empty arrays and showed zeros; it could not
     * 404 because it called nothing. This is that behaviour, restored: a
     * successful response with nothing in it is a state, not a failure.
     */
    getDashboardStats.mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: { kpis: [], salesChart: [], statusChart: [], alerts: [], recentOrders: [] } },
    });
    const view = render(<Probe />, { wrapper });
    // `loaded` first: asserting only that `error` is blank passes in the
    // pending state, which is how this test used to pass against a hook that
    // rejected the payload outright.
    await waitFor(() => expect(view.getByTestId('loaded').textContent).toBe('yes'));
    expect(view.getByTestId('error').textContent).toBe('');
    expect(view.getByTestId('refreshError').textContent).toBe('');
  });

  it('accepts a KPI with no trend at all', async () => {
    /*
     * `trend` is omitted, not zeroed, when there is no prior period. A schema
     * requiring it would reject the first month of trading.
     */
    getDashboardStats.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        data: {
          ...summary(0),
          kpis: [{ key: 'retailers', label: 'Active retailers', value: '3' }],
        },
      },
    });
    const view = render(<Probe />, { wrapper });
    await waitFor(() => expect(view.getByTestId('loaded').textContent).toBe('yes'));
    expect(view.getByTestId('error').textContent).toBe('');
  });

  it('keeps figures on screen and reports refreshError when a REFETCH fails', async () => {
    getDashboardStats.mockResolvedValueOnce(stats(100));
    const view = render(<Probe />, { wrapper });
    await waitFor(() => expect(view.getByTestId('gmv').textContent).toBe('100'));

    getDashboardStats.mockResolvedValueOnce({ ok: false, status: 503 });
    await client.refetchQueries({ queryKey: ['dashboard', 'stats'] });

    await waitFor(() => {
      // Data stays put — blanking a working dashboard would be worse...
      expect(view.getByTestId('gmv').textContent).toBe('100');
      // ...but the failure is no longer silent.
      expect(view.getByTestId('refreshError').textContent).toMatch(/503/);
      // And it is not reported as a blocking error, because it isn't one.
      expect(view.getByTestId('error').textContent).toBe('');
    });
  });

  it('clears refreshError once a later refetch succeeds', async () => {
    getDashboardStats.mockResolvedValueOnce(stats(100));
    const view = render(<Probe />, { wrapper });
    await waitFor(() => expect(view.getByTestId('gmv').textContent).toBe('100'));

    getDashboardStats.mockResolvedValueOnce({ ok: false, status: 503 });
    await client.refetchQueries({ queryKey: ['dashboard', 'stats'] });
    await waitFor(() => expect(view.getByTestId('refreshError').textContent).toMatch(/503/));

    getDashboardStats.mockResolvedValueOnce(stats(250));
    await client.refetchQueries({ queryKey: ['dashboard', 'stats'] });

    await waitFor(() => {
      expect(view.getByTestId('gmv').textContent).toBe('250');
      expect(view.getByTestId('refreshError').textContent).toBe('');
    });
  });
});
