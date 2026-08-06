/**
 * The paperwork a supplier cannot be onboarded without.
 *
 * All four, confirmed with the user on 2026-08-05. Stricter than the retailer
 * rule (NID and trade licence only), because a supplier is paid money by the
 * platform and these certificates are what a payout is reconciled against.
 *
 * # Why this is its own file
 *
 * Three things need it and they must not disagree:
 *
 *   - `DocumentsSection` renders one slot per entry, each marked required;
 *   - `useWholesalerAssets` derives which are still missing;
 *   - `wholesalerSchema` refuses a create that lacks any of them.
 *
 * They were three separate literals waiting to happen. The way that failure
 * presents is a slot the screen shows as optional and the server refuses, which
 * reads as the server being broken rather than as a list nobody updated.
 *
 * `key` is the UI slot and `purpose` is what the storage layer calls it — only
 * `tradeLicense`/`trade` actually differ, and the entry exists for the others so
 * the mapping is one place to look rather than three implicit matches and one
 * exception.
 *
 * The LOGO is deliberately absent. It is a picture on the profile, not a
 * document with a verification state, and it stays optional.
 */
export const REQUIRED_DOC_SLOTS = [
  { key: 'tradeLicense', purpose: 'trade', label: 'Trade License' },
  { key: 'tin', purpose: 'tin', label: 'TIN Certificate' },
  { key: 'vat', purpose: 'vat', label: 'VAT Registration' },
  { key: 'nid', purpose: 'nid', label: 'Owner NID Photo' },
] as const;

/** The labels, as stored on a document row and shown in a refusal. */
export const REQUIRED_DOCUMENT_NAMES: readonly string[] = REQUIRED_DOC_SLOTS.map((s) => s.label);

/** Slot key → the purpose string the server accepts. */
export const DOC_PURPOSE_BY_KEY: Record<string, string> = Object.fromEntries(
  REQUIRED_DOC_SLOTS.map((s) => [s.key, s.purpose]),
);
