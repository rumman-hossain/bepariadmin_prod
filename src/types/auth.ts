/**
 * Auth-specific state types for the AuthContext.
 *
 * These are internal to the auth flow — distinct from domain types
 * (src/types/domain.ts) and API types (src/types/api.ts).
 */

/** Auth flow step — tracks where the user is in the login/register process */
export type AuthStep =
  | 'idle'
  | 'login_form'
  | 'verifying_login'
  | 'forgot_password'
  | 'reset_password'
  | 'store_setup'
  | 'dashboard';

/** Auth state persisted in context */
export interface AuthState {
  /** Current auth flow step */
  step: AuthStep;

  /** Whether any auth operation is in progress */
  isLoading: boolean;

  /** User-friendly error message, or null */
  error: string | null;

  /** Authenticated user profile (from GET /me), or null if not logged in */
  user: AuthUser | null;

  /** JWT access token (15-min expiry) */
  accessToken: string | null;

  /** Whether the backend is reachable */
  isServerReachable: boolean;
}

/** Authenticated user — subset of MeResponseData relevant to the UI */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  shopName?: string;
  logoUrl?: string;
  code?: string;
  emailVerified: boolean;
  storeCreated: boolean;
  storeSetupCompleted: boolean;
}

/** Actions exposed by AuthContext */
export interface AuthActions {
  login: (identifier: string, password: string, userType?: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  clearError: () => void;
}