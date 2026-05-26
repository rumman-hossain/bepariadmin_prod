/**
 * AuthContext — React Context + Provider
 *
 * Central auth state: user, loading, errors.
 * Exposes login, verifyOtp, logout, bootstrap actions.
 *
 * Access tokens are stored ONLY in module-scope closure (memoryTokenStore),
 * NEVER in localStorage/sessionStorage. Cross-tab sync handled via
 * BroadcastChannel in tokenManager.ts.
 *
 * Matches the mobile app's auth flow behavior.
 */

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { hashPassword } from './passwordHasher';
import { getAccessToken, setAccessToken, clearAccessToken } from './memoryTokenStore';
import { onAuthBroadcast } from './tokenManager';
import {
  apiLogin,
  apiVerifyLoginOtp,
  apiGetMe,
  apiLogout,
  apiResendLoginOtp,
} from '../api/auth';
import { friendlyError, errorCode } from '../utils/errors';
import type { AuthState, AuthUser, AuthStep } from '../types/auth';

// ═══════════════════════════════════════════════════════════════
// Context Type
// ═══════════════════════════════════════════════════════════════

export interface AuthContextValue extends AuthState {
  login: (identifier: string, password: string, userType?: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  clearError: () => void;
  goToLogin: () => void;
  goToForgotPassword: () => void;
  /** True only during explicit login/OTP submit, NOT during bootstrap */
  submitting: boolean;
}

const defaultState: Omit<AuthState, 'accessToken'> = {
  step: 'idle',
  isLoading: true, // Start loading until bootstrap completes
  error: null,
  user: null,
  isServerReachable: true,
};

// AuthState.accessToken is kept for backward-compat on the interface,
// but its value is derived at call time from memoryTokenStore.
// Consumers should use getAccessToken() directly where possible.

export const AuthContext = createContext<AuthContextValue>({
  ...defaultState,
  accessToken: null,
  submitting: false,
  login: async () => {},
  verifyOtp: async () => {},
  resendOtp: async () => {},
  logout: async () => {},
  bootstrap: async () => {},
  clearError: () => {},
  goToLogin: () => {},
  goToForgotPassword: () => {},
});

// ═══════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<AuthStep>(defaultState.step);
  const [isLoading, setIsLoading] = useState(defaultState.isLoading);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(defaultState.error);
  const [user, setUser] = useState<AuthUser | null>(defaultState.user);
  const [isServerReachable, setIsServerReachable] = useState(defaultState.isServerReachable);

  // Force re-render trigger — bumped whenever token changes,
  // so React components reading accessToken from context re-render.
  const [, setTokenVersion] = useState(0);

  // Stored during login for OTP verification
  const loginIdentifierRef = useRef('');
  const loginUserTypeRef = useRef('staff');

  // ── Derived value: read from memoryTokenStore, not React state ───
  const accessToken = getAccessToken();

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Map API user to AuthUser
  function mapUser(me: Record<string, unknown>): AuthUser {
    return {
      id: me.id as string,
      name: (me.name as string) || '',
      email: (me.email as string) || '',
      role: (me.role as string) || '',
      phone: (me.phone as string) || undefined,
      shopName: (me.shopName as string) || undefined,
      logoUrl: (me.logoUrl as string) || undefined,
      code: (me.code as string) || undefined,
      emailVerified: (me.emailVerified as boolean) !== false,
    };
  }

  // Fetch profile after token received
  async function fetchProfile(token: string): Promise<AuthUser | null> {
    setAccessToken(token);
    setTokenVersion((v) => v + 1);

    const meRes = await apiGetMe();

    if (!meRes.ok) {
      // Retry once
      await new Promise((r) => setTimeout(r, 800));
      const retryRes = await apiGetMe();
      if (!retryRes.ok) {
        clearAccessToken();
        setTokenVersion((v) => v + 1);
        return null;
      }
      const me = (retryRes.data as unknown as Record<string, unknown>).data as Record<string, unknown>;
      return mapUser(me);
    }

    const me = (meRes.data as unknown as Record<string, unknown>).data as Record<string, unknown>;
    return mapUser(me);
  }

  // ═══════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════

  const login = useCallback(
    async (identifier: string, password: string, userType = 'staff') => {
      setSubmitting(true);
      setError(null);

      try {
        const passwordHash = await hashPassword(password, identifier);
        const res = await apiLogin({
          identifier: identifier.trim().toLowerCase(),
          password_hash: passwordHash,
          user_type: userType as 'staff' | 'wholesaler' | 'retailer',
        });

        if (!res.ok) {
          setError(friendlyError(res));
          setSubmitting(false);
          return;
        }

        const inner = (res.data as unknown as Record<string, unknown>).data as Record<string, unknown>;

        if (inner.requiresOTP) {
          loginIdentifierRef.current = identifier.trim().toLowerCase();
          loginUserTypeRef.current = userType;
          setStep('verifying_login');
        }
        // Admin app: staff accounts skip OTP (email_verified=true)
        // If no OTP required, should receive tokens directly
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      }

      setSubmitting(false);
    },
    []
  );

  // ═══════════════════════════════════════════════════════════
  // VERIFY OTP
  // ═══════════════════════════════════════════════════════════

  const verifyOtp = useCallback(async (code: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const identifier = loginIdentifierRef.current;
      const userType = loginUserTypeRef.current;

      const res = await apiVerifyLoginOtp({
        identifier,
        code,
        user_type: userType as 'staff' | 'wholesaler' | 'retailer',
      });

      if (!res.ok) {
        const code = errorCode(res);
        if (code === 'EXPIRED_CODE') {
          setStep('login_form');
          setError('OTP expired. Please login again.');
        } else {
          setError(friendlyError(res));
        }
        setSubmitting(false);
        return;
      }

      const inner = (res.data as unknown as Record<string, unknown>).data as Record<string, unknown>;
      const token = inner.accessToken as string;

      if (token) {
        const profile = await fetchProfile(token);
        if (profile) {
          setUser(profile);
          setStep('dashboard');
        } else {
          setError('Failed to load profile after login.');
          setStep('login_form');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    }

    setSubmitting(false);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // RESEND OTP
  // ═══════════════════════════════════════════════════════════

  const resendOtp = useCallback(async () => {
    try {
      await apiResendLoginOtp(loginIdentifierRef.current, loginUserTypeRef.current);
    } catch {
      // Silent
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Backend logout failure is non-critical
    }

    // apiLogout already calls clearAccessToken() in its .finally(),
    // but call it again defensively in case the request never fires.
    clearAccessToken();
    setTokenVersion((v) => v + 1);
    setUser(null);
    setStep('login_form');
    setError(null);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // BOOTSTRAP (cold start recovery)
  // ═══════════════════════════════════════════════════════════

  const bootstrap = useCallback(async () => {
    setIsLoading(true);

    // Helper: fetch with timeout
    async function fetchWithTimeout(
      url: string,
      options: RequestInit = {},
      timeoutMs = 15000,
    ): Promise<Response | null> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
      } catch {
        return null; // Timeout or network error
      } finally {
        clearTimeout(timer);
      }
    }

    try {
      // Run health check and silent refresh in PARALLEL (not sequential)
      const [healthRes, refreshRes] = await Promise.all([
        fetchWithTimeout('/health', {}, 15000),
        fetchWithTimeout(
          `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/auth/refresh`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          },
          15000,
        ),
      ]);

      // 1. Handle health check result
      if (!healthRes || !healthRes.ok) {
        setIsServerReachable(false);
        setStep('login_form');
        setIsLoading(false);
        return;
      }
      setIsServerReachable(true);

      // 2. Handle refresh token result
      if (!refreshRes || !refreshRes.ok) {
        // No valid refresh cookie — show login form (common case for new sessions)
        clearAccessToken();
        setTokenVersion((v) => v + 1);
        setStep('login_form');
        setIsLoading(false);
        return;
      }

      let refreshJson: Record<string, unknown>;
      try {
        refreshJson = await refreshRes.json() as Record<string, unknown>;
      } catch {
        setStep('login_form');
        setIsLoading(false);
        return;
      }

      const token = (refreshJson as Record<string, unknown>).data as Record<string, unknown> | undefined;
      const newAccessToken = (token as Record<string, unknown> | undefined)?.accessToken as string | undefined;

      if (!newAccessToken) {
        setStep('login_form');
        setIsLoading(false);
        return;
      }

      // 3. Store the new access token and validate via GET /me
      setAccessToken(newAccessToken);
      setTokenVersion((v) => v + 1);

      const meRes = await apiGetMe();

      if (!meRes.ok) {
        clearAccessToken();
        setTokenVersion((v) => v + 1);
        setStep('login_form');
        setIsLoading(false);
        return;
      }

      const me = (meRes.data as unknown as Record<string, unknown>).data as Record<string, unknown>;
      setUser(mapUser(me));
      setStep('dashboard');
    } catch {
      setIsServerReachable(false);
      setStep('login_form');
    }

    setIsLoading(false);
  }, []);

  // Bootstrap on mount
  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-tab sync — logout broadcast only (no localStorage token sync)
  useEffect(() => {
    return onAuthBroadcast(() => {
      clearAccessToken();
      setTokenVersion((v) => v + 1);
      setUser(null);
      setStep('login_form');
    });
  }, []);

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION HELPERS
  // ═══════════════════════════════════════════════════════════

  const goToLogin = useCallback(() => {
    setStep('login_form');
    setError(null);
  }, []);

  const goToForgotPassword = useCallback(() => {
    setStep('forgot_password');
    setError(null);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // VALUE
  // ═══════════════════════════════════════════════════════════

  const value: AuthContextValue = {
    step,
    isLoading,
    error,
    user,
    accessToken,
    isServerReachable,
    submitting,
    login,
    verifyOtp,
    resendOtp,
    logout,
    bootstrap,
    clearError,
    goToLogin,
    goToForgotPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}