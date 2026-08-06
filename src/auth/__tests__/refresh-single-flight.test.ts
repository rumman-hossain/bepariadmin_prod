import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * The reload-shows-login bug, as a client-side property.
 *
 * Refresh tokens rotate on every use. Two independent refresh implementations
 * existed — the singleton in `api/client.ts` and a raw `fetch` in
 * `sessionRestore.ts` — and the singleton only de-duplicated its own half. A
 * page load therefore raced itself.
 *
 * Production logs caught three refreshes inside 250ms. Each read the same
 * active token and each minted a replacement, but only one survived
 * server-side; the browser kept whichever response landed last, often a token
 * already dead. Its next refresh was rejected, the server cleared the session
 * cookie, and the user was signed out permanently.
 *
 * The property that prevents it is countable: **however many callers ask for a
 * token at once, exactly one request goes over the wire.** Counting fetches is
 * the point — an assertion about code structure would pass even if a second
 * implementation reappeared, which is exactly how this shipped.
 */

const CALLS: string[] = [];

function mockFetchOnce() {
  return vi.fn(async (url: string | URL | Request) => {
    CALLS.push(String(url));
    // A rotation takes real time; without a tick the callers cannot overlap and
    // the test would pass even with no singleton at all.
    await new Promise((r) => setTimeout(r, 20));
    return new Response(JSON.stringify({ data: { accessToken: 'at-' + CALLS.length } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

beforeEach(() => {
  CALLS.length = 0;
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('refresh is single-flight across the whole app', () => {
  it('collapses concurrent callers into ONE network refresh', async () => {
    vi.stubGlobal('fetch', mockFetchOnce());
    const { forceRefreshAccessToken } = await import('../../api/client');

    const tokens = await Promise.all([
      forceRefreshAccessToken(),
      forceRefreshAccessToken(),
      forceRefreshAccessToken(),
      forceRefreshAccessToken(),
    ]);

    const refreshCalls = CALLS.filter((u) => u.includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);

    // And every caller is served — parking them and never resolving would be a
    // different bug with the same symptom.
    tokens.forEach((t) => expect(t).toBeTruthy());
  });

  it('boot restore uses that same singleton, not its own fetch', async () => {
    /*
     * `sessionRestore` had its own raw `fetch` to /auth/refresh. Boot fired it
     * while any 401-driven request fired the singleton, so the two raced and
     * neither knew about the other. Both must now be one request.
     */
    vi.stubGlobal('fetch', mockFetchOnce());
    vi.doMock('../../api/auth', () => ({
      apiGetMe: async () => ({
        ok: true,
        status: 200,
        data: { data: { id: 'u1', name: 'A', email: 'a@b.c', role: 'admin' } },
      }),
    }));

    const [{ restoreSession }, { forceRefreshAccessToken }] = await Promise.all([
      import('../sessionRestore'),
      import('../../api/client'),
    ]);

    await Promise.all([restoreSession(), forceRefreshAccessToken(), forceRefreshAccessToken()]);

    const refreshCalls = CALLS.filter((u) => u.includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });
});
