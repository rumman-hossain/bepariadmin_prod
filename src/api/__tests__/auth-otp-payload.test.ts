import { describe, it, expect, vi, beforeEach } from 'vitest';
import vectors from 'nextgen-password/vectors.json';
import { otpRequestFields } from 'nextgen-password';

/**
 * What each OTP endpoint actually puts in its request body.
 *
 * These assert the WIRE, not the helper: the field names here are the Go struct
 * tags from beparibd-backend/internal/auth/model.go — `otp_hash`, `otp_nonce`,
 * `otp_mac` — and a rename on either side is silent otherwise. A body with the
 * wrong spelling deserializes into a zero-value field, the proof falls back to
 * whatever `code` holds, and everything keeps working right up until
 * OTP_REQUIRE_BINDING is turned on.
 */

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ request: requestMock }));

const VECTOR = (vectors as { otpV1: Array<{ code: string; nonce: string; hash: string; mac: string }> })
  .otpV1[0];

/** The body the mocked `request` was last called with. */
function sentBody(): Record<string, unknown> {
  const [, , options] = requestMock.mock.calls.at(-1)!;
  return (options as { body: Record<string, unknown> }).body;
}

function sentPath(): string {
  return requestMock.mock.calls.at(-1)![1] as string;
}

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockResolvedValue({ ok: true, status: 200, data: {} });
});

describe('verify-login sends a bound proof', () => {
  it('carries the digest, the nonce and the mac under the backend field names', async () => {
    const { apiVerifyLoginOtp } = await import('../auth');

    await apiVerifyLoginOtp({
      identifier: 'karim@bepari-bd.com',
      code: VECTOR.code,
      user_type: 'staff',
      otpNonce: VECTOR.nonce,
    });

    expect(sentPath()).toBe('/api/v1/auth/verify-login');
    expect(sentBody()).toEqual({
      identifier: 'karim@bepari-bd.com',
      user_type: 'staff',
      otp_hash: VECTOR.hash,
      otp_nonce: VECTOR.nonce,
      otp_mac: VECTOR.mac,
    });
  });

  /*
   * THE DIGITS DO NOT LEAVE THIS APP.
   *
   * Asserted on its own rather than left implicit in the toEqual above, because
   * the two fail differently. A toEqual that gains a `code` key reads as "the
   * payload changed"; this reads as what it is. The console sends `sendRawCode:
   * false` (see OTP_WIRE in ../auth), and the value of that is entirely in the
   * absence — a digest sitting next to the digits it hashes protects nobody.
   *
   * Note this requires a backend that accepts a body with no `code`. Before
   * 6348d8f every one of these was a 422.
   */
  it('sends no raw code at all', async () => {
    const { apiVerifyLoginOtp } = await import('../auth');

    await apiVerifyLoginOtp({
      identifier: 'karim@bepari-bd.com',
      code: VECTOR.code,
      user_type: 'staff',
      otpNonce: VECTOR.nonce,
    });

    expect(sentBody()).not.toHaveProperty('code');
  });

  it('never leaks otpNonce as a body field of its own', async () => {
    const { apiVerifyLoginOtp } = await import('../auth');

    await apiVerifyLoginOtp({
      identifier: 'karim@bepari-bd.com',
      code: VECTOR.code,
      user_type: 'staff',
      otpNonce: VECTOR.nonce,
    });

    // It is a client-side carrier, not a wire field. Spreading the payload
    // wholesale — which is what this function used to do — would send the
    // camelCase name too, and the server would ignore it while it sat in logs.
    expect(sentBody()).not.toHaveProperty('otpNonce');
  });

  it('sends an unbound digest when no nonce is in hand', async () => {
    const { apiVerifyLoginOtp } = await import('../auth');

    await apiVerifyLoginOtp({
      identifier: 'karim@bepari-bd.com',
      code: VECTOR.code,
      user_type: 'staff',
    });

    const body = sentBody();
    expect(body.otp_hash).toBe(VECTOR.hash);
    expect(body).not.toHaveProperty('otp_mac');
    expect(body).not.toHaveProperty('code');
  });
});

describe('the reset pair sends ONE issuance across TWO requests', () => {
  /*
   * verify-reset-otp is a pre-check and does not consume the code;
   * reset-password then spends it. Both therefore verify against the same
   * stored record, so both must present the same nonce. This is the assertion
   * that fails if anybody gives the two steps separate nonce state.
   */
  it('presents the same nonce to the pre-check and to the reset', async () => {
    const { apiVerifyResetOtp, apiResetPassword } = await import('../auth');

    await apiVerifyResetOtp('karim@bepari-bd.com', VECTOR.code, VECTOR.nonce);
    const verifyBody = sentBody();
    expect(sentPath()).toBe('/api/v1/auth/verify-reset-otp');

    await apiResetPassword(
      'karim@bepari-bd.com',
      VECTOR.code,
      'pbkdf2v3:deadbeef',
      VECTOR.nonce,
    );
    const resetBody = sentBody();
    expect(sentPath()).toBe('/api/v1/auth/reset-password');

    expect(verifyBody).toEqual({
      identifier: 'karim@bepari-bd.com',
      otp_hash: VECTOR.hash,
      otp_nonce: VECTOR.nonce,
      otp_mac: VECTOR.mac,
    });
    expect(resetBody).toEqual({
      identifier: 'karim@bepari-bd.com',
      otp_hash: VECTOR.hash,
      otp_nonce: VECTOR.nonce,
      otp_mac: VECTOR.mac,
      new_password_hash: 'pbkdf2v3:deadbeef',
    });
  });

  it('still sends the password hash when the reset runs unbound', async () => {
    // The shape produced when nothing carried a nonce this far — an old
    // `?email=` link, or a direct visit to /reset-password. Unbound, but a
    // complete and valid reset.
    const { apiResetPassword } = await import('../auth');

    await apiResetPassword('karim@bepari-bd.com', VECTOR.code, 'pbkdf2v3:deadbeef');

    expect(sentBody()).toEqual({
      identifier: 'karim@bepari-bd.com',
      otp_hash: VECTOR.hash,
      new_password_hash: 'pbkdf2v3:deadbeef',
    });
  });
});

describe('the endpoints that issue codes rather than verify them', () => {
  it('forgot-password sends only the address', async () => {
    const { apiForgotPassword } = await import('../auth');
    await apiForgotPassword('karim@bepari-bd.com');

    expect(sentPath()).toBe('/api/v1/auth/forgot-password');
    expect(sentBody()).toEqual({ identifier: 'karim@bepari-bd.com' });
  });

  it('resend carries no proof — there is no code to prove yet', async () => {
    const { apiResendLoginOtp } = await import('../auth');
    await apiResendLoginOtp('karim@bepari-bd.com', 'staff');

    expect(sentPath()).toBe('/api/v1/auth/login/resend-otp');
    expect(sentBody()).toEqual({ identifier: 'karim@bepari-bd.com', user_type: 'staff' });
  });
});

/**
 * The OTP fields are the PACKAGE'S output verbatim, not the console's rendering
 * of the same idea.
 *
 * The tests above pin the wire against golden vectors, which is the right check
 * for "does the server accept this". It is not the check that catches somebody
 * writing the fields out by hand again — a local `{ code, otp_hash: await
 * hashOtp(code), ... }` reproducing today's bytes passes every one of them, and
 * then drifts the first time the contract moves. That is exactly how this logic
 * ended up living in three apps at once, with the copies disagreeing about
 * whether to trim the code before hashing — which changes the digest, so one
 * app's correct entry is another app's "incorrect code".
 *
 * So these compare SERIALISED forms. Key order and key set are part of the
 * comparison, not just the values: reintroducing a local `otp_mac: ''` on the
 * unbound path, or reordering the fields around a hand-written spread, shows up
 * here even when every individual value still matches.
 */
describe('the console emits otpRequestFields byte for byte', () => {
  /*
   * `code` stays in this list even though the console no longer sends it, and
   * that is the point: sentOtpJson picks these keys OUT OF THE BODY, so leaving
   * it here makes a reintroduced `code` show up in the comparison instead of
   * being quietly filtered away. Removing it from the list would turn this
   * suite blind to the exact regression it now exists to catch.
   */
  const OTP_KEYS = ['code', 'otp_hash', 'otp_nonce', 'otp_mac'];

  /**
   * The OTP half of the last body, in the order it was written into the object.
   *
   * Insertion order survives because every call site spreads the package's
   * result in one go; a hand-built payload almost never reproduces it.
   */
  function sentOtpJson(): string {
    const body = sentBody();
    const picked: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (OTP_KEYS.includes(key)) picked[key] = body[key];
    }
    return JSON.stringify(picked);
  }

  /*
   * The option must match what ../auth passes (OTP_WIRE). If the console's flag
   * and this one ever disagree the suite goes green while the wire is wrong,
   * which is the failure this whole describe block was written to prevent.
   */
  async function expectedJson(code: string, nonce?: string): Promise<string> {
    return JSON.stringify(await otpRequestFields(code, nonce, { sendRawCode: false }));
  }

  it('matches on verify-login, bound', async () => {
    const { apiVerifyLoginOtp } = await import('../auth');
    await apiVerifyLoginOtp({
      identifier: 'karim@bepari-bd.com',
      code: VECTOR.code,
      user_type: 'staff',
      otpNonce: VECTOR.nonce,
    });

    expect(sentOtpJson()).toBe(await expectedJson(VECTOR.code, VECTOR.nonce));
  });

  it('matches on verify-reset-otp, bound', async () => {
    const { apiVerifyResetOtp } = await import('../auth');
    await apiVerifyResetOtp('karim@bepari-bd.com', VECTOR.code, VECTOR.nonce);

    expect(sentOtpJson()).toBe(await expectedJson(VECTOR.code, VECTOR.nonce));
  });

  it('matches on reset-password, bound', async () => {
    const { apiResetPassword } = await import('../auth');
    await apiResetPassword('karim@bepari-bd.com', VECTOR.code, 'pbkdf2v3:deadbeef', VECTOR.nonce);

    expect(sentOtpJson()).toBe(await expectedJson(VECTOR.code, VECTOR.nonce));
  });

  /*
   * The unbound path is the one worth guarding hardest. Its correct output is
   * defined by what it does NOT contain, and an absent key is the single easiest
   * thing for a reimplementation to get wrong — `otp_mac: ''` looks tidier and
   * costs the user one of three attempts, reported as a wrong code.
   */
  it('matches on verify-login with no nonce, omitting both binding fields', async () => {
    const { apiVerifyLoginOtp } = await import('../auth');
    await apiVerifyLoginOtp({
      identifier: 'karim@bepari-bd.com',
      code: VECTOR.code,
      user_type: 'staff',
    });

    expect(sentOtpJson()).toBe(await expectedJson(VECTOR.code, undefined));
    expect(Object.keys(JSON.parse(sentOtpJson()))).toEqual(['otp_hash']);
  });

  it('matches on reset-password with no nonce, omitting both binding fields', async () => {
    const { apiResetPassword } = await import('../auth');
    await apiResetPassword('karim@bepari-bd.com', VECTOR.code, 'pbkdf2v3:deadbeef');

    expect(sentOtpJson()).toBe(await expectedJson(VECTOR.code, undefined));
    expect(Object.keys(JSON.parse(sentOtpJson()))).toEqual(['otp_hash']);
  });

  it('matches on verify-reset-otp with no nonce, omitting both binding fields', async () => {
    const { apiVerifyResetOtp } = await import('../auth');
    await apiVerifyResetOtp('karim@bepari-bd.com', VECTOR.code);

    expect(sentOtpJson()).toBe(await expectedJson(VECTOR.code, undefined));
    expect(Object.keys(JSON.parse(sentOtpJson()))).toEqual(['otp_hash']);
  });
});
