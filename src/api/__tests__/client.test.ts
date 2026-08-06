import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { request as RequestFn } from '../client';

/**
 * The HTTP client's replay, refresh and de-duplication behaviour.
 *
 * These are the paths where getting it wrong is expensive rather than merely
 * wrong: a replayed POST creates a second account, a mishandled refresh
 * failure releases a queue of requests holding a dead token, and a broken
 * de-dupe turns one screen load into five identical requests.
 */

/**
 * A minimal stand-in for `Response`.
 *
 * The real one is backed by undici streams whose internals schedule on real
 * timers, which deadlocks against the fake timers the backoff assertions need.
 * The client touches `ok`, `status`, `headers.get`, `text()` — and `json()` on
 * the refresh path only.
 */
function response(status: number, body: string, contentType = 'application/json'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
    json: async () => JSON.parse(body),
  } as unknown as Response;
}

function jsonResponse(status: number, body: unknown): Response {
  return response(status, JSON.stringify(body));
}

/** A token that is valid for an hour, so nothing preemptively refreshes. */
function freshToken(): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + 3600 };
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

let fetchMock: ReturnType<typeof vi.fn>;
let request: typeof RequestFn;
let setAccessToken: (t: string) => void;
let getAccessToken: () => string | null;

/*
 * The client keeps module-level state — the single-flight refresh promise and
 * the in-flight GET map. Re-importing it per test is what stops one test's
 * queued waiters or cached request key leaking into the next.
 */
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  ({ request } = await import('../client'));
  const store = await import('../../auth/memoryTokenStore');
  setAccessToken = store.setAccessToken;
  getAccessToken = store.getAccessToken;
  store.clearAccessToken();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/**
 * Runs a request to completion, driving the retry backoff timers.
 *
 * Advances only while the promise is unsettled, so a request with no backoff
 * returns immediately and never reaches the 15s abort timer.
 */
async function run<T>(promise: Promise<T>): Promise<T> {
  let settled = false;
  const tracked = promise.then(
    (v) => {
      settled = true;
      return { ok: true, v } as const;
    },
    (e) => {
      settled = true;
      return { ok: false, e } as const;
    },
  );

  for (let i = 0; i < 12 && !settled; i++) {
    await vi.advanceTimersByTimeAsync(1000);
  }

  const result = await tracked;
  if (!result.ok) throw result.e;
  return result.v;
}

// ─── Replay safety ───────────────────────────────────────

describe('retry on 5xx', () => {
  it.each(['GET', 'PUT', 'DELETE'] as const)('replays %s — it is idempotent', async (method) => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, { message: 'unavailable' }))
      .mockResolvedValueOnce(jsonResponse(503, { message: 'unavailable' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const res = await run(request(method, '/api/v1/thing'));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(200);
  });

  it.each(['POST', 'PATCH'] as const)('never replays %s', async (method) => {
    /*
     * A 5xx does not mean the write was rejected — the server may have
     * committed and then failed to respond. Replaying creates a second account,
     * a second password reset, a second product. No Idempotency-Key is attached
     * anywhere in src/api, so the server cannot collapse the duplicates either.
     */
    fetchMock.mockResolvedValue(jsonResponse(500, { message: 'boom' }));

    const res = await run(request(method, '/api/v1/wholesalers', { body: { name: 'x' } }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(500);
  });

  it('stops after the configured number of attempts', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: 'boom' }));
    await run(request('GET', '/api/v1/thing'));
    // Initial attempt plus two retries.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('RESOLVES a retried GET rather than deadlocking on its own de-dupe key', async () => {
    /*
     * Regression guard. The retry used to recurse back through the public
     * `request()`, which found the outer call's key already registered in the
     * in-flight map and returned that very promise — a promise awaiting itself.
     *
     * The failure mode had no error and no timeout: every list screen simply
     * spun forever the first time the backend returned a 5xx. Verified against
     * real timers, not just the fake clock below.
     */
    fetchMock.mockResolvedValue(jsonResponse(503, { message: 'unavailable' }));

    const res = await run(request('GET', '/api/v1/products'));

    expect(res.status).toBe(503);
    expect(res.ok).toBe(false);
  });

  it('does not replay a 4xx — the request itself is the problem', async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, { message: 'invalid' }));
    const res = await run(request('GET', '/api/v1/thing'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(422);
  });
});

describe('retry on network failure and timeout', () => {
  it('replays an idempotent GET', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const res = await run(request('GET', '/api/v1/thing'));
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never replays a POST that timed out', async () => {
    // The most dangerous case of all: a timeout means the request may well have
    // been received and applied, and we simply never saw the answer.
    fetchMock.mockRejectedValue(
      new DOMException('The operation was aborted.', 'AbortError'),
    );

    const res = await run(request('POST', '/api/v1/auth/login', { body: { pin: '1' } }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(408);
    expect(res.ok).toBe(false);
  });

  it('reports status 0 for a non-timeout network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const res = await run(request('POST', '/api/v1/thing'));
    expect(res.status).toBe(0);
  });
});

// ─── Authentication ──────────────────────────────────────

describe('authenticated requests', () => {
  it('attaches the bearer token', async () => {
    setAccessToken(freshToken());
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await run(request('GET', '/api/v1/me', { auth: true }));

    const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^Bearer /);
  });

  it('fails fast with 401 when there is no token, without calling the network', async () => {
    const res = await run(request('GET', '/api/v1/me', { auth: true }));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes once on a 401 and replays the original request', async () => {
    setAccessToken(freshToken());
    const refreshed = freshToken();

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { accessToken: refreshed } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: 'protected' }));

    const res = await run(request('GET', '/api/v1/me', { auth: true }));

    expect(res.ok).toBe(true);
    expect(fetchMock.mock.calls[1]![0]).toContain('/auth/refresh');
    const replayHeaders = fetchMock.mock.calls[2]![1].headers as Record<string, string>;
    expect(replayHeaders.Authorization).toBe(`Bearer ${refreshed}`);
  });

  it('replays a POST after a 401 — this path is a re-auth, not a retry', async () => {
    // Distinct from the 5xx/timeout guard above: a 401 proves the server
    // REJECTED the request, so nothing was applied and replaying is safe.
    setAccessToken(freshToken());
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { accessToken: freshToken() } }))
      .mockResolvedValueOnce(jsonResponse(201, { data: 'created' }));

    const res = await run(request('POST', '/api/v1/wholesalers', { auth: true, body: { a: 1 } }));
    expect(res.status).toBe(201);
  });

  it('gives up when the refresh itself fails, rather than looping', async () => {
    setAccessToken(freshToken());
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'refresh rejected' }));

    const res = await run(request('GET', '/api/v1/me', { auth: true }));

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clears the cached token when refresh fails, so nothing reuses it', async () => {
    // The queued-waiter flush hands out `getAccessToken()`. If a failed refresh
    // left the dead token cached, every waiter was released holding it — a 401
    // storm instead of a clean re-authentication.
    setAccessToken(freshToken());

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockRejectedValueOnce(new TypeError('network down'));

    await run(request('GET', '/api/v1/me', { auth: true }));

    expect(getAccessToken()).toBeNull();
  });
});

// ─── De-duplication ──────────────────────────────────────

describe('request de-duplication', () => {
  it('collapses identical in-flight GETs into one network call', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: 'x' }));

    const results = await run(
      Promise.all([
        request('GET', '/api/v1/products'),
        request('GET', '/api/v1/products'),
        request('GET', '/api/v1/products'),
      ]),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it('does not collapse GETs to different paths', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: 'x' }));
    await run(
      Promise.all([request('GET', '/api/v1/products'), request('GET', '/api/v1/wholesalers')]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never collapses writes, even identical ones', async () => {
    // Two identical POSTs are two intended operations, not one asked twice.
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    await run(
      Promise.all([
        request('POST', '/api/v1/notes', { body: { text: 'hi' } }),
        request('POST', '/api/v1/notes', { body: { text: 'hi' } }),
      ]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('releases the key once settled, so a later identical GET refetches', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: 'x' }));
    await run(request('GET', '/api/v1/products'));
    await run(request('GET', '/api/v1/products'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('releases the key after a failure too, rather than caching the error forever', async () => {
    fetchMock.mockRejectedValue(new TypeError('down'));
    await run(request('GET', '/api/v1/products'));
    fetchMock.mockResolvedValue(jsonResponse(200, { data: 'recovered' }));
    const res = await run(request('GET', '/api/v1/products'));
    expect(res.ok).toBe(true);
  });
});

// ─── Response parsing ────────────────────────────────────

describe('response parsing', () => {
  it('parses a JSON body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: 1 } }));
    const res = await run(request<{ data: { id: number } }>('GET', '/api/v1/thing'));
    expect(res.data.data.id).toBe(1);
  });

  it('parses JSON even when the content-type says otherwise', async () => {
    // Some error paths in the Go backend return JSON as text/plain.
    fetchMock.mockResolvedValue(
      response(400, '{"message":"nope"}', 'text/plain'),
    );
    const res = await run(request<{ message: string }>('GET', '/api/v1/thing'));
    expect(res.data.message).toBe('nope');
  });

  it('returns a plain-text body as-is', async () => {
    fetchMock.mockResolvedValue(response(200, 'Service Unavailable', 'text/plain'));
    const res = await run(request<string>('GET', '/api/v1/thing'));
    expect(res.data).toBe('Service Unavailable');
  });

  it('does not throw on malformed JSON', async () => {
    fetchMock.mockResolvedValue(
      response(200, '{ broken'),
    );
    const res = await run(request<{ error: { code: string } }>('GET', '/api/v1/thing'));
    expect(res.data.error.code).toBe('JSON_PARSE_ERROR');
  });

  it('handles an empty body', async () => {
    fetchMock.mockResolvedValue(response(204, '', 'text/plain'));
    const res = await run(request('DELETE', '/api/v1/thing'));
    expect(res.ok).toBe(true);
  });
});

// ─── Request shape ───────────────────────────────────────

describe('request shape', () => {
  it('sends the body only when there is one', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await run(request('GET', '/api/v1/thing'));
    expect(fetchMock.mock.calls[0]![1].body).toBeUndefined();

    fetchMock.mockClear();
    await run(request('POST', '/api/v1/thing', { body: { a: 1 } }));
    expect(fetchMock.mock.calls[0]![1].body).toBe('{"a":1}');
  });

  it('sends credentials so the httpOnly refresh cookie travels', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await run(request('GET', '/api/v1/thing'));
    expect(fetchMock.mock.calls[0]![1].credentials).toBe('include');
  });

  it('identifies the client platform', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await run(request('GET', '/api/v1/thing'));
    const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>;
    expect(headers['X-Client-Platform']).toBe('web');
  });

  it('prefixes the configured base URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await run(request('GET', '/api/v1/thing'));
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/api/v1/thing');
  });

  it('honours a caller-supplied abort signal', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    const controller = new AbortController();
    await run(request('GET', '/api/v1/thing', { signal: controller.signal }));
    expect(fetchMock.mock.calls[0]![1].signal).toBe(controller.signal);
  });
});

/**
 * The refresh burst.
 *
 * Production logs show 17 refreshes in three seconds and 36 in sixteen, from a
 * single tab, with nothing failing beforehand. The single-flight promise did not
 * help: those calls were SEQUENTIAL, each starting after the previous resolved,
 * so each was its own network request and its own server-side token rotation.
 *
 * That is what put the browser onto a superseded token, which the server then
 * handed back with a ten-minute lease inside a twelve-hour session — the
 * "I left the screen and came back to the login page" bug.
 *
 * The server side is fixed separately and independently. This is the client
 * half: a burst must not reach the network as a burst.
 */
describe('refresh burst', () => {
  let forceRefreshAccessToken: () => Promise<string | null>;

  beforeEach(async () => {
    ({ forceRefreshAccessToken } = await import('../client'));
  });

  it('collapses a sequential burst onto ONE network request', async () => {
    const token = freshToken();
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { accessToken: token } }));

    // Seventeen, the number actually observed — awaited one after another, which
    // is precisely the shape the in-flight singleton cannot see.
    for (let i = 0; i < 17; i++) {
      expect(await forceRefreshAccessToken()).toBe(token);
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks again once the cooldown has passed', async () => {
    // The other half: this must not become "refresh once per page load", which
    // would break the case the whole mechanism exists for — a session revoked
    // elsewhere, discoverable only by asking.
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { accessToken: freshToken() } }));

    await forceRefreshAccessToken();
    vi.advanceTimersByTime(5_000);
    await forceRefreshAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('suppresses the burst after a FAILED refresh too', async () => {
    // A broken session is the state that would otherwise hammer hardest: every
    // caller fails, nothing is cached, and each one tries again immediately.
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'nope' }));

    for (let i = 0; i < 5; i++) {
      expect(await forceRefreshAccessToken()).toBeNull();
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('labels each refresh with a client instance and a rising sequence', async () => {
    /*
     * Diagnostics, not behaviour — and the reason they exist: reading the code
     * did not explain seventeen refreshes. Every entry point is accounted for
     * and none of them produces that. A single instance ID with a rising
     * sequence means this app is looping; several instance IDs mean several
     * contexts are racing over one shared cookie. The logs could not tell them
     * apart, so the next occurrence is instrumented to say which.
     */
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { accessToken: freshToken() } }));

    await forceRefreshAccessToken();
    vi.advanceTimersByTime(5_000);
    await forceRefreshAccessToken();

    const headersOf = (i: number) =>
      fetchMock.mock.calls[i]![1].headers as Record<string, string>;

    expect(headersOf(0)['X-Client-Instance']).toBeTruthy();
    // Same page load, same identity — that is what makes a burst attributable.
    expect(headersOf(1)['X-Client-Instance']).toBe(headersOf(0)['X-Client-Instance']);
    expect(headersOf(0)['X-Refresh-Seq']).toBe('1');
    expect(headersOf(1)['X-Refresh-Seq']).toBe('2');
  });
});
