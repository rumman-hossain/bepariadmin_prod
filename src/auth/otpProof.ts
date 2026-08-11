/**
 * One-time codes on the wire: the digest, and the nonce it is bound to.
 *
 * Two halves of one job, kept together because getting either one right without
 * the other is worthless:
 *
 *   - {@link otpFields} turns the digits the operator typed into what the
 *     backend's `otp_hash` / `otp_nonce` / `otp_mac` fields want;
 *   - {@link readOtpNonce} pulls the nonce back off the response that issued
 *     the code, which is the ONLY place it is ever available.
 *
 * # Why the nonce is the point
 *
 * Hashing six digits on its own buys nothing: the digest is credential-equivalent,
 * so anyone who can read it can replay it exactly as they could have replayed the
 * digits. The nonce is what changes the result. The server mints it WITH the code
 * and stores the two one-to-one, so somebody who reads the SMS or the email still
 * cannot verify — they do not hold the nonce, and they cannot go and ask for one,
 * because asking issues a NEW code to the account's own address and supersedes
 * theirs.
 *
 * That also means a nonce goes stale the instant a new code is issued. The
 * backend checks the mac against the nonce in ITS stored record and never against
 * the one we echo (see pkg/otp/store.go `bound`), so binding to a superseded
 * nonce does not fail loudly — it spends one of three attempts and comes back
 * looking exactly like a wrong code. Every caller here therefore overwrites its
 * nonce from the response of whatever re-issued the code.
 *
 * # Why the mac is conditional
 *
 * `bound()` on the server has no middle setting: a proof carrying a mac MUST
 * match the nonce in the stored record, while a proof carrying none is accepted
 * as long as `OTP_REQUIRE_BINDING` is false. So a wrong mac is not merely
 * useless, it is HARMFUL — it returns ErrNotBound, which SPENDS one of three
 * attempts and reaches the user as a wrong code. Three and their code is gone.
 * Where no nonce is available we therefore send the digest unbound rather than
 * binding to a placeholder: the same posture as the raw digits this replaces.
 *
 * THE RESET FLOW IS THAT CASE TODAY, and not by oversight on our side. The
 * backend mints a reset nonce and then discards it:
 *
 *   - `internal/auth/service.go` — ForgotPassword calls
 *     `code, _, reused, err := s.resolveResetCode(...)`, dropping the nonce that
 *     `resolveResetCode` returns into `_`;
 *   - `internal/auth/handler.go` — the ForgotPassword handler answers a
 *     hardcoded message with no nonce field. `otpNonce` appears exactly once in
 *     that file, in LoginResendOtp.
 *
 * There is a real reason it is awkward to fix: forgot-password answers 200 with
 * the same body whether or not the account exists, and a nonce present only for
 * real addresses would turn it into the enumeration oracle it refuses to be.
 *
 * `readOtpNonce` still runs on its response and the value is threaded end to
 * end, so the day the backend has somewhere safe to put one, this binds with no
 * further change here.
 */
import { hashOtp, prepareOtp } from 'nextgen-password';

/**
 * The OTP half of a request body, spelled the way the Go structs spell it —
 * see `VerifyLoginRequest`, `VerifyResetOtpRequest` and `ResetPasswordRequest`
 * in beparibd-backend/internal/auth/model.go.
 */
export interface OtpFields {
  /**
   * The raw digits, still sent.
   *
   * Not redundant and not an oversight: `code` carries `validate:"required"` on
   * every one of those structs, so omitting it fails validation before the proof
   * is ever looked at. The backend prefers `otp_hash` when both are present
   * (`otpProof`), so this is the field that keeps a pre-2.1.0 server working,
   * not the one being verified. It comes out the day the backend stops
   * accepting it.
   */
  code: string;
  otp_hash: string;
  otp_nonce?: string;
  otp_mac?: string;
}

/**
 * Build the proof for a code, binding it to its issuance when we have one.
 *
 * Throws `CryptoUnavailableError` / `HashTimeoutError` from the shared package,
 * the same pair `hashPassword` throws — so call sites can keep using
 * `hashErrorMessage(err)` and must not report these as network failures.
 */
export async function otpFields(code: string, nonce?: string | null): Promise<OtpFields> {
  if (nonce) {
    const { hash, mac } = await prepareOtp(code, nonce);
    return { code, otp_hash: hash, otp_nonce: nonce, otp_mac: mac };
  }
  // No mac, deliberately — see the note on conditional binding above. Note also
  // that `prepareOtp(code, '')` throws rather than returning an unbound proof,
  // so this branch cannot be folded into the one above.
  return { code, otp_hash: await hashOtp(code) };
}

/**
 * Read the issuance nonce out of a response body.
 *
 * Checks both nestings because the backend genuinely uses both, and neither is
 * wrong: `/auth/login` returns it as a field of `LoginResponse`, so it lands
 * inside `data`, while `/auth/login/resend-otp` has a plain string for `data`
 * and hangs `otpNonce` off the envelope beside it. Accepting either means the
 * reset flow keeps working whichever shape a nonce eventually arrives in.
 *
 * Returns `undefined` — never `''` — so callers can pass the result straight to
 * {@link otpFields}, whose binding branch tests for truthiness.
 */
export function readOtpNonce(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;

  const envelope = body as { otpNonce?: unknown; data?: unknown };

  if (typeof envelope.otpNonce === 'string' && envelope.otpNonce !== '') {
    return envelope.otpNonce;
  }

  const inner = envelope.data;
  if (typeof inner === 'object' && inner !== null) {
    const nonce = (inner as { otpNonce?: unknown }).otpNonce;
    if (typeof nonce === 'string' && nonce !== '') return nonce;
  }

  return undefined;
}
