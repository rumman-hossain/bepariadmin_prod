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
      // "email", not "email/phone". This is the ADMIN console: the form is
      // labelled Email, its validation says "Enter your email address", and
      // `users.staff` has no phone column at all — staff cannot sign in with
      // one. Offering it here sends somebody who mistyped their address off to
      // try a phone number that was never going to work.
      //
      // F-7 removed phone from the identifier FIELD and left it in this string.
      // Found by signing in wrongly in a real browser; no test noticed, because
      // the assertion was /incorrect/i.
      return 'The email or password you entered is incorrect.';
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
    case 'OTP_LOCKED':
      /*
       * The reset code's guess budget is spent.
       *
       * This had NO case, so it fell through to `fallbackMessage` and the raw
       * server sentence went to the screen — including its old advice to
       * "request a new code", which at the time could not work: the lock was
       * keyed to the account and nothing but a 15-minute timer released it. A
       * user who followed the instruction was refused again for attempts a
       * fresh code had never had. See F-40.
       *
       * The budget now belongs to the code, so a new one really does clear it,
       * and this says so in the app's own voice rather than the database's.
       */
      return 'Too many incorrect attempts with that code. Send a new code to try again.';
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
      /*
       * This is the REFRESH path's code, not the reset link's. `rotateSession`
       * returns INVALID_TOKEN from six places for ordinary session death — a
       * revoked session, an expired one, a token already rotated away — so
       * mapping it to a reset-link message told operators their reset link was
       * bad when they had simply been signed out.
       *
       * The reset screens map their own codes locally, where the context is
       * known. A shared map cannot know which flow a code arrived from.
       */
      return 'Your session has ended. Please sign in again.';
    case 'SESSION_EXPIRED':
      return 'Your session has ended. Please sign in again.';
    case 'ACCOUNT_SUSPENDED':
      return 'Your account has been suspended. Please contact support.';
    default:
      return fallbackMessage(msg);
  }
}

/**
 * Anything that looks like it came from the database or the runtime, rather
 * than from a person, gets replaced.
 *
 * The default branch used to `return msg || '...'`, i.e. prefer whatever the
 * backend sent. The backend emits `sendError(..., err.Error())` in
 * product/handler.go and catalog_handler.go, so raw Postgres text — table
 * names, column names, constraint names — travelled straight into the login
 * banner and into any screenshot or support ticket made of it.
 *
 * The allowlisted `code` cases above are still preferred; this only governs
 * what happens when there is no code to map.
 */
function fallbackMessage(msg: string): string {
  const generic = 'Something went wrong. Please try again.';
  if (!msg) return generic;

  const looksInternal =
    /\b(pq:|pgx|sql|SQLSTATE|constraint|relation|column|duplicate key|violates|goroutine|panic:|nil pointer|context deadline)\b/i.test(
      msg,
    ) ||
    // Schema-qualified identifiers: users.wholesalers, catalog.platform_config
    /\b[a-z_]+\.[a-z_]+\b/.test(msg) ||
    msg.length > 200;

  return looksInternal ? generic : msg;
}

/** Extracts the error code from a response, or null if no error */
export function errorCode(response: { ok: boolean; data: unknown }): string | null {
  if (response.ok) return null;
  const err = response.data as ApiError;
  return err?.error?.code || null;
}