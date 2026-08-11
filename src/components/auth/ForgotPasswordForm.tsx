/**
 * ForgotPasswordForm — request a reset code by email.
 */

import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { apiForgotPassword } from '../../api/auth';
import { readOtpNonce } from '../../auth/otpProof';
import { validateEmail } from '../../utils/validation';
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
   * Empty today, and correctly so: `/auth/forgot-password` answers with a fixed
   * message whether or not the account exists — that is what stops this form
   * being an account-enumeration oracle — and a nonce present for real addresses
   * and absent for invented ones would be exactly the tell it refuses to give.
   * So the reset path currently sends its digest unbound, which the server still
   * accepts.
   *
   * Read and carried anyway rather than left for later. The threading is the
   * hard part and it is the part that goes wrong quietly; wiring it now means
   * the day the backend has somewhere safe to return a nonce, the console binds
   * without anybody having to remember this screen exists.
   */
  const [otpNonce, setOtpNonce] = useState<string | undefined>(undefined);

  async function handleSubmit() {
    setFieldError(null);
    setFormError(null);

    const result = validateEmail(email);
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
          <h2 className="text-md font-semibold text-ink">Check your email</h2>
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
          The code has been emailed; this is the only thing that gets the
          operator to the screen that consumes it. `/reset-password` existed as a
          route the whole time and nothing linked to it, so the flow dead-ended
          here — the code arrived and there was nowhere to type it.

          The email is carried in the query string, which ResetPasswordForm
          already reads and prefills.
        */}
        <Button
          onClick={() =>
            // Router state, not a query string: the address would otherwise
            // land in browser history and in the Hosting/Cloudflare access
            // logs, which record full request URLs. The nonce rides the same
            // way, and for a stronger version of the same reason — it is half
            // of a credential, and a URL is the one place it must never be.
            void navigate('/reset-password', {
              state: { email: email.trim().toLowerCase(), otpNonce },
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
          Enter the email on your staff account and we&rsquo;ll send a code to set a new password.
        </p>
      </div>

      {formError && <Alert tone="bad">{formError}</Alert>}

      <Input
        type="email"
        name="email"
        label="Email address"
        placeholder="you@example.com"
        autoComplete="email"
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
