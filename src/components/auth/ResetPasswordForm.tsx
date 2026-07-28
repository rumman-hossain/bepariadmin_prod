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

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiResetPassword, apiVerifyResetOtp } from '../../api/auth';
import { hashPassword, hashErrorMessage } from '../../auth/passwordHasher';
import { validateEmail, validatePassword, validatePasswordMatch } from '../../utils/validation';

export function ResetPasswordForm() {
  const { clearError } = useAuth();
  // 'code' collects and verifies the emailed OTP; 'password' sets the new one.
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill the email when forgot-password passed it along, so the user does
  // not retype an address they just entered.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('email');
    if (e) setEmail(e);
  }, []);

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
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
      if (res.ok) {
        setStep('password');
      } else {
        const err = res.data as unknown as { error?: { message?: string } };
        setError(err?.error?.message || 'Invalid or expired code.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        const err = res.data as unknown as { error?: { message?: string } };
        const msg = err?.error?.message || 'Invalid or expired code.';
        // The code is only consumed on success, so an expired or locked-out
        // attempt sends the user back to re-enter it rather than stranding them
        // on a password form that can no longer succeed.
        setStep('code');
        setError(msg);
      }
    } catch (err) {
      setError(hashErrorMessage(err) ?? 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-slate-800">Password Reset!</h2>
        <p className="text-sm text-slate-500">
          Your password has been reset successfully. You can now login with your new password.
        </p>
        <button
          onClick={() => { window.location.href = '/'; }}
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={step === 'code' ? handleVerifyCode : handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">
          {step === 'code' ? 'Enter Reset Code' : 'Set New Password'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {step === 'code'
            ? 'Enter your email and the 6-digit code we sent you'
            : 'Choose a new password'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isSubmitting}
        />
      </div>

      {step === 'code' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            6-Digit Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl tracking-[0.4em] text-center font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="000000"
            autoComplete="one-time-code"
            disabled={isSubmitting}
          />
        </div>
      )}

      {step === 'password' && (
        <>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="Min 8 characters"
            autoComplete="new-password"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="Re-enter password"
            autoComplete="new-password"
            disabled={isSubmitting}
          />
        </div>
        </>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
      >
        {isSubmitting
          ? (step === 'code' ? 'Verifying...' : 'Resetting...')
          : (step === 'code' ? 'Verify Code' : 'Reset Password')}
      </button>

      <button
        type="button"
        onClick={() => { window.location.href = '/'; }}
        className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
      >
        ← Back to Login
      </button>
    </form>
  );
}