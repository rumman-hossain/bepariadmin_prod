// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRefreshRetailerDetail } from './useRetailers';

/**
 * The refresh has to be WAITABLE, or awaiting it in saveRetailerChildren does
 * nothing.
 *
 * `useSaveRetailerChildren.test.ts` injects its own callback, so it proves the
 * helper awaits what it is given and says nothing about what this hook hands
 * over. A mutant that reverted this to `void qc.invalidateQueries(...)` passed
 * that whole file — the rule tested, the thing supplying it not.
 *
 * That gap is the shape of the original bug: `invalidateQueries` only marks a
 * query stale and STARTS a refetch. Discarding its promise let the screen
 * navigate to the vault while the refetch was in flight, so the vault rendered
 * the stale cache and View still asked for a document id the attach had deleted.
 */
describe('useRefreshRetailerDetail', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );

  it('returns something awaitable, not undefined', () => {
    const { result } = renderHook(() => useRefreshRetailerDetail('ret-1'), { wrapper });

    const returned = result.current();

    expect(
      typeof (returned as Promise<unknown> | undefined)?.then,
      'the refresh must return invalidateQueries’ promise, or awaiting it is a no-op',
    ).toBe('function');
  });

  it('resolves rather than hanging when there is nothing cached to refetch', async () => {
    const { result } = renderHook(() => useRefreshRetailerDetail('ret-1'), { wrapper });

    await expect(result.current()).resolves.toBeUndefined();
  });
});
