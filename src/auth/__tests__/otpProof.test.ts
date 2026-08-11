import { describe, it, expect } from 'vitest';
import vectors from 'nextgen-password/vectors.json';
import { otpFields, readOtpNonce } from '../otpProof';

/**
 * What the console puts on the wire for a one-time code, and where it gets the
 * nonce that binds it.
 *
 * The golden vectors are imported from the canonical package rather than
 * restated here, exactly as `canonical-hash-conformance.test.ts` does for
 * passwords: they are the same bytes the Go server derives and the mobile app
 * sends, so a divergence in the digest or the binding fails here instead of
 * failing as "incorrect code" for every operator at once.
 */

interface OtpVector {
  note: string;
  code: string;
  nonce: string;
  hash: string;
  mac: string;
}

const otpV1 = (vectors as { otpV1: OtpVector[] }).otpV1;

describe('otpFields — the proof, against canonical vectors', () => {
  it('ships otpV1 golden vectors', () => {
    expect(otpV1.length).toBeGreaterThan(0);
  });

  it.each(otpV1)('binds the digest to the nonce for: $note', async ({ code, nonce, hash, mac }) => {
    expect(await otpFields(code, nonce)).toEqual({
      code,
      otp_hash: hash,
      otp_nonce: nonce,
      otp_mac: mac,
    });
  });

  /*
   * The digest is keyed by a fixed domain salt and the mac by the nonce — one
   * code therefore has one digest forever and a DIFFERENT mac per issuance.
   * Were the two ever wired the other way round, every vector above would still
   * be 64 plausible hex characters and nothing would match server-side.
   */
  it('changes the mac but not the digest when the code is re-issued', async () => {
    const first = await otpFields('481902', 'nonce-one');
    const second = await otpFields('481902', 'nonce-two');

    expect(second.otp_hash).toBe(first.otp_hash);
    expect(second.otp_mac).not.toBe(first.otp_mac);
  });

  /*
   * A code is six characters, not a number. `004217` and `4217` are different
   * codes, and the moment one round-trips through a number the digest changes
   * and a correct entry is rejected — for roughly one code in ten.
   */
  it('keeps leading zeros significant', async () => {
    const padded = await otpFields('004217', 'n');
    const bare = await otpFields('4217', 'n');
    expect(padded.otp_hash).not.toBe(bare.otp_hash);
  });
});

describe('otpFields — with no nonce to bind to', () => {
  /*
   * The server has no middle setting: a proof carrying a mac MUST match the
   * nonce in its stored record, while one carrying none is accepted as long as
   * OTP_REQUIRE_BINDING is false. So a fabricated mac is strictly worse than no
   * mac — it spends an attempt and reports as a wrong code.
   */
  it.each([undefined, null, ''])('omits the mac entirely rather than inventing one (%p)', async (nonce) => {
    const fields = await otpFields('481902', nonce);

    expect(fields.otp_mac).toBeUndefined();
    expect(fields.otp_nonce).toBeUndefined();
    expect(Object.keys(fields).sort()).toEqual(['code', 'otp_hash']);
  });

  it('still sends the digest, which is the half that does not need a nonce', async () => {
    const { otp_hash } = await otpFields(otpV1[0].code, undefined);
    expect(otp_hash).toBe(otpV1[0].hash);
  });
});

describe('otpFields — the raw code stays', () => {
  /*
   * `code` carries validate:"required" on VerifyLoginRequest,
   * VerifyResetOtpRequest and ResetPasswordRequest. Dropping it fails validation
   * with a 422 before the proof is ever examined, so this is not a redundant
   * field to be tidied away — it comes out when the backend stops requiring it.
   */
  it('sends the digits alongside the digest, bound or not', async () => {
    expect((await otpFields('481902', 'n')).code).toBe('481902');
    expect((await otpFields('481902')).code).toBe('481902');
  });
});

describe('readOtpNonce — both nestings the backend actually uses', () => {
  /* /auth/login returns it as a field of LoginResponse, so it lands in `data`. */
  it('reads it from inside data, as the login response nests it', () => {
    expect(readOtpNonce({ data: { requiresOTP: true, otpNonce: 'n-login' } })).toBe('n-login');
  });

  /* /auth/login/resend-otp has a plain string for `data` and hangs it beside. */
  it('reads it from the envelope, as the resend response nests it', () => {
    expect(readOtpNonce({ data: 'verification code resent', otpNonce: 'n-resend' })).toBe(
      'n-resend',
    );
  });

  it('returns undefined, never an empty string, when there is none', () => {
    // The distinction is load-bearing: otpFields branches on truthiness, and
    // prepareOtp throws on an empty nonce rather than returning an unbound
    // proof. An '' leaking through would be an exception on the login path.
    expect(readOtpNonce({ data: { requiresOTP: true } })).toBeUndefined();
    expect(readOtpNonce({ data: { otpNonce: '' } })).toBeUndefined();
    expect(readOtpNonce({ otpNonce: '' })).toBeUndefined();
  });

  it('survives bodies that are not objects at all', () => {
    // safeParseResponse hands back a bare string for a non-JSON response, and
    // this runs on the error path of every OTP request.
    for (const body of [null, undefined, 'Bad Gateway', 42, []]) {
      expect(readOtpNonce(body)).toBeUndefined();
    }
  });

  it('ignores a non-string nonce rather than binding to it', () => {
    expect(readOtpNonce({ otpNonce: 12345 })).toBeUndefined();
    expect(readOtpNonce({ data: { otpNonce: { value: 'x' } } })).toBeUndefined();
  });
});
