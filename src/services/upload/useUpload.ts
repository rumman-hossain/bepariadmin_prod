import { useCallback, useEffect, useRef } from 'react';
import { UploadAPIClient, sha256Hex, randomUUID } from './api';
import type { FileSpec } from './types';
import type { MediaSlot } from '@/src/features/products/types/registration';

interface UploadSlotOptions {
  file: File;
  purpose: string;
  position: number;
  /**
   * What KIND of thing this is, for client-side validation only.
   *
   * `document` accepts PDFs; the transport layer folds it to `image` before it
   * reaches the server, which decides the real handling from the PURPOSE.
   */
  mediaType: 'image' | 'video' | 'document';
  draftId: string | null;
  draftPurpose?: string;
  onSlotUpdate: (slot: Partial<MediaSlot>) => void;
  onDraftId: (id: string) => void;
}

/**
 * Client-side limits.
 *
 * The backend is the real gate — it sniffs magic bytes and enforces its own
 * caps — but there was no client check at all, so a 500 MB file would hash,
 * upload for minutes and only then be rejected. `accept` on the file input is a
 * picker filter, not a control: drag-and-drop and DevTools both bypass it.
 */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

/**
 * KYC paperwork: a scan is usually a PDF, sometimes a photograph of a document.
 *
 * This list did not exist, and its absence was a live bug. A national ID or
 * trade licence uploaded as a PDF was rejected by `rejectionReason` before it
 * reached the network — "application/pdf isn't supported here. Use JPEG, PNG,
 * WEBP, AVIF" — because a document was checked against the IMAGE list.
 *
 * The gap was already half-acknowledged: `api.ts` maps `mediaType: 'document'`
 * to `'image'` for the wire, so documents were anticipated at the transport
 * layer and never plumbed through validation.
 */
export const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

/**
 * The `accept` attribute for a file input, derived from the list that actually
 * validates.
 *
 * The slots used to hardcode `accept="image/*,application/pdf"`, and `image/*`
 * is far wider than what `rejectionReason` permits — it offers HEIC, GIF, TIFF,
 * BMP and SVG. So the picker let an operator choose a photo their phone had
 * taken as HEIC, and the file was refused the instant the dialog closed, by a
 * rule they had no way to see. The picker promised something the validator did
 * not honour.
 *
 * Built from the same constant instead, so the two cannot drift: whatever the
 * validator accepts is exactly what the picker offers.
 *
 * A file dialog usually still has an "All files" escape hatch, and drag-and-drop
 * ignores `accept` entirely — this narrows what is OFFERED, it does not enforce
 * anything. `rejectionReason` is the gate on the client, and the server's own
 * magic-byte sniff is the gate that counts.
 */
export function acceptAttribute(mediaType: 'image' | 'video' | 'document'): string {
  const allowed =
    mediaType === 'video'
      ? ALLOWED_VIDEO_TYPES
      : mediaType === 'document'
        ? ALLOWED_DOCUMENT_TYPES
        : ALLOWED_IMAGE_TYPES;
  return allowed.join(',');
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/**
 * Returns a user-facing reason the file is unacceptable, or null.
 *
 * Exported for tests: this gate silently blocked every scanned NID and trade
 * licence, and nothing could assert its behaviour while it was private.
 */
export function rejectionReason(file: File, mediaType: 'image' | 'video' | 'document'): string | null {
  const isVideo = mediaType === 'video';
  // A scanned document is size-bounded like an image, not like a video.
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const allowed =
    mediaType === 'video'
      ? ALLOWED_VIDEO_TYPES
      : mediaType === 'document'
        ? ALLOWED_DOCUMENT_TYPES
        : ALLOWED_IMAGE_TYPES;

  if (file.size === 0) return 'That file is empty.';
  if (file.size > limit) {
    return `That file is ${formatMb(file.size)}. The limit is ${formatMb(limit)}.`;
  }
  // An empty `file.type` happens for some drag sources; let the server decide
  // rather than blocking a probably-valid upload on a missing MIME hint.
  if (file.type && !allowed.includes(file.type)) {
    return `${file.type} isn’t supported here. Use ${allowed
      .map((t) => t.split('/')[1].toUpperCase())
      .join(', ')}.`;
  }
  return null;
}

export function useUpload() {
  const clientRef = useRef(new UploadAPIClient());

  /**
   * Every object URL this hook has created and not yet released.
   *
   * `URL.createObjectURL` pins the whole `File` blob in memory until the URL is
   * revoked — a page navigation does NOT free it. Nothing in src/services/ ever
   * called `revokeObjectURL`, so a product with several media slots retained
   * every file for the lifetime of the document, and re-picking a file to retry
   * an upload (which the UI explicitly enables by resetting `e.target.value`)
   * leaked another copy each time.
   */
  const objectUrls = useRef<Set<string>>(new Set());

  const createPreviewUrl = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    objectUrls.current.add(url);
    return url;
  }, []);

  const releasePreviewUrl = useCallback((url: string | undefined) => {
    if (!url || !objectUrls.current.has(url)) return;
    URL.revokeObjectURL(url);
    objectUrls.current.delete(url);
  }, []);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const uploadSlot = useCallback(
    async (opts: UploadSlotOptions) => {
      const {
        file,
        purpose,
        position,
        mediaType,
        draftId,
        draftPurpose = 'product',
        onSlotUpdate,
        onDraftId,
      } = opts;

      const rejection = rejectionReason(file, mediaType);
      if (rejection) {
        // Fail before creating a preview URL or hashing — no blob is retained
        // and the user finds out immediately rather than after a long upload.
        onSlotUpdate({ uploadStatus: 'error', uploadError: rejection });
        throw new Error(rejection);
      }

      const previewUrl = createPreviewUrl(file);
      onSlotUpdate({ localUri: previewUrl, uploadStatus: 'uploading', uploadError: undefined });

      try {
        const checksum = await sha256Hex(file);
        const spec: FileSpec = {
          filename: file.name,
          // The browser's own type wins. The fallback only covers a missing
          // MIME hint, and must not claim a PDF is a JPEG.
          contentType: file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
          sizeBytes: file.size,
          checksum,
          mediaType,
          position,
          purpose,
        };

        const draftRes = await clientRef.current.createDraft(
          { purpose: draftPurpose, files: [spec] },
          draftId ?? undefined,
        );

        onDraftId(draftRes.draft.id);

        const fileDetail = draftRes.files[0];
        if (!fileDetail) throw new Error('No upload URL returned');

        /*
         * signedUrl FIRST. This was the other way round, and that ordering is
         * why every upload from this app has failed.
         *
         * GCS decides CORS when a resumable session is INITIATED and the session
         * URI inherits the answer; later PUTs to `?upload_id=…` are never
         * re-checked. The backend initiates those server-to-server with no
         * Origin header, so no origin is recorded and the browser is blocked
         * from the moment the session is born — the write lands at Google and
         * the response is discarded, which reads as `200 (OK)` next to
         * `net::ERR_FAILED`.
         *
         * A signed PUT is checked per request against the bucket config. The
         * resumable URI stays as the fallback: the server still returns it, and
         * if signing failed it is the only thing left to try.
         */
        const uploadUrl = fileDetail.signedUrl || fileDetail.resumableUri;
        if (!uploadUrl) throw new Error('No upload URL returned');

        await clientRef.current.uploadToGCS(uploadUrl, file, spec.contentType, checksum);

        await clientRef.current.completeFile(fileDetail.fileId, {
          idempotencyKey: randomUUID(),
          actualSize: file.size,
          actualChecksum: checksum,
        });

        onSlotUpdate({
          localUri: fileDetail.signedUrl,
          uploadedUrl: fileDetail.signedUrl,
          uploadStatus: 'done',
        });

        // The server URL has replaced the local preview, so the blob can go.
        releasePreviewUrl(previewUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        // Keep the preview on failure — the user can still see what they picked
        // while deciding whether to retry. It is released on unmount.
        onSlotUpdate({ localUri: previewUrl, uploadStatus: 'error', uploadError: message });
        throw err;
      }
    },
    [createPreviewUrl, releasePreviewUrl],
  );

  return { uploadSlot, releasePreviewUrl, client: clientRef.current };
}
