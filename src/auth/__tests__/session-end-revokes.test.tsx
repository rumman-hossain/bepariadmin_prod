// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../AuthContext';
import { useAuth } from '../../hooks/useAuth';
import { setAccessToken, clearAccessToken } from '../memoryTokenStore';

/**
 * "YOUR SESSION ENDED" MUST MEAN THE SESSION ENDED.
 *
 * Reported as a vulnerability, and it was one. The console ended sessions only
 * in its own memory: it cleared the access token, dispatched `session/ended`,
 * showed "Your session ended. Please sign in again." — and told the server
 * nothing. The httpOnly refresh cookie stayed valid.
 *
 * So an operator read that message and walked away. Anyone at that keyboard
 * pressed Back, refreshed, and bootstrap's `POST /auth/refresh` correctly
 * answered YES. Real rows, full access, on a console that approves suppliers,
 * resets passwords and moves payout accounts.
 *
 * `apiLogoutSession` is the call that closes it, and the only one that can:
 * it authenticates by COOKIE, so it still works at the exact moment the access
 * token has gone null and `apiLogout` cannot authenticate at all.
 */

const api = vi.hoisted(() => ({
  login: vi.fn(),
  verify: vi.fn(),
  me: vi.fn(),
  resend: vi.fn(),
  logout: vi.fn(),
  logoutSession: vi.fn(),
}));

vi.mock('../../api/auth', () => ({
  apiLogin: api.login,
  apiVerifyLoginOtp: api.verify,
  apiGetMe: api.me,
  apiLogout: api.logout,
  apiLogoutSession: api.logoutSession,
  apiResendLoginOtp: api.resend,
}));

const restore = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock('../sessionRestore', () => ({
  restoreSession: () => restore.session(),
  checkServerHealth: async () => true,
}));

const SIGNED_IN = {
  ok: true as const,
  user: { id: 'u1', name: 'MD RUMMAN HOSSAIN', email: 'a@b.c', role: 'super_admin' },
};

beforeEach(() => {
  api.logout.mockReset().mockResolvedValue({ ok: true, status: 200, data: '' });
  api.logoutSession.mockReset().mockResolvedValue({ ok: true, status: 200, data: '' });
  restore.session.mockReset().mockResolvedValue(SIGNED_IN);
});
afterEach(cleanup);

function Harness() {
  const { step, notice, logout } = useAuth();
  return (
    <div>
      <span data-testid="step">{step}</span>
      {/* The login screen renders this; without it here the notice assertions
          below would be searching a DOM that never had the text in it. */}
      <span data-testid="notice">{notice}</span>
      <button onClick={() => void logout()}>sign out</button>
    </div>
  );
}

const renderSignedIn = async () => {
  render(<AuthProvider><Harness /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId('step').textContent).toBe('dashboard'));
};

describe('an explicit logout revokes on the server', () => {
  it('calls the cookie logout, which works without an access token', async () => {
    await renderSignedIn();
    await act(async () => { screen.getByText('sign out').click(); });
    await waitFor(() => expect(api.logoutSession).toHaveBeenCalled());
  });

  it('revokes exactly once, not once per listener that hears about it', async () => {
    /*
     * `clearAccessToken()` wakes the token subscriber, which also ends the
     * session — so the naive wiring revoked twice per logout, and the first
     * version of it recursed until the stack ran out. Once is the assertion
     * that holds both of those down.
     */
    await renderSignedIn();
    /*
     * The token MUST be set for this test to mean anything. Clearing a token
     * that is already null notifies nobody, so without this the subscriber
     * never wakes and the double-revoke it would cause cannot happen — the
     * assertion below would pass while proving nothing. Found by mutation:
     * removing the guard in `forceLogout` left this test green.
     */
    act(() => { setAccessToken('a.b.c'); });

    await act(async () => { screen.getByText('sign out').click(); });
    await waitFor(() => expect(api.logoutSession).toHaveBeenCalled());
    expect(api.logoutSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('step').textContent).toBe('login_form');
  });

  it('still signs out locally when the revoke FAILS', async () => {
    /*
     * Trapping somebody in a signed-in UI because the network is down would be
     * its own bug. What must not happen is claiming success we never had — see
     * the next test.
     */
    api.logout.mockRejectedValue(new Error('offline'));
    api.logoutSession.mockResolvedValue({ ok: false, status: 500, data: '' });
    await renderSignedIn();
    await act(async () => { screen.getByText('sign out').click(); });
    await waitFor(() => expect(screen.getByTestId('step').textContent).not.toBe('dashboard'));
  });

  it('says so when it could not confirm the session was ended', async () => {
    /*
     * `request` resolves `{ ok:false }` rather than throwing, so a 500 sailed
     * past the old try/catch and was indistinguishable from success. On a shared
     * machine the honest answer changes what the operator should do next.
     */
    api.logoutSession.mockResolvedValue({ ok: false, status: 500, data: '' });
    await renderSignedIn();
    await act(async () => { screen.getByText('sign out').click(); });
    await waitFor(() => expect(screen.getByText(/close the browser/i)).toBeTruthy());
  });

  /*
   * THE PATH THAT WAS ACTUALLY REPORTED.
   *
   * Nobody clicked sign out. The token went null on its own — an idle expiry, a
   * blip, the 401-storm path in api/client.ts — the console said "your session
   * ended", and the refresh cookie behind it stayed valid. This is the case the
   * whole change exists for, so it gets its own test rather than riding on the
   * explicit-logout ones.
   */
  it('revokes when the token goes null on its own, with nobody clicking anything', async () => {
    await renderSignedIn();
    act(() => { setAccessToken('a.b.c'); });
    api.logoutSession.mockClear();

    act(() => { clearAccessToken(); });

    await waitFor(() => expect(api.logoutSession).toHaveBeenCalled());
    expect(api.logoutSession).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('step').textContent).toBe('login_form'));
  });

  it('stays silent about it when the revoke succeeded', async () => {
    await renderSignedIn();
    await act(async () => { screen.getByText('sign out').click(); });
    await waitFor(() => expect(screen.getByTestId('step').textContent).not.toBe('dashboard'));
    expect(screen.queryByText(/close the browser/i)).toBeNull();
  });
});
