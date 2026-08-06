import { z } from 'zod';
import { validatePassword } from '@/src/auth/passwordHasher';
import { REQUIRED_DOCUMENT_NAMES } from '../constants/documents';

/**
 * Wholesaler Address schema
 */
export const addressItemSchema = z.object({
  id: z.string().optional(),
  addressType: z.enum(['primary', 'warehouse', 'return', 'billing']).default('primary'),
  division: z.string().optional(),
  district: z.string().min(1, 'District is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  addressLine: z.string().min(1, 'Full address is required'),
  isDefault: z.boolean().default(false),
});

/**
 * Wholesaler Bank Detail schema
 */
export const bankItemSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(1, 'Bank name is required'),
  accountName: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  branch: z.string().optional().or(z.literal('')),
  routing: z.string().optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
});

/**
 * Wholesaler Mobile Wallet schema
 */
export const walletItemSchema = z.object({
  id: z.string().optional(),
  walletType: z.enum(['bkash', 'nagad', 'rocket', 'upay']).default('bkash'),
  accountNumber: z
    .string()
    .min(1, 'Account number is required')
    .regex(/^01[3-9]\d{8}$/, 'Invalid Bangladeshi mobile number'),
  isDefault: z.boolean().default(false),
});

/**
 * Wholesaler Document schema
 */
export const documentSchema = z.object({
  id: z.string().optional(),
  /**
   * The stable identifier — `trade`, `tin`, `vat`, `nid`.
   *
   * A slot is matched to a stored document by THIS, never by the label. The
   * server calls one "Trade licence" and the form calls it "Trade License"; a
   * capital L was enough that nothing ever matched, and a supplier with all
   * four certificates saw four empty slots.
   */
  docType: z.string().optional(),
  name: z.string().min(1),
  date: z.string().optional(),
  status: z.string().default('Pending'),
  /**
   * Set by the UPLOAD hook when a file lands in this session. Absent for
   * documents loaded from the server, which no longer send a path at all.
   */
  fileUrl: z.string().optional(),
  /**
   * Set by the SERVER for a document already on file.
   *
   * Two fields rather than one because they answer different questions: one is
   * "this browser just uploaded something", the other is "the account already
   * has one". `documentOnFile` below is the only thing that should ask.
   */
  hasFile: z.boolean().optional(),
});

/**
 * Whether a slot is satisfied — by an upload in this session, or by a document
 * already on the account.
 *
 * One predicate, because checking only `fileUrl` made every EDIT screen report
 * all four certificates missing the moment the server stopped sending paths.
 */
export function documentOnFile(d: { fileUrl?: string; hasFile?: boolean }): boolean {
  return Boolean(d.fileUrl) || d.hasFile === true;
}

export const wholesalerSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().min(2, 'Company name is required (min 2 chars)'),
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  status: z.enum(['Active', 'Review', 'Suspended', 'Rejected']).default('Active'),
  riskScore: z.number().min(0).max(100).optional(),
  createdAt: z.string().optional(),

  // Owner & Contact
  ownerName: z.string().min(2, 'Owner name is required (min 2 chars)'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^01[3-9]\d{8}$/, 'Invalid Bangladeshi mobile number'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  logoUrl: z.string().optional().or(z.literal('')),
  commissionRate: z.number().min(0, 'Commission cannot be negative').optional().default(9.5),

  // Array Structures (Aligned with Backend)
  addresses: z.array(addressItemSchema).min(1, 'At least one address is required'),
  bankDetailsList: z.array(bankItemSchema).default([]),
  digitalWallets: z.array(walletItemSchema).default([]),
  documents: z.array(documentSchema).optional().default([]),

  // Login credentials (for onboarding only)
  password: z.string().optional(),

  /**
   * The upload draft holding the logo and the four certificates.
   *
   * Part of the form's data because it is part of what the form produces: the
   * create call sends it, and the server claims the draft in the same
   * transaction that inserts the supplier, then validates the required
   * documents against the files IN it.
   *
   * Before this the draft id lived only inside the upload hook, so it never
   * left the browser — the server received a list of `{docType, fileUrl}` the
   * page had composed and stored it verbatim, with no way to tell an uploaded
   * file from an invented path.
   */
  uploadDraftId: z.string().optional(),
}).superRefine((data, ctx) => {
  // Onboarding (no id) requires a password meeting the CANONICAL policy.
  //
  // This used to be a local `data.password.length >= 8` check — a third,
  // weaker copy of the rules alongside src/utils/validation.ts and the shared
  // package. An admin could therefore onboard a wholesaler with a password the
  // mobile app would refuse at its own login screen. The message now comes from
  // the package too, so the wholesaler is told the same thing wherever they read it.
  if (data.id) return;

  const result = validatePassword(data.password ?? '');
  if (!result.valid) {
    ctx.addIssue({
      code: 'custom',
      message: result.message || 'Password is required for onboarding',
      path: ['password'],
    });
  }

  /*
   * All four certificates, at onboarding only.
   *
   * The server refuses a create without them — it reads the upload draft and
   * names every missing one. Checking here as well means the operator is told
   * before the round trip, and told about all of them at once rather than one
   * per attempt.
   *
   * `id` returns above, so an EDIT is never held to this: a supplier already on
   * file may predate the rule, and blocking a correction to their address
   * because a VAT certificate is missing would make the record unfixable.
   */
  const onFile = new Set(
    (data.documents ?? []).filter(documentOnFile).map((d) => d.name),
  );
  const missing = REQUIRED_DOCUMENT_NAMES.filter((name) => !onFile.has(name));
  if (missing.length > 0) {
    ctx.addIssue({
      code: 'custom',
      message: `Upload the ${missing.join(', ')} before onboarding this supplier.`,
      path: ['documents'],
    });
  }
});

/**
 * Transient, UI-only stable key for React list rendering of add/remove-able
 * sub-records. It is NOT part of the zod schema (API contract) and never reaches
 * the API payload — the create/update mappers in `wholesalerApi.ts` pick fields
 * explicitly, so `_key` is dropped. Keeping it out of the zod schema also prevents
 * a client-generated value from being misread by the backend as an existing id.
 */
type WithClientKey<T> = T & { _key?: string };

export type WholesalerAddressItem = WithClientKey<z.infer<typeof addressItemSchema>>;
export type WholesalerBankItem = WithClientKey<z.infer<typeof bankItemSchema>>;
export type WholesalerWalletItem = WithClientKey<z.infer<typeof walletItemSchema>>;

/**
 * The shape the FORM edits — deliberately `z.input`, not `z.infer`.
 *
 * `z.infer` gives the parsed OUTPUT type, where `.default()` has already been
 * applied, so `commissionRate` reads as a required `number`. But the form lets
 * an operator clear that field, and clearing it sets `undefined`. Typing the
 * form against the output made `setField('commissionRate', undefined)` a type
 * error while the UI did exactly that on every clear — the mismatch was hidden
 * only because `strict` was off.
 *
 * Input is the correct model: defaults are applied when the form is parsed on
 * submit, not while it is being edited.
 */
export type WholesalerFormData = Omit<
  z.input<typeof wholesalerSchema>,
  'addresses' | 'bankDetailsList' | 'digitalWallets'
> & {
  addresses: WholesalerAddressItem[];
  bankDetailsList: WholesalerBankItem[];
  digitalWallets: WholesalerWalletItem[];
};