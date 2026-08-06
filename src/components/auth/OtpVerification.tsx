/**
 * OtpVerification — the 6-digit code step of login.
 *
 * Matches the mobile app: auto-submits on the sixth digit, 60-second resend
 * cooldown, five resend attempts.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isValidOtp } from '../../utils/validation';
import { Button } from '@/src/components/controls';
import { Alert } from '@/src/components/feedback';
import { Stack } from '@/src/components/layout/primitives';

const RESEND_SECONDS = 60;
const MAX_RESENDS = 5;

export function OtpVerification() {
  const { verifyOtp, resendOtp, submitting, error, clearError } = useAuth();
  const [otp, setOtp] = useState('');
  const [resendCount, setResendCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  /*
   * One interval for the whole cooldown, started when it begins.
   *
   * The previous version re-ran its effect on every tick — `[cooldown]` in the
   * dependency array — so it cleared and recreated the interval once a second
   * for sixty seconds, and the countdown drifted because each restart reset the
   * timer's phase.
   */
  useEffect(() => {
    if (cooldown === 0) return;
    const id = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
    // Deliberately keyed on whether a cooldown is running, not on its value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldown > 0]);

  const canResend = cooldown === 0 && resendCount < MAX_RESENDS;
  const maxReached = resendCount >= MAX_RESENDS;

  const verify = useCallback(
    async (code: string) => {
      if (!isValidOtp(code) || submitting) return;
      clearError();
      await verifyOtp(code);
      setOtp('');
    },
    [clearError, submitting, verifyOtp],
  );

  async function handleResend() {
    if (!canResend || submitting) return;
    await resendOtp();
    setResendCount((n) => n + 1);
    setCooldown(RESEND_SECONDS);
    setOtp('');
    inputRef.current?.focus();
  }

  function handleChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6) void verify(digits);
  }

  return (
    <Stack gap="md">
      {error && <Alert tone="bad">{error}</Alert>}

      <div className="flex flex-col gap-1">
        <label htmlFor="otp-code" className="text-sm font-medium text-ink-2">
          Verification code
        </label>
        <input
          ref={inputRef}
          id="otp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          // The browser can fill this from an SMS on a phone; the pattern is
          // what tells it the field is a one-time code.
          pattern="\d{6}"
          maxLength={6}
          value={otp}
          onChange={(e) => handleChange(e.target.value)}
          disabled={submitting}
          aria-invalid={error ? true : undefined}
          autoFocus
          className="w-full rounded-md border border-rule-input bg-sheet px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-ink placeholder:text-ink-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rule-focus disabled:opacity-disabled"
          placeholder="000000"
        />
      </div>

      <Button
        onClick={() => void verify(otp)}
        loading={submitting}
        disabled={otp.length < 6}
        fullWidth
        size="lg"
      >
        Verify code
      </Button>

      {/*
        One live region for the whole resend area, polite. The countdown updates
        every second — announcing each tick assertively would talk over the user
        continuously for a minute.
      */}
      <div aria-live="polite" className="text-center">
        {maxReached ? (
          <p className="text-xs text-ink-3">
            Maximum resend attempts reached. Go back and sign in again to get a new code.
          </p>
        ) : canResend ? (
          <button
            type="button"
            onClick={handleResend}
            disabled={submitting}
            className="rounded-sm text-sm font-medium text-brass transition-colors hover:text-brass-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rule-focus"
          >
            Resend code
          </button>
        ) : (
          <p className="text-xs text-ink-3">
            Resend available in{' '}
            <span className="font-mono tabular-nums text-ink-2">{cooldown}s</span>
          </p>
        )}
      </div>
    </Stack>
  );
}
