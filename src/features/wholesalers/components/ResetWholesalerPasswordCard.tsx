import { useState } from 'react';
import { FormSection } from '@/src/components/forms/FormSection';
import { Button } from '@/src/components/controls';
import { ConfirmDialog } from '@/src/components/feedback';
import { ShieldAlert } from 'lucide-react';
import { hashPassword, hashErrorMessage, validatePassword } from '@/src/auth/passwordHasher';
import { PasswordField } from '@/src/components/auth/PasswordField';
import { resetWholesalerPassword } from '../api/wholesalerApi';
import { toWholesalerApiError } from '../api/errors';
import { useToast } from '@/src/components/feedback/useToast';

interface ResetWholesalerPasswordCardProps {
  wholesalerId: string;
  loginEmail: string;
  companyName: string;
}

export function ResetWholesalerPasswordCard({
  wholesalerId,
  loginEmail,
  companyName,
}: ResetWholesalerPasswordCardProps) {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    /*
     * The canonical policy, not a local length check.
     *
     * This was `newPassword.length < 8` — no uppercase, no digit — on the one
     * screen where an admin sets somebody ELSE'S password. So a supplier could
     * be handed a credential their own app would refuse to let them choose, and
     * the console's own policy-conformance test did not cover this component.
     */
    const verdict = validatePassword(newPassword);
    if (!verdict.valid) {
      // `message` is optional on the shared type; it is always set on a failure,
      // but the fallback keeps the UI from rendering an empty error box.
      setLocalError(verdict.message ?? 'That password does not meet the policy.');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return false;
    }
    if (!loginEmail.trim()) {
      setLocalError('Supplier login email is missing; cannot reset password.');
      return false;
    }
    setLocalError(null);
    return true;
  };

  const handleOpenConfirm = () => {
    if (validate()) {
      setShowConfirm(true);
    }
  };

  const handleConfirmReset = async () => {
    setLoading(true);
    try {
      const passwordHash = await hashPassword(newPassword);
      await resetWholesalerPassword(wholesalerId, passwordHash);
      toast.success(
        'Password reset',
        `${companyName} must sign in again with the new password.`,
      );
      setNewPassword('');
      setConfirmPassword('');
      setShowConfirm(false);
    } catch (err) {
      toast.error('Reset failed', hashErrorMessage(err) ?? toWholesalerApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FormSection icon={ShieldAlert} title="Reset login password">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            {/*
             * The generator belongs here: an admin is setting a password FOR a
             * supplier, then reading it out or emailing it. Generated passwords
             * omit confusable characters (I l 1 O 0) for exactly that reason,
             * and Copy is offered so nobody retypes a 16-character string by
             * eye and locks the supplier out of their own account.
             */}
            <PasswordField
              id="reset-password-new"
              name="reset-password-new"
              label="New password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(value) => {
                setNewPassword(value);
                setLocalError(null);
              }}
              error={localError ?? undefined}
              allowGenerate
              disabled={loading}
              /*
               * NOT `required`, and that is the whole point.
               *
               * This card is rendered INSIDE the profile form, and Save Changes
               * is a `type="submit"` button. A `required` input anywhere in that
               * form makes the browser refuse the submit and focus this field
               * with "Please fill out this field." — so an operator correcting
               * an address could not save at all unless they also set a new
               * password, and the only clue was a native tooltip on a card they
               * were not using.
               *
               * Measured on dev: pressing Save Changes produced no request at
               * all, and no message from the app.
               *
               * Nothing is lost. Resetting a password is a SEPARATE action with
               * its own button, and `canSubmit` below already refuses an empty
               * or mismatched pair — a rule this form has no business enforcing
               * on somebody who is not resetting anything.
               */
            />
          </div>
          <div className="min-w-0 flex-1">
            <PasswordField
              id="reset-password-confirm"
              name="reset-password-confirm"
              label="Confirm password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(value) => {
                setConfirmPassword(value);
                setLocalError(null);
              }}
              showStrength={false}
              disabled={loading}
              // Not `required`, for the same reason as the field above: it would
              // block the profile form's own submit.
            />
          </div>
          <Button
            variant="danger"
            size="md"
            type="button"
            onClick={handleOpenConfirm}
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full sm:w-auto shrink-0"
          >
            Reset password
          </Button>
        </div>
      </FormSection>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => !loading && setShowConfirm(false)}
        onConfirm={handleConfirmReset}
        title="Reset supplier password?"
        message={`This will replace the login password for ${companyName} (${loginEmail}) and sign them out of all devices.`}
        confirmLabel="Reset password"
        cancelLabel="Cancel"
        tone="danger"
        loading={loading}
      />
    </>
  );
}
