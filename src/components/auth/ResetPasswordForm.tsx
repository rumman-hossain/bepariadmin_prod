/**
 * ResetPasswordForm — set a new password using the 6-digit code sent by
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
import { readOtpNonce } from 'nextgen-password';
import { hashPassword, hashErrorMessage } from '../../auth/passwordHasher';
import { validateIdentifier, validatePassword, validatePasswordMatch } from '../../utils/validation';
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
  // 'code' collects and verifies the OTP; 'password' sets the new one.
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * The nonce belonging to the code currently in the user's inbox.
   *
   * ONE value for the whole screen, and that is deliberate. `verifyCode` does
   * not consume the code — it is a pre-check — so `submitPassword` spends the
   * SAME issuance afterwards, and both calls have to present the same nonce. A
   * second copy of this, or one reset between the two steps, would bind the
   * final request to nothing and lose the password the user just typed to a
   * message reading "incorrect code".
   *
   * Forgot-password returns a nonce on every response, so the ordinary arrival
   * — through the form, carrying router state — is bound. It answers identically
   * for addresses that do not exist by handing back a decoy (`decoyNonce()` in
   * `internal/auth/service.go`) rather than by withholding the field, so the
   * enumeration objection that once justified omitting it no longer holds.
   *
   * Undefined is still a supported state, not a bug: a legacy `?email=` link
   * never carried one, someone who opens this route directly has none, and a
   * reload that loses history state has none. Those send the digest unbound,
   * which the server accepts while OTP_REQUIRE_BINDING is false — the same
   * posture as the raw digits this replaced, and strictly better than binding to
   * a placeholder, which the store counts as a wrong guess.
   */
  const [otpNonce, setOtpNonce] = useState<string | undefined>(undefined);

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
    /*
     * `identifier` first, `email` second, and BOTH are read on purpose.
     *
     * The field accepts a mobile number now, so `email` is the wrong name for
     * what it carries — but a tab opened before this deploy still has router
     * state spelled the old way, and an emailed `?email=` link may be days old.
     * Reading both costs one `??` and avoids a prefill silently going blank for
     * anyone mid-flow across the deploy.
     */
    const state = location.state as {
      identifier?: string;
      email?: string;
      otpNonce?: string;
    } | null;
    const fromState = state?.identifier ?? state?.email;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('identifier') ?? params.get('email');
    const value = fromState ?? fromUrl;

    if (value) {
      setEmail(value);
      setEmailLocked(true);
    }

    /*
     * Router state only — there is no `?otpNonce=` branch and there must not be
     * one. The email tolerates a query-string fallback because it is a privacy
     * leak into access logs; a nonce is half of a credential, and putting it
     * somewhere Cloudflare writes to disk would hand it to anybody reading them.
     *
     * Read here rather than at each call site so that a direct visit, an old
     * `?email=` link and a normal arrival from forgot-password all end up in one
     * known state instead of three.
     */
    if (state?.otpNonce) setOtpNonce(state.otpNonce);

    if (fromUrl) {
      params.delete('email');
      params.delete('identifier');
      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}`,
      );
    }
    /*
     * MOUNT ONLY, and `location.state` must NOT be a dependency.
     *
     * exhaustive-deps asks for it. Adding it would be a regression, not a
     * tidy-up: resendCode() below replaces `otpNonce` with the one the resend
     * response carried, and re-running this effect afterwards would overwrite
     * that fresh nonce with the stale one still sitting in router state. The
     * server reports a stale nonce exactly as it reports a wrong code — three
     * of those and the real code is destroyed. That is the trap the long note
     * in resendCode exists to describe, and this would walk straight into it
     * from the other side. It would also re-lock an email the user had edited.
     *
     * Mount-only is SOUND here rather than merely convenient: /forgot-password
     * and /reset-password are different routes (router/index.tsx), so arriving
     * here mounts this component fresh and the effect sees that navigation's
     * state. Nothing navigates to /reset-password from /reset-password —
     * resendCode updates in place and does not navigate — so there is no path
     * on which state changes while this stays mounted.
     *
     * If a future change adds one, this comment is wrong and the fix is to make
     * the nonce flow through props or a reducer, NOT to add the dependency.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setResendNote('Sent. Use the most recent code you were sent.');
        setCode('');
        /*
         * The nonce follows the code, and it follows it EVEN INTO UNDEFINED.
         *
         * This is the stale-nonce trap on the reset side. The server may have
         * re-sent the outstanding code or minted a fresh one — it deliberately
         * will not say which, because saying so would reveal whether a reset is
         * in flight for this address — so the only nonce we can trust afterwards
         * is the one this response carried. Keeping the previous value when the
         * new response has none would bind the next attempt to a code that may
         * no longer exist, and the server reports that exactly as it reports a
         * wrong code: three of them and the real code is destroyed, on the one
         * screen whose whole purpose is recovering an account.
         */
        setOtpNonce(readOtpNonce(res.data));
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

    // validateIdentifier, not validateEmail. This screen is reached by SMS as
    // often as by mail now, and validateEmail rejected a mobile number with
    // "Please enter a valid email address" — refusing the very credential the
    // code had just been texted to.
    const identifierResult = validateIdentifier(email);
    if (!identifierResult.valid) {
      setError(identifierResult.message);
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code you were sent.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiVerifyResetOtp(email.trim().toLowerCase(), code.trim(), otpNonce);
      if (res.ok) setStep('password');
      // friendlyError, not the raw `error.message`: the backend emits raw
      // Postgres text from some handlers, and this screen is unauthenticated —
      // anyone can reach it.
      else setError(friendlyError(res));
    } catch (err) {
      // `hashErrorMessage` first: this step derives a digest from the code
      // before it reaches the network, so a device without SubtleCrypto fails
      // here — and telling that user to check their connection sends them
      // looking for a problem they do not have.
      setError(
        hashErrorMessage(err) ?? 'Could not reach the server. Check your connection and try again.',
      );
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
      // The same `otpNonce` verifyCode used, not a re-read of anything: the
      // pre-check left this code live and this is the call that spends it, so
      // the two requests are two halves of one issuance.
      const res = await apiResetPassword(
        email.trim().toLowerCase(),
        code.trim(),
        passwordHash,
        otpNonce,
      );

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
          {/*
            `type="text"`, matching ForgotPasswordForm — see the note there.
            `type="email"` made the browser refuse a mobile number outright, so
            somebody who requested their code by SMS could not type the number
            back in to spend it.
          */}
          <Input
            type="text"
            name="identifier"
            label="Email or mobile number"
            placeholder="you@example.com or 01712345678"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            /*
              `readOnly`, not `disabled`. Disabled would drop the field out of
              the tab order, so a keyboard or screen-reader user could not read
              back where the code went — on the one screen where that is the
              thing they most need to confirm.
            */
            readOnly={emailLocked}
            hint={emailLocked ? 'The code was sent here.' : undefined}
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
