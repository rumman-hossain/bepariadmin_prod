// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../AuthContext';
import { useAuth } from '../../hooks/useAuth';

/**
 * The nonce on the LOGIN side: captured once, replaced on every resend.
 *
 * `/auth/login` is the only response that ever carries the login nonce — there
 * is deliberately no endpoint that hands one out on its own, because that would
 * let anybody holding the six digits go and fetch what binds them, which is the
 * entire property the scheme exists to provide. So it is captured on the way
 * past or it is gone.
 *
 * `/auth/login/resend-otp` then issues a REPLACEMENT code and returns its nonce
 * beside `data` rather than inside it. Keeping the old value from there is the
 * failure this file exists to catch: the server checks the mac against the nonce
 * in its own record and answers a mismatch exactly as it answers a wrong code,
 * so the operator is told a correctly typed code is incorrect — three times,
 * after which the real code is destroyed.
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

// Cold-start restore is not what these tests are about, and left real it fires
// fetches at bootstrap.
vi.mock('../sessionRestore', () => ({
  restoreSession: async () => ({ ok: false, reason: 'refresh_failed' }),
  checkServerHealth: async () => true,
}));

vi.mock('../passwordHasher', async (importOriginal) => {
  const real = await importOriginal<typeof import('../passwordHasher')>();
  return {
    ...real,
    hashForLogin: async (p: string) => ({ primary: `pbkdf2v3:${p}`, legacy: null }),
  };
});

beforeEach(() => {
  api.login.mockReset();
  api.verify.mockReset().mockResolvedValue({ ok: false, status: 400, data: {} });
  api.resend.mockReset();
  api.me.mockReset().mockResolvedValue({ ok: false, status: 401, data: {} });
});
afterEach(cleanup);

/** A login that stops at the OTP step, carrying `nonce` if one is given. */
function loginRequiringOtp(nonce?: string) {
  api.login.mockResolvedValue({
    ok: true,
    status: 200,
    data: { data: { requiresOTP: true, ...(nonce ? { otpNonce: nonce } : {}) } },
  });
}

/**
 * Buttons that announce when their action has FULLY settled.
 *
 * Waiting on `api.resend` having been *called* is not enough and produced a
 * genuinely order-dependent test: the call happens before its response resolves,
 * so a verify clicked straight afterwards read the nonce as it was BEFORE the
 * resend's dispatch had committed. It passed alone and failed in the full suite.
 *
 * The marker is rendered after the promise settles, so `findByText` waiting on
 * it implies the state update and the effect that mirrors `pendingLogin` into
 * its ref have both flushed.
 */
function Harness() {
  const { login, verifyOtp, resendOtp } = useAuth();
  const [done, setDone] = useState<string[]>([]);
  const settle = (name: string) => () => setDone((d) => [...d, name]);
  const run = (name: string, action: () => Promise<void>) => () => {
    void action().then(settle(name), settle(name));
  };

  return (
    <div>
      <button onClick={run('login', () => login('karim@bepari-bd.com', 'Kh0lnaRiver'))}>
        go-login
      </button>
      <button onClick={run('resend', resendOtp)}>go-resend</button>
      <button onClick={run('verify', () => verifyOtp('481902'))}>go-verify</button>
      <output>{done.join(',')}</output>
    </div>
  );
}

/** Click an action and wait for it to settle, not merely to have started. */
async function act(name: 'login' | 'resend' | 'verify') {
  const before = screen.getByRole('status').textContent ?? '';
  fireEvent.click(screen.getByText(`go-${name}`));
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toBe(before ? `${before},${name}` : name),
  );
}

/** The `otpNonce` handed to the most recent verify-login call. */
function nonceSentToVerify(): unknown {
  const [payload] = api.verify.mock.calls.at(-1)! as [{ otpNonce?: string }];
  return payload.otpNonce;
}

async function signInToOtpStep(nonce?: string) {
  loginRequiringOtp(nonce);
  render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  );
  await act('login');
  expect(api.login).toHaveBeenCalled();
}

describe('login OTP nonce', () => {
  it('sends the nonce the login response carried', async () => {
    await signInToOtpStep('n-from-login');

    await act('verify');
    expect(api.verify).toHaveBeenCalled();

    expect(nonceSentToVerify()).toBe('n-from-login');
  });

  it('replaces it with the one a resend returned', async () => {
    await signInToOtpStep('n-from-login');

    // Beside `data`, not inside it — /auth/login/resend-otp answers
    // { data: "verification code resent", otpNonce: "..." }.
    api.resend.mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: 'verification code resent', otpNonce: 'n-from-resend' },
    });

    await act('resend');
    expect(api.resend).toHaveBeenCalled();

    await act('verify');
    expect(api.verify).toHaveBeenCalled();

    expect(nonceSentToVerify()).toBe('n-from-resend');
  });

  it('drops the old one when a resend names no replacement', async () => {
    // A code was issued regardless, so what we held is stale. Unbound is weaker
    // than bound; bound to a retired issuance cannot verify at all.
    await signInToOtpStep('n-from-login');

    api.resend.mockResolvedValue({ ok: true, status: 200, data: { data: 'resent' } });

    await act('resend');
    expect(api.resend).toHaveBeenCalled();

    await act('verify');
    expect(api.verify).toHaveBeenCalled();

    expect(nonceSentToVerify()).toBeUndefined();
  });

  it('keeps it when the resend was REFUSED', async () => {
    // Inside the cooldown, or out of hourly budget: no message was sent, so the
    // code in the inbox and its nonce are both still the live pair. Clearing
    // here would break a flow that was working.
    await signInToOtpStep('n-from-login');

    api.resend.mockResolvedValue({
      ok: false,
      status: 429,
      data: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    });

    await act('resend');
    expect(api.resend).toHaveBeenCalled();

    await act('verify');
    expect(api.verify).toHaveBeenCalled();

    expect(nonceSentToVerify()).toBe('n-from-login');
  });

  it('verifies unbound when the login response carried no nonce', async () => {
    // An older backend, or one with binding not yet rolled out. The code still
    // has to work: OTP_REQUIRE_BINDING is false and a digest with no mac passes.
    await signInToOtpStep(undefined);

    await act('verify');
    expect(api.verify).toHaveBeenCalled();

    expect(nonceSentToVerify()).toBeUndefined();
  });
});
