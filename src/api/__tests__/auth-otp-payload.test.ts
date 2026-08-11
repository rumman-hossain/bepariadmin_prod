import { describe, it, expect, vi, beforeEach } from 'vitest';
import vectors from 'nextgen-password/vectors.json';

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
      code: VECTOR.code,
      otp_hash: VECTOR.hash,
      otp_nonce: VECTOR.nonce,
      otp_mac: VECTOR.mac,
    });
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
      email: 'karim@bepari-bd.com',
      code: VECTOR.code,
      otp_hash: VECTOR.hash,
      otp_nonce: VECTOR.nonce,
      otp_mac: VECTOR.mac,
    });
    expect(resetBody).toEqual({
      email: 'karim@bepari-bd.com',
      code: VECTOR.code,
      otp_hash: VECTOR.hash,
      otp_nonce: VECTOR.nonce,
      otp_mac: VECTOR.mac,
      new_password_hash: 'pbkdf2v3:deadbeef',
    });
  });

  it('still sends the password hash when the reset runs unbound', async () => {
    // The shape the console actually produces today, because forgot-password
    // returns no nonce. Unbound, but a complete and valid reset.
    const { apiResetPassword } = await import('../auth');

    await apiResetPassword('karim@bepari-bd.com', VECTOR.code, 'pbkdf2v3:deadbeef');

    expect(sentBody()).toEqual({
      email: 'karim@bepari-bd.com',
      code: VECTOR.code,
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
    expect(sentBody()).toEqual({ email: 'karim@bepari-bd.com' });
  });

  it('resend carries no proof — there is no code to prove yet', async () => {
    const { apiResendLoginOtp } = await import('../auth');
    await apiResendLoginOtp('karim@bepari-bd.com', 'staff');

    expect(sentPath()).toBe('/api/v1/auth/login/resend-otp');
    expect(sentBody()).toEqual({ identifier: 'karim@bepari-bd.com', user_type: 'staff' });
  });
});
