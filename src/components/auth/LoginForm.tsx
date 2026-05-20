/**
 * LoginForm — Real backend login with PBKDF2 password hashing.
 *
 * Matches the mobile app's LoginScreen behavior:
 * 1. User enters email/phone + password
 * 2. Password is PBKDF2-hashed in-browser before sending
 * 3. POST /api/v1/auth/login
 * 4. If requiresOTP → switches to OTP verification step
 */

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { validateIdentifier, validatePassword } from '../../utils/validation';

export function LoginForm() {
  const { login, isLoading, error, clearError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  function validate(): boolean {
    clearError();
    const idResult = validateIdentifier(identifier);
    if (!idResult.valid) {
      return false;
    }
    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await login(identifier, password);
    setPassword('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Email or Mobile
        </label>
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="Email or phone number"
          autoComplete="username"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      <p className="text-xs text-slate-400 text-center mt-2">
        🔒 Password is hashed in-browser before sending
      </p>
    </form>
  );
}