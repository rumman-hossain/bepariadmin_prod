import { REQUIRED_DOC_SLOTS } from '../constants/documents';

/**
 * A stored doc_type turned into the words on screen.
 *
 * Reads REQUIRED_DOC_SLOTS — the same list the onboarding form renders and the
 * schema validates against — so a certificate cannot be called one thing when
 * it is uploaded and another when it is read back. An unrecognised type keeps
 * its raw code rather than vanishing: dropping the row would lose a document
 * somebody uploaded.
 *
 * Split out of SupplierPaperworkPanel.tsx so that file exports only its
 * component; a module exporting both loses Fast Refresh
 * (`react-refresh/only-export-components`).
 */
export function supplierDocLabel(docType: string): string {
  return REQUIRED_DOC_SLOTS.find((s) => s.purpose === docType)?.label ?? docType;
}
