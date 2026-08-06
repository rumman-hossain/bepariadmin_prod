import { describe, it, expect } from 'vitest';
import { wholesalerSchema, documentOnFile } from '../schemas/wholesalerSchema';
import { REQUIRED_DOC_SLOTS, REQUIRED_DOCUMENT_NAMES } from '../constants/documents';

/**
 * Onboarding a supplier: the credentials it signs in with, and the paperwork it
 * cannot be onboarded without.
 *
 * The server is the rule — `AdminCreateWholesaler` reads the upload draft and
 * refuses a create missing any of the four. These assert the console agrees, so
 * the operator is told before the round trip and told about all of them at once.
 */

const COMPLETE = {
  companyName: 'Elegant Apparel Ltd',
  ownerName: 'Mohammad Ali',
  mobile: '01712345678',
  email: 'supplier@example.com',
  categories: ['Gents Textile'],
  addresses: [
    {
      addressType: 'primary' as const,
      district: 'Dhaka',
      postalCode: '1205',
      addressLine: 'Shop 12, New Market',
      isDefault: true,
    },
  ],
  bankDetailsList: [],
  digitalWallets: [],
  password: 'Kh@taProxy2026Xy',
  uploadDraftId: 'draft-1',
  documents: REQUIRED_DOCUMENT_NAMES.map((name) => ({
    name,
    status: 'pending',
    fileUrl: `uploads/draft-1/${name}`,
  })),
};

describe('the four certificates', () => {
  it('a complete onboarding passes', () => {
    expect(wholesalerSchema.safeParse(COMPLETE).success).toBe(true);
  });

  it('each one, missing on its own, refuses the onboarding and is named', () => {
    for (const slot of REQUIRED_DOC_SLOTS) {
      const result = wholesalerSchema.safeParse({
        ...COMPLETE,
        documents: COMPLETE.documents.filter((d) => d.name !== slot.label),
      });

      expect(result.success, `${slot.label} was not required`).toBe(false);
      if (result.success) continue;
      const message = result.error.issues.map((i) => i.message).join(' ');
      expect(message, `the refusal does not name ${slot.label}`).toContain(slot.label);
    }
  });

  it('names every missing one at once, not the first', () => {
    /*
     * Reporting one at a time costs a submit to learn each. Being told about the
     * TIN, fixing it, and then being told about the VAT is four attempts to
     * learn four things the form knew on the first press.
     */
    const result = wholesalerSchema.safeParse({ ...COMPLETE, documents: [] });
    expect(result.success).toBe(false);
    if (result.success) return;

    const message = result.error.issues.map((i) => i.message).join(' ');
    for (const name of REQUIRED_DOCUMENT_NAMES) {
      expect(message, `the message does not name ${name}`).toContain(name);
    }
  });

  it('a slot with a filename but no uploaded file does not count', () => {
    // A row is written for a chosen file before its bytes land. Counting it
    // would tell the operator everything is ready over a document that is not
    // there — and the server, which checks the draft, would refuse anyway.
    const result = wholesalerSchema.safeParse({
      ...COMPLETE,
      documents: COMPLETE.documents.map((d) =>
        d.name === 'VAT Registration' ? { ...d, fileUrl: '' } : d,
      ),
    });
    expect(result.success).toBe(false);
  });

  it('does NOT hold an existing supplier to it', () => {
    /*
     * `id` present means an edit. A supplier already on file may predate the
     * rule, and blocking a correction to their address because a VAT
     * certificate is missing makes the record unfixable — the operator cannot
     * add the certificate without saving, and cannot save without it.
     */
    const result = wholesalerSchema.safeParse({
      ...COMPLETE,
      id: 'whl-1',
      password: undefined,
      documents: [],
    });
    expect(result.success, 'an edit was blocked by the onboarding document rule').toBe(true);
  });
});

describe('the login credentials', () => {
  it('both are required, because either one signs the supplier in', () => {
    // The server requires the phone now too: it writes `phone_hash`, which is
    // what the login query matches on. A supplier onboarded without a number
    // could only ever sign in by email.
    for (const field of ['email', 'mobile'] as const) {
      const result = wholesalerSchema.safeParse({ ...COMPLETE, [field]: '' });
      expect(result.success, `${field} was not required`).toBe(false);
    }
  });

  it('the mobile must be a Bangladeshi number, or the hash matches nothing', () => {
    for (const bad of ['12345', '01112345678', '+1 555 0100', 'not a number']) {
      const result = wholesalerSchema.safeParse({ ...COMPLETE, mobile: bad });
      expect(result.success, `${bad} was accepted as a mobile number`).toBe(false);
    }
  });
});

describe('the upload draft', () => {
  it('is part of the form data, so it can be sent', () => {
    // It used to live only inside the upload hook and never left the browser,
    // which is why the server had to trust a document list the page composed.
    const parsed = wholesalerSchema.parse(COMPLETE);
    expect(parsed.uploadDraftId).toBe('draft-1');
  });
});

describe('one list, three readers', () => {
  it('the slots and the names cannot drift apart', () => {
    // The section renders REQUIRED_DOC_SLOTS, the hook derives what is missing
    // from it, and the schema refuses against REQUIRED_DOCUMENT_NAMES. Three
    // literals were waiting to happen, and the way that fails is a slot the
    // screen shows as optional and the server refuses.
    expect(REQUIRED_DOCUMENT_NAMES).toEqual(REQUIRED_DOC_SLOTS.map((s) => s.label));
    expect(REQUIRED_DOC_SLOTS).toHaveLength(4);
  });

  it('the logo is not among them', () => {
    // A picture on the profile, not a document with a verification state.
    const labels = REQUIRED_DOC_SLOTS.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes('logo'))).toBe(false);
  });

  it('every slot maps to a purpose the server routes to the private bucket', () => {
    // `tradeLicense` is the one that differs — the server calls it `trade`.
    // Sending the key through would fix three documents and leave the trade
    // licence failing for a different reason.
    expect(REQUIRED_DOC_SLOTS.map((s) => s.purpose).sort()).toEqual(['nid', 'tin', 'trade', 'vat']);
  });
});

/**
 * Whether a slot counts as satisfied.
 *
 * Two different facts share this predicate: "this browser just uploaded
 * something" (`fileUrl`, set by the upload hook) and "the account already has
 * one" (`hasFile`, set by the server). Checking only the first made every EDIT
 * screen report all four certificates missing the moment the server stopped
 * sending object paths — a supplier with complete paperwork, told to upload it
 * all again.
 */
describe('documentOnFile', () => {
  it('counts a file uploaded in this session', () => {
    expect(documentOnFile({ fileUrl: 'uploads/d/f' })).toBe(true);
  });

  it('counts a document already on the account', () => {
    // The case a source-level check missed: no path, and the document is there.
    expect(documentOnFile({ hasFile: true })).toBe(true);
  });

  it('does not count an empty slot', () => {
    expect(documentOnFile({})).toBe(false);
    expect(documentOnFile({ fileUrl: '' })).toBe(false);
    expect(documentOnFile({ hasFile: false })).toBe(false);
    expect(documentOnFile({ fileUrl: '', hasFile: false })).toBe(false);
  });

  it('an EDIT of a supplier with all four on file is not blocked', () => {
    /*
     * End to end through the schema, because that is where the rule actually
     * bites. `id` present means an edit, so the requirement does not apply —
     * but a create-shaped payload with hasFile documents must pass too, or an
     * operator re-uploading one certificate is told to re-upload all of them.
     */
    const onFileOnly = REQUIRED_DOCUMENT_NAMES.map((name) => ({
      name,
      status: 'pending',
      hasFile: true,
    }));

    const result = wholesalerSchema.safeParse({ ...COMPLETE, documents: onFileOnly });
    expect(result.success, 'documents already on file were treated as missing').toBe(true);
  });
});

/**
 * MATCHING A SLOT TO A STORED DOCUMENT.
 *
 * The edit screen showed all four certificates as "Not uploaded" for a supplier
 * that had all four. Two causes, and the second is the interesting one:
 *
 *   - the slot decided from `fileUrl`, which the server no longer sends; and
 *   - the match was on the human LABEL. The server stores "Trade licence" and
 *     the form calls it "Trade License" — one capital letter — so nothing ever
 *     matched, and an operator was told to re-upload paperwork already on file.
 *
 * `docType` is the identifier. The label is prose and prose drifts.
 */
describe('slot matching', () => {
  it('the server labels and the form labels genuinely differ', () => {
    /*
     * This is the trap, asserted so nobody "fixes" the match back to names on
     * the assumption that the two agree. They do not, and they do not need to:
     * one is what an operator reads on the form, the other is what a reviewer
     * reads in the vault.
     */
    const serverLabels = ['Trade licence', 'TIN certificate', 'VAT registration', 'Owner NID'];
    expect(serverLabels).not.toEqual(REQUIRED_DOCUMENT_NAMES);
  });

  it('every slot carries a purpose that a stored docType can equal', () => {
    // The join key. The server writes `trade`/`tin`/`vat`/`nid` as doc_type;
    // these must be the same four strings or the match is decorative.
    expect(REQUIRED_DOC_SLOTS.map((s) => s.purpose).sort()).toEqual(['nid', 'tin', 'trade', 'vat']);
  });

  it('a stored document keeps its docType through the form schema', () => {
    // Dropped anywhere along the way, the match silently falls back to names
    // and the bug returns without a single error.
    const parsed = wholesalerSchema.safeParse({
      ...COMPLETE,
      id: 'whl-1',
      password: undefined,
      documents: [{ docType: 'trade', name: 'Trade licence', status: 'pending', hasFile: true }],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.documents?.[0]?.docType).toBe('trade');
  });
});
