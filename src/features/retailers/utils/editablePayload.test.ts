import { describe, it, expect } from 'vitest';
import { toEditablePayload, CREDENTIAL_FIELDS } from './editablePayload';
import { splitCategories } from './splitCategories';

describe('toEditablePayload', () => {
  it('removes the sign-in credentials', () => {
    const out = toEditablePayload({
      name: 'Karim',
      shopName: 'Karim Traders',
      phone: '01712345678',
      email: 'karim@example.com',
    });

    // The whole point: these two must not reach the wire. The server ignores
    // them, so sending them means a 200 and a success toast over a change that
    // never happened.
    expect(out).not.toHaveProperty('phone');
    expect(out).not.toHaveProperty('email');
    expect(out).toEqual({ name: 'Karim', shopName: 'Karim Traders' });
  });

  it('keeps everything else, including the assessment', () => {
    const out = toEditablePayload({
      name: 'Karim',
      district: 'Dhaka',
      category: 'Fashion, FMCG',
      locationRanking: 'A',
      yearsInBusiness: 7,
      latitude: 23.8103,
      longitude: 90.4125,
    });

    expect(out).toEqual({
      name: 'Karim',
      district: 'Dhaka',
      category: 'Fashion, FMCG',
      locationRanking: 'A',
      yearsInBusiness: 7,
      latitude: 23.8103,
      longitude: 90.4125,
    });
  });

  it('keeps a falsy value that is genuinely present', () => {
    // 0 is a real number of years and '' is a genuinely cleared district. A
    // strip written with a truthiness test would drop both.
    const out = toEditablePayload({ yearsInBusiness: 0, district: '', latitude: 0 });
    expect(out).toEqual({ yearsInBusiness: 0, district: '', latitude: 0 });
  });

  it('does not mutate its input', () => {
    // The form still needs `phone` to render the read-only row and validate.
    const input = { name: 'Karim', phone: '01712345678' };
    toEditablePayload(input);
    expect(input).toEqual({ name: 'Karim', phone: '01712345678' });
  });

  it('strips every field named in CREDENTIAL_FIELDS', () => {
    // Guards the list itself: if a field is added to CREDENTIAL_FIELDS but the
    // filter stops consulting it, this fails.
    const payload = Object.fromEntries(CREDENTIAL_FIELDS.map((f) => [f, 'x']));
    expect(toEditablePayload({ ...payload, name: 'Karim' })).toEqual({ name: 'Karim' });
  });
});

describe('splitCategories', () => {
  it('splits, trims and drops blanks', () => {
    expect(splitCategories('Fashion, , FMCG,')).toEqual(['Fashion', 'FMCG']);
  });

  it('returns nothing for an empty string', () => {
    // A shop with no categories must render "Not provided", not a single empty
    // chip — which is what an unfiltered split would produce.
    expect(splitCategories('')).toEqual([]);
  });

  it('round-trips through a join', () => {
    const picked = ['Fashion', 'Electronics'];
    expect(splitCategories(picked.join(', '))).toEqual(picked);
  });
});

describe('the collections never go through PATCH', () => {
  it('strips addresses, banks and wallets', () => {
    // Each has its own PUT endpoint. PATCH does not bind them, so sending them
    // there is silently ignored — the exact shape this feature produced four
    // times: create returning a SessionUser, PATCH returning a string, the list
    // returning nulls, and financials having no client at all.
    const out = toEditablePayload({
      name: 'Karim',
      addresses: [{ district: 'Dhaka' }],
      bankDetailsList: [{ bankName: 'BRAC' }],
      digitalWallets: [{ walletType: 'bkash' }],
    });

    expect(out).toEqual({ name: 'Karim' });
  });

  it('keeps the assessment, which PATCH does bind', () => {
    // The stripping must be surgical: the assessment fields were added to
    // UpdateRetailerRequest deliberately and must still be sent.
    const out = toEditablePayload({ locationRanking: 'main_goli', yearsInBusiness: 7 });
    expect(out).toEqual({ locationRanking: 'main_goli', yearsInBusiness: 7 });
  });
});
