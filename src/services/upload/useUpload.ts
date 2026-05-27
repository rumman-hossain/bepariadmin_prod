import { useCallback, useRef } from 'react';
import { UploadAPIClient, sha256Hex, randomUUID } from './api';
import type { FileSpec } from './types';
import type { MediaSlot } from '@/src/features/products/types/registration';

interface UploadSlotOptions {
  file: File;
  purpose: string;
  position: number;
  mediaType: 'image' | 'video';
  draftId: string | null;
  draftPurpose?: string;
  onSlotUpdate: (slot: Partial<MediaSlot>) => void;
  onDraftId: (id: string) => void;
}

export function useUpload() {
  const clientRef = useRef(new UploadAPIClient());

  const uploadSlot = useCallback(async (opts: UploadSlotOptions) => {
    const { file, purpose, position, mediaType, draftId, draftPurpose = 'product', onSlotUpdate, onDraftId } = opts;

    const previewUrl = URL.createObjectURL(file);
    onSlotUpdate({ localUri: previewUrl, uploadStatus: 'uploading', uploadError: undefined });

    try {
      const checksum = await sha256Hex(file);
      const spec: FileSpec = {
        filename: file.name,
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

      await clientRef.current.uploadToGCS(fileDetail.resumableUri || fileDetail.signedUrl, file, spec.contentType);

      await clientRef.current.completeFile(fileDetail.fileId, {
        idempotencyKey: randomUUID(),
        actualSize: file.size,
        actualChecksum: checksum,
      });

      onSlotUpdate({
        localUri: previewUrl,
        uploadedUrl: fileDetail.signedUrl,
        uploadStatus: 'done',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      onSlotUpdate({ localUri: previewUrl, uploadStatus: 'error', uploadError: message });
      throw err;
    }
  }, []);

  return { uploadSlot, client: clientRef.current };
}
