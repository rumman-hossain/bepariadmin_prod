/**
 * HTTP Client
 *
 * Handles all API communication with automatic token attachment,
 * silent refresh on 401, request deduplication, and retries.
 *
 * Refresh token: httpOnly cookie (set by backend, JS-inaccessible).
 * Access token: module-scope closure variable (memoryTokenStore) —
 *   NEVER touches localStorage or sessionStorage (XSS-proof).
 */

import { API_BASE_URL, REQUEST_TIMEOUT } from '../utils/constants';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  isTokenExpired,
  isTokenExpiringSoon,
} from '../auth/memoryTokenStore';
import type { ApiResponse } from '../types/api';

// ═══════════════════════════════════════════════════════════════
// Token Refresh — Singleton with Queued Waiters
// ═══════════════════════════════════════════════════════════════

let refreshPromise: Promise<string | null> | null = null;
let pendingQueue: Array<{ resolve: (token: string | null) => void }> = [];

/**
 * How long a just-completed refresh answers for the next caller.
 *
 * The singleton only collapses refreshes that OVERLAP. Production logs show 17
 * refreshes in three seconds and 36 in sixteen — sequential, each starting after
 * the last resolved, so every one of them was a separate network request and a
 * separate server-side rotation.
 *
 * A token minted a second ago is valid for another fifteen minutes, so asking
 * again cannot learn anything. This collapses a burst onto one request without
 * ever handing anyone a token it has reason to doubt.
 *
 * Deliberately NOT a circuit breaker. Refusing to refresh after N attempts would
 * log someone out to protect the server from the client, which is the wrong way
 * round.
 */
const REFRESH_COOLDOWN_MS = 1500;

let lastRefreshAt = 0;
let lastRefreshResult: string | null = null;

/**
 * Identifies this page load, so a burst in the server logs can be attributed.
 *
 * One tab, one ID. If a burst carries a single instance with a rising sequence,
 * something in this app is looping; if it carries many instances, they are
 * separate contexts racing over one shared cookie. Reading the code did not
 * settle which — every refresh entry point is accounted for and none of them
 * explains seventeen — so the next occurrence is instrumented to say so itself.
 *
 * Carries no user data and is regenerated on every load.
 */
const CLIENT_INSTANCE_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

let refreshSequence = 0;

async function refreshAccessToken(): Promise<string | null> {
  // If refresh already in progress, queue and wait
  if (refreshPromise) {
    return new Promise((resolve) => {
      pendingQueue.push({ resolve });
    });
  }

  // A refresh that finished moments ago answers for this one too.
  if (lastRefreshAt && Date.now() - lastRefreshAt < REFRESH_COOLDOWN_MS) {
    return lastRefreshResult;
  }

  refreshPromise = (async () => {
    // The only fetch in this file that had no AbortController. Every other
    // request times out; this one could hang forever behind a captive portal or
    // a load-balancer blackhole — and because every concurrent caller parks on
    // `pendingQueue`, a hung refresh blocked every authenticated request in the
    // app indefinitely, with no rejection path.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Instance': CLIENT_INSTANCE_ID,
          'X-Refresh-Seq': String(++refreshSequence),
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        clearAccessToken();
        return null;
      }

      const json = await res.json();
      const newToken = json.data?.accessToken;

      if (newToken) {
        setAccessToken(newToken);
      }

      return newToken;
    } catch {
      // Previously returned null WITHOUT clearing, while the `finally` below
      // flushed every queued waiter with `getAccessToken()` — the still-cached,
      // known-expired token. A transient blip during refresh therefore released
      // the whole queue with a dead token and produced a 401 storm instead of a
      // clean re-authentication.
      clearAccessToken();
      return null;
    } finally {
      clearTimeout(timeoutId);
      // Flush all queued waiters
      const token = getAccessToken();
      // Recorded here, not in the success path, so a FAILED refresh also
      // suppresses the next 1.5 seconds. Otherwise a broken session is the one
      // state that hammers hardest.
      lastRefreshAt = Date.now();
      lastRefreshResult = token;
      for (const waiter of pendingQueue) {
        waiter.resolve(token);
      }
      pendingQueue = [];
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function getValidAccessToken(): Promise<string | null> {
  const currentToken = getAccessToken();
  if (currentToken && !isTokenExpired()) {
    return currentToken;
  }
  return refreshAccessToken();
}

/**
 * A token guaranteed to still be valid `minValidSeconds` from now.
 *
 * `getValidAccessToken` refreshes once the token has ALREADY expired, which is
 * fine for a request that completes in milliseconds. It is not fine for a long
 * one: an upload that takes two minutes can start with a token that is valid and
 * finish with one that is not.
 *
 * Callers outside `request()` need this because they build their own headers —
 * see `services/upload/api.ts`, which is the only such caller and used to send a
 * bare `getAccessToken()` with no expiry check at all.
 *
 * Routes through the same refresh singleton as everything else, so concurrent
 * callers queue on one in-flight refresh rather than starting a stampede.
 */
export async function getFreshAccessToken(minValidSeconds = 60): Promise<string | null> {
  const currentToken = getAccessToken();
  if (currentToken && !isTokenExpiringSoon(minValidSeconds)) {
    return currentToken;
  }
  return refreshAccessToken();
}

/**
 * Force a refresh, regardless of what the local expiry claims.
 *
 * For the one case the expiry cannot predict: the server rejected a token we
 * believed was good. That happens when the session was revoked elsewhere — a
 * password change on another device, an admin eviction — and the only way to
 * find out is to be told.
 */
export function forceRefreshAccessToken(): Promise<string | null> {
  return refreshAccessToken();
}

// ═══════════════════════════════════════════════════════════════
// JSON Parsing
// ═══════════════════════════════════════════════════════════════

async function safeParseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (
    contentType.includes('application/json') ||
    text.trim().startsWith('{') ||
    text.trim().startsWith('[')
  ) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return { error: { code: 'JSON_PARSE_ERROR', message: 'Failed to parse response' } } as unknown as T;
    }
  }

  return text as unknown as T;
}

// ═══════════════════════════════════════════════════════════════
// Request — Core HTTP Function
// ═══════════════════════════════════════════════════════════════

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Methods it is safe to replay.
 *
 * The retry paths below fired for ANY method, on 5xx *and* on timeout, up to
 * three attempts. `REQUEST_TIMEOUT` is 15s, so a POST the server had already
 * ACCEPTED but answered slowly — or 5xx'd after committing — was sent again,
 * twice. No Idempotency-Key is attached to anything in src/api, so the server
 * has no way to collapse the duplicates.
 *
 * Reachable on apiLogin, apiResetPassword, wholesaler create/update, and
 * product publish. Duplicate account creation and duplicate password resets are
 * exactly the kind of thing that is never noticed until it is.
 *
 * PUT and DELETE are idempotent by HTTP semantics; POST and PATCH are not.
 */
const REPLAYABLE_METHODS: ReadonlySet<HttpMethod> = new Set<HttpMethod>([
  'GET',
  'PUT',
  'DELETE',
]);

interface RequestOptions {
  auth?: boolean;
  body?: Record<string, unknown>;
  signal?: AbortSignal;
}

const pendingRequests = new Map<string, Promise<ApiResponse<unknown>>>();

/**
 * Public entry point: de-duplication, wrapped around the retrying executor.
 *
 * The two concerns have to stay separate. When they were one function, the
 * retry recursed back through this de-duplication check — and because the
 * outer call had already registered its key, the retry was handed the very
 * promise it was running inside. Every GET that hit a 5xx or a network error
 * awaited itself and NEVER RESOLVED: no error, no timeout, just a spinner that
 * spun until the operator reloaded the page.
 */
export function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
  retries = 2,
): Promise<ApiResponse<T>> {
  if (method !== 'GET') return execWithRetry<T>(method, path, options, retries);

  const reqKey = `${method}:${path}:${JSON.stringify(options.body ?? {})}`;
  const inFlight = pendingRequests.get(reqKey);
  if (inFlight) return inFlight as Promise<ApiResponse<T>>;

  const promise = execWithRetry<T>(method, path, options, retries).finally(() => {
    // Released on failure as well as success, so an error is not cached.
    pendingRequests.delete(reqKey);
  });

  pendingRequests.set(reqKey, promise);
  return promise;
}

async function execWithRetry<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions,
  retries: number,
): Promise<ApiResponse<T>> {
  const exec = async (): Promise<ApiResponse<T>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'web',
    };

    if (options.auth) {
      // Preemptive refresh if token expiring soon
      const currentToken = getAccessToken();
      if (currentToken && isTokenExpiringSoon(60)) {
        await refreshAccessToken();
      }

      const token = getAccessToken();
      if (!token) {
        return { ok: false, status: 401, data: { message: 'Not authenticated' } as T };
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: 'include',
        signal: options.signal || controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await safeParseResponse<T>(res);

      // 401 with auth — try refresh once and retry
      if (res.status === 401 && options.auth) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryRes = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            credentials: 'include',
          });
          const retryData = await safeParseResponse<T>(retryRes);
          return { ok: retryRes.ok, status: retryRes.status, data: retryData };
        }
      }

      // Server errors — retry with backoff, but only where a replay is safe.
      if (!res.ok && res.status >= 500 && retries > 0 && REPLAYABLE_METHODS.has(method)) {
        const delay = Math.pow(2, 3 - retries) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        // Recurse into the executor, NOT the de-duplicating entry point.
        return execWithRetry<T>(method, path, options, retries - 1);
      }

      return { ok: res.ok, status: res.status, data };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      // A timeout is the MOST dangerous case to replay: the request may well
      // have been received and applied, and we simply never saw the response.
      if (retries > 0 && REPLAYABLE_METHODS.has(method)) {
        const delay = Math.pow(2, 3 - retries) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        return execWithRetry<T>(method, path, options, retries - 1);
      }
      const message = err instanceof Error ? err.message : 'Network Error';
      const status = err instanceof DOMException && err.name === 'AbortError' ? 408 : 0;
      return { ok: false, status, data: { message } as T };
    }
  };

  return exec();
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

export { getAccessToken, getValidAccessToken };