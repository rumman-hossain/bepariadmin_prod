// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ChangePasswordForm } from '../ChangePasswordForm';

const apiChangePassword = vi.fn();
const hashPassword = vi.fn();

vi.mock('@/src/api/auth', () => ({
  apiChangePassword: (...args: unknown[]) => apiChangePassword(...args),
}));

// Only the hashing is stubbed. `validatePassword` and `scorePassword` stay
// real, because their exact behaviour is what several of these tests assert.
vi.mock('@/src/auth/passwordHasher', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/src/auth/passwordHasher')>();
  return {
    ...real,
    hashPassword: (p: string) => hashPassword(p),
    hashErrorMessage: () => null,
  };
});

vi.mock('@/src/components/feedback/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

beforeEach(() => {
  apiChangePassword.mockReset().mockResolvedValue({ ok: true, status: 200, data: {} });
  hashPassword.mockReset().mockImplementation(async (p: string) => `pbkdf2v3:${p}`);
});
afterEach(cleanup);

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const submit = () => fireEvent.click(screen.getByRole('button', { name: /change password/i }));

function fill(current: string, next: string, confirm = next) {
  type(/current password/i, current);
  type(/^new password/i, next);
  type(/confirm new password/i, confirm);
}

describe('ChangePasswordForm validation', () => {
  it('requires every field before calling the API', async () => {
    render(<ChangePasswordForm />);
    submit();

    expect(screen.getByText(/enter your current password/i)).toBeTruthy();
    expect(apiChangePassword).not.toHaveBeenCalled();
  });

  it('enforces the shared policy on the new password', () => {
    // Not a local rule — the same validatePassword the mobile app uses, so an
    // admin cannot set themselves a password their own app would reject.
    render(<ChangePasswordForm />);
    fill('OldPass1', 'alllowercase');
    submit();

    expect(screen.getByText(/uppercase letter/i)).toBeTruthy();
    expect(apiChangePassword).not.toHaveBeenCalled();
  });

  it('requires the confirmation to match', () => {
    render(<ChangePasswordForm />);
    fill('OldPass1', 'NewPass123', 'NewPass124');
    submit();

    expect(screen.getByText(/do not match/i)).toBeTruthy();
    expect(apiChangePassword).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password without a round trip', () => {
    // The server would accept this and leave the user exactly where they were.
    render(<ChangePasswordForm />);
    fill('Kf7mQp2x', 'Kf7mQp2x');
    submit();

    expect(screen.getByText(/have not used here before/i)).toBeTruthy();
    expect(apiChangePassword).not.toHaveBeenCalled();
  });

  it('clears a field error once the user starts correcting it', () => {
    render(<ChangePasswordForm />);
    submit();
    expect(screen.getByText(/enter your current password/i)).toBeTruthy();

    type(/current password/i, 'O');
    expect(screen.queryByText(/enter your current password/i)).toBeNull();
  });
});

describe('ChangePasswordForm submission', () => {
  it('sends hashes, never the plaintext', async () => {
    /*
     * The whole point of the client-side PBKDF2 scheme. If this ever regresses
     * to sending the raw password, every proxy and log between the browser and
     * the database sees it.
     */
    render(<ChangePasswordForm />);
    fill('OldPass1', 'BrandNew99');
    submit();

    await waitFor(() => expect(apiChangePassword).toHaveBeenCalled());
    const [oldHash, newHash] = apiChangePassword.mock.calls[0]!;
    expect(oldHash).toBe('pbkdf2v3:OldPass1');
    expect(newHash).toBe('pbkdf2v3:BrandNew99');
    expect(JSON.stringify(apiChangePassword.mock.calls)).not.toContain('"OldPass1"');
  });

  it('calls onSuccess and clears the fields', async () => {
    const onSuccess = vi.fn();
    render(<ChangePasswordForm onSuccess={onSuccess} />);
    fill('OldPass1', 'BrandNew99');
    submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect((screen.getByLabelText(/current password/i) as HTMLInputElement).value).toBe('');
  });

  it('puts a wrong current password on that field, not in a banner', async () => {
    apiChangePassword.mockResolvedValue({
      ok: false,
      status: 400,
      data: { error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } },
    });

    render(<ChangePasswordForm />);
    fill('WrongPass1', 'BrandNew99');
    submit();

    await waitFor(() =>
      expect(screen.getByText(/not your current password/i)).toBeTruthy(),
    );
  });

  it('shows an unrelated failure as a banner instead', async () => {
    apiChangePassword.mockResolvedValue({
      ok: false,
      status: 500,
      data: { error: { code: 'INTERNAL', message: 'pq: relation "users.staff" does not exist' } },
    });

    render(<ChangePasswordForm />);
    fill('OldPass1', 'BrandNew99');
    submit();

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    // Raw SQL must never reach the screen.
    expect(screen.queryByText(/relation/i)).toBeNull();
  });
});

describe('ChangePasswordForm strength advice', () => {
  it('refuses a guessable password outright', () => {
    /*
     * This test asserted the opposite: that `Password1` showed a warning and
     * then SUBMITTED, on the reasoning that the mobile app accepted it and
     * refusing here would put the two out of step.
     *
     * The reasoning was sound and the premise is now false — the shared policy
     * carries a strength floor, so both apps reject it and they stay in step by
     * rejecting rather than by accepting.
     */
    render(<ChangePasswordForm />);
    fill('OldPass1', 'Password1');
    submit();

    expect(apiChangePassword).not.toHaveBeenCalled();
  });

  it('tells someone at the minimum that they are fine, not that they are wrong', () => {
    // A password on the floor is ACCEPTED. Calling it "easy to guess" — which
    // this banner used to do — is alarming and untrue.
    render(<ChangePasswordForm />);
    fill('OldPass1', 'Kf7mQp2x');

    expect(screen.getByText(/acceptable/i)).toBeTruthy();
    expect(screen.queryByText(/easy to guess/i)).toBeNull();
    submit();
    return waitFor(() => expect(apiChangePassword).toHaveBeenCalled());
  });

  it('says nothing once the password is strong', () => {
    render(<ChangePasswordForm />);
    fill('OldPass1', 'Xk9wQ2mLpZ7vTr4B');
    expect(screen.queryByText(/acceptable/i)).toBeNull();
  });

  it('offers no generator on your own password', () => {
    // A generated string is one you cannot memorise, so you write it down.
    render(<ChangePasswordForm />);
    expect(screen.queryByRole('button', { name: /generate/i })).toBeNull();
  });
});
