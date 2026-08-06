// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { WholesalerFormProvider } from '../components/form/context';
import { DocumentsSection } from '../components/form/DocumentsSection';
import { REQUIRED_DOC_SLOTS } from '../constants/documents';
import type { WholesalerFormData } from '../schemas/wholesalerSchema';

/**
 * THE EDIT SCREEN, RENDERED, for a supplier that already has its paperwork.
 *
 * Measured on dev: every slot read "Not uploaded" for WHL-00009, which had all
 * four certificates on file — so an operator correcting an address would have
 * been told to re-upload the lot.
 *
 * Two causes, and the second is the one worth remembering:
 *
 *   - the slot decided from `fileUrl`, which the server stopped sending because
 *     it published the private bucket's object paths; and
 *   - the slot was matched to a stored document by its human LABEL. The server
 *     writes "Trade licence"; this form says "Trade License". One capital
 *     letter, and nothing ever matched.
 *
 * A source-level check missed all of it — the strings were all still in the
 * file. Only rendering the section with server-shaped data shows it.
 */

vi.mock('@/src/services/upload/useUpload', () => ({
  useUpload: () => ({ uploadSlot: vi.fn() }),
  acceptAttribute: () => 'application/pdf',
}));

afterEach(cleanup);

/** What the server actually returns — its spellings, and no object path. */
const ON_FILE = [
  { id: 'd1', docType: 'trade', name: 'Trade licence', status: 'pending', hasFile: true },
  { id: 'd2', docType: 'tin', name: 'TIN certificate', status: 'pending', hasFile: true },
  { id: 'd3', docType: 'vat', name: 'VAT registration', status: 'pending', hasFile: true },
  { id: 'd4', docType: 'nid', name: 'Owner NID', status: 'pending', hasFile: true },
];

function renderSection(documents: unknown[]) {
  const values = {
    companyName: 'Elegant Apparel Ltd',
    ownerName: 'Mohammad Ali',
    email: 'supplier@example.com',
    mobile: '01712345678',
    categories: [],
    addresses: [],
    bankDetailsList: [],
    digitalWallets: [],
    documents,
  } as unknown as WholesalerFormData;

  render(
    <WholesalerFormProvider
      values={values}
      errors={{}}
      setField={vi.fn()}
      isSubmitting={false}
      mode="edit"
    >
      <DocumentsSection />
    </WholesalerFormProvider>,
  );
}

describe('a supplier whose certificates are already on file', () => {
  it('shows every slot as Uploaded, not as missing', () => {
    renderSection(ON_FILE);

    expect(screen.queryAllByText(/not uploaded/i)).toHaveLength(0);
    expect(screen.queryAllByText(/^uploaded$/i)).toHaveLength(REQUIRED_DOC_SLOTS.length);
  });

  it('matches on docType even though the two spell the label differently', () => {
    /*
     * The pointed version of the test above. Each stored document keeps the
     * SERVER's wording and no form label matches it — if the match were on
     * names, nothing would be found and every slot would read "Not uploaded".
     */
    for (const doc of ON_FILE) {
      expect(
        REQUIRED_DOC_SLOTS.some((s) => s.label === doc.name),
        `"${doc.name}" unexpectedly matches a form label — the test has lost its point`,
      ).toBe(false);
    }

    renderSection(ON_FILE);
    expect(screen.queryAllByText(/not uploaded/i)).toHaveLength(0);
  });

  it('a document with no file still reads as missing', () => {
    // `hasFile: false` is a row recorded without bytes. Showing it as uploaded
    // would offer an operator a document that cannot be opened.
    renderSection(ON_FILE.map((d) => (d.docType === 'vat' ? { ...d, hasFile: false } : d)));

    expect(screen.queryAllByText(/not uploaded/i)).toHaveLength(1);
  });

  it('a blank form shows all four as missing', () => {
    // The other direction, so "nothing is ever missing" cannot pass the above.
    renderSection([]);

    expect(screen.queryAllByText(/not uploaded/i)).toHaveLength(REQUIRED_DOC_SLOTS.length);
  });

  it('still marks every slot required', () => {
    renderSection(ON_FILE);
    for (const slot of REQUIRED_DOC_SLOTS) {
      expect(screen.getByText(`${slot.label} *`)).toBeTruthy();
    }
  });
});
