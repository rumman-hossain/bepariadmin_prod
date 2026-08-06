/**
 * Shared validation functions.
 *
 * Password rules are NOT defined here — they are re-exported from the canonical
 * `nextgen-password` package via `@/src/auth/passwordHasher`, so the admin app,
 * the mobile app and the backend cannot drift apart on password strength.
 */
import { validatePassword as canonicalValidatePassword } from '@/src/auth/passwordHasher';

/** Checks if a string looks like a valid email address */
function isValidEmail(value: string): boolean {
  return value.includes('@') && value.includes('.');
}

/*
 * There was a `isValidBDPhone` / `isValidIdentifier` pair here, accepting either
 * an email or an 11-digit BD mobile number. Nothing calls them any more: staff
 * sign in with an email, and the identifier field stopped offering phone to
 * staff. Wholesaler phone validation lives with the wholesaler schema.
 */

/**
 * Password rules come from the shared `nextgen-password` package, never from
 * this file.
 *
 * There used to be a local implementation here enforcing only "required" and
 * ">= 8 characters", while the canonical policy also requires an uppercase
 * letter and a digit. Because the admin app writes passwords for wholesalers,
 * that gap let an admin create an account the mobile app would then reject at
 * its own login and registration screens.
 *
 * The re-export is normalised to `message: string` so the ~4 existing call
 * sites, which render `message` directly, keep working unchanged.
 */
export function validatePassword(value: string): { valid: boolean; message: string } {
  const result = canonicalValidatePassword(value);
  return { valid: result.valid, message: result.message ?? '' };
}

/** Boolean form of the canonical policy. */
export function isValidPassword(value: string): boolean {
  return canonicalValidatePassword(value).valid;
}

/** OTP is exactly 6 digits */
export function isValidOtp(value: string): boolean {
  return /^\d{6}$/.test(value);
}

/** Email validation result with message */
export function validateEmail(value: string): { valid: boolean; message: string } {
  if (!value) return { valid: false, message: 'Email is required' };
  if (!isValidEmail(value)) return { valid: false, message: 'Please enter a valid email address' };
  return { valid: true, message: '' };
}

/** Confirm password match validation */
export function validatePasswordMatch(
  password: string,
  confirm: string
): { valid: boolean; message: string } {
  if (password !== confirm) {
    return { valid: false, message: 'Passwords do not match' };
  }
  return { valid: true, message: '' };
}