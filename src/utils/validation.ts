/**
 * Shared validation functions.
 *
 * These match the validation logic in the mobile app's LoginScreen
 * and RegisterScreen components.
 */

/** Checks if a string looks like a valid email address */
export function isValidEmail(value: string): boolean {
  return value.includes('@') && value.includes('.');
}

/**
 * Checks if a string is a valid Bangladeshi mobile number.
 * Format: 11 digits starting with 01 (e.g., 01712345678).
 * Mobile operators: 013, 014, 015, 016, 017, 018, 019
 */
export function isValidBDPhone(value: string): boolean {
  return /^01[3-9]\d{8}$/.test(value);
}

/** Checks if a string is a valid identifier (email OR BD phone) */
export function isValidIdentifier(value: string): boolean {
  return isValidEmail(value) || isValidBDPhone(value);
}

/** Password must be at least 8 characters */
export function isValidPassword(value: string): boolean {
  return value.length >= 8;
}

/** Password validation result with message */
export function validatePassword(value: string): { valid: boolean; message: string } {
  if (!value) return { valid: false, message: 'Password is required' };
  if (value.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
  return { valid: true, message: '' };
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

/** Login identifier validation result */
export function validateIdentifier(value: string): { valid: boolean; message: string } {
  if (!value.trim()) return { valid: false, message: 'Enter email or mobile number' };
  if (!isValidIdentifier(value)) return { valid: false, message: 'Enter a valid email or mobile number' };
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