/**
 * Token Manager — Browser
 *
 * Access token: localStorage (short-lived, 15 min)
 * Refresh token: httpOnly cookie (set by backend, JS-inaccessible)
 *
 * Cross-tab sync via BroadcastChannel.
 */

import { ACCESS_TOKEN_KEY } from '../utils/constants';

// ═══════════════════════════════════════════════════════════════
// Access Token
// ═══════════════════════════════════════════════════════════════

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  broadcastTokenUpdate(token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  broadcastLogout();
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// ═══════════════════════════════════════════════════════════════
// JWT Decode
// ═══════════════════════════════════════════════════════════════

export function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const exp = getTokenExpiry(token);
  return exp ? Date.now() > exp : true;
}

export function isTokenExpiringSoon(token: string, seconds = 60): boolean {
  const exp = getTokenExpiry(token);
  return exp ? Date.now() > exp - seconds * 1000 : true;
}

// ═══════════════════════════════════════════════════════════════
// Cross-Tab Sync (BroadcastChannel)
// ═══════════════════════════════════════════════════════════════

type TokenMessage =
  | { type: 'TOKEN_UPDATED'; token: string }
  | { type: 'LOGOUT' };

const CHANNEL_NAME = 'bepari-auth';

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  try {
    if (!channel) {
      channel = new BroadcastChannel(CHANNEL_NAME);
    }
    return channel;
  } catch {
    return null;
  }
}

function broadcastTokenUpdate(token: string): void {
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: 'TOKEN_UPDATED', token } satisfies TokenMessage);
  }
}

function broadcastLogout(): void {
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: 'LOGOUT' } satisfies TokenMessage);
  }
}

/**
 * Subscribe to cross-tab auth events.
 * Returns an unsubscribe function.
 */
export function onAuthBroadcast(
  onTokenUpdated: (token: string) => void,
  onLogout: () => void
): () => void {
  const ch = getChannel();

  if (!ch) {
    return () => {};
  }

  const handler = (event: MessageEvent<TokenMessage>) => {
    if (event.data.type === 'TOKEN_UPDATED') {
      localStorage.setItem(ACCESS_TOKEN_KEY, event.data.token);
      onTokenUpdated(event.data.token);
    } else if (event.data.type === 'LOGOUT') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      onLogout();
    }
  };

  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}