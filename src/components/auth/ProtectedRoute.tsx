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
import { ForgotPasswordForm } from './ForgotPasswordForm';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { step, isLoading, isServerReachable, goToLogin } = useAuth();

  // Bootstrap loading — show spinner
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

  // Server unreachable
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

  // Authenticated — show dashboard
  if (step === 'dashboard') {
    return <>{children}</>;
  }

  // OTP verification step
  if (step === 'verifying_login') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F2F7] p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">BEPARIBD</h1>
            <p className="text-[#8E8E93] text-[15px] mt-1">Admin Portal</p>
          </div>

          <div className="bg-white rounded-3xl px-6 py-8 shadow-md shadow-black/5">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📧</span>
              </div>
              <h2 className="text-lg font-semibold text-[#1C1C1E]">Check Your Email</h2>
              <p className="text-[#8E8E93] text-[15px] mt-1">
                Enter the 6‑digit code we sent you
              </p>
            </div>
            <OtpVerification />
          </div>
        </div>
      </div>
    );
  }

  // Forgot password step
  if (step === 'forgot_password') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F2F7] p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">BEPARIBD</h1>
          </div>
          <div className="bg-white rounded-3xl px-6 py-8 shadow-md shadow-black/5">
            <ForgotPasswordForm onBack={goToLogin} />
          </div>
        </div>
      </div>
    );
  }

  // Login form (default)
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