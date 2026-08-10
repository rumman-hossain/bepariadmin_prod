// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * The wizard quoted every product at the platform default while the server
 * priced it at the supplier's rate.
 *
 * Measured on dev before the fix, against Mayer Doa Store (margin 15):
 *
 *     cost ৳500   wizard said ৳547.50   stored ৳575
 *     cost ৳600   wizard said ৳657.00   stored ৳690
 *
 * The server derives both figures from ROUND(base * (1 + COALESCE(w.margin,
 * 9.50)/100), 2). The wizard used /catalog/platform-margin, which is ONE global
 * number. They agree only when a supplier happens to sit on 9.5 — which test-01
 * does, and which is why this went unnoticed.
 */

const listSuppliersForPicker = vi.fn();
vi.mock('@/src/features/wholesalers/api/wholesalerApi', () => ({
  listSuppliersForPicker: () => listSuppliersForPicker(),
}));

import { useEffectiveMargin } from '../useEffectiveMargin';

/** Only the two fields the hook reads; the real type is far larger. */
const supplier = (id: string, commissionRate?: number) =>
  ({ id, commissionRate }) as never;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const PLATFORM = 9.5;

beforeEach(() => {
  listSuppliersForPicker.mockReset();
  listSuppliersForPicker.mockResolvedValue([
    supplier('mayer', 15),
    supplier('mohan', 12),
    supplier('test-01', 9.5),
    supplier('unpriced', undefined),
  ]);
});
afterEach(cleanup);

const render = (wholesalerId: string) =>
  renderHook(() => useEffectiveMargin(wholesalerId, PLATFORM), { wrapper });

describe('the margin follows the supplier, not the platform', () => {
  it.each([
    ['mayer', 15],
    ['mohan', 12],
  ])('uses %s’s own rate rather than the 9.5 default', async (id, expected) => {
    const { result } = render(id);
    await waitFor(() => expect(result.current).toBe(expected));
  });

  it('prices ৳600 at ৳690, which is what the catalogue showed', async () => {
    const { result } = render('mayer');
    await waitFor(() => expect(result.current).toBe(15));
    // The exact discrepancy that was shipped: 657 shown, 690 stored.
    expect(600 * (1 + result.current / 100)).toBe(690);
    expect(600 * (1 + PLATFORM / 100)).toBe(657);
  });

  it('still agrees with the platform when the supplier sits on the default', async () => {
    // The case that hid the bug. It must keep passing, but it proves nothing on
    // its own — which is why the 15 and 12 cases above exist.
    const { result } = render('test-01');
    await waitFor(() => expect(result.current).toBe(9.5));
  });
});

describe('falling back', () => {
  it('uses the platform figure before a supplier is chosen', () => {
    const { result } = render('');
    expect(result.current).toBe(PLATFORM);
  });

  it('does not fetch the supplier list until there is a supplier to look up', () => {
    render('');
    expect(listSuppliersForPicker).not.toHaveBeenCalled();
  });

  it('matches the server’s COALESCE when a supplier carries no margin', async () => {
    // COALESCE(w.margin, 9.50) — an unpriced supplier is 9.5 server-side, so the
    // wizard must say 9.5 too rather than blanking or showing NaN.
    const { result } = render('unpriced');
    await waitFor(() => expect(listSuppliersForPicker).toHaveBeenCalled());
    expect(result.current).toBe(PLATFORM);
  });

  it('holds the platform figure for an id the list does not contain', async () => {
    const { result } = render('deleted-supplier');
    await waitFor(() => expect(listSuppliersForPicker).toHaveBeenCalled());
    expect(result.current).toBe(PLATFORM);
  });

  it('does not throw when the supplier list fails to load', async () => {
    listSuppliersForPicker.mockRejectedValue(new Error('network'));
    const { result } = render('mayer');
    await waitFor(() => expect(listSuppliersForPicker).toHaveBeenCalled());
    expect(result.current).toBe(PLATFORM);
  });
});
