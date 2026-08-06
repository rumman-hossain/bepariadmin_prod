/**
 * ResetPasswordForm — set a new password using the 6-digit code emailed by
 * forgot-password.
 *
 * This used to read a `?token=` query parameter from a reset LINK. That flow
 * never worked: no backend code path ever issued a token, so every submission
 * came back INVALID_TOKEN. The server-rendered reset page and the token branch
 * behind it have since been removed, leaving email + code as the only reset
 * path — the same one the mobile app already uses.
 *
 * The code is verified before the password step, so a mistyped code is reported
 * immediately rather than after the user has chosen and confirmed a password.
 * Verification is non-consuming; reset-password consumes the code.
 */

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiForgotPassword, apiResetPassword, apiVerifyResetOtp } from '../../api/auth';
import { hashPassword, hashErrorMessage } from '../../auth/passwordHasher';
import { validateEmail, validatePassword, validatePasswordMatch } from '../../utils/validation';
import { friendlyError } from '../../utils/errors';
import { Button, Input } from '@/src/components/controls';
import { Alert } from '@/src/components/feedback';
import { Form, FormActions } from '@/src/components/forms/Form';
import { Stack } from '@/src/components/layout/primitives';
import { PasswordField } from './PasswordField';

export function ResetPasswordForm() {
  const { clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // 'code' collects and verifies the emailed OTP; 'password' sets the new one.
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * True when forgot-password sent us here carrying the address, which is the
   * only way to arrive holding a code that can actually work.
   *
   * The code was generated for *that* address and no other, so an editable
   * field here offers a change that cannot succeed: edit the email and the code
   * stops verifying, with nothing on screen explaining why. Locking it removes
   * a dead end rather than removing a choice.
   *
   * Someone who opens `/reset-password` directly still gets an editable field —
   * they have to say who they are.
   */
  const [emailLocked, setEmailLocked] = useState(false);

  const [resendNote, setResendNote] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  /**
   * Take the address out of the URL as soon as it has been read.
   *
   * `/reset-password?email=someone@example.com` writes a real address into
   * browser history and into the Firebase Hosting and Cloudflare access logs,
   * which record full request URLs. `Referrer-Policy: no-referrer` already
   * stops it reaching third parties, and the CODE is never in a URL — it goes
   * in a POST body — so this is a privacy leak rather than an account-takeover
   * one. It is still avoidable, so avoid it.
   *
   * It arrives in **router state** now, which lives in `history.state`: not in
   * the URL, not in a server access log, and it survives a reload because the
   * browser persists history state alongside the entry.
   *
   * **Not `sessionStorage`.** The first attempt used it and guard A8 rejected
   * the build — "credentials must stay in memory; only the theme may persist".
   * An address is not a credential, but that guard is deliberately absolute and
   * the promise it enforces is that this app persists nothing about you. Router
   * state keeps the promise and needs no exception.
   *
   * The `?email=` branch stays only to honour links already sent; it is read
   * once and stripped.
   */
  useEffect(() => {
    const fromState = (location.state as { email?: string } | null)?.email;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('email');
    const value = fromState ?? fromUrl;

    if (value) {
      setEmail(value);
      setEmailLocked(true);
    }

    if (fromUrl) {
      params.delete('email');
      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}`,
      );
    }
  }, []);

  /**
   * Ask for another code.
   *
   * This did not exist, so the only way to get one was to navigate back to
   * forgot-password and retype the address — and that was also the screen a
   * user landed on after being told, wrongly, that a new code would help.
   *
   * The server reuses the outstanding code while it is still usable, so
   * pressing this repeatedly re-sends the same digits rather than retiring the
   * email already in the inbox.
   */
  async function resendCode() {
    setError(null);
    setResendNote(null);
    setIsResending(true);
    try {
      const res = await apiForgotPassword(email.trim().toLowerCase());
      if (res.ok) {
        /*
         * Deliberately silent about WHICH code was sent.
         *
         * The server re-sends the outstanding code while it is still usable and
         * mints a new one when it is not, so "an earlier code still works" —
         * the first wording here — is false whenever the old one had expired. I
         * saw it claim exactly that in a browser.
         *
         * The obvious fix, returning `reused` from the server, would be worse
         * than the bug: it tells an unauthenticated caller whether a live reset
         * code exists for an address, turning a deliberately non-enumerating
         * endpoint into an oracle for who is mid-reset. "The most recent" is
         * true in both branches and leaks nothing.
         */
        setResendNote('Sent. Use the most recent code in your email.');
        setCode('');
      } else {
        setError(friendlyError(res));
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setIsResending(false);
    }
  }

  async function verifyCode() {
    setError(null);
    clearError();

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setError(emailResult.message);
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiVerifyResetOtp(email.trim().toLowerCase(), code.trim());
      if (res.ok) setStep('password');
      // friendlyError, not the raw `error.message`: the backend emits raw
      // Postgres text from some handlers, and this screen is unauthenticated —
      // anyone can reach it.
      else setError(friendlyError(res));
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPassword() {
    setError(null);
    clearError();

    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.valid) {
      setError(passwordResult.message);
      return;
    }
    const matchResult = validatePasswordMatch(newPassword, confirmPassword);
    if (!matchResult.valid) {
      setError(matchResult.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const passwordHash = await hashPassword(newPassword);
      const res = await apiResetPassword(email.trim().toLowerCase(), code.trim(), passwordHash);

      if (res.ok) {
        setSuccess(true);
      } else {
        // The code is only consumed on success, so an expired or locked-out
        // attempt sends the user back to re-enter it rather than stranding them
        // on a password form that can no longer succeed.
        setStep('code');
        setError(friendlyError(res));
      }
    } catch (err) {
      setError(
        hashErrorMessage(err) ?? 'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <Stack gap="md" align="center" className="text-center">
        <CheckCircle2 className="h-8 w-8 text-ok" aria-hidden="true" />
        <div>
          <h2 className="text-md font-semibold text-ink">Password changed</h2>
          <p className="mt-1 text-sm text-ink-2">
            Sign in with your new password. Every other device has been signed out — including
            anyone who should not have been signed in.
          </p>
        </div>
        <Button onClick={() => void navigate('/login')}>Go to sign in</Button>
      </Stack>
    );
  }

  const onCodeStep = step === 'code';

  return (
    <Form onSubmit={onCodeStep ? verifyCode : submitPassword}>
      <div>
        <h2 className="text-md font-semibold text-ink">
          {onCodeStep ? 'Enter your reset code' : 'Set a new password'}
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          {onCodeStep
            ? 'Use the 6-digit code from the email we sent you.'
            : 'Choose a password you have not used here before.'}
        </p>
      </div>

      {error && <Alert tone="bad">{error}</Alert>}
      {resendNote && <Alert tone="ok">{resendNote}</Alert>}

      {onCodeStep ? (
        <>
          <Input
            type="email"
            name="email"
            label="Email address"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            /*
              `readOnly`, not `disabled`. Disabled would drop the field out of
              the tab order, so a keyboard or screen-reader user could not read
              back which address the code went to — on the one screen where
              that is the thing they most need to confirm.
            */
            readOnly={emailLocked}
            hint={emailLocked ? 'The code was sent to this address.' : undefined}
            required
          />
          <Input
            name="code"
            label="Reset code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={isSubmitting}
            identifier
            required
            className="[&_input]:text-center [&_input]:tracking-[0.4em]"
          />
          {/*
            The escape hatch, and the reason the lockout message can now tell
            the truth. Spending a code's three guesses used to lock the ACCOUNT
            for 15 minutes with no way out but waiting; the budget belongs to
            the code now, so this button genuinely clears it.

            `type="button"` matters — inside a <form> the default is submit,
            which would fire verifyCode instead and burn another guess.
          */}
          <div className="-mt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void resendCode()}
              loading={isResending}
              disabled={isSubmitting || !email.trim()}
            >
              Send a new code
            </Button>
          </div>
        </>
      ) : (
        <>
          <PasswordField
            id="reset-new-password"
            name="new-password"
            label="New password"
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
            disabled={isSubmitting}
            required
          />
          <PasswordField
            id="reset-confirm-password"
            name="confirm-password"
            label="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            showStrength={false}
            disabled={isSubmitting}
            required
          />
        </>
      )}

      <FormActions
        aside={
          <Button variant="ghost" size="sm" onClick={() => void navigate('/login')} disabled={isSubmitting}>
            Back to sign in
          </Button>
        }
      >
        <Button type="submit" loading={isSubmitting}>
          {onCodeStep ? 'Verify code' : 'Set password'}
        </Button>
      </FormActions>
    </Form>
  );
}
