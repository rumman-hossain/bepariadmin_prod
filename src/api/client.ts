/**
 * HTTP Client
 *
 * Handles all API communication with automatic token attachment,
 * silent refresh on 401, request deduplication, and retries.
 *
 * Refresh token is handled via httpOnly cookie (set by backend).
 * Access token is stored in localStorage.
 */

import { API_BASE_URL, ACCESS_TOKEN_KEY, REQUEST_TIMEOUT } from '../utils/constants';
import type { ApiResponse } from '../types/api';

// ═══════════════════════════════════════════════════════════════
// Token Helpers
// ═══════════════════════════════════════════════════════════════

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function saveAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

/** Decode JWT payload to get expiry timestamp */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const exp = getTokenExpiry(token);
  return exp ? Date.now() > exp : true;
}

function isTokenExpiringSoon(token: string, seconds = 60): boolean {
  const exp = getTokenExpiry(token);
  return exp ? Date.now() > exp - seconds * 1000 : true;
}

// ═══════════════════════════════════════════════════════════════
// Token Refresh — Singleton with Queued Waiters
// ═══════════════════════════════════════════════════════════════

let refreshPromise: Promise<string | null> | null = null;
let pendingQueue: Array<{ resolve: (token: string | null) => void }> = [];

async function refreshAccessToken(): Promise<string | null> {
  // If refresh already in progress, queue and wait
  if (refreshPromise) {
    return new Promise((resolve) => {
      pendingQueue.push({ resolve });
    });
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        clearAccessToken();
        return null;
      }

      const json = await res.json();
      const newToken = json.data?.accessToken;

      if (newToken) {
        saveAccessToken(newToken);
      }

      return newToken;
    } catch {
      return null;
    } finally {
      // Flush all queued waiters
      const token = getAccessToken();
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
  if (currentToken && !isTokenExpired(currentToken)) {
    return currentToken;
  }
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

interface RequestOptions {
  auth?: boolean;
  body?: Record<string, unknown>;
  signal?: AbortSignal;
}

const pendingRequests = new Map<string, Promise<ApiResponse<unknown>>>();

export async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
  retries = 2
): Promise<ApiResponse<T>> {
  const reqKey = `${method}:${path}:${JSON.stringify(options.body ?? {})}`;

  // Deduplicate identical GET requests
  if (method === 'GET' && pendingRequests.has(reqKey)) {
    return pendingRequests.get(reqKey) as Promise<ApiResponse<T>>;
  }

  const exec = async (): Promise<ApiResponse<T>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Platform': 'web',
    };

    if (options.auth) {
      // Preemptive refresh if token expiring soon
      const currentToken = getAccessToken();
      if (currentToken && isTokenExpiringSoon(currentToken, 60)) {
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

      // Server errors — retry with backoff
      if (!res.ok && res.status >= 500 && retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        return request<T>(method, path, options, retries - 1);
      }

      return { ok: res.ok, status: res.status, data };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        return request<T>(method, path, options, retries - 1);
      }
      const message = err instanceof Error ? err.message : 'Network Error';
      const status = err instanceof DOMException && err.name === 'AbortError' ? 408 : 0;
      return { ok: false, status, data: { message } as T };
    }
  };

  const promise = exec().finally(() => {
    if (method === 'GET') pendingRequests.delete(reqKey);
  });

  if (method === 'GET') pendingRequests.set(reqKey, promise);
  return promise;
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

export { getAccessToken, saveAccessToken, clearAccessToken, getValidAccessToken, isTokenExpired };