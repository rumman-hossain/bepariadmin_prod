import React, { useState } from 'react';
import { FormSection } from '@/src/components/forms/FormSection';
import { FormField } from '@/src/components/forms/FormField';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { ConfirmDialog } from '@/src/components/shared/ConfirmDialog';
import { ShieldAlert } from 'lucide-react';
import { hashPassword } from '@/src/auth/passwordHasher';
import { resetWholesalerPassword } from '../api/wholesalerApi';
import { toWholesalerApiError } from '../api/errors';
import { useToast } from '@/src/components/ui/Toast';

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
    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters.');
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
      const salt = loginEmail.toLowerCase().trim();
      const passwordHash = await hashPassword(newPassword, salt);
      await resetWholesalerPassword(wholesalerId, passwordHash);
      toast.success(
        'Password reset',
        `${companyName} must sign in again with the new password.`,
      );
      setNewPassword('');
      setConfirmPassword('');
      setShowConfirm(false);
    } catch (err) {
      toast.error('Reset failed', toWholesalerApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FormSection icon={ShieldAlert} title="Reset login password">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormField
            label="New password"
            htmlFor="reset-password-new"
            required
            error={localError ?? undefined}
            className="flex-1 min-w-0"
          >
            <Input
              id="reset-password-new"
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setLocalError(null);
              }}
              disabled={loading}
            />
          </FormField>
          <FormField
            label="Confirm password"
            htmlFor="reset-password-confirm"
            required
            className="flex-1 min-w-0"
          >
            <Input
              id="reset-password-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setLocalError(null);
              }}
              disabled={loading}
            />
          </FormField>
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
        variant="danger"
        loading={loading}
      />
    </>
  );
}
