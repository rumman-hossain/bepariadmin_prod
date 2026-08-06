import { useCallback, useEffect, useRef, useState } from 'react';
import { useUpload } from '@/src/services/upload/useUpload';
import type { UploadStatus } from '@/src/features/products/types/registration';
import type { WholesalerFormData } from '../schemas/wholesalerSchema';
import { DOC_PURPOSE_BY_KEY } from '../constants/documents';

export interface PendingDoc {
  fileName: string;
  fileSize: string;
  status: UploadStatus;
  error?: string;
}

export interface WholesalerAssetsApi {
  logoPreviewUrl: string | null;
  logoUpload: { status: UploadStatus; error?: string };
  onLogoSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  pendingDocs: Record<string, PendingDoc>;
  onDocSelected: (
    key: string,
    label: string,
    position: number,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** The draft the server claims when the supplier is created. */
  assetDraftId: string | null;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Logo and KYC-document uploads for the wholesaler form.
 *
 * Extracted from `WholesalerForm`, where roughly 140 lines of upload
 * orchestration sat between the category fetch and the form JSX: two upload
 * handlers, blob-URL lifecycle, a per-slot generation counter, and an
 * authoritative results ref.
 *
 * The two genuinely subtle parts are kept and documented rather than
 * simplified away, because both fix real races:
 *
 *   - **Generation counters.** Picking a new file for a slot bumps its
 *     generation; an in-flight upload only applies its result if its captured
 *     generation is still current. Without this, a slow upload of the wrong
 *     file could land after the right one and overwrite it.
 *   - **The results ref.** Documents are rebuilt from a ref rather than read
 *     from `values.documents`, so two slots uploading concurrently cannot
 *     clobber each other through a stale closure over form state.
 */

export function useWholesalerAssets(
  values: WholesalerFormData,
  setField: <K extends keyof WholesalerFormData>(field: K, value: WholesalerFormData[K]) => void,
): WholesalerAssetsApi {
  const { uploadSlot } = useUpload();

  // One draft shared by the logo and every document, so they attach to a single
  // upload draft: the first upload creates it, later ones reuse it.
  //
  // Genuinely one now. This hook used to be called separately by
  // BasicInfoSection and DocumentsSection, so each held its own copy of this
  // state and the sentence above was aspirational — the logo opened one draft
  // and the certificates another. It is instantiated once, in the form
  // provider, and handed to both through context.
  const [assetDraftId, setAssetDraftId] = useState<string | null>(null);

  /*
   * The draft id goes into the FORM's data as well as this hook's state.
   *
   * The create call sends it, and the server claims the draft in the same
   * transaction that inserts the supplier and validates the four required
   * documents against the files in it. Held only here, it never left the
   * browser: the server was handed a list of `{docType, fileUrl}` the page had
   * composed, and stored it verbatim with no way to tell an uploaded file from
   * an invented path.
   */
  const rememberDraft = useCallback(
    (id: string) => {
      setAssetDraftId(id);
      setField('uploadDraftId', id);
    },
    [setField],
  );

  // Always-current snapshot of `values` for async callbacks — a closure would
  // capture a stale copy.
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const uploadGenRef = useRef<Record<string, number>>({});
  const docResultsRef = useRef<
    Record<string, { docType: string; name: string; fileUrl: string; status: string }>
  >({});

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoUpload, setLogoUpload] = useState<{ status: UploadStatus; error?: string }>({
    status: 'idle',
  });
  const [pendingDocs, setPendingDocs] = useState<Record<string, PendingDoc>>({});

  // Release the local preview once a server URL exists, and on unmount.
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = logoPreviewUrl;
  }, [logoPreviewUrl]);

  useEffect(
    () => () => {
      if (previewUrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const onLogoSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const previous = previewUrlRef.current;
      if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);

      setLogoPreviewUrl(URL.createObjectURL(file));
      setField('logoUrl', '');
      setLogoUpload({ status: 'uploading', error: undefined });

      const gen = (uploadGenRef.current.logo ?? 0) + 1;
      uploadGenRef.current.logo = gen;
      const isCurrent = () => uploadGenRef.current.logo === gen;

      try {
        await uploadSlot({
          file,
          // 'logo', not 'wholesaler:logo'. The server's IsValidPurpose accepts
          // the bare purposes and the slotted PRODUCT forms; anything else is
          // refused. Measured: IsValidPurpose("wholesaler:logo") == false, so
          // every supplier logo upload was rejected on the purpose alone —
          // independently of the 401 that stopped admins reaching it at all.
          purpose: 'logo',
          position: 0,
          mediaType: 'image',
          draftId: assetDraftId,
          draftPurpose: 'wholesaler',
          onDraftId: rememberDraft,
          onSlotUpdate: (slot) => {
            if (!isCurrent()) return;
            if (slot.uploadStatus) {
              setLogoUpload({ status: slot.uploadStatus, error: slot.uploadError });
            }
            if (slot.uploadStatus === 'done' && slot.uploadedUrl) {
              setField('logoUrl', slot.uploadedUrl);
              setLogoPreviewUrl(slot.uploadedUrl);
            }
          },
        });
      } catch {
        if (isCurrent()) {
          setLogoUpload({ status: 'error', error: 'Logo upload failed. Please try again.' });
        }
      } finally {
        // Allows re-picking the same file to retry.
        e.target.value = '';
      }
    },
    [assetDraftId, rememberDraft, setField, uploadSlot],
  );

  const onDocSelected = useCallback(
    (key: string, label: string, position: number) =>
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPendingDocs((prev) => ({
          ...prev,
          [key]: { fileName: file.name, fileSize: formatSize(file.size), status: 'uploading' },
        }));

        // Drop any prior result for this slot until the new upload completes.
        delete docResultsRef.current[key];
        setField(
          'documents',
          (valuesRef.current.documents || []).filter((d) => d.name !== label),
        );

        const gen = (uploadGenRef.current[key] ?? 0) + 1;
        uploadGenRef.current[key] = gen;
        const isCurrent = () => uploadGenRef.current[key] === gen;

        try {
          await uploadSlot({
            file,
            // The BARE document purpose, which is also what routes the file to
            // the private bucket. `wholesaler:document:tin` was rejected
            // outright by IsValidPurpose.
            //
            // Mapped, not passed through: three slot keys match the server's
            // purpose names but `tradeLicense` does not — the server calls it
            // `trade`. Sending the key directly would fix three documents and
            // leave the trade licence failing for a different reason.
            purpose: DOC_PURPOSE_BY_KEY[key] ?? key,
            position,
            /*
             * 'document', NOT 'image'.
             *
             * This said `image`, and `rejectionReason(file, 'image')` refuses a
             * PDF — in the browser, before any request. So every one of these
             * slots showed "PDF or high-res Image format" and then refused the
             * PDF with "Upload failed. Please try again.", which is advice that
             * cannot work: trying again with the same file fails the same way.
             *
             * Measured on dev: two PNGs reached `/uploads/drafts`, the trade
             * licence PDF produced no request at all.
             *
             * It matters more now that all four certificates are mandatory —
             * trade licences, TIN and VAT certificates are normally scans, so
             * requiring what the form refuses would make onboarding impossible.
             *
             * The logo above stays 'image': a company logo genuinely is a
             * picture, and offering a PDF there sets up a rejection at the
             * server instead.
             */
            mediaType: 'document',
            draftId: assetDraftId,
            draftPurpose: 'wholesaler',
            onDraftId: rememberDraft,
            onSlotUpdate: (slot) => {
              if (!isCurrent()) return;

              // Captured outside the updater: onSlotUpdate takes a
              // Partial<MediaSlot>, so the truthiness narrowing on
              // `uploadStatus` does not survive into the closure.
              const nextStatus = slot.uploadStatus;
              const nextError = slot.uploadError;

              if (nextStatus) {
                setPendingDocs((prev) => {
                  const current = prev[key] ?? { fileName: label, fileSize: '' };
                  return { ...prev, [key]: { ...current, status: nextStatus, error: nextError } };
                });
              }

              if (slot.uploadStatus === 'done' && slot.uploadedUrl) {
                docResultsRef.current[key] = {
                  // docType as well as the label: the slot is matched by type,
                  // so a freshly uploaded document that carried only a name
                  // would not be found by its own slot after a save.
                  docType: DOC_PURPOSE_BY_KEY[key] ?? key,
                  name: label,
                  fileUrl: slot.uploadedUrl,
                  status: 'uploaded',
                };
                const uploadedNames = new Set(
                  Object.values(docResultsRef.current).map((d) => d.name),
                );
                const preserved = (valuesRef.current.documents || []).filter(
                  (d) => !uploadedNames.has(d.name),
                );
                setField('documents', [...preserved, ...Object.values(docResultsRef.current)]);
              }
            },
          });
        } catch {
          if (isCurrent()) {
            setPendingDocs((prev) => ({
              ...prev,
              [key]: {
                ...(prev[key] ?? { fileName: label, fileSize: '' }),
                status: 'error',
                error: 'Upload failed. Please try again.',
              },
            }));
          }
        } finally {
          e.target.value = '';
        }
      },
    [assetDraftId, rememberDraft, setField, uploadSlot],
  );

  /*
   * `missingRequired` used to be returned here and is gone.
   *
   * Its only consumer became `fieldError('documents')` — the schema's own
   * refusal, so the screen and the rule say the same sentence. A second,
   * parallel notion of "which are missing" left behind is a thing somebody
   * wires up later expecting it to agree, and it matched slots by their human
   * LABEL, which is exactly the comparison that failed.
   */
  return {
    logoPreviewUrl,
    logoUpload,
    onLogoSelected,
    pendingDocs,
    onDocSelected,
    // Named so the create screen can send it: the server claims this draft in
    // the same transaction that inserts the supplier, and validates the four
    // required documents against the files IN it rather than against a list the
    // browser composed.
    assetDraftId,
  };
}
