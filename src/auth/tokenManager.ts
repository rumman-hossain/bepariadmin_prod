/**
 * Token Manager — Cross-Tab Logout Sync
 *
 * Access tokens are stored ONLY in memoryTokenStore (module-scope closure).
 * Refresh tokens are httpOnly cookies (JS-inaccessible).
 *
 * This module handles BroadcastChannel-based cross-tab LOGOUT only.
 * No localStorage token sync — tokens NEVER touch localStorage.
 */

// ═══════════════════════════════════════════════════════════════
// Cross-Tab Sync (BroadcastChannel)
// ═══════════════════════════════════════════════════════════════

type LogoutMessage = { type: 'LOGOUT' };

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

/**
 * Broadcast a logout event to all other tabs.
 * Called after apiLogout completes.
 */
export function broadcastLogout(): void {
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: 'LOGOUT' } satisfies LogoutMessage);
  }
}

/**
 * Subscribe to logout broadcasts from other tabs.
 * Returns an unsubscribe function.
 */
export function onAuthBroadcast(
  onLogout: () => void
): () => void {
  const ch = getChannel();

  if (!ch) {
    return () => {};
  }

  const handler = (event: MessageEvent<LogoutMessage>) => {
    if (event.data.type === 'LOGOUT') {
      onLogout();
    }
  };

  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}