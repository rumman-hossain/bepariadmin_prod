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
let localExpiresAt: number = 0;
const subscribers = new Set<(token: string | null) => void>();

// ─── Helpers ────────────────────────────────────────────────────────────

function decodeJwtClaims(token: string): { exp: number; iat: number } | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    return {
      exp: typeof payload.exp === 'number' ? payload.exp * 1000 : 0, // ms
      iat: typeof payload.iat === 'number' ? payload.iat * 1000 : 0, // ms
    };
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    const claims = decodeJwtClaims(token);
    if (claims && claims.exp > 0 && claims.iat > 0) {
      const lifespan = claims.exp - claims.iat;
      // Safeguard lifespan values: must be between 0 and 2 hours
      if (lifespan > 0 && lifespan < 7200 * 1000) {
        localExpiresAt = Date.now() + lifespan;
      } else {
        localExpiresAt = claims.exp;
      }
    } else {
      localExpiresAt = 0;
    }
  } else {
    localExpiresAt = 0;
  }
  for (const fn of subscribers) fn(token);
}

/*
 * NOTIFIES ONLY ON A REAL TRANSITION.
 *
 * This used to notify unconditionally — a change event announcing no change —
 * and that turned a subscriber which ends the session into an infinite loop:
 *
 *   clearAccessToken() → notify(null) → subscriber ends the session
 *                      → clearAccessToken() → notify(null) → …
 *
 * The subscriber in AuthContext guards on `isAuthenticatedRef`, but that ref is
 * written in a `useEffect`, and React cannot render during a synchronous
 * recursion — so every level read `true` and the stack ran out. It surfaced as
 * an unhandled `RangeError`, not a failing assertion, which is exactly the kind
 * of thing a green summary line hides.
 *
 * Clearing a token that is already null is a no-op, so it should say nothing.
 * Anyone genuinely interested in "it is null" can read `getAccessToken()`.
 */
export function clearAccessToken(): void {
  if (accessToken === null && localExpiresAt === 0) return;
  accessToken = null;
  localExpiresAt = 0;
  for (const fn of subscribers) fn(null);
}

/**
 * Returns true when token is expired (with 30-second buffer).
 */
export function isTokenExpired(): boolean {
  if (!accessToken || localExpiresAt === 0) return true;
  return Date.now() > localExpiresAt - 30_000;
}

/**
 * Returns true when token will expire within `thresholdSeconds`.
 * Default 120 seconds (2 minutes) — ideal for silent refresh.
 */
export function isTokenExpiringSoon(thresholdSeconds: number = 120): boolean {
  if (!accessToken || localExpiresAt === 0) return false;
  return Date.now() > localExpiresAt - thresholdSeconds * 1000;
}

/**
 * Subscribe to token changes. Returns an unsubscribe function.
 * Used by AuthContext to react to token updates without React state.
 */
export function subscribe(fn: (token: string | null) => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}