import { describe, it, expect } from 'vitest';
import { friendlyError, errorCode, errorKind } from '../errors';

/**
 * Guards against backend internals reaching the screen.
 *
 * The default branch used to return the backend's `message` verbatim. The Go
 * handlers call `sendError(..., err.Error())`, so raw Postgres text reached the
 * login banner — and from there, any screenshot or support ticket.
 */

function fail(data: unknown) {
  return friendlyError({ ok: false, data });
}

const GENERIC = 'Something went wrong. Please try again.';

describe('friendlyError', () => {
  it('maps known codes to human copy', () => {
    expect(fail({ error: { code: 'INVALID_CREDENTIALS' } })).toMatch(/incorrect/i);
    // NOT "email/phone". Staff sign in with an email — `users.staff` has no
    // phone column — and the form is labelled Email. The old copy offered a
    // method that does not exist for this audience, which sends a user who
    // mistyped their address to try something that cannot work.
    expect(fail({ error: { code: 'INVALID_CREDENTIALS' } })).not.toMatch(/phone/i);
    expect(fail({ error: { code: 'ACCOUNT_SUSPENDED' } })).toMatch(/suspended/i);
    expect(fail({ error: { code: 'RATE_LIMITED' } })).toMatch(/too many/i);
  });

  it('prefers the mapped code even when a raw message is present', () => {
    const result = fail({
      error: { code: 'INVALID_CREDENTIALS', message: 'pq: relation "users.staff" does not exist' },
    });
    expect(result).toMatch(/incorrect/i);
    expect(result).not.toMatch(/pq:/);
  });

  it.each([
    'pq: duplicate key value violates unique constraint "wholesalers_email_key"',
    'ERROR: column p.wholesaler_id does not exist (SQLSTATE 42703)',
    'failed to scan row: sql: no rows in result set',
    'context deadline exceeded',
    'runtime error: invalid memory address or nil pointer dereference',
    'insert into users.wholesalers failed',
  ])('replaces internal-looking text: %s', (msg) => {
    expect(fail({ error: { message: msg } })).toBe(GENERIC);
  });

  it('replaces an implausibly long message rather than dumping it on screen', () => {
    expect(fail({ error: { message: 'x'.repeat(400) } })).toBe(GENERIC);
  });

  it('still shows a genuine, human backend message', () => {
    expect(fail({ error: { message: 'This wholesaler has already been approved.' } })).toBe(
      'This wholesaler has already been approved.',
    );
    expect(fail({ message: 'Your session has ended.' })).toBe('Your session has ended.');
  });

  it('returns empty for a successful response', () => {
    expect(friendlyError({ ok: true, data: {} })).toBe('');
  });

  it('falls back when there is no message at all', () => {
    expect(fail({})).toBe(GENERIC);
    expect(fail(null)).toBe(GENERIC);
  });
});

/**
 * The OTP screens, where the console used to talk over the backend.
 *
 * Every sentence the server sends about a one-time code is written in
 * internal/auth/service.go to be followable — the attempts countdown, the
 * singular at one attempt, the hour that only applies to the send budget, the
 * refusal to call an outage a wrong code. Restating any of it here means
 * guessing at facts this file does not have, and each `case` below is a place
 * that guessed wrong once.
 */
describe('friendlyError — one-time codes say what the server said', () => {
  // Verbatim from internal/auth/service.go, so a change to the backend's
  // wording shows up here as a fixture that no longer matches reality.
  const EXPIRED_OR_LOCKED =
    'This code is no longer valid. Request a new one — if you have run out, more become ' +
    'available an hour after your first request, or contact the Bepari-BD admin team.';

  /*
   * THE REGRESSION TEST. Named so the failure output says what broke.
   *
   * The old copy was "This verification code has expired. A new one has been
   * sent." Nothing sends one. The user waited for an email that was never
   * coming, on the screen where they are already afraid of being locked out.
   */
  it('EXPIRED_CODE never claims a new code was sent', () => {
    const claimsASend = /has been sent|new one has been sent|we (have )?sent|sent you|on its way/i;

    // With the server's sentence...
    expect(fail({ error: { code: 'EXPIRED_CODE', message: EXPIRED_OR_LOCKED } })).not.toMatch(
      claimsASend,
    );
    // ...and without one, where the client's own fallback is all there is.
    expect(fail({ error: { code: 'EXPIRED_CODE' } })).not.toMatch(claimsASend);

    // Not merely silent about it: still tells them what to actually do.
    expect(fail({ error: { code: 'EXPIRED_CODE' } })).toMatch(/request a new one/i);
  });

  it('EXPIRED_CODE passes the backend sentence through untouched', () => {
    expect(fail({ error: { code: 'EXPIRED_CODE', message: EXPIRED_OR_LOCKED } })).toBe(
      EXPIRED_OR_LOCKED,
    );
  });

  it('EXPIRED_CODE falls back to copy that names both remedies', () => {
    const result = fail({ error: { code: 'EXPIRED_CODE' } });
    expect(result).toMatch(/request a new one/i);
    // The hour is the second remedy, and it belongs to the SEND budget — which
    // is the state the fallback is describing, so naming it here is true.
    expect(result).toMatch(/hour/i);
  });

  /*
   * `attemptsRemainingMessage` exists on the server so that the last guess reads
   * "1 attempt remaining" — a singular that reached production wrong once. The
   * console replaced the whole sentence with a fixed string, so the operator
   * never saw the count at all.
   */
  it.each([
    'Incorrect code. 2 attempts remaining.',
    'Incorrect code. 1 attempt remaining.',
    'Invalid verification code.',
  ])('INVALID_CODE keeps the server sentence: %s', (message) => {
    expect(fail({ error: { code: 'INVALID_CODE', message } })).toBe(message);
  });

  it('INVALID_CODE keeps the countdown the operator needs to see', () => {
    const result = fail({
      error: { code: 'INVALID_CODE', message: 'Incorrect code. 1 attempt remaining.' },
    });
    expect(result).toMatch(/1 attempt remaining/);
    // Singular, not "1 attempts" — the bug the backend function was written for.
    expect(result).not.toMatch(/1 attempts/);
  });

  it('INVALID_CODE falls back to client copy rather than leaking internals', () => {
    // A mapped code is not a reason to trust the message attached to it.
    const result = fail({
      error: { code: 'INVALID_CODE', message: 'pq: relation "users.staff" does not exist' },
    });
    expect(result).not.toMatch(/pq:/);
    expect(result).toMatch(/incorrect/i);
  });

  it('OTP_STORE_UNAVAILABLE never blames the code', () => {
    const server = 'Verification is temporarily unavailable. Please try again.';
    expect(fail({ error: { code: 'OTP_STORE_UNAVAILABLE', message: server } })).toBe(server);

    // The fallback carries the same promise: this is a 503, and service.go is
    // explicit that a store it cannot reach is never reported as a wrong code.
    const fallback = fail({ error: { code: 'OTP_STORE_UNAVAILABLE' } });
    expect(fallback).not.toMatch(/incorrect|invalid|wrong/i);
    expect(fallback).toMatch(/try again/i);
  });

  /*
   * The backend raises TOO_MANY_REQUESTS from three places with three different
   * waits: the hourly send budget (service.go:270), max resends (:979) and a
   * 60-second cooldown (:982). A fallback that borrowed the hourly wording
   * would be FALSE for the cooldown — an hour's wait for a one-minute problem.
   */
  it('TOO_MANY_REQUESTS keeps the cooldown sentence verbatim', () => {
    const cooldown = 'Please wait 1 minute before requesting another code.';
    expect(fail({ error: { code: 'TOO_MANY_REQUESTS', message: cooldown } })).toBe(cooldown);
  });

  it('TOO_MANY_REQUESTS falls back without naming an interval it cannot know', () => {
    const result = fail({ error: { code: 'TOO_MANY_REQUESTS' } });
    // No "an hour": that is true of the send budget and false of the cooldown,
    // and this one string has to serve all three sites.
    expect(result).not.toMatch(/hour/i);
    // And it reads as a limit, not as a dropped connection.
    expect(result).not.toMatch(/connection|network|reach/i);
    expect(result).toMatch(/too many|wait/i);
  });

  it('OTP_LOCKED still speaks in the app’s own voice about a remedy that works', () => {
    // Unchanged by this work and deliberately so: the guess budget belongs to
    // the code now, so "send a new code" is followable. See F-40.
    const result = fail({ error: { code: 'OTP_LOCKED' } });
    expect(result).toMatch(/too many incorrect attempts/i);
    expect(result).toMatch(/new code/i);
  });
});

/**
 * `errorKind` is what lets a screen react to a failure instead of only printing
 * it. Without it the OTP step showed one undifferentiated banner, so a 503 on
 * our side and a mistyped digit offered the same remedy — resend, which spends
 * one of three paid SMS an hour.
 */
describe('errorKind', () => {
  const of = (code?: string) => errorKind({ ok: false, data: code ? { error: { code } } : {} });

  it('calls a store outage ours, not theirs', () => {
    expect(of('OTP_STORE_UNAVAILABLE')).toBe('service');
    expect(of('INTERNAL_ERROR')).toBe('service');
  });

  it('separates a budget or cooldown from both of the above', () => {
    expect(of('TOO_MANY_REQUESTS')).toBe('limit');
    expect(of('RATE_LIMITED')).toBe('limit');
  });

  it('makes no claim about anything it does not recognise', () => {
    expect(of('INVALID_CODE')).toBe('user');
    expect(of('EXPIRED_CODE')).toBe('user');
    expect(of('SOMETHING_NEW')).toBe('user');
    expect(of()).toBe('user');
  });

  it('survives a junk body and a success without throwing', () => {
    for (const data of [null, undefined, 'boom', 42, []]) {
      expect(() => errorKind({ ok: false, data })).not.toThrow();
      expect(errorKind({ ok: false, data })).toBe('user');
    }
    expect(errorKind({ ok: true, data: { error: { code: 'OTP_STORE_UNAVAILABLE' } } })).toBe('user');
  });
});

/**
 * `errorCode` is how callers branch on a specific failure rather than showing a
 * banner — the change-password form uses it to put "that is not your current
 * password" on the field, and AuthContext uses it to decide whether to move to
 * the OTP step. A wrong answer here misroutes the whole flow.
 */
describe('errorCode', () => {
  const of = (data: unknown) => errorCode({ ok: false, data });

  it('extracts the code from the standard envelope', () => {
    expect(of({ error: { code: 'INVALID_PASSWORD' } })).toBe('INVALID_PASSWORD');
  });

  it('returns null on success, even when a code is present', () => {
    // A 2xx carrying an `error` object is a backend quirk, not a failure.
    expect(errorCode({ ok: true, data: { error: { code: 'X' } } })).toBeNull();
  });

  it('returns null when the failure carries no code', () => {
    expect(of({ error: { message: 'something' } })).toBeNull();
    expect(of({ message: 'something' })).toBeNull();
    expect(of({})).toBeNull();
  });

  it('survives a non-object body without throwing', () => {
    for (const data of [null, undefined, 'boom', 42, []]) {
      expect(() => of(data)).not.toThrow();
      expect(of(data)).toBeNull();
    }
  });
});
