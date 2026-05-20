/**
 * Maps backend error codes to user-friendly messages.
 *
 * These codes come from the backend's standardized error format:
 *   { error: { code: string, message: string } }
 *
 * This is the SAME error mapping as the mobile client
 * (wholesaleapp-client/src/services/api/endpoints/auth.ts).
 */

export interface ApiError {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

export function friendlyError(response: { ok: boolean; data: unknown }): string {
  if (response.ok) return '';

  const err = response.data as ApiError;
  const code = err?.error?.code;
  const msg = err?.error?.message || err?.message || '';

  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'The email/phone or password you entered is incorrect.';
    case 'INVALID_CODE':
      return 'The verification code you entered is incorrect. Please check and try again.';
    case 'EXPIRED_CODE':
      return 'This verification code has expired. A new one has been sent.';
    case 'USER_NOT_FOUND':
      return 'No account found with this email.';
    case 'ALREADY_REGISTERED':
      return 'This email is already registered. Please login instead.';
    case 'PHONE_CONFLICT':
      return 'This phone number is already linked to an active account.';
    case 'INVALID_PHONE':
      return 'Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).';
    case 'CONFLICT':
      return 'An account with this email or phone already exists.';
    case 'UNAUTHORIZED':
      return 'Please login again to continue.';
    case 'FORBIDDEN':
      return 'You do not have permission to perform this action.';
    case 'NOT_FOUND':
      return 'The requested resource was not found.';
    case 'VALIDATION_FAILED':
      return 'Please check your information and try again.';
    case 'BAD_REQUEST':
      return 'Invalid request. Please check your input.';
    case 'INTERNAL_ERROR':
      return 'Something went wrong on our end. Please try again shortly.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'PAYMENT_REQUIRED':
      return 'Payment is required to proceed.';
    case 'PAYMENT_FAILED':
      return 'Payment was unsuccessful. Please try again.';
    case 'INVENTORY_INSUFFICIENT':
      return 'This item is currently out of stock.';
    case 'ORDER_DUPLICATE':
      return 'This order has already been placed.';
    case 'INVALID_TOKEN':
      return 'The reset link is invalid or has expired. Please request a new one.';
    case 'ACCOUNT_SUSPENDED':
      return 'Your account has been suspended. Please contact support.';
    default:
      return msg || 'Something went wrong. Please try again.';
  }
}

/** Extracts the error code from a response, or null if no error */
export function errorCode(response: { ok: boolean; data: unknown }): string | null {
  if (response.ok) return null;
  const err = response.data as ApiError;
  return err?.error?.code || null;
}