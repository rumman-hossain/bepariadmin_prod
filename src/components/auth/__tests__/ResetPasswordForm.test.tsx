// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
function renderWithState(state: { email: string }) {
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

