import { z } from 'zod';
import { ASSESSMENT_CODES } from '../constants/assessment';

/**
 * The retailer contract, written from the SERVER.
 *
 * Source: `beparibd-backend/internal/admin/model.go` — `type RetailerProfile
 * struct` — copied field by field from the Go JSON tags, including which of
 * them carry `omitempty`.
 *
 * The `omitempty` tags are why the optional fields below are optional. That is
 * not a guess: a Go field tagged `omitempty` is **absent** from the payload when
 * empty, not present-and-null, so `.optional()` is correct and `.nullable()`
 * would be wrong. Guessing this the other way is how a screen ends up rendering
 * "undefined" in a table cell.
 */

/**
 * A bank account and a mobile wallet, mirroring the Go `BankDetail` and
 * `MobileWallet` — one shape serving both wholesalers and retailers.
 *
 * Both lists are REPEATABLE and `isDefault` marks the destination to use when
 * nothing else says otherwise.
 */
export const bankDetailSchema = z.object({
  id: z.string().optional(),
  bankName: z.string(),
  accountName: z.string(),
  accountNumber: z.string(),
  branch: z.string().optional(),
  routing: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const mobileWalletSchema = z.object({
  id: z.string().optional(),
  walletType: z.string(),
  accountNumber: z.string(),
  isDefault: z.boolean().default(false),
});

/**
 * A shop's address, as the server returns it.
 *
 * This schema DID NOT EXIST, and its absence was a live defect. `RetailerProfile`
 * has carried `addresses` since migration 090 and `GetRetailer` populates it —
 * but nothing here parsed the field, so `retailer.addresses` was not on the
 * type and the edit screen could not prefill what was already on file. An
 * operator opening Edit saw an empty Addresses section for a shop that had one,
 * and adding a row there would REPLACE the stored set (the PUT is wholesale),
 * silently deleting the address they never saw.
 *
 * It matters more now that `district` is derived from these rather than typed:
 * an edit that could not see the addresses would derive an empty district and
 * file the shop under nothing.
 */
export const retailerAddressSchema = z.object({
  id: z.string().optional(),
  addressType: z.string().default('primary'),
  division: z.string().optional(),
  district: z.string(),
  postalCode: z.string().optional(),
  addressLine: z.string(),
  isDefault: z.boolean().default(false),
});

export type BankDetail = z.infer<typeof bankDetailSchema>;
export type MobileWallet = z.infer<typeof mobileWalletSchema>;
export type RetailerAddressRow = z.infer<typeof retailerAddressSchema>;

export const retailerDocumentSchema = z.object({
  id: z.string(),
  docType: z.string(),
  docName: z.string().optional(),
  /**
   * Whether a file exists — a boolean, not an address.
   *
   * The object path never leaves the server: sending it would hand out the one
   * thing the private bucket protects. Opening a document is a separate request
   * that mints a short-lived signed URL after checking who is asking.
   */
  hasFile: z.boolean().default(false),
  status: z.string().optional(),
  verifiedByName: z.string().optional(),
  verifiedAt: z.string().optional(),
});

export const retailerSchema = z.object({
  id: z.string(),
  name: z.string(),
  shopName: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  district: z.string().optional(),
  category: z.string().optional(),
  creditScore: z.number(),
  /*
   * Total value of DELIVERED orders.
   *
   * `.catch(0)` rather than required: the detail endpoint does not compute it,
   * and a shop with no orders is genuinely zero. Absent, null and 0 all mean
   * "has not bought anything yet" — the same tolerance the collections needed
   * after `.default([])` rejected a null and took the whole list down.
   */
  gmv: z.number().nullish().transform((v) => v ?? 0).catch(0),
  referralCode: z.string().optional(),
  status: z.string(),
  createdAt: z.string(),

  /**
   * Who created this account: `SELF` when the shop signed itself up, `ADMIN`
   * when an operator did. `createdByName` is the staff member's name, joined
   * server-side — "Admin" alone does not answer the question an operator is
   * actually asking, which is *which* admin.
   *
   * Both optional: every row that predates migration 090 has neither, and a
   * screen that requires them would refuse to render the existing retailer base.
   */
  createdBy: z.enum(['SELF', 'ADMIN']).optional(),
  createdByName: z.string().optional(),

  /**
   * The shop assessment. Every field optional — most retailers have never been
   * visited, and that is a state, not missing data.
   */
  locationRanking: z.string().optional(),
  estimatedMonthlySale: z.string().optional(),
  yearsInBusiness: z.number().int().optional(),
  shopType: z.string().optional(),
  shopDecorType: z.string().optional(),
  shopPhotoUrl: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  /**
   * Who made the assessment, and when.
   *
   * An assessment without these is an opinion wearing the clothes of a fact. Six
   * months on, "Shop type: Small" with no name and no date cannot be told apart
   * from a guess. The detail screen refuses to show the assessment as current
   * without them.
   */
  assessedByName: z.string().optional(),
  assessedAt: z.string().optional(),

  /*
   * Payment destinations and paperwork.
   *
   * `.nullish().transform(v => v ?? [])`, NOT `.default([])`. Zod's `.default()`
   * fires only on `undefined`; a `null` is rejected outright with "expected
   * array, received null". Go marshals a nil slice to `null`, and
   * `RetailerProfile` is shared by the list and detail endpoints — the list
   * never populates these three, so every row arrived carrying three nulls and
   * one rejected row failed the entire response. The screen said "The retailer
   * directory did not respond" while the API was returning 200.
   *
   * `platform/httpx.emptyListsNotNull` exists to prevent exactly this, but it
   * descends into `map[string]any` and top-level slices only — never into
   * struct fields inside a slice of structs, which is where these live.
   *
   * So: absent, null and [] all mean the same thing here — nothing on file —
   * and all three parse to `[]`. The backend also gained `omitempty`, but this
   * tolerance is what makes that a formatting choice rather than a deploy that
   * can take the screen down.
   */
  bankDetails: z.array(bankDetailSchema).nullish().transform((v) => v ?? []),
  mobileWallets: z.array(mobileWalletSchema).nullish().transform((v) => v ?? []),
  // Same nullish tolerance as the two above, and for the same reason: the LIST
  // endpoint shares this shape and never populates addresses, so every row
  // arrives with a null here.
  addresses: z.array(retailerAddressSchema).nullish().transform((v) => v ?? []),
  documents: z.array(retailerDocumentSchema).nullish().transform((v) => v ?? []),
});

export type Retailer = z.infer<typeof retailerSchema>;

/**
 * `{ data, meta }` — the envelope `internal/admin/handler.go:64` actually
 * writes. `meta` is required here rather than optional, because a list screen
 * that silently loses its total renders paging controls that lie.
 */
/**
 * How many shops sit in each state.
 *
 * `.catch()` on the object, not just the fields: the server logs and continues
 * when the count query fails, serving the list without them. The directory is
 * the point — a missing convenience must not take the screen down, which is the
 * same reasoning that put the fallback on the server.
 */
export const retailerStatusCountsSchema = z
  .object({
    active: z.number().default(0),
    pending: z.number().default(0),
    suspended: z.number().default(0),
    rejected: z.number().default(0),
  })
  .catch({ active: 0, pending: 0, suspended: 0, rejected: 0 });

export type RetailerStatusCounts = z.infer<typeof retailerStatusCountsSchema>;

export const retailerListSchema = z.object({
  data: z.array(retailerSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    // Optional so an older server, or one whose count query failed, still
    // parses. The strip renders nothing rather than the screen erroring.
    statusCounts: retailerStatusCountsSchema.optional(),
  }),
});

export const retailerDetailSchema = z.object({ data: retailerSchema });

/**
 * What `POST /auth/admin/create-retailer` actually returns — and it is NOT a
 * retailer profile.
 *
 * That endpoint lives in `internal/auth` and returns a `SessionUser`, the same
 * shape the register flow returns: id, name, role, status, userType. It has no
 * `creditScore` and no `createdAt`, both of which `retailerSchema` requires.
 *
 * Parsing the create response with `retailerDetailSchema` therefore THREW on a
 * successful 201: the retailer was created, the screen said "The retailer could
 * not be created" and stayed put, and pressing Create again hit "that phone
 * number is already registered". Measured:
 *
 *   data.creditScore -> expected number, received undefined
 *   data.createdAt   -> expected string, received undefined
 *
 * The fix is to describe the response honestly rather than to pad the Go struct
 * with fields it has no business carrying. `id` is the only thing the caller
 * needs — it navigates to the detail screen, which fetches the real profile.
 * Trusting a create response for display data would be the wrong instinct
 * anyway: it is a different shape from a different package.
 */
export const retailerCreatedSchema = z.object({
  data: z.object({
    // Required, and the only thing that is. Without an id there is nowhere to
    // navigate, and silently landing on a blank detail page would be worse than
    // failing here.
    id: z.string().min(1),
  }),
});

/**
 * The shop assessment, as submitted.
 *
 * Codes, never display labels — see constants/assessment.ts for why. The enums
 * are built from ASSESSMENT_CODES so this schema and the dropdown cannot drift:
 * adding an option in one place without the other stops compiling.
 *
 * `''` is accepted alongside each code because an unselected `<select>` submits
 * an empty string, and the alternative is every optional field failing
 * validation the moment somebody opens the section and does not fill it in.
 */
const optionalCode = (codes: readonly string[]) =>
  z.union([z.enum(codes as [string, ...string[]]), z.literal('')]).optional();

export const assessmentSchema = z.object({
  locationRanking: optionalCode(ASSESSMENT_CODES.locationRanking),
  estimatedMonthlySale: optionalCode(ASSESSMENT_CODES.estimatedMonthlySale),
  shopType: optionalCode(ASSESSMENT_CODES.shopType),
  shopDecorType: optionalCode(ASSESSMENT_CODES.shopDecorType),
  yearsInBusiness: z
    .number()
    .int('Whole years only')
    .min(0, 'Cannot be negative')
    // A shop trading since before the country existed is a typo, not a shop.
    .max(200, 'That is longer than any shop has traded')
    .optional(),
  /** Captured from the device, so bounded by what a coordinate can be. */
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type Assessment = z.infer<typeof assessmentSchema>;

/**
 * What PATCH accepts.
 *
 * Contact and classification, plus the assessment. Still no `status` — suspend
 * and activate are their own routes, because a lifecycle change hidden inside a
 * general-purpose PATCH is a lifecycle change nobody can audit.
 */
export const retailerUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Owner name is required'),
  shopName: z.string().trim().min(1, 'Shop name is required'),
  phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, 'Enter an 11-digit Bangladeshi mobile number, e.g. 01712345678'),
  email: z.string().trim().email('Enter a valid email address').or(z.literal('')),
  /*
   * Optional, and typed as such.
   *
   * These were bare `z.string().trim()` — a REQUIRED string with no message, so
   * an empty district produced Zod's own "Invalid input: expected string" in
   * front of an operator. The server treats both as optional
   * (`district` and `category` are nullable on the row), so the schema now says
   * what the server means.
   */
  district: z.string().trim().optional(),
  category: z.string().trim().optional(),
}).merge(assessmentSchema);

export type RetailerUpdate = z.infer<typeof retailerUpdateSchema>;

/**
 * What creating a retailer accepts.
 *
 * The update fields plus a password. `passwordHash` rather than `password`: the
 * browser hashes it before it leaves, the same path the wholesaler create flow
 * uses, so nothing on the server and nothing in a log ever sees what was typed.
 * The 73-character floor is the v3 client-hash envelope length — a plaintext
 * password cannot satisfy it, which is the point.
 */
export const retailerCreateSchema = retailerUpdateSchema.extend({
  passwordHash: z.string().min(73, 'The password was not hashed by the browser'),
});

export type RetailerCreate = z.infer<typeof retailerCreateSchema>;

/**
 * The four KYC documents, and the codes the server stores for them.
 *
 * Same shape as the wholesaler slots (`DocumentsSection.tsx`) so an operator who
 * has verified a supplier recognises this immediately. The codes match
 * `internal/upload/purpose.go` — nid, trade, vat, tin — which is what routes an
 * upload to the PRIVATE bucket rather than the public one. A fifth code added
 * here without adding it there would land a national ID in the bucket that
 * grants allUsers read.
 */
export const RETAILER_DOC_TYPES = [
  { value: 'trade', label: 'Trade licence' },
  { value: 'tin', label: 'TIN certificate' },
  { value: 'vat', label: 'VAT registration' },
  { value: 'nid', label: 'Owner NID' },
] as const;


export type RetailerDocument = z.infer<typeof retailerDocumentSchema>;

/**
 * The path this console opens a document at.
 *
 * # Why this is not `z.string().url()`
 *
 * It was, and that rejected every document the moment the backend stopped
 * handing out Google signed URLs. `/api/v1/doc/<token>` is a path, not a URL, so
 * Zod refused it and the screen said "Could not open that document" — blaming
 * the file for a validation rule about its address.
 *
 * # Why the prefix is pinned rather than relaxed to `z.string()`
 *
 * The entire point of the proxy is that a storage address never reaches the
 * browser. Accepting any string would let a future change quietly return
 * `https://storage.googleapis.com/beparibd-private-…?X-Goog-Signature=…` again
 * and nothing here would notice. Pinning the prefix makes this schema the thing
 * that notices: the value must be a path on our own origin, under the one route
 * that streams documents.
 */
const DOCUMENT_PATH_PREFIX = '/api/v1/doc/';

export const documentUrlSchema = z.object({
  data: z.object({
    url: z
      .string()
      .refine((value) => value.startsWith(DOCUMENT_PATH_PREFIX) && value.length > DOCUMENT_PATH_PREFIX.length, {
        message: `Expected a document path beginning ${DOCUMENT_PATH_PREFIX}`,
      }),
    expiresAt: z.string(),
  }),
});
