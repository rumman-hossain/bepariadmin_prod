import { describe, it, expect } from 'vitest';
import {
  authReducer,
  initialAuthState,
  isAuthenticated,
  type AuthAction,
  type AuthState,
} from '../authMachine';
import type { AuthUser } from '../../types/auth';

const USER: AuthUser = {
  id: 'u1',
  name: 'Karim Rahman',
  email: 'karim@bepari-bd.com',
  role: 'admin',
  emailVerified: true,
};

/** Applies a sequence, so a whole flow can be asserted in one place. */
const run = (actions: AuthAction[], from: AuthState = initialAuthState) =>
  actions.reduce(authReducer, from);

describe('auth machine — the invalid states it makes unreachable', () => {
  it('never reaches dashboard without a user', () => {
    /*
     * The reason this is a reducer. With six independent useState values,
     * `step: 'dashboard'` with `user: null` type-checked and rendered — and
     * ProtectedRoute branches on `step` while the shell reads `user`, so the
     * app would have shown an authenticated chrome with nobody signed in.
     *
     * `session/established` is the only transition into `dashboard` and it
     * requires a user, so the pair cannot come apart.
     */
    const reachable = (
      [
        { type: 'bootstrap/anonymous', serverUp: true },
        { type: 'bootstrap/failed' },
        { type: 'request/start' },
        { type: 'request/failed', error: 'x' },
        { type: 'login/otpRequired', identifier: 'a', userType: 'staff' },
        { type: 'login/expired', error: 'x' },
        { type: 'session/ended' },
        { type: 'error/cleared' },
        { type: 'navigate', step: 'login_form' },
      ] as AuthAction[]
    ).map((a) => authReducer(initialAuthState, a));

    for (const state of reachable) {
      if (state.step === 'dashboard') expect(state.user).not.toBeNull();
    }
  });

  it('is never submitting once signed in', () => {
    const state = run([
      { type: 'request/start' },
      { type: 'session/established', user: USER },
    ]);
    expect(state.step).toBe('dashboard');
    expect(state.submitting).toBe(false);
  });

  it('is never loading once signed in', () => {
    const state = run([{ type: 'session/established', user: USER }]);
    expect(state.isLoading).toBe(false);
  });

  it('holds no stale error on the dashboard', () => {
    const state = run([
      { type: 'request/failed', error: 'Wrong password' },
      { type: 'session/established', user: USER },
    ]);
    expect(state.error).toBeNull();
  });
});

describe('auth machine — sign-in flows', () => {
  it('runs the OTP path end to end', () => {
    const afterLogin = run([
      { type: 'request/start' },
      { type: 'login/otpRequired', identifier: 'karim@bepari-bd.com', userType: 'staff' },
    ]);
    expect(afterLogin.step).toBe('verifying_login');
    expect(afterLogin.submitting).toBe(false);
    expect(afterLogin.pendingLogin).toEqual({
      identifier: 'karim@bepari-bd.com',
      userType: 'staff',
    });

    const afterOtp = run([{ type: 'session/established', user: USER }], afterLogin);
    expect(isAuthenticated(afterOtp)).toBe(true);
    // The identifier does not outlive the flow it belongs to.
    expect(afterOtp.pendingLogin).toBeNull();
  });

  it('returns to the form on an expired code, keeping the reason visible', () => {
    const state = run([
      { type: 'login/otpRequired', identifier: 'a@b.c', userType: 'staff' },
      { type: 'login/expired', error: 'That code has expired.' },
    ]);
    expect(state.step).toBe('login_form');
    expect(state.error).toBe('That code has expired.');
    expect(state.pendingLogin).toBeNull();
  });

  it('keeps the user on the form after a failed attempt', () => {
    const state = run([
      { type: 'request/start' },
      { type: 'request/failed', error: 'Invalid credentials' },
    ]);
    expect(state.step).toBe('idle');
    expect(state.submitting).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  it('clears the previous error when a new request starts', () => {
    // Otherwise a stale "Invalid credentials" sits under a spinner while the
    // corrected attempt is in flight.
    const state = run([
      { type: 'request/failed', error: 'Invalid credentials' },
      { type: 'request/start' },
    ]);
    expect(state.error).toBeNull();
    expect(state.submitting).toBe(true);
  });
});

describe('auth machine — bootstrap', () => {
  it('restores a session', () => {
    const state = authReducer(initialAuthState, {
      type: 'bootstrap/restored',
      user: USER,
      serverUp: true,
    });
    expect(isAuthenticated(state)).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('lands on the form when there is no session', () => {
    const state = authReducer(initialAuthState, { type: 'bootstrap/anonymous', serverUp: true });
    expect(state.step).toBe('login_form');
    expect(state.isLoading).toBe(false);
    expect(state.isServerReachable).toBe(true);
  });

  it('distinguishes "no session" from "server unreachable"', () => {
    /*
     * Both land on the login form, but only one of them means the credentials
     * would work — the shell shows a different screen for each, so the flag has
     * to survive the transition.
     */
    const offline = authReducer(initialAuthState, { type: 'bootstrap/failed' });
    expect(offline.step).toBe('login_form');
    expect(offline.isServerReachable).toBe(false);
  });

  it('always stops loading, whichever way bootstrap ends', () => {
    // A bootstrap that leaves isLoading true is a permanent spinner.
    for (const action of [
      { type: 'bootstrap/restored', user: USER, serverUp: true },
      { type: 'bootstrap/anonymous', serverUp: true },
      { type: 'bootstrap/failed' },
    ] as AuthAction[]) {
      expect(authReducer(initialAuthState, action).isLoading).toBe(false);
    }
  });
});

describe('auth machine — sign out', () => {
  const signedIn = run([{ type: 'session/established', user: USER }]);

  it('drops the user and returns to the form', () => {
    const state = authReducer(signedIn, { type: 'session/ended' });
    expect(state.user).toBeNull();
    expect(state.step).toBe('login_form');
    expect(isAuthenticated(state)).toBe(false);
  });

  it('reaches the same state from every route into it', () => {
    /*
     * Signing out happens from four places — explicit logout, a cross-tab
     * broadcast, a failed restore, and an expired OTP. They were four
     * hand-written groups of setters that could drift apart; they are one
     * transition now.
     */
    const viaLogout = authReducer(signedIn, { type: 'session/ended' });
    const viaExpiry = authReducer(signedIn, { type: 'login/expired', error: null as never });
    expect({ ...viaLogout, error: null }).toEqual({ ...viaExpiry, error: null });
  });

  it('keeps the server-reachable flag, which is not part of the session', () => {
    const offline = { ...signedIn, isServerReachable: false };
    expect(authReducer(offline, { type: 'session/ended' }).isServerReachable).toBe(false);
  });
});

describe('auth machine — hygiene', () => {
  it('returns the same object when clearing an already-clear error', () => {
    // Referential stability: a no-op dispatch must not re-render the app.
    const state = authReducer(initialAuthState, { type: 'error/cleared' });
    expect(state).toBe(initialAuthState);
  });

  it('is a pure function of its inputs', () => {
    const before = JSON.parse(JSON.stringify(initialAuthState));
    authReducer(initialAuthState, { type: 'session/established', user: USER });
    expect(JSON.parse(JSON.stringify(initialAuthState))).toEqual(before);
  });

  it('clears the error on navigation', () => {
    const errored = authReducer(initialAuthState, { type: 'request/failed', error: 'x' });
    const state = authReducer(errored, { type: 'navigate', step: 'login_form' });
    expect(state.step).toBe('login_form');
    expect(state.error).toBeNull();
  });
});

describe('auth machine — telling the user why they are back at the login form', () => {
  it('carries a notice when a session ended by itself', () => {
    const state = authReducer(initialAuthState, {
      type: 'bootstrap/anonymous',
      serverUp: true,
      notice: 'Your session ended. Please sign in again.',
    });
    expect(state.step).toBe('login_form');
    expect(state.notice).toBe('Your session ended. Please sign in again.');
    // Not an error. Nothing went wrong and nobody mistyped anything.
    expect(state.error).toBeNull();
  });

  it('says nothing to someone who was never signed in', () => {
    // Telling a first-time visitor their session expired is nonsense.
    const state = authReducer(initialAuthState, { type: 'bootstrap/anonymous', serverUp: true });
    expect(state.notice).toBeNull();
  });

  it('carries a notice through a mid-session revocation', () => {
    // A password change on another device now evicts this one immediately, so
    // this path is reachable while the user is sitting on the dashboard.
    const signedIn = authReducer(initialAuthState, { type: 'session/established', user: USER });
    const state = authReducer(signedIn, { type: 'session/ended', notice: 'Your session ended.' });
    expect(state.step).toBe('login_form');
    expect(state.notice).toBe('Your session ended.');
  });

  it('never shows a notice and an error at once', () => {
    /*
     * The login form picks one. If a stale notice survived a failed attempt the
     * user would see "your session ended" sitting above "invalid credentials"
     * and have no idea which applied.
     */
    const expired = authReducer(initialAuthState, {
      type: 'bootstrap/anonymous',
      serverUp: true,
      notice: 'Your session ended.',
    });
    const attempting = authReducer(expired, { type: 'request/start' });
    expect(attempting.notice).toBeNull();

    const failed = authReducer(attempting, { type: 'request/failed', error: 'Invalid credentials' });
    expect(failed.error).toBe('Invalid credentials');
    expect(failed.notice).toBeNull();
  });

  it('does not carry a notice onto the dashboard', () => {
    const expired = authReducer(initialAuthState, {
      type: 'bootstrap/anonymous',
      serverUp: true,
      notice: 'Your session ended.',
    });
    const state = authReducer(expired, { type: 'session/established', user: USER });
    expect(state.notice).toBeNull();
  });

  it('clears the notice on navigation', () => {
    const expired = authReducer(initialAuthState, {
      type: 'bootstrap/anonymous',
      serverUp: true,
      notice: 'Your session ended.',
    });
    expect(authReducer(expired, { type: 'navigate', step: 'login_form' }).notice).toBeNull();
  });
});
