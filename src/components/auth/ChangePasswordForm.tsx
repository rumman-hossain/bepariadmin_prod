import { useState } from 'react';
import { apiChangePassword } from '@/src/api/auth';
import {
  hashPassword,
  hashErrorMessage,
  validatePassword,
  scorePassword,
} from '@/src/auth/passwordHasher';
import { Button } from '@/src/components/controls';
import { Alert } from '@/src/components/feedback';
import { PasswordField } from './PasswordField';
import { friendlyError, errorCode } from '@/src/utils/errors';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FieldErrors {
  current?: string;
  next?: string;
  confirm?: string;
}

/**
 * The band that is accepted but worth improving.
 *
 * This used to mean "accepted, and guessable" — anything at or below 2 got a
 * warning and went through. The policy now REJECTS below 2, so that reading no
 * longer holds: a score of 2 is the accepted minimum, not a near-miss, and
 * telling someone their accepted password is "easy to guess" is both alarming
 * and untrue.
 *
 * It now means exactly one thing: this password sits on the floor. The advice is
 * an invitation, not a warning.
 */
const ADVISORY_SCORE = 2;

/**
 * Change your own password.
 *
 * Plaintext never leaves the browser: both values are PBKDF2-hashed here and
 * the backend compares the hash. That is also why the current password cannot
 * be checked locally — only the server can tell whether it is right, so a wrong
 * one surfaces as a field error after the round trip rather than before it.
 *
 * No generator here, deliberately. `PasswordField`'s generator is for admins
 * setting a password *for someone else*; offering it on your own password
 * produces a string you cannot memorise and must therefore write down.
 */
export function ChangePasswordForm({ onSuccess, onCancel }: ChangePasswordFormProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = scorePassword(next);
  const isAtFloor = Boolean(next) && strength.score === ADVISORY_SCORE;

  function validate(): boolean {
    const found: FieldErrors = {};

    if (!current) found.current = 'Enter your current password';

    const policy = validatePassword(next);
    if (!policy.valid) found.next = policy.message;
    // Catching this client-side saves a round trip that would otherwise succeed
    // and leave the user with the password they already had.
    else if (next === current) found.next = 'Choose a password you have not used here before';

    if (!confirm) found.confirm = 'Re-enter the new password';
    else if (confirm !== next) found.confirm = 'These passwords do not match';

    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const [oldHash, newHash] = await Promise.all([hashPassword(current), hashPassword(next)]);
      const res = await apiChangePassword(oldHash, newHash);

      if (!res.ok) {
        // The server answers INVALID_PASSWORD when the current password is
        // wrong. Matching on the code rather than the 400 avoids putting an
        // unrelated validation failure on that field.
        if (errorCode(res) === 'INVALID_PASSWORD') {
          setErrors({ current: 'That is not your current password' });
        } else {
          setFormError(friendlyError(res));
        }
        return;
      }

      setCurrent('');
      setNext('');
      setConfirm('');
      onSuccess?.();
    } catch (err) {
      // A hashing failure is a device capability problem, not a credentials
      // problem, and needs different advice.
      setFormError(
        hashErrorMessage(err) ?? 'Could not change your password. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const clearError = (key: keyof FieldErrors) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && <Alert tone="bad">{formError}</Alert>}

      <PasswordField
        id="current-password"
        name="current-password"
        label="Current password"
        autoComplete="current-password"
        value={current}
        onChange={(v) => {
          setCurrent(v);
          clearError('current');
        }}
        error={errors.current}
        showStrength={false}
        disabled={submitting}
        required
      />

      <PasswordField
        id="new-password"
        name="new-password"
        label="New password"
        autoComplete="new-password"
        value={next}
        onChange={(v) => {
          setNext(v);
          clearError('next');
        }}
        error={errors.next}
        disabled={submitting}
        required
      />

      <PasswordField
        id="confirm-password"
        name="confirm-password"
        label="Confirm new password"
        autoComplete="new-password"
        value={confirm}
        onChange={(v) => {
          setConfirm(v);
          clearError('confirm');
        }}
        error={errors.confirm}
        showStrength={false}
        disabled={submitting}
        required
      />

      {/*
       * Still advisory, but it now means something different. The shared policy
       * rejects anything below the floor, so a password that reaches this branch
       * has already been accepted — this only says it is sitting at the minimum
       * and a little more length would go a long way.
       */}
      {isAtFloor && !errors.next && (
        <Alert tone="info" title="This password is acceptable">
          It clears the minimum. A few more characters would make it considerably harder to
          guess — length helps more than any other single change.
        </Alert>
      )}

      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          Change password
        </Button>
      </div>
    </form>
  );
}
