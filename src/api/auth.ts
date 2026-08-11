/**
 * Auth API Functions
 *
 * Thin wrappers around the HTTP client for all auth endpoints.
 * These mirror the mobile app's API client functions
 * (wholesaleapp-client/src/services/api/client.ts).
 */

import { request } from './client';
import { clearAccessToken } from '../auth/memoryTokenStore';
import { otpFields } from '../auth/otpProof';
import type {
  ApiResponse,
  LoginPayload,
  VerifyOtpPayload,
  LoginResponseData,
  MeResponseData,
  ForgotPasswordResponseData,
  ResetPasswordResponseData,
} from '../types/api';

export function apiLogin(payload: LoginPayload): Promise<ApiResponse<LoginResponseData>> {
  return request<LoginResponseData>('POST', '/api/v1/auth/login', { body: payload as unknown as Record<string, unknown> });
}

/**
 * Verify the login code.
 *
 * Sends the digest bound to `otpNonce` — the value `/auth/login` returned with
 * the code, or the newer one `/auth/login/resend-otp` returned if the operator
 * asked again. Binding to the wrong one of those two spends an attempt and reads
 * as a wrong code, so the caller's job is to keep that field current; see
 * AuthContext's `resendOtp`.
 *
 * The hashing happens HERE rather than at the call site so no caller can send
 * the digits by forgetting a step.
 */
export async function apiVerifyLoginOtp(
  payload: VerifyOtpPayload
): Promise<ApiResponse<LoginResponseData>> {
  const { code, otpNonce, ...rest } = payload;
  return request<LoginResponseData>('POST', '/api/v1/auth/verify-login', {
    body: { ...rest, ...(await otpFields(code, otpNonce)) },
  });
}

export function apiGetMe(): Promise<ApiResponse<MeResponseData>> {
  return request<MeResponseData>('GET', '/api/v1/auth/me', { auth: true });
}

export function apiLogout(): Promise<ApiResponse<string>> {
  return request<string>('POST', '/api/v1/auth/logout', { auth: true }).finally(() => {
    clearAccessToken();
  });
}

export function apiLogoutSession(): Promise<ApiResponse<string>> {
  return request<string>('POST', '/api/v1/auth/logout-session');
}

export function apiForgotPassword(
  email: string
): Promise<ApiResponse<ForgotPasswordResponseData>> {
  return request<ForgotPasswordResponseData>('POST', '/api/v1/auth/forgot-password', {
    body: { email },
  });
}

/**
 * Confirm an emailed reset code WITHOUT consuming it, so the UI can advance to
 * the set-new-password step and report a bad code before the user types a
 * password. The code is consumed later, by apiResetPassword.
 *
 * `otpNonce` is whatever forgot-password returned when it issued this code. It
 * has to be the SAME value apiResetPassword then sends: this call leaves the
 * code live rather than spending it, so one issuance — and therefore one nonce —
 * has to survive both requests. It is optional because the endpoint that issues
 * reset codes does not currently return one; see readOtpNonce.
 */
export async function apiVerifyResetOtp(
  email: string,
  code: string,
  otpNonce?: string
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>('POST', '/api/v1/auth/verify-reset-otp', {
    body: { email, ...(await otpFields(code, otpNonce)) },
  });
}

/**
 * Set a new password using the emailed OTP.
 *
 * This previously sent `{ token, new_password_hash }`, matching a server-rendered
 * reset page. That path was already broken: nothing on the backend ever issued a
 * token, so every submission failed with INVALID_TOKEN. Both the page and the
 * token branch have since been removed, and email + code is the only reset path.
 *
 * `otpNonce` must be the one apiVerifyResetOtp was given — the pre-check did not
 * consume the code, so this is the second request against a single issuance.
 */
export async function apiResetPassword(
  email: string,
  code: string,
  newPasswordHash: string,
  otpNonce?: string
): Promise<ApiResponse<ResetPasswordResponseData>> {
  return request<ResetPasswordResponseData>('POST', '/api/v1/auth/reset-password', {
    body: { email, ...(await otpFields(code, otpNonce)), new_password_hash: newPasswordHash },
  });
}

/**
 * Ask for the login code again.
 *
 * The reply carries a NEW nonce, beside `data` rather than inside it, and it
 * SUPERSEDES the one `/auth/login` handed over — read it with `readOtpNonce` and
 * overwrite. A caller that keeps binding against the old nonce fails every
 * attempt from here on, and fails in the shape of a wrong code rather than
 * anything that points at a stale nonce.
 */
export function apiResendLoginOtp(
  identifier: string,
  userType: string
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>('POST', '/api/v1/auth/login/resend-otp', {
    body: { identifier, user_type: userType },
  });
}
/**
 * Change the signed-in user's own password.
 *
 * Both values are the client-side PBKDF2 hashes, never plaintext — the backend
 * compares `old_password_hash` against the stored argon2id(clientHash) and
 * re-hashes the new one. `auth: true` because this is the only password
 * endpoint that requires an existing session.
 */
export function apiChangePassword(
  oldPasswordHash: string,
  newPasswordHash: string
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>('POST', '/api/v1/auth/change-password', {
    auth: true,
    body: { old_password_hash: oldPasswordHash, new_password_hash: newPasswordHash },
  });
}
