import { Panel } from '@/src/components/layout/primitives';
import { DocumentVault } from '@/src/components/documents/DocumentVault';
import { getWholesalerDocumentUrl } from '../api/wholesalerApi';
import { REQUIRED_DOC_SLOTS } from '../constants/documents';
import type { Wholesaler } from '@/src/types/domain';

/**
 * THE PAPERWORK, AS ITS OWN PANEL.
 *
 * It was a row inside "Business Profile", between Company Logo and Addresses —
 * the four certificates that Approve and Reject are decided on, filed under
 * decoration, in a one-third-width column. Reviewing them is the job this
 * screen exists for, so they lead it.
 *
 * # This is a FRAME, not a second vault
 *
 * The rows come from the shared `DocumentVault`, which the retailer screen also
 * renders. Copying it would eventually give the two screens two answers to
 * "what does a document that is still saving look like" — the supplier and
 * retailer document rules on the server had already drifted apart that way
 * once. All this adds is the heading and the count.
 *
 * # The count
 *
 * Derived here rather than read from `documentsOnFile`, which the LIST endpoint
 * populates and the DETAIL endpoint does not. Reading it would show "0 of 4"
 * over four visible certificates on every detail page.
 */
export function SupplierPaperworkPanel({ supplier }: { supplier: Wholesaler }) {
  const documents = supplier.documents ?? [];
  const removed = Boolean(supplier.deletedAt);

  /*
   * Counted over the REQUIRED slots, not over the rows.
   *
   * A supplier can hold two files of the same type after a re-upload, and
   * `documents.length` would then report 5 of 4. What the number answers is how
   * many of the four required certificates are covered.
   */
  const onFile = REQUIRED_DOC_SLOTS.filter((slot) =>
    documents.some((d) => d.docType === slot.purpose && d.hasFile),
  ).length;

  return (
    <Panel
      title="Paperwork"
      action={
        <span className="text-xs text-ink-2">
          {removed
            ? // A removed supplier keeps its documents; saying "2 of 4" here
              // would read as paperwork lost in the deletion.
              'kept, not destroyed'
            : `${onFile} of ${REQUIRED_DOC_SLOTS.length} on file`}
        </span>
      }
    >
      <DocumentVault
        subjectId={supplier.id}
        documents={documents}
        fetchUrl={getWholesalerDocumentUrl}
        labelFor={supplierDocLabel}
        emptyLabel="No documents on file for this supplier yet."
        /*
         * The Panel above already says "Paperwork". Letting the vault add its
         * own "Documents" put two headings on one list — the caption it shares
         * that row with still renders.
         */
        heading={null}
      />
    </Panel>
  );
}

/**
 * A stored doc_type turned into the words on screen.
 *
 * Reads REQUIRED_DOC_SLOTS — the same list the onboarding form renders and the
 * schema validates against — so a certificate cannot be called one thing when
 * it is uploaded and another when it is read back. An unrecognised type keeps
 * its raw code rather than vanishing: dropping the row would lose a document
 * somebody uploaded.
 */
export function supplierDocLabel(docType: string): string {
  return REQUIRED_DOC_SLOTS.find((s) => s.purpose === docType)?.label ?? docType;
}
