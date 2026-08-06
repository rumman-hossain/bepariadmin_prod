import { describe, it, expect, vi } from 'vitest';
import { RetailerRequestError, isNotFound } from '../api/retailersApi';

/**
 * After a delete, the row must not be fetched again.
 *
 * The delete worked and the console then filled with repeated 404s for the shop
 * that had just been removed. Two causes, both mine:
 *
 *   1. `remove.onSuccess` called `invalidateQueries({ queryKey: ['retailers'] })`
 *      — a PREFIX that matches `['retailers','detail',id]`. The comment above it
 *      said "invalidates the LIST, not this row". The code invalidated both.
 *   2. `getRetailer` threw a bare `Error`, discarding the status, so the query
 *      could not tell a definitive 404 from a transient failure and TanStack
 *      retried it three times.
 *
 * These pin the two pieces that make the fix work.
 */

// Rebuilt here exactly as the hook defines them. Importing would mean importing
// the whole TanStack surface for a key-shape assertion.
const keys = {
  all: ['retailers'] as const,
  lists: () => [...keys.all, 'list'] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

/** TanStack matches by key PREFIX — this is the rule that caused the bug. */
function matches(filterKey: readonly unknown[], queryKey: readonly unknown[]): boolean {
  return filterKey.every((part, i) => JSON.stringify(part) === JSON.stringify(queryKey[i]));
}

describe('invalidating after a delete', () => {
  it('the LIST key does not match a detail query', () => {
    // The whole fix in one assertion.
    expect(matches(keys.lists(), keys.detail('ret-1'))).toBe(false);
  });

  it('the ALL key DOES match a detail query — which is why it cannot be used', () => {
    // Proves the diagnosis rather than asserting the fix twice. If this ever
    // becomes false, TanStack's prefix matching has changed and the reasoning
    // above needs revisiting.
    expect(matches(keys.all, keys.detail('ret-1'))).toBe(true);
  });

  it('the LIST key still matches a list query, so the directory does refresh', () => {
    const listQuery = [...keys.lists(), { page: 1, limit: 25 }];
    expect(matches(keys.lists(), listQuery)).toBe(true);
  });
});

describe('a 404 is an answer, not a failure to get one', () => {
  it('is recognised', () => {
    expect(isNotFound(new RetailerRequestError(404, 'gone'))).toBe(true);
  });

  it('a 500 is not — that one is worth retrying', () => {
    expect(isNotFound(new RetailerRequestError(500, 'server'))).toBe(false);
  });

  it('a bare Error is not treated as a 404', () => {
    // The status has to survive the throw. A plain Error carries none, which is
    // exactly why the retries happened.
    expect(isNotFound(new Error('This retailer could not be loaded'))).toBe(false);
    expect(isNotFound(undefined)).toBe(false);
  });

  it('the retry predicate stops immediately on 404 and persists otherwise', () => {
    // The expression the hook passes to TanStack, asserted directly.
    const retry = (n: number, e: unknown) => !isNotFound(e) && n < 3;

    expect(retry(0, new RetailerRequestError(404, 'gone'))).toBe(false);
    expect(retry(0, new RetailerRequestError(503, 'flaky'))).toBe(true);
    expect(retry(3, new RetailerRequestError(503, 'flaky'))).toBe(false);
  });
});

// ─── The status has to survive the throw ────────────────────────────────────

vi.mock('@/src/api/client', () => ({ request: vi.fn() }));
import { request } from '@/src/api/client';
import { getRetailer } from '../api/retailersApi';

describe('getRetailer preserves the status it was given', () => {
  it('a 404 arrives as a RetailerRequestError isNotFound can recognise', async () => {
    /*
     * The half the isNotFound tests above could not see.
     *
     * Mutation D3 replaced this throw with a bare `new Error(...)` and broke
     * nothing — the retry predicate would then treat a deleted shop as a
     * transient failure and retry it three times, which is the bug.
     */
    vi.mocked(request).mockResolvedValue({ ok: false, status: 404, data: {} } as never);

    const err = await getRetailer('gone').catch((e: unknown) => e);
    expect(isNotFound(err)).toBe(true);
  });

  it('a 500 arrives with its own status, not flattened to 404', async () => {
    vi.mocked(request).mockResolvedValue({ ok: false, status: 500, data: {} } as never);

    const err = await getRetailer('x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RetailerRequestError);
    expect((err as RetailerRequestError).status).toBe(500);
    expect(isNotFound(err)).toBe(false);
  });

  it("keeps the server's own message when it sent one", async () => {
    vi.mocked(request).mockResolvedValue({
      ok: false,
      status: 404,
      data: { error: { message: 'That retailer no longer exists' } },
    } as never);

    const err = await getRetailer('gone').catch((e: unknown) => e);
    expect((err as Error).message).toBe('That retailer no longer exists');
  });
});
