/**
 * OtpVerification — 6-digit OTP input for login verification.
 *
 * Matches mobile app's OtpVerifyScreen behavior:
 * - Auto-submit when 6 digits entered
 * - 60-second resend cooldown
 * - Max 5 resend attempts
 * - Back to login on expired code
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isValidOtp } from '../../utils/validation';

export function OtpVerification() {
  const { verifyOtp, resendOtp, submitting, error, clearError, isLoading, step } = useAuth();
  const [otp, setOtp] = useState('');
  const [resendCount, setResendCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Focus input on mount
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7294/ingest/ae423c12-13a4-45ec-a07b-20329cf2b723',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'098add'},body:JSON.stringify({sessionId:'098add',location:'OtpVerification.tsx:mount',message:'OTP screen mounted',data:{submitting,isLoading,step,isDark:document.documentElement.classList.contains('dark'),inputDisabled:submitting},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  const canResend = cooldown === 0 && resendCount < 5;
  const maxReached = resendCount >= 5;

  async function handleVerify(codeOverride?: string) {
    const finalOtp = codeOverride || otp;
    if (!isValidOtp(finalOtp) || submitting) return;

    clearError();
    await verifyOtp(finalOtp);
    setOtp('');
  }

  async function handleResend() {
    if (!canResend || submitting) return;
    await resendOtp();
    setResendCount((prev) => prev + 1);
    setCooldown(60);
    setOtp('');
    inputRef.current?.focus();
  }

  function handleChange(value: string) {
    const clean = value.replace(/\D/g, '').slice(0, 6);
    // #region agent log
    fetch('http://127.0.0.1:7294/ingest/ae423c12-13a4-45ec-a07b-20329cf2b723',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'098add'},body:JSON.stringify({sessionId:'098add',location:'OtpVerification.tsx:handleChange',message:'OTP input change',data:{rawLen:value.length,cleanLen:clean.length,cleanPreview:clean.slice(0,2)+'****',submitting,isDark:document.documentElement.classList.contains('dark')},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setOtp(clean);
    if (clean.length === 6) {
      handleVerify(clean);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Verification Code
        </label>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            // #region agent log
            fetch('http://127.0.0.1:7294/ingest/ae423c12-13a4-45ec-a07b-20329cf2b723',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'098add'},body:JSON.stringify({sessionId:'098add',location:'OtpVerification.tsx:onFocus',message:'OTP input focused',data:{disabled:submitting,otpLen:otp.length},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
            // #endregion
          }}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center text-2xl tracking-[0.5em] font-mono"
          placeholder="000000"
          autoComplete="one-time-code"
          disabled={submitting}
        />
      </div>

      <button
        type="button"
        onClick={() => handleVerify()}
        disabled={submitting || otp.length < 6}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
      >
        {submitting ? 'Verifying...' : 'Verify OTP'}
      </button>

      <div className="text-center">
        {maxReached ? (
          <p className="text-xs text-slate-400">Maximum resend attempts reached.</p>
        ) : canResend ? (
          <button
            type="button"
            onClick={handleResend}
            disabled={submitting}
            className="text-sm text-emerald-600 font-semibold hover:underline"
          >
            Resend Code
          </button>
        ) : (
          <p className="text-xs text-slate-400">
            Resend in <span className="font-mono text-slate-600">{cooldown}s</span>
          </p>
        )}
      </div>
    </div>
  );
}