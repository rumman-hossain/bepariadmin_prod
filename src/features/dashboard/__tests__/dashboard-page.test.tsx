// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { DashboardPage } from '../pages/DashboardPage';
import type { DashboardStats } from '../types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/*
 * The page now carries the SMS-balance card, which fetches on its own request —
 * so rendering it needs a QueryClient. Its own request is the point: the figure
 * comes from an external provider, and sharing the summary's call would put that
 * on the critical path of every KPI on the screen.
 */
const renderDashboard = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
};

/**
 * What the KPI tiles actually say.
 *
 * Three defects live here, all of them mine, all of them invisible until the
 * endpoint stopped 404-ing:
 *
 *   - the icon map was keyed on display text the API has never emitted, so
 *     every tile drew the same fallback;
 *   - the trend printed a raw float64;
 *   - a missing trend arrived as 0 and rendered "+0% vs last month" beside a
 *     growth arrow, which is a claim about a comparison nobody made.
 */

const useDashboardStats = vi.fn();
vi.mock('../hooks/useDashboardStats', () => ({
  useDashboardStats: () => useDashboardStats(),
}));

// recharts measures its container, which jsdom reports as 0×0; the charts are
// not what this file is about.
vi.mock('../components/ChartContainer', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CHART_HEIGHT_PX: 260,
}));

function loaded(kpis: DashboardStats['kpis']) {
  useDashboardStats.mockReturnValue({
    stats: {
      kpis,
      salesChart: [{ name: 'Jan', value: 1 }],
      statusChart: [],
      alerts: [],
      recentOrders: [],
    },
    isLoading: false,
    isRefreshing: false,
    error: null,
    refreshError: null,
    lastUpdatedAt: null,
    refresh: vi.fn(),
    clearError: vi.fn(),
  });
}

/** The lucide icon rendered inside a tile, identified by its own class name. */
function iconOf(label: string): string {
  const tile = screen.getByText(label).closest('p');
  const svg = tile?.querySelector('svg');
  return svg?.getAttribute('class') ?? '';
}

beforeEach(() => useDashboardStats.mockReset());
afterEach(cleanup);

describe('dashboard KPI tiles', () => {
  it('gives each KPI its own icon', () => {
    /*
     * The map was keyed on 'Total GMV' / 'Active Retailers'; the API sends
     * 'GMV (30 days)' / 'Active retailers'. Nothing matched, so all four tiles
     * fell through to TrendingUp. It would have broken on the casing alone.
     */
    loaded([
      { key: 'gmv', label: 'GMV (30 days)', value: '1000', isCurrency: true },
      { key: 'orders', label: 'Orders (30 days)', value: '12' },
      { key: 'retailers', label: 'Active retailers', value: '3' },
      { key: 'wholesalers', label: 'Active wholesalers', value: '2' },
    ]);
    renderDashboard();

    const icons = [
      iconOf('GMV (30 days)'),
      iconOf('Orders (30 days)'),
      iconOf('Active retailers'),
      iconOf('Active wholesalers'),
    ];
    expect(icons.every(Boolean)).toBe(true);
    expect(new Set(icons).size).toBe(4);
  });

  it('picks the icon from `key`, so rewording a label changes nothing', () => {
    /*
     * The property that matters more than the mapping itself: copy is free to
     * change. Asserting the four icons are distinct would still pass a map
     * keyed on labels, as long as the labels happened to match — this does not.
     */
    loaded([{ key: 'gmv', label: 'GMV (30 days)', value: '1000' }]);
    renderDashboard();
    const before = iconOf('GMV (30 days)');
    cleanup();

    loaded([{ key: 'gmv', label: 'Gross merchandise value, last 30 days', value: '1000' }]);
    renderDashboard();
    expect(iconOf('Gross merchandise value, last 30 days')).toBe(before);
  });

  it('renders no trend at all when there is nothing to compare against', () => {
    /*
     * Asserted by absence. The head-count KPIs are point-in-time totals with no
     * prior period, and `trend >= 0` was true for the 0 that used to stand in
     * for "unknown" — so they showed +0% growth.
     */
    loaded([{ key: 'retailers', label: 'Active retailers', value: '3' }]);
    renderDashboard();

    expect(screen.queryByText(/vs last month/)).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('shows the trend when there IS a prior period', () => {
    loaded([{ key: 'orders', label: 'Orders (30 days)', value: '12', trend: 12.3 }]);
    renderDashboard();
    expect(screen.getByText(/vs last month/)).toBeTruthy();
    expect(screen.getByText(/\+12\.3%/)).toBeTruthy();
  });

  it('treats a genuine 0% as flat, not as missing', () => {
    // The other half of the nullable trend: zero is a real, measured reading
    // and must still be shown. Modelling "unknown" as 0 lost this distinction.
    loaded([{ key: 'orders', label: 'Orders (30 days)', value: '12', trend: 0 }]);
    renderDashboard();
    expect(screen.getByText(/vs last month/)).toBeTruthy();
  });

  it('puts a space between the figure and its caption', () => {
    /*
     * `{value}%<span>vs last month</span>` emits no whitespace, so the tile read
     * "+12.3%vs last month". JSX collapses a NEWLINE to a space but not an
     * adjacency, which is exactly the difference a refactor onto one line
     * erases — and it did.
     */
    loaded([{ key: 'orders', label: 'Orders (30 days)', value: '12', trend: 12.3 }]);
    const { container } = renderDashboard();
    // Asserted on the rendered text, not on DOM node adjacency — the reader of
    // the screen sees a string, and that is the thing that was wrong.
    expect(container.textContent).toContain('+12.3% vs last month');
    expect(container.textContent).not.toContain('%vs');
  });

  it('renders a negative trend without a stray plus sign', () => {
    loaded([{ key: 'orders', label: 'Orders (30 days)', value: '12', trend: -8.4 }]);
    renderDashboard();
    expect(screen.getByText(/-8\.4%/)).toBeTruthy();
    expect(screen.queryByText(/\+-/)).toBeNull();
  });
});
