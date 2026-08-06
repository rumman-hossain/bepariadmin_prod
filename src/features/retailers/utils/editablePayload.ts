/**
 * What an edit is allowed to send.
 *
 * The server binds neither `phone` nor `email` on PATCH — they are the sign-in
 * credentials, and changing one has to rewrite the phone hash and end every
 * session or the shop keeps a live session on a credential that no longer
 * identifies it. The edit screen therefore shows both and offers neither.
 *
 * This exists as a function rather than a destructure inside the submit handler
 * so the property can be TESTED. The previous behaviour — client sends them,
 * server ignores them, response is 200 with a success toast — was invisible
 * precisely because nothing asserted it either way.
 */

/** Fields the retailer PATCH endpoint refuses to bind. */
export const CREDENTIAL_FIELDS = [
  'phone',
  'email',
  // The collections have their OWN endpoints and PATCH does not bind them.
  // Sending them here would be ignored server-side — the silent-drop shape this
  // feature has already produced four times. They are saved by
  // saveRetailerChildren instead.
  'addresses',
  'bankDetailsList',
  'digitalWallets',
] as const;

/**
 * Strips the credential fields from an edit payload.
 *
 * Returns a new object; the input is untouched, because the caller's form state
 * still needs `phone` to render the read-only row and to validate its shape.
 */
export function toEditablePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    // Compared against the shared list, not two inline string literals: adding
    // a third un-bindable field should be one edit here, not a hunt through
    // submit handlers.
    if ((CREDENTIAL_FIELDS as readonly string[]).includes(key)) continue;
    out[key] = value;
  }
  return out;
}
