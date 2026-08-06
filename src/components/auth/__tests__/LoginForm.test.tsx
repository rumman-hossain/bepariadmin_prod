// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from '../LoginForm';

const login = vi.fn();
const clearError = vi.fn();
let authError: string | null = null;

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    login,
    submitting: false,
    error: authError,
    notice: null,
    clearError,
  }),
}));

// The form navigates to /forgot-password for real now, so it needs a router.
// It used to dispatch a state change nothing read, which is why the link did
// nothing at all.
const renderForm = () =>
  render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  );

beforeEach(() => {
  login.mockReset();
  clearError.mockReset();
  authError = null;
});
afterEach(cleanup);

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const submit = () => fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

describe('LoginForm validation', () => {
  it('tells the user what is wrong instead of doing nothing', () => {
    /*
     * The form used to compute both validation messages and throw them away,
     * returning a bare `false`. Pressing Sign In with an empty field produced no
     * error, no request and no feedback of any kind — the button simply appeared
     * not to work.
     */
    renderForm();
    submit();

    expect(screen.getByText(/enter your email/i)).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it('reports both fields at once rather than one at a time', () => {
    renderForm();
    submit();
    expect(screen.getByText(/enter your email/i)).toBeTruthy();
    expect(screen.getByText(/enter your password/i)).toBeTruthy();
  });

  it('marks the invalid field for assistive technology', () => {
    renderForm();
    submit();
    expect(screen.getByLabelText(/^email$/i).getAttribute('aria-invalid')).toBe('true');
  });

  it('clears a field error as soon as the user starts fixing it', () => {
    // Leaving the error up while someone is actively correcting it reads as
    // though the correction is not registering.
    renderForm();
    submit();
    expect(screen.getByText(/enter your email/i)).toBeTruthy();

    type(/^email$/i, 'a');
    expect(screen.queryByText(/enter your email/i)).toBeNull();
  });

  it('no longer offers a phone number staff cannot sign in with', () => {
    /*
     * The field said "Email or mobile number" and the validator accepted a BD
     * phone — but the staff lookup is email-only server-side (no phone_hash
     * clause, unlike retailer and wholesaler), so a phone number produced a
     * silent 401 that read as a wrong password.
     */
    renderForm();
    expect(screen.queryByLabelText(/mobile/i)).toBeNull();
    expect(screen.getByLabelText(/^email$/i)).toBeTruthy();
  });

  it('submits a valid email and password', () => {
    renderForm();
    type(/^email$/i, 'admin@bepari-bd.com');
    type(/^password$/i, 'Password1');
    submit();
    expect(login).toHaveBeenCalledWith('admin@bepari-bd.com', 'Password1');
  });

  it('does not apply the set-time password policy at sign-in', () => {
    /*
     * This test previously asserted the opposite, reasoning that a weaker local
     * rule "would let an admin SET a password the mobile app then rejects".
     * True — but this is not a set-password form. Running the set-time policy
     * (8+, uppercase, digit) at sign-in means any account whose password
     * predates that policy cannot even send the request: the form refuses
     * locally, so there is no server response and no route to recovery.
     *
     * A sign-in form transmits what was typed. Only the server can say whether
     * it is right. The policy still applies where a password is chosen —
     * ResetPasswordForm and ChangePasswordForm.
     */
    renderForm();
    type(/^email$/i, 'admin@bepari-bd.com');
    type(/^password$/i, 'alllowercase');
    submit();
    expect(login).toHaveBeenCalledWith('admin@bepari-bd.com', 'alllowercase');
  });

  it('surfaces a server-side error', () => {
    authError = 'Invalid credentials';
    renderForm();
    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });

  it('gives both inputs a name so browsers can autofill them', () => {
    // The console reported "a form field element should have an id or name".
    renderForm();
    expect(screen.getByLabelText(/^email$/i).getAttribute('name')).toBe('identifier');
    expect(screen.getByLabelText(/^password$/i).getAttribute('name')).toBe('password');
  });
});
