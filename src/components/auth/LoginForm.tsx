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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full px-4 py-3.5 bg-[#F2F2F7] border-0 rounded-2xl text-[15px] text-[#1C1C1E] placeholder-[#8E8E93] focus:outline-none focus:bg-[#E5E5EA] transition-colors"
          placeholder="Email or mobile number"
          autoComplete="username"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1.5">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3.5 bg-[#F2F2F7] border-0 rounded-2xl text-[15px] text-[#1C1C1E] placeholder-[#8E8E93] focus:outline-none focus:bg-[#E5E5EA] transition-colors"
          placeholder="Password"
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 bg-[#007AFF] hover:bg-[#0062CC] text-white text-[17px] font-semibold rounded-2xl transition-colors disabled:opacity-40"
      >
        {isLoading ? 'Signing in…' : 'Sign In'}
      </button>

      <div className="text-center">
        <a
          href="/forgot-password"
          className="text-[15px] text-[#007AFF] hover:text-[#0062CC] transition-colors"
        >
          Forgot password?
        </a>
      </div>
    </form>
  );
}