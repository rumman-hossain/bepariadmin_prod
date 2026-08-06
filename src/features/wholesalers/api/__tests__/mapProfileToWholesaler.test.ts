import { describe, it, expect } from 'vitest';
import { mapProfileToWholesaler, sanitizeLogoUrlForApi } from '../wholesalerApi';
import { DEFAULT_COMMISSION_RATE } from '../../constants';

/**
 * `mapProfileToWholesaler` is the app's widest trust boundary: it takes an
 * untyped server payload through ~70 unchecked `as` casts and hands back the
 * object every supplier screen renders. These lock in what it does with the
 * payloads the backend actually sends — including the incomplete ones.
 */

function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'whl-1',
    name: 'Karim Rahman',
    companyName: 'Rahman Textiles',
    phone: '01711223344',
    status: 'ACTIVE',
    ...overrides,
  };
}

describe('mapProfileToWholesaler — company name', () => {
  it('prefers companyName', () => {
    const w = mapProfileToWholesaler(profile({ companyName: 'A', shopName: 'B', name: 'C' }));
    expect(w.companyName).toBe('A');
  });

  it('falls back to shopName, then to the owner name', () => {
    // Three field names for one concept, from three generations of the API.
    expect(
      mapProfileToWholesaler(profile({ companyName: undefined, shopName: 'B', name: 'C' }))
        .companyName,
    ).toBe('B');
    expect(
      mapProfileToWholesaler(profile({ companyName: undefined, shopName: undefined, name: 'C' }))
        .companyName,
    ).toBe('C');
  });

  it('is an empty string, never undefined, when all three are absent', () => {
    // The list sorts and filters on this; `undefined.toLowerCase()` throws.
    const w = mapProfileToWholesaler({ id: 'x' });
    expect(w.companyName).toBe('');
  });
});

describe('mapProfileToWholesaler — status', () => {
  it.each([
    ['ACTIVE', 'Active'],
    ['APPROVED', 'Active'],
    ['INIT', 'Review'],
    ['REVIEW', 'Review'],
    ['PENDING_REVIEW', 'Review'],
    ['STORE_CREATED', 'Review'],
    ['RESUBMIT_REQUIRED', 'Review'],
    ['REJECTED', 'Rejected'],
    ['SUSPENDED', 'Suspended'],
  ])('maps %s to %s', (backend, display) => {
    expect(mapProfileToWholesaler(profile({ status: backend })).status).toBe(display);
  });

  it('is case-insensitive', () => {
    expect(mapProfileToWholesaler(profile({ status: 'active' })).status).toBe('Active');
  });

  it('falls back to Review, not Active, for an unknown status', () => {
    // Failing closed matters here: an unrecognised status shown as Active would
    // let an unapproved supplier appear live.
    expect(mapProfileToWholesaler(profile({ status: 'GIBBERISH' })).status).toBe('Review');
    expect(mapProfileToWholesaler(profile({ status: undefined })).status).toBe('Review');
  });
});

describe('mapProfileToWholesaler — location', () => {
  it('takes the district from the default address', () => {
    const w = mapProfileToWholesaler(
      profile({
        addresses: [
          { district: 'Chattogram', addressType: 'warehouse' },
          { district: 'Dhaka', isDefault: true },
        ],
      }),
    );
    expect(w.location).toBe('Dhaka');
  });

  it('treats a primary address as the default when no flag is set', () => {
    const w = mapProfileToWholesaler(
      profile({
        addresses: [{ district: 'Khulna' }, { district: 'Dhaka', addressType: 'primary' }],
      }),
    );
    expect(w.location).toBe('Dhaka');
  });

  it('falls back to the first address with any district at all', () => {
    // A default address with a blank district must not blank out the location
    // when a sibling address has one.
    const w = mapProfileToWholesaler(
      profile({
        addresses: [
          { district: '  ', isDefault: true },
          { district: 'Sylhet' },
        ],
      }),
    );
    expect(w.location).toBe('Sylhet');
  });

  it('accepts the capitalised District key some payloads use', () => {
    const w = mapProfileToWholesaler(profile({ addresses: [{ District: 'Rajshahi' }] }));
    expect(w.location).toBe('Rajshahi');
  });

  it('trims surrounding whitespace', () => {
    expect(mapProfileToWholesaler(profile({ addresses: [{ district: ' Dhaka ' }] })).location).toBe(
      'Dhaka',
    );
  });

  it('is an empty string when there are no addresses', () => {
    expect(mapProfileToWholesaler(profile()).location).toBe('');
    expect(mapProfileToWholesaler(profile({ addresses: 'not-an-array' })).location).toBe('');
  });
});

describe('mapProfileToWholesaler — commission', () => {
  it('uses the margin the server sent', () => {
    expect(mapProfileToWholesaler(profile({ margin: 12.5 })).commissionRate).toBe(12.5);
  });

  it('keeps a genuine zero commission', () => {
    // `typeof === 'number'`, not a falsy check: a zero-commission supplier is a
    // real arrangement and must not silently revert to the platform default.
    expect(mapProfileToWholesaler(profile({ margin: 0 })).commissionRate).toBe(0);
  });

  it('falls back to the default when the margin is absent or not a number', () => {
    expect(mapProfileToWholesaler(profile()).commissionRate).toBe(DEFAULT_COMMISSION_RATE);
    expect(mapProfileToWholesaler(profile({ margin: '9.5' })).commissionRate).toBe(
      DEFAULT_COMMISSION_RATE,
    );
  });
});

describe('mapProfileToWholesaler — collections', () => {
  it('maps every address, defaulting the type to primary', () => {
    const w = mapProfileToWholesaler(
      profile({ addresses: [{ district: 'Dhaka' }, { addressType: 'warehouse', district: 'Gazipur' }] }),
    );
    expect(w.addresses).toEqual([
      { id: undefined, addressType: 'primary', division: undefined, district: 'Dhaka', postalCode: '', addressLine: '', isDefault: false },
      { id: undefined, addressType: 'warehouse', division: undefined, district: 'Gazipur', postalCode: '', addressLine: '', isDefault: false },
    ]);
  });

  it('coerces isDefault to a real boolean', () => {
    // The server has sent 1/0 as well as true/false; the form binds a checkbox.
    const w = mapProfileToWholesaler(profile({ addresses: [{ isDefault: 1 }, { isDefault: null }] }));
    expect(w.addresses!.map((a) => a.isDefault)).toEqual([true, false]);
  });

  it('promotes the default bank account to the summary field', () => {
    const w = mapProfileToWholesaler(
      profile({
        bankDetails: [
          { bankName: 'City', accountNumber: '1' },
          { bankName: 'BRAC', accountNumber: '2', isDefault: true },
        ],
      }),
    );
    expect(w.bankDetails?.bankName).toBe('BRAC');
    expect(w.bankDetailsList).toHaveLength(2);
  });

  it('leaves the bank summary undefined when there are no accounts', () => {
    const w = mapProfileToWholesaler(profile());
    expect(w.bankDetails).toBeUndefined();
    expect(w.bankDetailsList).toEqual([]);
  });

  it('promotes the default wallet and defaults its type to bkash', () => {
    const w = mapProfileToWholesaler(
      profile({ bkashWallets: [{ accountNumber: '017', isDefault: true }] }),
    );
    expect(w.digitalWallet).toEqual({ walletType: 'bkash', accountNumber: '017' });
  });

  it('renames docName to name and defaults the status to Pending', () => {
    const w = mapProfileToWholesaler(
      profile({
        documents: [{ id: 'doc-1', docType: 'trade', docName: 'Trade License', hasFile: true }],
      }),
    );
    expect(w.documents).toEqual([
      {
        id: 'doc-1',
        docType: 'trade',
        name: 'Trade License',
        date: undefined,
        status: 'Pending',
        hasFile: true,
      },
    ]);
  });

  it('carries PRESENCE, never the object path', () => {
    /*
     * The response used to include `fileUrl` — the private-bucket object path —
     * for every supplier certificate. The bytes were not reachable with it, but
     * it published the bucket layout the document proxy exists to hide.
     *
     * A server that starts sending one again must not have it silently pass
     * through to the browser's memory, so the mapping is asserted to drop it.
     */
    const w = mapProfileToWholesaler(
      profile({
        documents: [
          { id: 'd', docType: 'nid', docName: 'NID', hasFile: true, fileUrl: 'uploads/draft/file' },
        ],
      }),
    );

    expect(JSON.stringify(w.documents)).not.toContain('uploads/');
    expect(JSON.stringify(w.documents)).not.toContain('fileUrl');
    expect(w.documents?.[0]?.hasFile).toBe(true);
  });

  it('reads hasFile strictly, so a missing field is not a file', () => {
    // `d.hasFile === true` and not a truthiness check: an older server that
    // omits the field would otherwise leave `undefined`, and a row rendering
    // View for a document that is not there fails at the click.
    const w = mapProfileToWholesaler(
      profile({ documents: [{ id: 'd', docType: 'vat', docName: 'VAT' }] }),
    );
    expect(w.documents?.[0]?.hasFile).toBe(false);
  });

  it('survives every collection being absent or the wrong type', () => {
    const w = mapProfileToWholesaler({
      id: 'x',
      addresses: null,
      bankDetails: 'nope',
      bkashWallets: 42,
      documents: { not: 'an array' },
    });
    expect(w.addresses).toEqual([]);
    expect(w.bankDetailsList).toEqual([]);
    expect(w.digitalWallets).toEqual([]);
    expect(w.documents).toEqual([]);
  });
});

describe('mapProfileToWholesaler — dates', () => {
  it('passes an ISO string through unchanged', () => {
    const w = mapProfileToWholesaler(profile({ createdAt: '2026-01-15T10:30:00Z' }));
    expect(w.createdAt).toBe('2026-01-15T10:30:00Z');
  });

  it('serialises a Date instance', () => {
    const w = mapProfileToWholesaler(profile({ createdAt: new Date('2026-01-15T10:30:00Z') }));
    expect(w.createdAt).toBe('2026-01-15T10:30:00.000Z');
  });

  it('drops a value it cannot represent rather than rendering [object Object]', () => {
    expect(mapProfileToWholesaler(profile({ createdAt: { seconds: 1 } })).createdAt).toBeUndefined();
    expect(mapProfileToWholesaler(profile({ createdAt: 0 })).createdAt).toBeUndefined();
  });
});

describe('sanitizeLogoUrlForApi', () => {
  it('passes a real URL through', () => {
    expect(sanitizeLogoUrlForApi('https://storage.googleapis.com/logo.png')).toBe(
      'https://storage.googleapis.com/logo.png',
    );
  });

  it('strips a data: URI', () => {
    // A base64 preview would be persisted as the supplier's logo — megabytes of
    // it, inline in a database column.
    expect(sanitizeLogoUrlForApi('data:image/png;base64,iVBORw0KG')).toBe('');
  });

  it('strips the mock-gcs scheme used by the local upload stub', () => {
    expect(sanitizeLogoUrlForApi('mock-gcs://bucket/logo.png')).toBe('');
  });

  it('returns an empty string, not undefined, for no URL', () => {
    expect(sanitizeLogoUrlForApi(undefined)).toBe('');
    expect(sanitizeLogoUrlForApi('')).toBe('');
  });

  it('is applied to the logo when mapping a profile', () => {
    expect(mapProfileToWholesaler(profile({ logoUrl: 'data:image/png;base64,AAA' })).logoUrl).toBe('');
  });
});
