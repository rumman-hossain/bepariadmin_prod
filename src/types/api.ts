/**
 * API Request & Response Types
 *
 * These mirror the backend's request/response structs from
 * beparibd-backend/internal/auth/model.go
 */

// ─── Common ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

// ─── Auth Payloads ───────────────────────────────────────────────────────

export interface LoginPayload {
  identifier: string;
  password_hash: string;
  user_type: 'wholesaler' | 'retailer' | 'staff';
}

export interface VerifyOtpPayload {
  identifier: string;
  code: string;
  user_type: 'wholesaler' | 'retailer' | 'staff';
  /**
   * The nonce issued alongside this code, from the login or resend response.
   *
   * NOT a wire field — `apiVerifyLoginOtp` turns it into `otp_hash`/`otp_nonce`/
   * `otp_mac`. Optional so a caller with no nonce degrades to the unbound digest
   * rather than binding to something invented, which would fail as a wrong code.
   */
  otpNonce?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password_hash: string;
}

export interface ResendOtpPayload {
  identifier: string;
  user_type: 'wholesaler' | 'retailer' | 'staff';
}

// ─── Auth Responses ──────────────────────────────────────────────────────

export interface LoginResponseData {
  accessToken: string;
  refreshToken?: string; // Only returned for mobile clients; web uses cookie
  user: MeResponseData;
  requiresOTP: boolean;
  expiresIn?: number;
  /**
   * Minted with the OTP and returned only here, alongside `requiresOTP`.
   *
   * There is deliberately no endpoint that hands out a nonce on its own: one
   * would let anyone holding the six digits go and fetch what binds them, which
   * is the entire property this field exists to provide.
   */
  otpNonce?: string;
}

export interface RefreshResponseData {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface MeResponseData {
  id: string;
  name: string;
  email: string;
  role: string;
  shopName?: string;
  logoUrl?: string;
  phone?: string;
  code?: string;
  marginPercent: number;
  wholesalerId?: string;
  retailerId?: string;
  userType: 'wholesaler' | 'retailer' | 'staff';
  emailVerified: boolean;
  storeCreated: boolean;
  storeSetupCompleted: boolean;
  status: string;
  createdBy: string;
  docTradeLicense?: string;
  docVatRegistration?: string;
  docTinCertificate?: string;
  docNidCopy?: string;
}

export interface ForgotPasswordResponseData {
  message: string;
}

export interface ResetPasswordResponseData {
  message: string;
}

// ─── Error Response ─────────────────────────────────────────────────────

export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}