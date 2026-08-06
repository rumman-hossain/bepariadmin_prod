import { describe, it, expect } from 'vitest';
import { friendlyError, errorCode } from '../errors';

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
