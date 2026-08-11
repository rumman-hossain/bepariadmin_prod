// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../AuthContext';
import { useAuth } from '../../hooks/useAuth';

/**
 * What the OTP step tells the operator when something fails.
 *
 * Three of these were wrong at once, and all three shared a cause: the console
 * restating, in its own words, a situation only the backend could see.
 *
 *   - a 503 from an unreachable code store was reported like a wrong code;
 *   - a refused resend was reported as nothing at all, which reads as success;
 *   - an expired code was reported with a client sentence, so fixing the copy
 *     in utils/errors.ts alone would have left THIS screen still lying.
 *
 * These assert what reaches the state the screen renders, which is the last
 * point where the server's own sentence can still be thrown away.
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
  api.login.mockReset().mockResolvedValue({
    ok: true,
    status: 200,
    data: { data: { requiresOTP: true, otpNonce: 'n-1' } },
  });
  api.verify.mockReset().mockResolvedValue({ ok: false, status: 400, data: {} });
  api.resend.mockReset().mockResolvedValue({ ok: true, status: 200, data: { data: {} } });
  api.me.mockReset().mockResolvedValue({ ok: false, status: 401, data: {} });
});
afterEach(cleanup);

/** Renders the auth state the OTP screen reads, and settles its actions. */
function Harness() {
  const { login, verifyOtp, resendOtp, error, errorKind } = useAuth();
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
      <p data-testid="error">{error ?? ''}</p>
      <p data-testid="kind">{errorKind ?? ''}</p>
    </div>
  );
}

async function act(name: 'login' | 'resend' | 'verify') {
  const before = screen.getByRole('status').textContent ?? '';
  fireEvent.click(screen.getByText(`go-${name}`));
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toBe(before ? `${before},${name}` : name),
  );
}

const shownError = () => screen.getByTestId('error').textContent;
const shownKind = () => screen.getByTestId('kind').textContent;

async function signInToOtpStep() {
  render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  );
  await act('login');
}

describe('verifying a code that fails', () => {
  it('reports a store outage as ours, never as a wrong code', async () => {
    const server = 'Verification is temporarily unavailable. Please try again.';
    api.verify.mockResolvedValue({
      ok: false,
      status: 503,
      data: { error: { code: 'OTP_STORE_UNAVAILABLE', message: server } },
    });

    await signInToOtpStep();
    await act('verify');

    expect(shownError()).toBe(server);
    // The kind is what stops the screen offering to spend a paid SMS on it.
    expect(shownKind()).toBe('service');
    expect(shownError()).not.toMatch(/incorrect|invalid|wrong/i);
  });

  it('keeps the attempts countdown the server sent', async () => {
    api.verify.mockResolvedValue({
      ok: false,
      status: 400,
      data: { error: { code: 'INVALID_CODE', message: 'Incorrect code. 1 attempt remaining.' } },
    });

    await signInToOtpStep();
    await act('verify');

    expect(shownError()).toBe('Incorrect code. 1 attempt remaining.');
    expect(shownKind()).toBe('user');
  });

  it('does not claim a new code was sent when the old one is gone', async () => {
    // The EXPIRED_CODE branch had its own hardcoded sentence, so this path
    // bypassed utils/errors.ts entirely.
    const server =
      'This code is no longer valid. Request a new one — if you have run out, more become ' +
      'available an hour after your first request, or contact the Bepari-BD admin team.';
    api.verify.mockResolvedValue({
      ok: false,
      status: 400,
      data: { error: { code: 'EXPIRED_CODE', message: server } },
    });

    await signInToOtpStep();
    await act('verify');

    expect(shownError()).toBe(server);
    expect(shownError()).not.toMatch(/has been sent|sent you/i);
  });
});

describe('asking for another code', () => {
  it('says so when the server refused to send one', async () => {
    /*
     * This dispatched nothing at all on a refusal. The screen then started its
     * 60-second cooldown and incremented its resend counter exactly as it does
     * after a real send — so the operator waited for an SMS that the server had
     * already declined to send, with nothing on screen to say otherwise.
     */
    const server = 'Please wait 1 minute before requesting another code.';
    api.resend.mockResolvedValue({
      ok: false,
      status: 429,
      data: { error: { code: 'TOO_MANY_REQUESTS', message: server } },
    });

    await signInToOtpStep();
    await act('resend');

    expect(shownError()).toBe(server);
    expect(shownKind()).toBe('limit');
  });

  it('stays silent when the send actually worked', async () => {
    await signInToOtpStep();
    await act('resend');

    expect(shownError()).toBe('');
    expect(shownKind()).toBe('');
  });
});
