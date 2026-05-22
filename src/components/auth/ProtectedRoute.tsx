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

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { step, isLoading, isServerReachable } = useAuth();
  const location = useLocation();

  // ── Bootstrap loading — show spinner in-line (no redirect) ──────
  if (isLoading && step === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F2F7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#8E8E93] text-[15px]">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Server unreachable — show inline (no route change) ─────────
  if (!isServerReachable) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F2F7]">
        <div className="text-center">
          <p className="text-4xl mb-4">🔌</p>
          <h2 className="text-xl font-semibold text-[#1C1C1E] mb-1">Server Unreachable</h2>
          <p className="text-[#8E8E93] text-[15px]">Unable to connect. Try again later.</p>
        </div>
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

  // ── Forgot password — redirect to /forgot-password ─────────────
  if (step === 'forgot_password') {
    return <Navigate to="/forgot-password" state={{ from: location }} replace />;
  }

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
    <div className="flex items-center justify-center min-h-screen bg-[#F2F2F7] p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">BEPARIBD</h1>
          <p className="text-[#8E8E93] text-[15px] mt-1">Admin Portal</p>
        </div>

        <div className="bg-white rounded-3xl px-6 py-8 shadow-md shadow-black/5">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
