import { describe, it, expect } from 'vitest';
import { mapWholesalerToFormData } from './mapWholesalerToForm';
import type { Wholesaler } from '@/src/types/domain';

/**
 * The step between the server's supplier and the form the operator edits.
 *
 * Documents are the interesting part, and the reason is a bug that rendered
 * perfectly: the edit screen showed all four certificates as "Not uploaded" for
 * a supplier that had all four.
 *
 * `documents-section.test.tsx` proves the SECTION matches a slot to a stored
 * document by `docType`. This proves the docType survives the trip — dropping
 * it here silently falls the match back to labels the two sides spell
 * differently, and the section test cannot see that because it builds its own
 * values.
 */

const SUPPLIER = {
  id: 'whl-1',
  companyName: 'Elegant Apparel Ltd',
  ownerName: 'Mohammad Ali',
  email: 'supplier@example.com',
  mobile: '01712345678',
  documents: [
    // The SERVER's wording, which is not any form label.
    { id: 'd1', docType: 'trade', name: 'Trade licence', status: 'pending', hasFile: true },
    { id: 'd2', docType: 'vat', name: 'VAT registration', status: 'pending', hasFile: false },
  ],
} as unknown as Wholesaler;

describe('mapWholesalerToFormData — documents', () => {
  it('carries the docType, which is what a slot is matched by', () => {
    const form = mapWholesalerToFormData(SUPPLIER);
    expect(form.documents?.map((d) => d.docType)).toEqual(['trade', 'vat']);
  });

  it('carries presence rather than a path', () => {
    // The server no longer sends `fileUrl`; a form that looks for one reports
    // every certificate missing.
    const form = mapWholesalerToFormData(SUPPLIER);
    expect(form.documents?.[0]?.hasFile).toBe(true);
    expect(form.documents?.[1]?.hasFile).toBe(false);
    expect(JSON.stringify(form.documents)).not.toContain('uploads/');
  });

  it('keeps the row id, so an edit refers to the document that exists', () => {
    const form = mapWholesalerToFormData(SUPPLIER);
    expect(form.documents?.map((d) => d.id)).toEqual(['d1', 'd2']);
  });

  it('survives a supplier with no documents at all', () => {
    const form = mapWholesalerToFormData({ ...SUPPLIER, documents: undefined } as Wholesaler);
    expect(form.documents).toEqual([]);
  });
});
