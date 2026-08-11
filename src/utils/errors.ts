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
      /*
       * The server counts down; this used to throw the count away.
       *
       * `attemptsRemainingMessage` in internal/auth/service.go sends "Incorrect
       * code. 2 attempts remaining." — and it is a function precisely so that
       * the last one reads "1 attempt remaining", a singular that reached
       * production wrong once. Replacing all of that with one fixed sentence
       * meant the operator never learned they were one guess from losing the
       * code, on the screen where that warning is the only thing that would
       * have saved them.
       *
       * The fallback is for the other INVALID_CODE site — the unbound-nonce
       * branch sends "Invalid verification code." with no count — and for a
       * server that sends nothing at all.
       */
      return serverMessageOr(msg, 'The verification code you entered is incorrect. Please check and try again.');
    case 'EXPIRED_CODE':
      /*
       * This said "A new one has been sent." NOTHING SENDS ONE.
       *
       * The user sat waiting for an email that was never coming, on the screen
       * where they are already worried about being locked out. It is the same
       * failure as F-40 one state over: an instruction that cannot be followed.
       *
       * The server's own sentence is correct and actionable — see
       * `expiredOrLockedMessage` in internal/auth/service.go, which names BOTH
       * remedies (request another, and the hour after the first request) and is
       * written to be true of all four states this code covers: never issued,
       * already used, expired, and locked out a moment ago. So it is passed
       * through rather than restated here.
       *
       * The fallback mirrors it for a server that sends no message, and its one
       * hard requirement is the one the old string broke: it must never claim a
       * code was sent. Pinned by a named test.
       */
      return serverMessageOr(
        msg,
        'This code is no longer valid. Request a new one. If you have run out, more become ' +
          'available an hour after your first request, or contact the admin team.',
      );
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
    case 'TOO_MANY_REQUESTS':
      /*
       * Had no case, so it fell through to `fallbackMessage`. The wording that
       * reached the screen was accidentally fine — it was the server's — but
       * nothing could BRANCH on it, so a spent send budget was one more
       * undifferentiated failure on a screen full of them.
       *
       * The fallback names no interval, and that is the whole care here. The
       * backend raises this from three places with three different waits:
       * service.go:270 (hourly send budget), :979 (max resends) and :982 (a
       * 60-second cooldown). A fallback borrowing the "an hour after your first
       * request" wording would be plainly FALSE for the cooldown — telling
       * someone to wait an hour when the answer is one minute. The interval
       * reaches the screen only when the server itself supplied it.
       */
      return serverMessageOr(msg, 'Too many requests. Please wait before trying again.');
    case 'OTP_STORE_UNAVAILABLE':
      /*
       * A 503. This is OURS, and it is retryable.
       *
       * Also had no case. It looked identical to a wrong code, so the operator
       * did the reasonable thing and pressed Resend — spending one of three
       * PAID SMS an hour on an outage that was not their fault. verifyOTP in
       * service.go is explicit that a store it cannot reach is a 503 and never
       * "your code is wrong", and it charges no attempt: the code in their hand
       * is still good and still has its full guess budget.
       *
       * So the copy must not blame the code, and `errorKind` below reports it as
       * `service` so the screen can stop offering to spend an SMS on it.
       */
      return serverMessageOr(msg, 'Verification is temporarily unavailable. Please try again in a moment.');
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
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Prefer the sentence the server sent; keep a client one only as a floor.
 *
 * This is the actual fix, and the three bugs above were three symptoms of not
 * having it. A mapped `case` that returns a hardcoded string is a claim that
 * this file knows the situation better than the service that produced it — and
 * it does not. The countdown, the singular at one attempt, whether the wait is
 * an hour or a minute, whether a code was sent: all of that lives in
 * internal/auth/service.go and none of it can be reconstructed from a code
 * alone. Guessing produced "A new one has been sent."
 *
 * The server's text still goes through `fallbackMessage`, so the Postgres-text
 * guard applies here exactly as it does to an unmapped code — a mapped code is
 * not a reason to trust a message that mentions a constraint name. When that
 * guard rejects the text, or there was none, the caller's own sentence is used
 * rather than the generic: on these screens "Something went wrong" is barely
 * better than silence.
 */
function serverMessageOr(msg: string, fallback: string): string {
  const cleaned = fallbackMessage(msg);
  return cleaned === GENERIC_MESSAGE ? fallback : cleaned;
}

/**
 * Whether a failure is ours, a limit, or something the caller can act on.
 *
 * `friendlyError` answers "what do I show"; this answers "what KIND of thing
 * happened", which is the question the OTP screen could not previously ask.
 * Every failure looked the same there, so a 503 on our side and a mistyped
 * digit produced the same red banner and the same advice.
 *
 * `user` is the default and deliberately does NOT mean "the user's fault" — it
 * means we have no evidence it is ours, so we make no claim either way.
 */
export type ErrorKind = 'service' | 'limit' | 'user';

/** Ours. Retryable, and never to be reported as bad input. */
const SERVICE_CODES = new Set(['OTP_STORE_UNAVAILABLE', 'INTERNAL_ERROR']);

/** A budget or a cooldown. Not a network fault, and not a wrong code. */
const LIMIT_CODES = new Set(['TOO_MANY_REQUESTS', 'RATE_LIMITED']);

export function errorKind(response: { ok: boolean; data: unknown }): ErrorKind {
  const code = errorCode(response);
  if (code === null) return 'user';
  if (SERVICE_CODES.has(code)) return 'service';
  if (LIMIT_CODES.has(code)) return 'limit';
  return 'user';
}

function fallbackMessage(msg: string): string {
  const generic = GENERIC_MESSAGE;
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