import { FileText } from 'lucide-react';
import { FormSection } from '@/src/components/forms/FormSection';
import { DocumentUploadSlot } from '@/src/components/forms/DocumentUploadSlot';
import { Text } from '@/src/components/data';
import { Alert } from '@/src/components/feedback';
import { acceptAttribute } from '@/src/services/upload/useUpload';
import { RETAILER_DOC_SLOTS, type PendingDoc } from '../../hooks/useRetailerAssets';
import type { RetailerDocument } from '../../schemas/retailerSchema';

/**
 * The shop's paperwork.
 *
 * Each file uploads the moment it is chosen, into a draft the create call later
 * claims — the files exist before the shop does, which is the only way "NID and
 * trade licence are required" can be enforced at create rather than nagged
 * about afterwards.
 *
 * Every purpose here routes to the PRIVATE bucket. Nothing in this section is
 * ever publicly addressable.
 */

export interface DocumentsSectionProps {
  pendingDocs: Record<string, PendingDoc>;
  onFileSelected: (
    key: string,
    purpose: string,
    position: number,
    imageOnly?: boolean,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  missingRequired: string[];
  /** Documents already on file — populated on edit, empty on create. */
  existing?: RetailerDocument[];
  /** Only warn about missing documents once the operator has tried to submit. */
  showMissing?: boolean;
}

export function DocumentsSection({
  pendingDocs,
  onFileSelected,
  missingRequired,
  existing = [],
  showMissing = false,
}: DocumentsSectionProps) {
  return (
    <FormSection icon={FileText} title="Documents Upload">
      <Text as="p" variant="caption" className="-mt-2 mb-4">
        Each file uploads as soon as you choose it. PDF, JPEG, PNG, WEBP or AVIF — except the shop
        photo, which must be a photograph. Up to 10 MB.
      </Text>

      {showMissing && missingRequired.length > 0 && (
        <Alert tone="warn" title="Required documents missing">
          {/*
            Both named at once. Reporting one at a time costs the operator a
            submit to learn each — the form already knows all of them.
          */}
          {missingRequired.join(' and ')} {missingRequired.length === 1 ? 'is' : 'are'} needed before
          this shop can be created.
        </Alert>
      )}

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
        {RETAILER_DOC_SLOTS.map((slot, index) => (
          <DocumentUploadSlot
            key={slot.key}
            docKey={slot.key}
            label={slot.required ? `${slot.label} *` : slot.label}
            pending={pendingDocs[slot.key]}
            // On edit, a document already on file shows as present. Matched on
            // docType rather than the label, because the label carries the
            // required marker and would never match.
            existing={(() => {
              const found = existing.find((d) => d.docType === slot.key);
              return found ? { name: slot.label, fileUrl: found.hasFile ? 'stored' : undefined } : undefined;
            })()}
            onFileSelect={onFileSelected(slot.key, slot.purpose, index, slot.imageOnly)}
            /*
              The picker offers exactly what the validator accepts — JPEG, PNG,
              WEBP, AVIF, and a PDF for everything except the shop photo.

              This was `image/*`, which is much wider: it offered HEIC, GIF,
              TIFF and BMP, and `rejectionReason` then refused them the instant
              the dialog closed. A phone photo saved as HEIC could be chosen and
              never uploaded, with nothing on screen having warned against it.
            */
            accept={acceptAttribute(slot.imageOnly ? 'image' : 'document')}
          />
        ))}
      </div>
    </FormSection>
  );
}
