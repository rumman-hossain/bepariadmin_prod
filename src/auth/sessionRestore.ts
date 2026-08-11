/**
 * sessionRestore — single enterprise entry point for cold-start session recovery.
 * Used by AuthContext bootstrap; mirrors runtime refresh contract in client.ts.
 */

import { API_BASE_URL, REQUEST_TIMEOUT } from '../utils/constants';
import { setAccessToken, clearAccessToken } from './memoryTokenStore';
import { apiGetMe } from '../api/auth';
import { forceRefreshAccessToken } from '../api/client';
import type { AuthUser } from '../types/auth';
import { mapUser } from './mapUser';

export type SessionRestoreOutcome =
  | { ok: true; accessToken: string; user: AuthUser }
  | {
      ok: false;
      /**
       * `session_expired` and `missing_token` are no longer produced here.
       *
       * They came from inspecting the raw refresh response, which this module
       * used to fetch itself — a second refresh implementation racing the one in
       * `api/client.ts`, and the cause of the reload-shows-login bug. Boot now
       * goes through the shared singleton, which reports success or failure and
       * not the response body.
       *
       * The variants are kept in the union because `AuthContext` still switches
       * on them and a caller may reintroduce the distinction properly (the
       * server does send a distinguishable code). Narrowing the type would only
       * move the loss somewhere less visible.
       */
      reason: 'refresh_failed' | 'session_expired' | 'missing_token' | 'profile_failed' | 'network';
    };

/** Used only by the health probe below; the refresh path no longer fetches directly. */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Boot-time refresh, routed through the SAME singleton every other caller uses.
 *
 * This used to be its own raw `fetch` — a second, uncoordinated refresh
 * implementation living beside the one in `api/client.ts`. That is what caused
 * the reload-shows-login bug.
 *
 * Refresh tokens rotate on every use. A page load fired this AND any 401-driven
 * refresh from `client.ts`, and the singleton only de-duplicated its own half.
 * Production logs caught three refreshes inside 250ms: each read the same
 * active token, each minted a replacement, and only the last one survived
 * server-side. The browser kept whichever response landed last — often a token
 * already dead — and its next refresh was rejected, at which point the server
 * cleared the session cookie and the user was signed out for good.
 *
 * The server no longer punishes that race (see rotateSession), but the race
 * itself should not exist: one refresh implementation, one in-flight request,
 * every caller awaiting the same promise.
 */
async function refreshForBoot(): Promise<string | null> {
  return forceRefreshAccessToken();
}

async function loadProfile(accessToken: string): Promise<AuthUser | null> {
  setAccessToken(accessToken);

  let meRes = await apiGetMe();
  if (!meRes.ok) {
    await new Promise((r) => setTimeout(r, 800));
    meRes = await apiGetMe();
  }

  if (!meRes.ok) {
    clearAccessToken();
    return null;
  }

  const me = (meRes.data as unknown as Record<string, unknown>).data as Record<string, unknown>;
  return mapUser(me);
}

/** Restore session from httpOnly __session cookie (Firebase-compatible). */
export async function restoreSession(): Promise<SessionRestoreOutcome> {
  /*
   * The singleton returns the token or null; it does not surface the response,
   * so the old `session_expired` vs `refresh_failed` split by error code is no
   * longer available here.
   *
   * That distinction was cosmetic — both land the user on the sign-in form, and
   * `refresh_failed` already carries the "your session ended" notice. Keeping
   * two refresh implementations to preserve a nuance in a message is what
   * caused the logout bug in the first place.
   */
  const accessToken = await refreshForBoot();
  if (!accessToken) {
    return { ok: false, reason: 'refresh_failed' };
  }

  const user = await loadProfile(accessToken);
  if (!user) {
    return { ok: false, reason: 'profile_failed' };
  }

  return { ok: true, accessToken, user };
}

export async function checkServerHealth(): Promise<boolean> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, REQUEST_TIMEOUT);
  return Boolean(res?.ok);
}
