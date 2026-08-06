/**
 * LoginForm — sign-in against the real backend.
 *
 * The password is PBKDF2-hashed in the browser before it is sent, matching the
 * mobile app; if the server answers `requiresOTP`, the router moves to the OTP
 * step.
 */

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '@/src/components/controls';
import { Button } from '@/src/components/controls';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@/src/components/feedback';

interface FieldErrors {
  identifier?: string;
  password?: string;
}

export function LoginForm() {
  const { login, submitting, error, notice, clearError } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  /**
   * Both validators already return a usable message — the form used to compute
   * them, discard them, and `return false`. Pressing Sign In with a malformed
   * address therefore did nothing at all: no error, no request, no feedback.
   */
  function validate(): boolean {
    clearError();

    const next: FieldErrors = {};

    // Email only. Staff are looked up by email alone server-side — there is no
    // phone_hash clause for the staff table, unlike retailer and wholesaler — so
    // accepting a phone number here just produced a confusing 401.
    if (!identifier.trim()) {
      next.identifier = 'Enter your email address.';
    }

    /*
     * Presence only, deliberately. This used to run `validatePassword`, which is
     * the SET-TIME policy (8+ chars, an uppercase letter, a digit). Applying it
     * at sign-in means any account whose password predates the policy cannot
     * even send the request — the form refuses locally, so there is no server
     * response and no path to recovery. A sign-in form's job is to transmit
     * what was typed; only the server can say whether it is right.
     */
    if (!password) {
      next.password = 'Enter your password.';
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await login(identifier, password);
    setPassword('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/*
        A notice and an error are different things and must not look alike.
        "Your session ended" is information — the clock ran out, or a password
        was changed on another device. Styling it red would read as "you did
        something wrong", which is both untrue and the wrong prompt: the
        response is simply to sign in again.

        They are mutually exclusive by construction — `request/start` clears the
        notice, so an attempt in progress cannot show both.
      */}
      {error ? (
        <Alert tone="bad">{error}</Alert>
      ) : notice ? (
        <Alert tone="info">{notice}</Alert>
      ) : null}

      <Input
        id="login-identifier"
        name="identifier"
        type="text"
        label="Email"
        value={identifier}
        onChange={(e) => {
          setIdentifier(e.target.value);
          if (fieldErrors.identifier) setFieldErrors((p) => ({ ...p, identifier: undefined }));
        }}
        error={fieldErrors.identifier}
        autoComplete="username"
        autoFocus
        disabled={submitting}
        fullWidth
      />

      <Input
        id="login-password"
        name="password"
        type="password"
        label="Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
        }}
        error={fieldErrors.password}
        autoComplete="current-password"
        disabled={submitting}
        fullWidth
      />

      <Button type="submit" loading={submitting} fullWidth size="lg">
        Sign in
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => void navigate('/forgot-password')}
          className="rounded-sm text-sm text-brass transition-colors hover:text-brass-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rule-focus"
        >
          Forgot password?
        </button>
      </div>
    </form>
  );
}
