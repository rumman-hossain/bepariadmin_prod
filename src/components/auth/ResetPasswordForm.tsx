/**
 * ResetPasswordForm — Set new password using token from email link.
 *
 * Matches mobile app's ResetPasswordScreen behavior.
 * Token is read from URL query parameter: ?token=<64 hex chars>
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiResetPassword } from '../../api/auth';
import { hashPassword, hashErrorMessage } from '../../auth/passwordHasher';
import { validateEmail, validatePassword, validatePasswordMatch } from '../../utils/validation';

export function ResetPasswordForm() {
  const { clearError } = useAuth();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Read token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
    } else {
      setError('Invalid or missing reset token.');
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    clearError();

    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setError(emailResult.message);
      return;
    }

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
      const res = await apiResetPassword(token, passwordHash);

      if (res.ok) {
        setSuccess(true);
      } else {
        const err = res.data as unknown as { error?: { message?: string } };
        const msg = err?.error?.message || 'Token invalid or expired.';
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">Set New Password</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter your email and choose a new password
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Resetting...' : 'Reset Password'}
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