import { describe, it, expect } from 'vitest';
import { districtFromAddresses } from './districtFromAddresses';
import { acceptAttribute, ALLOWED_DOCUMENT_TYPES, ALLOWED_IMAGE_TYPES } from '@/src/services/upload/useUpload';
import type { RetailerAddress } from '../components/RetailerForm';

const addr = (district: string, isDefault = false): RetailerAddress => ({
  addressType: 'primary',
  district,
  addressLine: 'Shop 12',
  isDefault,
});

/**
 * `users.retailers.district` after the free-text field was deleted.
 *
 * The form asked for the district twice — once as free text, once as a picker on
 * every address. Only the free-text one is gone; the COLUMN is still real, and
 * the list screen filters on it. Deriving it keeps that filter working from the
 * answer that was validated against the canonical list, so "Dhaka " and "dhaka"
 * can no longer file a shop somewhere the filter cannot find it.
 */
describe('districtFromAddresses', () => {
  it('takes the district of the default address', () => {
    // A shop with two addresses has said which one it is. That is its answer to
    // "where are you", and picking the other would file it in the wrong place.
    expect(districtFromAddresses([addr('Khulna'), addr('Dhaka', true)])).toBe('Dhaka');
  });

  it('falls back to the first when nothing is marked default', () => {
    // The ordinary case: one address, no box ticked.
    expect(districtFromAddresses([addr('Rajshahi')])).toBe('Rajshahi');
  });

  it('returns empty for no addresses', () => {
    expect(districtFromAddresses([])).toBe('');
    expect(districtFromAddresses(undefined)).toBe('');
  });

  it('trims, so a stray space cannot create a second Dhaka', () => {
    // The whole reason the free-text field was a problem.
    expect(districtFromAddresses([addr('  Dhaka  ')])).toBe('Dhaka');
  });

  it('does not mistake a half-filled address for an answer', () => {
    // An address row exists from the moment Add Address is pressed. Reading its
    // blank district is correct — it is blank — but it must not throw.
    expect(districtFromAddresses([addr('')])).toBe('');
  });
});

/**
 * What the file picker OFFERS must be what the validator ACCEPTS.
 *
 * The slots hardcoded `accept="image/*"`, which is far wider than the validated
 * list — it offers HEIC, GIF, TIFF, BMP and SVG. A photo taken on a phone as
 * HEIC could be chosen and was then refused the instant the dialog closed, by a
 * rule the operator had no way to see.
 */
describe('acceptAttribute', () => {
  it('offers exactly the document types that pass validation', () => {
    const offered = acceptAttribute('document').split(',');
    expect(offered).toEqual(ALLOWED_DOCUMENT_TYPES);
    expect(offered).toContain('application/pdf');
  });

  it('offers exactly the image types for an images-only slot', () => {
    const offered = acceptAttribute('image').split(',');
    expect(offered).toEqual(ALLOWED_IMAGE_TYPES);
  });

  it('never offers a PDF where only a photograph will do', () => {
    // The shop photo. A PDF "photograph" is accepted by the global content-type
    // list and then fails wherever it is rendered.
    expect(acceptAttribute('image')).not.toContain('application/pdf');
  });

  it('never uses a wildcard', () => {
    // `image/*` is the specific thing that broke: a wildcard promises whatever
    // the OS thinks is an image, and the validator honours a fixed list.
    for (const kind of ['image', 'document', 'video'] as const) {
      expect(acceptAttribute(kind)).not.toContain('*');
    }
  });
});
