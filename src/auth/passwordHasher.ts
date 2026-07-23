/**
 * Admin client-side password hashing.
 *
 * This module is intentionally a THIN RE-EXPORT of the ONE canonical hasher in
 * `@bepari/password` (PBKDF2-HMAC-SHA256, 310k iters, 32 bytes, "pbkdf2v2:"
 * prefix, salt = identifier.trim().toLowerCase()). Keeping the algorithm in a
 * single shared package means the admin app can never silently drift from the
 * mobile client, super-admin-setup page, or backend verification.
 *
 * The golden-vector conformance test in `__tests__/canonical-hash-conformance.test.ts`
 * locks this to the canonical package's shipped `vectors.json`, so any divergence
 * fails the build.
 *
 * IMPORTANT: The plaintext password NEVER leaves the browser — only the
 * "pbkdf2v2:<64 hex>" hash is transmitted. `hashPassword(password, identifier)`
 * trims+lowercases the identifier to derive the salt.
 */
export { hashPassword, normalizeIdentifier } from '@bepari/password';
