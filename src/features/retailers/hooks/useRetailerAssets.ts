import { useCallback, useRef, useState } from 'react';
import { useUpload } from '@/src/services/upload/useUpload';
import type { UploadStatus } from '@/src/features/products/types/registration';

/**
 * Uploading a retailer's paperwork before the retailer exists.
 *
 * # Why the files go up first
 *
 * NID and trade licence are required to CREATE a shop, and that cannot be
 * enforced after the row exists — at that point the account is real and the only
 * lever left is asking nicely. So the files are uploaded to a draft while the
 * shop is still hypothetical, and the create call names the draft. The server
 * checks the draft's contents before it inserts anything.
 *
 * # One draft, shared
 *
 * The first upload creates a draft and every later slot reuses it, so all of a
 * shop's documents arrive as one unit that create can claim in a single
 * transaction. A draft per slot would mean five drafts to attach and five ways
 * to half-attach them.
 *
 * # The purpose is BARE
 *
 * `nid`, not `retailer:document:nid`. The server's `IsValidPurpose` accepts the
 * bare document purposes and the slotted product forms — nothing else. The
 * wholesaler hook sends `wholesaler:document:${key}`, which that function
 * rejects, so supplier document uploads would fail validation even after the
 * 401 that stopped them earlier. Getting this wrong is invisible until an
 * upload is refused with a message about the purpose.
 *
 * The purpose also decides the bucket: every value here is a document purpose,
 * so all of them route to the PRIVATE bucket.
 */

/** Slot key → the storage purpose the server understands. */
export const RETAILER_DOC_SLOTS = [
  { key: 'nid', label: 'Owner NID', purpose: 'nid', required: true, imageOnly: false },
  { key: 'trade', label: 'Trade Licence', purpose: 'trade', required: true, imageOnly: false },
  {
    key: 'shop_photo',
    label: 'Shop Photo',
    purpose: 'shop_photo',
    required: false,
    // Images only, enforced server-side too. A PDF "photo" is accepted by the
    // global content-type list and then fails wherever it is rendered.
    imageOnly: true,
  },
] as const;

/*
 * TIN and VAT are NOT slots here.
 *
 * Removed from the form on request — a shop registers with its owner's NID, its
 * trade licence and a photograph, and two extra optional boxes made the section
 * look like more work than it is.
 *
 * The SERVER still accepts `tin` and `vat` as purposes, deliberately. They route
 * to the private bucket, the buyer app may still send them, and narrowing a
 * server allow-list to match one form is how a working client breaks. Removing
 * a slot removes a way to upload, not a kind of document.
 */

export type RetailerDocSlotKey = (typeof RETAILER_DOC_SLOTS)[number]['key'];

export interface PendingDoc {
  fileName: string;
  fileSize: string;
  status: UploadStatus;
  error?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useRetailerAssets() {
  const { uploadSlot } = useUpload();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [pendingDocs, setPendingDocs] = useState<Record<string, PendingDoc>>({});

  /*
   * Generation counter per slot.
   *
   * Somebody who picks the wrong file and immediately picks the right one has
   * two uploads in flight for one slot. Without this, whichever finishes LAST
   * wins — which may be the file they replaced. The counter lets a stale
   * response identify itself and do nothing.
   */
  const genRef = useRef<Record<string, number>>({});

  /*
   * ONE draft, even when two files are picked a moment apart.
   *
   * `draftId` is state, so every handler closes over the value it had when the
   * handler was created. Picking the NID and then the trade licence before the
   * first upload answers means BOTH handlers see `null` and each creates its own
   * draft. `setDraftId` runs twice and the last write wins, so create claims a
   * draft holding one document — and the server refuses with "Upload the
   * National ID" over a file the operator watched upload.
   *
   * The ref holds the id the moment it is known, and the gate holds the other
   * slots for exactly as long as it takes to learn it — not for the whole
   * upload, which would serialise files that could travel together.
   */
  const draftIdRef = useRef<string | null>(null);
  const draftGate = useRef<Promise<void> | null>(null);
  const openGate = useRef<(() => void) | null>(null);

  const releaseGate = useCallback(() => {
    openGate.current?.();
    openGate.current = null;
    draftGate.current = null;
  }, []);

  const onFileSelected = useCallback(
    (key: string, purpose: string, position: number, slotImageOnly = false) =>
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPendingDocs((prev) => ({
          ...prev,
          [key]: { fileName: file.name, fileSize: formatSize(file.size), status: 'uploading' },
        }));

        const gen = (genRef.current[key] ?? 0) + 1;
        genRef.current[key] = gen;
        const isCurrent = () => genRef.current[key] === gen;

        /*
         * Claim the draft, or wait for whoever claimed it.
         *
         * A loop rather than a single check, because the holder can fail without
         * ever producing a draft — a rejected file type never reaches
         * `createDraft`. A waiter that resumed and went ahead regardless would
         * start a second draft in exactly the situation this gate exists to
         * prevent. Instead it looks again, finds the gate open and no id, and
         * takes over the claim itself.
         *
         * It terminates: the gate is only ever resolved by `releaseGate`, which
         * also clears it, so a resolved gate is a null gate and the next pass
         * claims. The whole check runs before the first `await`, and JavaScript
         * runs a handler to its first suspension without interruption, so the
         * read and the write cannot interleave.
         */
        let iCreateTheDraft = false;
        while (draftIdRef.current === null) {
          if (draftGate.current === null) {
            iCreateTheDraft = true;
            draftGate.current = new Promise<void>((resolve) => {
              openGate.current = resolve;
            });
            break;
          }
          await draftGate.current;
        }

        try {
          await uploadSlot({
            file,
            purpose,
            position,
            // A shop photo is an image; NID and trade licence are DOCUMENTS,
            // which accept PDFs.
            //
            // This said 'image' unconditionally, on the reasoning that the
            // transport layer folds document→image anyway. It does — but the
            // CLIENT-SIDE type gate runs first, and it checked a PDF against
            // the image list and refused it. Every scanned national ID was
            // rejected before it reached the network.
            mediaType: slotImageOnly ? 'image' : 'document',
            // The REF, not the state. State is a snapshot of the render this
            // handler was born in; the ref is what the previous upload actually
            // learned.
            draftId: draftIdRef.current,
            draftPurpose: 'retailer',
            onDraftId: (id) => {
              draftIdRef.current = id;
              setDraftId(id);
              // The id is known — the waiting slots can go now, rather than
              // after this file finishes transferring.
              releaseGate();
            },
            onSlotUpdate: (slot) => {
              if (!isCurrent()) return;
              const nextStatus = slot.uploadStatus;
              const nextError = slot.uploadError;
              if (nextStatus) {
                setPendingDocs((prev) => {
                  const current = prev[key] ?? { fileName: file.name, fileSize: '' };
                  return { ...prev, [key]: { ...current, status: nextStatus, error: nextError } };
                });
              }
            },
          });
        } catch (err) {
          if (!isCurrent()) return;
          setPendingDocs((prev) => ({
            ...prev,
            [key]: {
              ...(prev[key] ?? { fileName: file.name, fileSize: '' }),
              status: 'error',
              error: err instanceof Error ? err.message : 'Upload failed',
            },
          }));
        } finally {
          /*
           * The gate must open even when this upload failed before a draft
           * existed — a rejected file type never reaches `createDraft`, so
           * `onDraftId` never fires. Leaving the gate shut would strand every
           * other slot on a promise nothing resolves: the operator picks a
           * second file and the spinner never moves.
           *
           * Releasing with no draft id is correct: `draftIdRef` is still null,
           * so the next slot claims creation itself.
           */
          if (iCreateTheDraft) releaseGate();
        }
      },
    [releaseGate, uploadSlot],
  );

  /**
   * Which required documents are still missing.
   *
   * The server refuses the create without them; this is so the operator learns
   * that BEFORE filling in the rest of the form, and learns about all of them at
   * once rather than one per submit.
   */
  const missingRequired = RETAILER_DOC_SLOTS.filter(
    (s) => s.required && pendingDocs[s.key]?.status !== 'done',
  ).map((s) => s.label);

  return { draftId, pendingDocs, onFileSelected, missingRequired };
}
