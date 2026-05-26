/**
 * sessionRestore — single enterprise entry point for cold-start session recovery.
 * Used by AuthContext bootstrap; mirrors runtime refresh contract in client.ts.
 */

import { API_BASE_URL, REQUEST_TIMEOUT } from '../utils/constants';
import { setAccessToken, clearAccessToken } from './memoryTokenStore';
import { apiGetMe } from '../api/auth';
import type { AuthUser } from '../types/auth';

export type SessionRestoreOutcome =
  | { ok: true; accessToken: string; user: AuthUser }
  | { ok: false; reason: 'refresh_failed' | 'missing_token' | 'profile_failed' | 'network' };

const WEB_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Client-Platform': 'web',
};

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

async function postRefresh(): Promise<Response | null> {
  const url = `${API_BASE_URL}/api/v1/auth/refresh`;
  const options: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: WEB_HEADERS,
  };

  let res = await fetchWithTimeout(url, options);
  if (res && (res.ok || res.status < 500)) {
    return res;
  }

  res = await fetchWithTimeout(url, options);
  return res;
}

function mapUser(me: Record<string, unknown>): AuthUser {
  return {
    id: me.id as string,
    name: (me.name as string) || '',
    email: (me.email as string) || '',
    role: (me.role as string) || '',
    phone: (me.phone as string) || undefined,
    shopName: (me.shopName as string) || undefined,
    logoUrl: (me.logoUrl as string) || undefined,
    code: (me.code as string) || undefined,
    emailVerified: (me.emailVerified as boolean) !== false,
  };
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
  const refreshRes = await postRefresh();
  if (!refreshRes?.ok) {
    return { ok: false, reason: 'refresh_failed' };
  }

  let refreshJson: Record<string, unknown>;
  try {
    refreshJson = (await refreshRes.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: 'network' };
  }

  const data = refreshJson.data as Record<string, unknown> | undefined;
  const accessToken = data?.accessToken as string | undefined;
  if (!accessToken) {
    return { ok: false, reason: 'missing_token' };
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
