// ═══════════════════════════════════════════════════════════════
// Application Constants
// ═══════════════════════════════════════════════════════════════

/**
 * Base URL for the BepariBD API.
 * 
 * Empty string = relative paths. With Firebase proxy rewrites,
 * all /api/* and /health requests are forwarded to Cloud Run
 * from the same origin, so no absolute URL is needed.
 */
export const API_BASE_URL = '';

/** PBKDF2 iteration count — must match backend and mobile client */
export const PBKDF2_ITERATIONS = 310_000;

/** PBKDF2 key length in bytes (256-bit) */
export const PBKDF2_KEY_LENGTH = 32;

/** PBKDF2 digest algorithm — matches mobile app */
export const PBKDF2_DIGEST = 'SHA-256';

/** Output prefix for client-side password hash */
export const PBKDF2_PREFIX = 'pbkdf2v2';

/** Access token localStorage key */
export const ACCESS_TOKEN_KEY = 'bepari_access_token';

/** Max request body size in bytes (64 KiB — matches backend) */
export const MAX_BODY_SIZE = 64 * 1024;

/** Default request timeout in milliseconds */
export const REQUEST_TIMEOUT = 15_000;