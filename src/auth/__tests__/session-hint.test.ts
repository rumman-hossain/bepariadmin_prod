// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { hasSessionHint, isPublicPath, shouldAttemptRestore } from '../sessionHint';

function setCookie(raw: string) {
  document.cookie = raw;
}

afterEach(() => {
  // jsdom keeps cookies between tests; expire everything this file set.
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0]!.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
  });
});

describe('session hint — reading it', () => {
  it('is absent for a browser that has never signed in', () => {
    expect(hasSessionHint()).toBe(false);
  });

  it('is present once the server has set it', () => {
    setCookie('bd_session=1; path=/');
    expect(hasSessionHint()).toBe(true);
  });

  it('does not match a cookie that merely contains the name', () => {
    /*
     * A bare `document.cookie.includes('bd_session=')` would match
     * `not_bd_session=1` and `xbd_session=1`. Getting this wrong makes the app
     * skip a refresh for a signed-in user, which is the failure mode this
     * whole design is arranged to avoid.
     */
    setCookie('not_bd_session=1; path=/');
    expect(hasSessionHint()).toBe(false);
  });

  it('finds it when other cookies come first', () => {
    setCookie('theme=dark; path=/');
    setCookie('bd_session=1; path=/');
    expect(hasSessionHint()).toBe(true);
  });
});

describe('session hint — where its absence may be trusted', () => {
  /*
   * The containment for the one dangerous divergence: hint gone while
   * __session is still alive. Trusting the hint everywhere would show the
   * login page to someone genuinely signed in — the F-42 symptom by another
   * route. So its ABSENCE only counts on routes where nobody expects a session.
   */

  it('skips the refresh on public routes when there is no hint', () => {
    for (const p of ['/login', '/forgot-password', '/reset-password']) {
      expect(shouldAttemptRestore(p)).toBe(false);
    }
  });

  it('ALWAYS asks on a protected route, hint or not', () => {
    // The mitigation. A deep link to real work must never be denied a refresh
    // because a marker cookie went missing.
    for (const p of ['/dashboard', '/orders', '/logistics', '/accounting', '/']) {
      expect(shouldAttemptRestore(p)).toBe(true);
    }
  });

  it('asks on a public route too, once a hint exists', () => {
    setCookie('bd_session=1; path=/');
    expect(shouldAttemptRestore('/login')).toBe(true);
  });

  it('treats nested public paths as public', () => {
    expect(isPublicPath('/reset-password/step-2')).toBe(true);
    // ...but not a route that merely starts with the same letters.
    expect(isPublicPath('/loginish')).toBe(false);
  });
});
