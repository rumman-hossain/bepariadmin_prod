/**
 * memoryTokenStore — Netflix-style closure token store.
 *
 * Access tokens live ONLY in a module-scope variable behind exported getters/setters.
 * They NEVER touch localStorage, sessionStorage, or window globals.
 *
 * This prevents token theft via XSS because JavaScript running in the browser
 * cannot enumerate module scope variables from outside the closure.
 */

// ─── Module-scope state (NOT exported) ──────────────────────────────────

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;
const subscribers = new Set<(token: string | null) => void>();

// ─── Helpers ────────────────────────────────────────────────────────────

function decodeJwtExpiry(token: string): number {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return 0;
    const payload = JSON.parse(atob(payloadB64));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0; // ms
  } catch {
    return 0;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  tokenExpiresAt = token ? decodeJwtExpiry(token) : 0;
  for (const fn of subscribers) fn(token);
}

export function clearAccessToken(): void {
  accessToken = null;
  tokenExpiresAt = 0;
  for (const fn of subscribers) fn(null);
}

export function getTokenExpiry(): number {
  return tokenExpiresAt;
}

/**
 * Returns true when token is expired (with 30-second buffer).
 */
export function isTokenExpired(): boolean {
  if (!accessToken || tokenExpiresAt === 0) return true;
  return Date.now() > tokenExpiresAt - 30_000;
}

/**
 * Returns true when token will expire within `thresholdSeconds`.
 * Default 120 seconds (2 minutes) — ideal for silent refresh.
 */
export function isTokenExpiringSoon(thresholdSeconds: number = 120): boolean {
  if (!accessToken || tokenExpiresAt === 0) return false;
  return Date.now() > tokenExpiresAt - thresholdSeconds * 1000;
}

/**
 * Subscribe to token changes. Returns an unsubscribe function.
 * Used by AuthContext to react to token updates without React state.
 */
export function subscribe(fn: (token: string | null) => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}