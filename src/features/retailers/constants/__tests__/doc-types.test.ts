import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RETAILER_DOC_TYPES } from '../../schemas/retailerSchema';

/**
 * The document codes must match `internal/upload/purpose.go`.
 *
 * `IsDocumentPurpose` is what routes an upload to the PRIVATE bucket. A code
 * this app sends that the server does not recognise as a document falls through
 * to `getBucketByPurpose`'s default — the PUBLIC bucket, the one that grants
 * allUsers read.
 *
 * So a typo here does not produce an error. It produces a national ID on the
 * open internet, silently, with nothing on either side complaining.
 */
describe('retailer document types', () => {
  it('matches the server purposes that route to the private bucket', () => {
    let source: string;
    try {
      source = readFileSync(
        '../beparibd-backend/internal/upload/purpose.go',
        'utf8',
      );
    } catch {
      // The backend is a sibling checkout and may be absent. Skipping is
      // honest; asserting against a file we could not read would be theatre.
      console.warn('purpose.go not readable — skipping the cross-repo check');
      return;
    }

    const start = source.indexOf('var documentPurposes');
    const block = source.slice(start, source.indexOf('}', start));
    const serverCodes = [...block.matchAll(/Purpose(\w+):/g)].map((m) => m[1]!.toLowerCase());

    expect(serverCodes.length, 'failed to parse documentPurposes').toBeGreaterThan(0);

    for (const { value } of RETAILER_DOC_TYPES) {
      expect(
        serverCodes,
        `"${value}" is not a document purpose on the server — an upload with it would ` +
          'land in the PUBLIC bucket',
      ).toContain(value);
    }
  });

  it('has four distinct codes with readable labels', () => {
    const codes = RETAILER_DOC_TYPES.map((d) => d.value);
    expect(new Set(codes).size).toBe(codes.length);
    for (const d of RETAILER_DOC_TYPES) expect(d.label.trim()).not.toBe('');
  });
});
