// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResetPasswordForm } from '../ResetPasswordForm';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ clearError: () => {} }),
}));

const apiMock = vi.hoisted(() => ({
  verify: vi.fn(),
  reset: vi.fn(),
  forgot: vi.fn(),
}));

vi.mock('../../../api/auth', () => ({
  apiVerifyResetOtp: apiMock.verify,
  apiResetPassword: apiMock.reset,
  apiForgotPassword: apiMock.forgot,
}));

/*
 * Only the password derivation is stubbed — 310,000 PBKDF2 iterations per test
 * buys nothing here and jsdom does not carry a SubtleCrypto to run them on.
 * `readOtpNonce` is deliberately NOT mocked: the shape it reads off a response
 * is half of what these tests are about.
 */
vi.mock('../../../auth/passwordHasher', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../auth/passwordHasher')>();
  return { ...real, hashPassword: async (p: string) => `pbkdf2v3:${p}`, hashErrorMessage: () => null };
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/reset-password');

});

function renderAt(search: string) {
  window.history.replaceState({}, '', `/reset-password${search}`);
  return render(
    <MemoryRouter>
      <ResetPasswordForm />
    </MemoryRouter>,
  );
}

/**
 * How forgot-password hands the address over now: router state, which lives in
 * history.state rather than the URL or web storage.
 */
function renderWithState(state: { email: string; otpNonce?: string }) {
  window.history.replaceState({}, '', '/reset-password');
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reset-password', state }]}>
      <ResetPasswordForm />
    </MemoryRouter>,
  );
}

describe('ResetPasswordForm — the email is fixed once it is known', () => {
  /*
   * The reset code is generated for one specific address. Arriving from
   * forgot-password means we already know which, so an editable field offers a
   * change that cannot succeed: edit the address and the code silently stops
   * verifying, with nothing on screen saying why.
   */

  it('locks the email when forgot-password passed it along', () => {
    renderAt('?email=someone%40example.com');
    const email = screen.getByLabelText(/email address/i) as HTMLInputElement;

    expect(email.value).toBe('someone@example.com');
    expect(email.readOnly).toBe(true);
  });

  it('uses readOnly rather than disabled, so it stays reachable', () => {
    /*
     * `disabled` drops the field out of the tab order and out of the
     * accessibility tree in several combinations. On this screen the address is
     * the single thing a user most needs to read back — "is the code going
     * where I think?" — so it must stay focusable and announced.
     */
    renderAt('?email=someone%40example.com');
    const email = screen.getByLabelText(/email address/i) as HTMLInputElement;

    expect(email.disabled).toBe(false);
    expect(email.readOnly).toBe(true);
  });

  it('says where the code went', () => {
    renderAt('?email=someone%40example.com');
    expect(screen.getByText(/the code was sent to this address/i)).toBeTruthy();
  });

  it('leaves the field editable when opened directly', () => {
    // No email in the URL: the user has to say who they are, so locking an
    // empty field would make the screen impossible to complete.
    renderAt('');
    const email = screen.getByLabelText(/email address/i) as HTMLInputElement;

    expect(email.value).toBe('');
    expect(email.readOnly).toBe(false);
    expect(screen.queryByText(/the code was sent to this address/i)).toBeNull();
  });
});

describe('ResetPasswordForm — the address does not linger in the URL', () => {
  /*
   * `/reset-password?email=someone@example.com` writes a real address into
   * browser history and into the Firebase Hosting and Cloudflare access logs,
   * which record full request URLs. The reset CODE is never in a URL — it goes
   * in a POST body — so this is a privacy leak rather than an account-takeover
   * one, but it is free to avoid.
   */

  it('strips the email from the URL once it has been read', () => {
    renderAt('?email=someone%40example.com');

    expect(window.location.search).toBe('');
    // ...without losing it: the field is still filled and still locked.
    const email = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(email.value).toBe('someone@example.com');
    expect(email.readOnly).toBe(true);
  });

  it('reads the address from router state, so it need not be in the URL at all', () => {
    // How forgot-password hands over now: navigate('/reset-password', { state }).
    renderWithState({ email: 'someone@example.com' });

    expect(window.location.search).toBe('');
    const email = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(email.value).toBe('someone@example.com');
    expect(email.readOnly).toBe(true);
  });

  it('keeps other query parameters intact', () => {
    renderAt('?email=someone%40example.com&ref=mail');
    expect(window.location.search).toBe('?ref=mail');
  });
});

describe('ResetPasswordForm — resend', () => {
  /*
   * There was no way to get another code from this screen. That mattered more
   * than it sounds: spending a code's three guesses used to lock the ACCOUNT
   * for 15 minutes, the error told users to request a new code, and requesting
   * one could not clear it. The budget belongs to the code now, so this button
   * is the action that actually works — see F-40.
   */

  it('offers a way to get another code', () => {
    renderAt('?email=someone%40example.com');
    expect(screen.getByRole('button', { name: /send a new code/i })).toBeTruthy();
  });

  it('does not submit the form — that would spend a guess', () => {
    /*
     * A raw <button> inside a <form> defaults to type="submit", which here
     * would run verifyCode and charge an attempt against the very budget the
     * user is trying to escape.
     *
     * Honest scope: the kit's `Button` already defaults `type = 'button'`
     * (Button.tsx:61), so this pins the KIT's guarantee, not this call site's
     * prop — removing `type="button"` from the JSX leaves the test passing. It
     * is kept because the property is what matters and the default is the thing
     * that could quietly change; the explicit prop stays as documentation.
     */
    renderAt('?email=someone%40example.com');
    const resend = screen.getByRole('button', { name: /send a new code/i }) as HTMLButtonElement;
    expect(resend.type).toBe('button');
  });
});

/**
 * THE NONCE, END TO END.
 *
 * The code is issued by forgot-password and spent by reset-password, with a
 * non-consuming pre-check in between — so ONE issuance has to survive two
 * screens and three requests. Every hop is somewhere the value can be dropped or
 * left behind, and none of them fails visibly: the backend compares the mac
 * against the nonce in its OWN record and reports a mismatch exactly as it
 * reports a wrong code. So the symptom of any bug below is an operator being
 * told the code they typed correctly is incorrect, three times, after which the
 * code is destroyed.
 */
describe('ResetPasswordForm — carrying the issuance nonce', () => {
  const type = (label: RegExp, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

  beforeEach(() => {
    apiMock.verify.mockReset().mockResolvedValue({ ok: true, status: 200, data: {} });
    apiMock.reset.mockReset().mockResolvedValue({ ok: true, status: 200, data: {} });
    apiMock.forgot.mockReset().mockResolvedValue({ ok: true, status: 200, data: {} });
  });

  it('sends the nonce forgot-password issued to BOTH the pre-check and the reset', async () => {
    renderWithState({ email: 'someone@example.com', otpNonce: 'n-issued' });

    type(/reset code/i, '481902');
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() =>
      expect(apiMock.verify).toHaveBeenCalledWith('someone@example.com', '481902', 'n-issued'),
    );

    type(/^new password/i, 'Kh0lnaRiver');
    type(/confirm new password/i, 'Kh0lnaRiver');
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));

    // The SAME nonce. The pre-check left the code live, so this is the second
    // request against one stored record — a fresh or missing value here would
    // fail the step that actually changes the password, after the user has
    // chosen one.
    await waitFor(() =>
      expect(apiMock.reset).toHaveBeenCalledWith(
        'someone@example.com',
        '481902',
        'pbkdf2v3:Kh0lnaRiver',
        'n-issued',
      ),
    );
  });

  it('replaces the nonce when the user asks for another code', async () => {
    renderWithState({ email: 'someone@example.com', otpNonce: 'n-superseded' });

    apiMock.forgot.mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: { message: 'sent' }, otpNonce: 'n-current' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send a new code/i }));
    await waitFor(() => expect(apiMock.forgot).toHaveBeenCalled());

    type(/reset code/i, '481902');
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() =>
      expect(apiMock.verify).toHaveBeenCalledWith('someone@example.com', '481902', 'n-current'),
    );
  });

  it('drops the old nonce when a resend does not name its replacement', async () => {
    /*
     * A code was issued either way, so the one we held is stale regardless. An
     * unbound digest still verifies while OTP_REQUIRE_BINDING is false; a mac
     * built from a retired nonce cannot verify at all.
     */
    renderWithState({ email: 'someone@example.com', otpNonce: 'n-superseded' });

    fireEvent.click(screen.getByRole('button', { name: /send a new code/i }));
    await waitFor(() => expect(apiMock.forgot).toHaveBeenCalled());

    type(/reset code/i, '481902');
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() =>
      expect(apiMock.verify).toHaveBeenCalledWith('someone@example.com', '481902', undefined),
    );
  });

  it('keeps the nonce when a resend FAILS — nothing new was issued', async () => {
    // A refused resend (inside the cooldown, or out of budget) sent no message,
    // so the code in the inbox and the nonce bound to it are both still live.
    // Clearing here would downgrade a flow that was working.
    renderWithState({ email: 'someone@example.com', otpNonce: 'n-issued' });

    apiMock.forgot.mockResolvedValue({
      ok: false,
      status: 429,
      data: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    });

    fireEvent.click(screen.getByRole('button', { name: /send a new code/i }));
    await waitFor(() => expect(apiMock.forgot).toHaveBeenCalled());

    type(/reset code/i, '481902');
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() =>
      expect(apiMock.verify).toHaveBeenCalledWith('someone@example.com', '481902', 'n-issued'),
    );
  });

  it('runs unbound rather than refusing when no nonce ever arrived', async () => {
    // The shape today: forgot-password answers identically for addresses that
    // do not exist, so it returns no nonce at all. Also a legacy `?email=` link,
    // and anyone who opens the route directly. All must still be able to reset.
    renderAt('?email=someone%40example.com');

    type(/reset code/i, '481902');
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() =>
      expect(apiMock.verify).toHaveBeenCalledWith('someone@example.com', '481902', undefined),
    );
  });
});

