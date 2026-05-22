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
  RefreshResponseData,
  MeResponseData,
  ForgotPasswordResponseData,
  ResetPasswordResponseData,
} from '../types/api';

// ═══════════════════════════════════════════════════════════════
// Auth Endpoints
// ═══════════════════════════════════════════════════════════════

export function apiHealthCheck(): Promise<ApiResponse<string>> {
  return request<string>('GET', '/health');
}

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

export function apiRefresh(): Promise<ApiResponse<RefreshResponseData>> {
  return request<RefreshResponseData>('POST', '/api/v1/auth/refresh');
}

export function apiLogout(): Promise<ApiResponse<string>> {
  return request<string>('POST', '/api/v1/auth/logout', { auth: true }).finally(() => {
    clearAccessToken();
  });
}

export function apiForgotPassword(
  email: string
): Promise<ApiResponse<ForgotPasswordResponseData>> {
  return request<ForgotPasswordResponseData>('POST', '/api/v1/auth/forgot-password', {
    body: { email },
  });
}

export function apiResetPassword(
  token: string,
  newPasswordHash: string
): Promise<ApiResponse<ResetPasswordResponseData>> {
  return request<ResetPasswordResponseData>('POST', '/api/v1/auth/reset-password', {
    body: { token, new_password_hash: newPasswordHash },
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