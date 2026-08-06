/**
 * The session hint — a non-secret marker that lets boot skip a refresh that
 * could only ever fail.
 *
 * The refresh token lives in an httpOnly cookie, so JavaScript cannot read it.
 * That is deliberate — it is the XSS defence — but it also means the app has no
 * way to tell "signed out" from "signed in" except by asking the server. So
 * every anonymous visitor to the login page fired `POST /auth/refresh` purely to
 * be told "no".
 *
 * The server now sets `bd_session` beside `__session`, with matching attributes
 * and lifetime but readable by JavaScript. It carries a constant value and no
 * credential whatsoever.
 */

/**
 * The route prefixes where a visitor plausibly has no session, and where the
 * hint's ABSENCE may therefore be trusted to skip the refresh.
 *
 * This is the containment for the one dangerous failure mode. If the hint and
 * `__session` ever diverge — hint gone, session alive — trusting the hint
 * everywhere would show the login page to someone who is genuinely signed in,
 * which is exactly the bug F-42 fixed, arriving by another route.
 *
 * Restricting the optimisation to public routes means a deep link to
 * `/dashboard` ALWAYS attempts a refresh. A stale hint can then only ever cost
 * an anonymous visitor nothing, never a real user their session.
 */
export const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Whether the browser is carrying a session marker.
 *
 * **Never proof of authentication.** It answers only "is it worth asking the
 * server?". The server remains the sole authority on whether a session exists,
 * and any code that treats a `true` here as authorisation is a security bug —
 * anyone can set this cookie in a console.
 */
export function hasSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  // Match the name at a boundary: a bare `includes` would also match a cookie
  // called `not_bd_session`.
  return document.cookie
    .split(';')
    .some((c) => c.trim().startsWith('bd_session='));
}

/**
 * Whether boot should attempt to restore a session.
 *
 * Skips only when BOTH are true: no marker, and a route where nobody expects to
 * be signed in. Everything else asks the server, which is the only thing that
 * actually knows.
 */
export function shouldAttemptRestore(pathname: string): boolean {
  if (hasSessionHint()) return true;
  return !isPublicPath(pathname);
}
