import { createContext } from 'react';
import type { AuthState } from '../types/auth';

/**
 * The auth context object, split out of `AuthContext.tsx`.
 *
 * That file exports `AuthProvider`, a component; exporting the context from it
 * too cost Fast Refresh on the single most-edited file in the auth flow. The
 * consumer is `hooks/useAuth.ts`, which is where the hook already lived.
 */

export interface AuthContextValue extends AuthState {
  login: (identifier: string, password: string, userType?: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  clearError: () => void;
  /**
   * Re-read the signed-in user, after they have edited their own details.
   *
   * The header renders the name and role from this object, so a profile save
   * without it leaves a stale name in the corner of every screen and reads as
   * a change that did not take.
   */
  refreshUser: () => Promise<void>;
  /** True only during explicit login/OTP submit, NOT during bootstrap */
  submitting: boolean;
}

const defaultState: Omit<AuthState, 'accessToken'> = {
  step: 'idle',
  isLoading: true, // Start loading until bootstrap completes
  error: null,
  notice: null,
  user: null,
  isServerReachable: true,
};

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
  refreshUser: async () => {},
});
