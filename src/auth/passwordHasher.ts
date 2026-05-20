import { PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST, PBKDF2_PREFIX } from '../utils/constants';

/**
 * Hashes a password using PBKDF2 (SHA-256, 310k iterations) in the browser.
 *
 * This is the EXACT same algorithm as the mobile client (React Native)
 * and the super-admin-setup.html page. The backend expects this format
 * as `password_hash` and will bcrypt it before storage.
 *
 * IMPORTANT: The plaintext password NEVER leaves the browser.
 * Only the PBKDF2 hash (prefixed with "pbkdf2v2:") is transmitted.
 *
 * @param password - The plaintext password (goes out of scope immediately after hashing)
 * @param salt - The unique salt (email address or phone number of the user)
 * @returns PBKDF2 hash string in format "pbkdf2v2:<64 hex chars>"
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_DIGEST,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8 // bits = bytes * 8
  );

  const hex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${PBKDF2_PREFIX}:${hex}`;
}