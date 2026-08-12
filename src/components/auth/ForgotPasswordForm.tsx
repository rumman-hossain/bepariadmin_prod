/**
 * ForgotPasswordForm — request a reset code by email or SMS.
 */

import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { apiForgotPassword } from '../../api/auth';
import { readOtpNonce } from 'nextgen-password';
import { validateIdentifier } from '../../utils/validation';
import { friendlyError } from '../../utils/errors';
import { Button, Input } from '@/src/components/controls';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@/src/components/feedback';
import { Form, FormActions } from '@/src/components/forms/Form';
import { Stack } from '@/src/components/layout/primitives';

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * The nonce issued with the reset code, to hand to the screen that spends it.
   *
   * `/auth/forgot-password` returns one — `otpNonce`, inside `data`. It did not
   * always, and the enumeration objection that used to be recorded here (a nonce
   * for real addresses and none for invented ones is exactly the tell the fixed
   * 200 exists to withhold) was answered rather than ignored: `decoyNonce()` in
   * `internal/auth/service.go` returns 32 random hex characters from every
   * silent branch too, so the body has the same shape whether the account
   * exists, may not sign in, or has no delivery channel. A decoy binds to
   * nothing because no code was ever stored beside it.
   *
   * This screen only READS it. The value has to survive a navigation to reach
   * the screen that spends it, and it travels in router state — see the
   * `navigate` call below and the `location.state` reader in ResetPasswordForm.
   * Never a query parameter: a nonce is half of a credential and the URL is
   * written to browser history and to hosting access logs.
   */
  const [otpNonce, setOtpNonce] = useState<string | undefined>(undefined);

  async function handleSubmit() {
    setFieldError(null);
    setFormError(null);

    const result = validateIdentifier(email);
    if (!result.valid) {
      setFieldError(result.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiForgotPassword(email.trim().toLowerCase());
      if (res.ok) {
        setOtpNonce(readOtpNonce(res.data));
        setSent(true);
      } else setFormError(friendlyError(res));
    } catch {
      setFormError('Could not reach the server. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Stack gap="md" align="center" className="text-center">
        <MailCheck className="h-8 w-8 text-ok" aria-hidden="true" />
        <div>
          {/*
            "Check your email" would be wrong half the time now. The server sends
            the code to whichever channel the identifier named — a number gets a
            text — and it deliberately does NOT substitute one for the other, so
            naming the wrong one here would send somebody to an inbox that will
            never receive it.
          */}
          <h2 className="text-md font-semibold text-ink">Check your messages</h2>
          {/*
            Deliberately non-committal about whether the account exists. Saying
            "no account with that email" turns this form into an account
            enumeration oracle — anyone can test addresses against it.
          */}
          <p className="mt-1 text-sm text-ink-2">
            If an account exists for {email.trim().toLowerCase()}, a reset code is on its way. It
            expires shortly, so use it soon.
          </p>
        </div>
        {/*
          The code has been sent; this is the only thing that gets the operator to
          the screen that consumes it. `/reset-password` existed as a route the
          whole time and nothing linked to it, so the flow dead-ended here — the
          code arrived and there was nowhere to type it.

          The identifier rides in router state, which ResetPasswordForm reads and
          prefills.
        */}
        <Button
          onClick={() =>
            // Router state, not a query string: the identifier would otherwise
            // land in browser history and in the Hosting/Cloudflare access
            // logs, which record full request URLs. That reasoning got stronger
            // when this field started accepting a mobile number — a phone number
            // in an access log is worse than an address. The nonce rides the
            // same way, and for a stronger version again: it is half of a
            // credential, and a URL is the one place it must never be.
            //
            // `identifier`, with `email` alongside it for one release so a tab
            // opened before this deploy still prefills. ResetPasswordForm reads
            // both.
            void navigate('/reset-password', {
              state: {
                identifier: email.trim().toLowerCase(),
                email: email.trim().toLowerCase(),
                otpNonce,
              },
            })
          }
        >
          Enter the code
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back to sign in
        </Button>
      </Stack>
    );
  }

  return (
    <Form onSubmit={handleSubmit}>
      {/*
        The sent state has always had a heading; this one had none, so the
        screen opened as a bare email field with a "Send reset code" button and
        never said what it was for. Found by opening it in a browser — every
        test passed, because a missing heading is missing markup, not broken
        markup.

        The copy promises a code is *sent*, not that the account *exists*: the
        server answers 200 either way on purpose, and wording that implied
        otherwise here would leak what the endpoint refuses to.
      */}
      <div>
        <h2 className="text-md font-semibold text-ink">Reset your password</h2>
        <p className="mt-1 text-sm text-ink-2">
          Enter the email or mobile number on your account and we&rsquo;ll send a code to set a
          new password.
        </p>
      </div>

      {formError && <Alert tone="bad">{formError}</Alert>}

      {/*
       * `type="text"`, NOT `type="email"`.
       *
       * This field was `type="email"`, which made the browser refuse to submit a
       * mobile number — so resetting by phone was unreachable from this screen
       * even though the server has always supported it, matching
       * `phone_hash = $1 OR email = $2` and texting the code when the identifier
       * is a number. The failure was an HTML5 validation bubble: no request was
       * made, so nothing appeared in the network tab or the server logs to say
       * why.
       *
       * `validateIdentifier` replaced `validateEmail` in the submit handler for
       * the same reason: it accepted addresses only, so a mobile number was
       * refused with "Please enter a valid email address" — an error naming the
       * wrong thing and offering no way forward. The replacement accepts either
       * and keeps the server's own mobile rule byte-for-byte, so it can never be
       * stricter than the thing that actually decides.
       */}
      <Input
        type="text"
        name="identifier"
        label="Email or mobile number"
        placeholder="you@example.com or 01712345678"
        autoComplete="username"
        autoFocus
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (fieldError) setFieldError(null);
        }}
        error={fieldError ?? undefined}
        disabled={isSubmitting}
        required
      />

      <FormActions
        aside={
          <Button variant="ghost" size="sm" onClick={onBack} disabled={isSubmitting}>
            Back to sign in
          </Button>
        }
      >
        <Button type="submit" loading={isSubmitting}>
          Send reset code
        </Button>
      </FormActions>
    </Form>
  );
}
