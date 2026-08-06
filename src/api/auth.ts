/**
 * Auth API Functions
 *
 * Thin wrappers around the HTTP client for all auth endpoints.
 * These mirror the mobile app's API client functions
 * (wholesaleapp-client/src/services/api/client.ts).
 */

import { request } from './client';
import { clearAccessToken } from '../auth/memoryTokenStore';
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

export function apiVerifyLoginOtp(
  payload: VerifyOtpPayload
): Promise<ApiResponse<LoginResponseData>> {
  return request<LoginResponseData>('POST', '/api/v1/auth/verify-login', {
    body: payload as unknown as Record<string, unknown>,
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
 */
export function apiVerifyResetOtp(
  email: string,
  code: string
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>('POST', '/api/v1/auth/verify-reset-otp', {
    body: { email, code },
  });
}

/**
 * Set a new password using the emailed OTP.
 *
 * This previously sent `{ token, new_password_hash }`, matching a server-rendered
 * reset page. That path was already broken: nothing on the backend ever issued a
 * token, so every submission failed with INVALID_TOKEN. Both the page and the
 * token branch have since been removed, and email + code is the only reset path.
 */
export function apiResetPassword(
  email: string,
  code: string,
  newPasswordHash: string
): Promise<ApiResponse<ResetPasswordResponseData>> {
  return request<ResetPasswordResponseData>('POST', '/api/v1/auth/reset-password', {
    body: { email, code, new_password_hash: newPasswordHash },
  });
}

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
