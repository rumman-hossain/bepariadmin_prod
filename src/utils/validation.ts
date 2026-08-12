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

/**
 * An 11-digit Bangladeshi mobile number, matching the server's own rule.
 *
 * Kept byte-compatible with `BangladeshiMobileRegex` in
 * beparibd-backend/pkg/validator: `01`, then an operator digit 3-9, then eight
 * more. A looser rule here would accept numbers the server then rejects, and the
 * user would read that as the site being broken rather than the number being
 * wrong.
 */
function isValidBDMobile(value: string): boolean {
  return /^01[3-9]\d{8}$/.test(value.replace(/[^0-9]/g, ''));
}

/**
 * An identifier is an email address OR a mobile number, and both are real.
 *
 * This pair was deleted once, with a note saying "staff sign in with an email,
 * and the identifier field stopped offering phone to staff". That premise no
 * longer holds: the server matches `phone_hash = $1 OR email = $2` in all three
 * account tables and sends the one-time code to whichever channel the identifier
 * names, so a number is a first-class way in — for staff too.
 *
 * WHY VALIDATE AT ALL, rather than let the server decide. A blank field and an
 * obvious typo are worth catching before a round trip. What this must NOT do is
 * be stricter than the server: `validateEmail` was doing exactly that here, and
 * a mobile number came back as "Please enter a valid email address" — an error
 * that names the wrong thing and offers no way forward.
 */
export function validateIdentifier(value: string): { valid: boolean; message: string } {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, message: 'Email or mobile number is required' };
  if (isValidEmail(trimmed) || isValidBDMobile(trimmed)) return { valid: true, message: '' };
  return {
    valid: false,
    message: 'Enter a valid email address or 11-digit mobile number',
  };
}

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

/*
 * `validateEmail` WAS HERE AND IS DELETED ON PURPOSE.
 *
 * It rejected anything without an `@`, which is correct for an address and wrong
 * for an identifier. It was called on both reset screens, and it is why a mobile
 * number came back as "Please enter a valid email address" — a refusal naming
 * the wrong field, for a credential the server would have accepted.
 *
 * Nothing calls it now. It is removed rather than left exported because the two
 * names sit next to each other in one file and differ by one word: the next
 * person adding an identifier field would reach for the wrong one, which is
 * exactly what happened here — three separate times, on three screens.
 *
 * Use `validateIdentifier`. If you genuinely need to check an ADDRESS and not an
 * identifier — a contact field, say — `isValidEmail` above is still here.
 */

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