// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { OtpVerification } from '../OtpVerification';
import type { ErrorKind } from '../../../utils/errors';

/**
 * Telling "this is us" from "this is your code", on the screen where the
 * difference costs money.
 *
 * Every failure here used to render the same red banner beside the same
 * "Resend code" button. So an `OTP_STORE_UNAVAILABLE` — a 503, our store
 * unreachable, no attempt charged — looked exactly like a mistyped digit, and
 * the operator did the reasonable thing and pressed resend. That spends one of
 * three PAID SMS an hour, on an outage they did not cause and which a new code
 * would not fix.
 */

const verifyOtp = vi.fn();
const resendOtp = vi.fn();
const clearError = vi.fn();
let authError: string | null = null;
let authErrorKind: ErrorKind | null = null;

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    verifyOtp,
    resendOtp,
    clearError,
    submitting: false,
    error: authError,
    errorKind: authErrorKind,
  }),
}));

beforeEach(() => {
  verifyOtp.mockReset();
  resendOtp.mockReset();
  clearError.mockReset();
  authError = null;
  authErrorKind = null;
});
afterEach(cleanup);

const resendButton = () => screen.queryByRole('button', { name: /resend code/i });

describe('OtpVerification — a wrong code', () => {
  it('offers a resend, because a new code is the remedy', () => {
    authError = 'Incorrect code. 2 attempts remaining.';
    authErrorKind = 'user';
    render(<OtpVerification />);

    expect(resendButton()).not.toBeNull();
    // The countdown the backend went to the trouble of sending is on screen.
    expect(screen.getByText(/2 attempts remaining/)).toBeTruthy();
  });
});

describe('OtpVerification — our own outage', () => {
  beforeEach(() => {
    authError = 'Verification is temporarily unavailable. Please try again.';
    authErrorKind = 'service';
  });

  it('does not offer to spend an SMS on a problem the user did not cause', () => {
    render(<OtpVerification />);
    expect(resendButton()).toBeNull();
  });

  it('says plainly that it is not their code', () => {
    render(<OtpVerification />);

    expect(screen.getByText(/problem on our side, not your code/i)).toBeTruthy();
    // And nothing anywhere on the screen calls the code wrong.
    expect(screen.queryByText(/incorrect|invalid/i)).toBeNull();
  });

  it('shows it as a warning rather than as a rejection', () => {
    render(<OtpVerification />);

    // Still role="alert" — a screen reader must not lose it. What changes is
    // the claim: amber (not you) instead of red (your code).
    const alert = screen.getByRole('alert');
    expect(alert.className).toMatch(/warn/);
    expect(alert.className).not.toMatch(/bad/);
  });
});

describe('OtpVerification — the server has just refused to send', () => {
  it('hides a resend that would only be refused again', () => {
    authError = 'Please wait 1 minute before requesting another code.';
    authErrorKind = 'limit';
    render(<OtpVerification />);

    expect(resendButton()).toBeNull();
    // The server's own sentence is the explanation; the screen adds none of its
    // own, and in particular does not invent a different interval.
    expect(screen.getByText(/wait 1 minute/i)).toBeTruthy();
    expect(screen.queryByText(/hour/i)).toBeNull();
  });
});

describe('OtpVerification — no failure', () => {
  it('offers the resend as it always did', () => {
    render(<OtpVerification />);
    expect(resendButton()).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
