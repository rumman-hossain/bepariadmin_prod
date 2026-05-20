/**
 * ForgotPasswordForm — Request password reset email.
 *
 * Matches mobile app's ForgotPasswordScreen behavior.
 */

import React, { useState } from 'react';
import { apiForgotPassword } from '../../api/auth';
import { validateEmail } from '../../utils/validation';

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = validateEmail(email);
    if (!result.valid) {
      setError(result.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiForgotPassword(email.trim().toLowerCase());
      if (res.ok) {
        setSent(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl mb-3">📧</div>
        <h2 className="text-xl font-bold text-slate-800">Check Your Email</h2>
        <p className="text-sm text-slate-500">
          If an account with that email exists, a password reset link has been sent.
        </p>
        <button
          onClick={onBack}
          className="text-sm text-emerald-600 font-semibold hover:underline"
        >
          ← Back to Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">Reset Password</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter your email and we'll send you a reset link
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Sending...' : 'Send Reset Link'}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
      >
        ← Back to Login
      </button>
    </form>
  );
}