/**
 * AuthContext — React Context + Provider
 *
 * Central auth state: user, tokens, loading, errors.
 * Exposes login, verifyOtp, logout, bootstrap actions.
 *
 * Matches the mobile app's auth flow behavior.
 */

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { hashPassword } from './passwordHasher';
import { clearTokens, onAuthBroadcast } from './tokenManager';
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
}

const defaultState: AuthState = {
  step: 'idle',
  isLoading: true, // Start loading until bootstrap completes
  error: null,
  user: null,
  accessToken: null,
  isServerReachable: true,
};

export const AuthContext = createContext<AuthContextValue>({
  ...defaultState,
  login: async () => {},
  verifyOtp: async () => {},
  resendOtp: async () => {},
  logout: async () => {},
  bootstrap: async () => {},
  clearError: () => {},
});

// ═══════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<AuthStep>(defaultState.step);
  const [isLoading, setIsLoading] = useState(defaultState.isLoading);
  const [error, setError] = useState<string | null>(defaultState.error);
  const [user, setUser] = useState<AuthUser | null>(defaultState.user);
  const [accessToken, setAccessToken] = useState<string | null>(defaultState.accessToken);
  const [isServerReachable, setIsServerReachable] = useState(defaultState.isServerReachable);

  // Stored during login for OTP verification
  const loginIdentifierRef = useRef('');
  const loginUserTypeRef = useRef('staff');

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
    localStorage.setItem('bepari_access_token', token);
    setAccessToken(token);

    const meRes = await apiGetMe();

    if (!meRes.ok) {
      // Retry once
      await new Promise((r) => setTimeout(r, 800));
      const retryRes = await apiGetMe();
      if (!retryRes.ok) {
        clearTokens();
        setAccessToken(null);
        return null;
      }
      const me = retryRes.data as unknown as Record<string, unknown>;
      return mapUser(me);
    }

    const me = meRes.data as unknown as Record<string, unknown>;
    return mapUser(me);
  }

  // ═══════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════

  const login = useCallback(
    async (identifier: string, password: string, userType = 'staff') => {
      setIsLoading(true);
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
          setIsLoading(false);
          return;
        }

        const data = res.data as unknown as Record<string, unknown>;

        if (data.requiresOTP) {
          loginIdentifierRef.current = identifier.trim().toLowerCase();
          loginUserTypeRef.current = userType;
          setStep('verifying_login');
        }
        // Admin app: staff accounts skip OTP (email_verified=true)
        // If no OTP required, should receive tokens directly
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      }

      setIsLoading(false);
    },
    []
  );

  // ═══════════════════════════════════════════════════════════
  // VERIFY OTP
  // ═══════════════════════════════════════════════════════════

  const verifyOtp = useCallback(async (code: string) => {
    setIsLoading(true);
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
        setIsLoading(false);
        return;
      }

      const data = res.data as unknown as Record<string, unknown>;
      const token = data.accessToken as string;

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

    setIsLoading(false);
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

    clearTokens();
    setUser(null);
    setAccessToken(null);
    setStep('login_form');
    setError(null);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // BOOTSTRAP (cold start recovery)
  // ═══════════════════════════════════════════════════════════

  const bootstrap = useCallback(async () => {
    setIsLoading(true);

    try {
      // 1. Health check
      const healthRes = await fetch('/health');
      if (!healthRes.ok) {
        setIsServerReachable(false);
        setIsLoading(false);
        return;
      }
      setIsServerReachable(true);

      // 2. Check stored token
      const storedToken = localStorage.getItem('bepari_access_token');
      if (!storedToken) {
        setStep('login_form');
        setIsLoading(false);
        return;
      }

      // 3. Validate token via GET /me
      setAccessToken(storedToken);
      const meRes = await apiGetMe();

      if (!meRes.ok) {
        // Token invalid — clear and go to login
        clearTokens();
        setAccessToken(null);
        setStep('login_form');
        setIsLoading(false);
        return;
      }

      const me = meRes.data as unknown as Record<string, unknown>;
      setUser(mapUser(me));
      setStep('dashboard');
    } catch {
      setIsServerReachable(false);
    }

    setIsLoading(false);
  }, []);

  // Bootstrap on mount
  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-tab sync
  useEffect(() => {
    return onAuthBroadcast(
      (token) => setAccessToken(token),
      () => {
        setUser(null);
        setAccessToken(null);
        setStep('login_form');
      }
    );
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
    login,
    verifyOtp,
    resendOtp,
    logout,
    bootstrap,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}