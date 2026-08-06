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

/**
 * The versioned API prefix.
 *
 * Every request path in this app is a bare literal — roughly 45 of them across
 * seven modules, and `/api/v1/auth/refresh` alone appears in three separate
 * files. That makes a version bump a 45-site find-and-replace with no way to
 * tell whether you got them all. Build paths from this instead:
 *
 *   `${API_V1}/auth/refresh`
 *
 * The existing literals are left where they are: rewriting all 45 in the same
 * pass as a large deletion would bury a real mistake in the diff. Use this for
 * new paths, and convert the old ones when you are next in that file anyway.
 */
export const API_V1 = '/api/v1';

/** Default request timeout in milliseconds */
export const REQUEST_TIMEOUT = 15_000;

