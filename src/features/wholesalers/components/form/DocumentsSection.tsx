import { FileText } from 'lucide-react';
import { FormSection } from '@/src/components/forms/FormSection';
import { Alert } from '@/src/components/feedback';
import { Text } from '@/src/components/data';
import { acceptAttribute } from '@/src/services/upload/useUpload';
import { REQUIRED_DOC_SLOTS } from '../../constants/documents';
import { DocumentUploadSlot } from '@/src/components/forms/DocumentUploadSlot';
import { useWholesalerFormContext } from './useWholesalerFormContext';

/**
 * KYC documents — trade licence, TIN, VAT and owner NID.
 *
 * All four are required, and the server enforces it: `AdminCreateWholesaler`
 * reads the upload DRAFT and refuses a create missing any of them. This screen
 * says so before the round trip, and names every missing one at once — being
 * told about the TIN, fixing it, and then being told about the VAT is four
 * submits to learn four things the form already knew.
 *
 * The slot list comes from `REQUIRED_DOC_SLOTS` rather than being written out
 * here. It used to be an inline literal, which meant the rendered slots and the
 * requirement could drift into disagreeing — a slot the screen treats as
 * optional and the server refuses reads as the server being broken.
 */
export function DocumentsSection() {
  const { values, assets, fieldError } = useWholesalerFormContext();
  const { pendingDocs, onDocSelected } = assets;

  /*
   * Shown only once the operator has tried to submit.
   *
   * `fieldError('documents')` is set by the schema's refinement, which runs on
   * validate() — so the warning appears when they press Onboard and not while
   * they are still filling the form in. Nagging about four missing documents on
   * a blank form is noise; naming them at the moment of refusal is an answer.
   *
   * The message comes from the schema, so the screen and the rule cannot say
   * different things — the hook's `missingRequired` exists for callers that want
   * to disable a button before a submit is attempted.
   */
  const documentsError = fieldError('documents');

  return (
    <FormSection icon={FileText} title="Documents Upload">
      <Text as="p" variant="caption" className="-mt-2 mb-4">
        Each file uploads as soon as you choose it. All four are required. PDF or high-res image
        format.
      </Text>

      {documentsError && (
        <Alert tone="warn" title="Required documents missing">
          {documentsError}
        </Alert>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {REQUIRED_DOC_SLOTS.map((doc, docIndex) => (
          <DocumentUploadSlot
            key={doc.key}
            docKey={doc.key}
            // The asterisk, on every one of them. A slot that looks optional and
            // is refused on submit is worse than one that never looked optional.
            label={`${doc.label} *`}
            pending={pendingDocs[doc.key]}
            /*
              Matched on docType, NOT the label.

              The server calls it "Trade licence" and this slot calls it
              "Trade License" — a capital L and a different spelling of the
              same word. Matching on the human label meant NOTHING ever
              matched, so a supplier with all four certificates was shown
              four empty slots and told to upload them again. The retailer
              form learned the same lesson: the label is prose, docType is
              the identifier.
            */
            existing={values.documents?.find((d) => d.docType === doc.purpose)}
            onFileSelect={onDocSelected(doc.key, doc.label, docIndex)}
            /*
             * The picker offers exactly what the validator accepts.
             *
             * The slot's default is `image/*,application/pdf`, which is much
             * wider: it offers HEIC, GIF, TIFF and BMP, and the upload then
             * refuses them the instant the dialog closes. The retailer slots
             * moved off that wide net for the same reason.
             */
            accept={acceptAttribute('document')}
          />
        ))}
      </div>
    </FormSection>
  );
}
