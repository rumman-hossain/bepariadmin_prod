/**
 * Auth API Functions
 *
 * Thin wrappers around the HTTP client for all auth endpoints.
 * These mirror the mobile app's API client functions
 * (wholesaleapp-client/src/services/api/client.ts).
 */

import { request } from './client';
import { clearAccessToken } from '../auth/memoryTokenStore';
/*
 * The OTP wire shape comes from the shared package and is built NOWHERE ELSE in
 * this app.
 *
 * `otpRequestFields` used to be a local `otpFields` in `src/auth/otpProof.ts`,
 * and near-identical copies lived in the wholesale client and the retailer app.
 * The three had already drifted — the field spellings, whether the digits were
 * still sent, and what to do with no nonce were each decided three times from
 * the same Go structs. None of that is console-specific: it is the backend
 * contract, and `nextgen-password` is the one thing already verified against it.
 *
 * The trimming that IS ours stays at the input boundary, not in here — see
 * ResetPasswordForm, which trims before calling. `otpRequestFields` passes the
 * code through byte-for-byte on purpose, so normalising twice cannot produce two
 * digests for one keystroke.
 */
import { otpRequestFields } from 'nextgen-password';

/*
 * NO RAW DIGITS ON THE WIRE, FROM THIS APP.
 *
 * `otpRequestFields` still defaults to sending `code` alongside the digest, and
 * that default is deliberate: the two React Native apps ship through stores, so
 * an install from last month is still posting six digits and the server still
 * has to take them. This console does not have that problem — it reloads.
 *
 * What this does NOT do is make anything safer on its own. The digest is a hash
 * of six digits, so anyone holding it can replay it exactly as they could the
 * digits; the backend says so about itself in pkg/otp/digest.go. The defence is
 * the NONCE binding, and dropping `code` is what makes that binding the only way
 * in from here rather than one of two.
 *
 * The hole stays open until OTP_REQUIRE_BINDING is on server-side — until then
 * an attacker simply posts raw digits and never touches this code path. This is
 * a prerequisite for that flag, not a substitute for it.
 *
 * Requires the backend to accept a body with no `code`, which it does from
 * 6348d8f (`required_without=OtpHash`). Sending this against anything older is
 * a 422 on every login.
 */
const OTP_WIRE = { sendRawCode: false } as const;
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
    body: { ...rest, ...(await otpRequestFields(code, otpNonce, OTP_WIRE)) },
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
 * has to survive both requests.
 *
 * Forgot-password DOES return a nonce now — `otpNonce` inside `data`, on every
 * response including the silent ones — so the normal reset arrives bound. The
 * parameter stays optional for the arrivals that carry nothing: an old
 * `?email=` link, or someone opening `/reset-password` directly. Those send the
 * digest unbound, which the server accepts, rather than binding to a guess.
 */
export async function apiVerifyResetOtp(
  email: string,
  code: string,
  otpNonce?: string
): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>('POST', '/api/v1/auth/verify-reset-otp', {
    body: { email, ...(await otpRequestFields(code, otpNonce, OTP_WIRE)) },
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
    body: { email, ...(await otpRequestFields(code, otpNonce, OTP_WIRE)), new_password_hash: newPasswordHash },
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
