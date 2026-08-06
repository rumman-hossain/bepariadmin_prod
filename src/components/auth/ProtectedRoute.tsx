/**
 * ProtectedRoute — Wraps children behind authentication.
 *
 * When the user is not authenticated, redirects to /login (or the
 * appropriate auth step route) using <Navigate> so the browser URL
 * always reflects the actual view.  After login the user is sent back
 * to their intended destination via React Router's `state.from`.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from './LoginForm';
import { AuthShell } from './AuthShell';
import { Loader2, PlugZap } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { step, isLoading, isServerReachable } = useAuth();
  const location = useLocation();

  // ── Bootstrap loading — show spinner in-line (no redirect) ──────
  if (isLoading && step === 'idle') {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-paper"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brass" aria-hidden="true" />
          <p className="text-sm text-ink-2">Restoring your session…</p>
        </div>
      </div>
    );
  }

  // ── Server unreachable — show inline (no route change) ─────────
  if (!isServerReachable) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6">
        <AuthShell
          title="Cannot reach the server"
          subtitle="The console is running but the API is not responding."
        >
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <PlugZap className="h-8 w-8 text-ink-3" aria-hidden="true" />
            <p className="text-sm text-ink-2">
              This is a connection problem, not a sign-in problem — your credentials are fine.
              Check that the API is running, then retry.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-sm text-sm font-medium text-brass hover:text-brass-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rule-focus"
            >
              Retry
            </button>
          </div>
        </AuthShell>
      </div>
    );
  }

  // ── Authenticated — render protected children ──────────────────
  if (step === 'dashboard') {
    return <>{children}</>;
  }

  // ── OTP verification — redirect to /login?step=verify ─────────
  if (step === 'verifying_login') {
    return <Navigate to="/login" state={{ from: location, step: 'verify' }} replace />;
  }

  // There is no `forgot_password` branch here any more. It was unreachable —
  // /login is not under ProtectedLayout, so this component never ran for the
  // screen that dispatched that step — and it is now the router's job anyway.

  // ── Login form — redirect to /login, preserving intended path ─
  // Don't redirect if we're already on an auth page to avoid loops.
  const isAuthPath =
    location.pathname === '/login' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';

  if (!isAuthPath) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Already on /login — render the form without redirect loop
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <AuthShell title="Sign in" subtitle="Admin console for the Bepari-BD marketplace.">
        <LoginForm />
      </AuthShell>
    </div>
  );
}
