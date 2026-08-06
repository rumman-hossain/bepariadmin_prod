/**
 * Admin client-side password hashing.
 *
 * This module is intentionally a THIN RE-EXPORT of the ONE canonical hasher in
 * `nextgen-password` (PBKDF2-HMAC-SHA256, "pbkdf2v3:" prefix, IDENTIFIER-INDEPENDENT
 * salt = fixed DOMAIN_SALT). Keeping the algorithm in a single shared package
 * means the admin app can never silently drift from the mobile client,
 * super-admin-setup page, or backend verification.
 *
 * The golden-vector conformance test in `__tests__/canonical-hash-conformance.test.ts`
 * locks this to the canonical package's shipped `vectors.json`, so any divergence
 * fails the build.
 *
 * IMPORTANT: The plaintext password NEVER leaves the browser — only the
 * "pbkdf2v3:<64 hex>" hash is transmitted.
 *   - `hashPassword(password)` — v3, identifier-independent. Use for admin-create,
 *     reset, admin-set, and change-password writes.
 *   - `hashForLogin(password, identifier)` — LOGIN; send its `primary` field as
 *     password_hash. Fresh deployment (no v2 users) so no legacy hash is sent.
 *   - `hashPasswordV2(password, identifier)` — LEGACY, retained only for the
 *     conformance test / server-side migration reference.
 */
import { CryptoUnavailableError, HashTimeoutError } from 'nextgen-password';

export {
  hashPassword,
  hashForLogin,
  hashPasswordV2,
  normalizeIdentifier,
  CryptoUnavailableError,
  HashTimeoutError,
  /**
   * The canonical password policy: required, >= 8 chars, >= 1 uppercase,
   * >= 1 digit.
   *
   * Re-exported here because the admin app used to carry its own copy in
   * `src/utils/validation.ts` that enforced only the first two rules, and a
   * third, length-only copy in the wholesaler Zod schema. The effect was that
   * an admin could set a wholesaler password — say all-lowercase, no digits —
   * that the mobile app would then refuse at its own registration screen. This
   * is exactly the drift the shared package's own docstring says it exists to
   * prevent, so the package is now the only definition in the app.
   */
  validatePassword,

  /**
   * Strength estimation and generation, also from the shared package.
   *
   * They live there rather than here for the same reason the policy does: the
   * mobile app shows a strength meter on its own registration screen, and two
   * implementations would eventually disagree about the same password. The
   * package stays framework-free — the React components that render these are
   * in `src/components/auth/`.
   */
  scorePassword,
  generatePassword,
} from 'nextgen-password';

export type {
  PasswordValidation,
  PasswordStrength,
  StrengthLevel,
  GeneratePasswordOptions,
} from 'nextgen-password';

/**
 * Maps a password-hashing failure to a clear, user-facing message.
 *
 * Returns `null` for anything that is NOT a hashing-capability error, so callers
 * can fall back to their existing (network/API) error handling:
 *   `setError(hashErrorMessage(err) ?? <existing fallback>)`.
 *
 * - CryptoUnavailableError: the device fundamentally lacks SubtleCrypto — hashing
 *   fails closed, so tell the user to update rather than retry.
 * - HashTimeoutError: the derive was too slow on this device — retrying is fine.
 */
export function hashErrorMessage(err: unknown): string | null {
  if (err instanceof CryptoUnavailableError) {
    return 'This browser can’t securely process your password. Please update your browser or device and try again.';
  }
  if (err instanceof HashTimeoutError) {
    return 'Processing your password took too long on this device. Please try again.';
  }
  return null;
}
