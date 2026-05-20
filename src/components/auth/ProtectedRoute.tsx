/**
 * ProtectedRoute — Wraps children behind authentication.
 *
 * If user is not authenticated, shows login screen instead.
 * Handles loading state during bootstrap.
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from './LoginForm';
import { OtpVerification } from './OtpVerification';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { step, isLoading, isServerReachable } = useAuth();

  // Bootstrap loading — show spinner
  if (isLoading && step === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Server unreachable
  if (!isServerReachable) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Server Unreachable</h2>
          <p className="text-slate-500 text-sm">Unable to connect to the backend. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Authenticated — show dashboard
  if (step === 'dashboard') {
    return <>{children}</>;
  }

  // OTP verification step
  if (step === 'verifying_login') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl">📧</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Check Your Email</h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter the 6-digit code sent to your email
            </p>
          </div>
          <OtpVerification />
        </div>
      </div>
    );
  }

  // Login form (default)
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">BEPARIBD</h1>
          <p className="text-slate-500 text-sm">Admin Portal — Sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}