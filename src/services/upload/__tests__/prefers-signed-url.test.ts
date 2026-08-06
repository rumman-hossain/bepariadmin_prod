// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * WHICH URL the browser uploads to — the whole fix, in one expression.
 *
 * The server returns two. `resumableUri` addresses a session GCS created
 * server-to-server, with no `Origin` header, so no origin was ever recorded
 * against it and every browser PUT to it is refused — the bytes land at Google
 * and the response is discarded, which shows up as `200 (OK)` beside
 * `net::ERR_FAILED`. `signedUrl` is checked per request against the bucket's
 * CORS config, which is correct and always was.
 *
 * `useUpload` read `resumableUri || signedUrl`. Every upload from this app
 * failed for that reason, and no test noticed — which is what this file is for.
 */

const uploadToGCS = vi.fn().mockResolvedValue(undefined);
const completeFile = vi.fn().mockResolvedValue({});
const createDraft = vi.fn();

vi.mock('../api', () => ({
  UploadAPIClient: class {
    createDraft = createDraft;
    uploadToGCS = uploadToGCS;
    completeFile = completeFile;
  },
  sha256Hex: vi.fn().mockResolvedValue('deadbeef'),
  randomUUID: () => 'idem-1',
}));

import { useUpload } from '../useUpload';

const SIGNED = 'https://storage.googleapis.com/bucket/o?X-Goog-Signature=abc';
const RESUMABLE = 'https://storage.googleapis.com/upload/storage/v1/b/bucket/o?upload_id=xyz';

function draftReturning(files: Record<string, unknown>[]) {
  return { draft: { id: 'draft-1' }, files };
}

async function runUpload() {
  const { result } = renderHook(() => useUpload());
  await act(async () => {
    await result.current.uploadSlot({
      file: new File(['x'], 'nid.pdf', { type: 'application/pdf' }),
      purpose: 'nid',
      position: 0,
      mediaType: 'document',
      draftId: null,
      draftPurpose: 'retailer',
      onSlotUpdate: () => {},
      onDraftId: () => {},
    });
  });
}

beforeEach(() => {
  uploadToGCS.mockClear();
  createDraft.mockReset();
  // jsdom has no object-URL implementation.
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => 'blob:preview',
    revokeObjectURL: () => {},
  });
});

describe('when the server returns both URLs', () => {
  it('uploads to the SIGNED one', async () => {
    createDraft.mockResolvedValue(
      draftReturning([{ fileId: 'f1', signedUrl: SIGNED, resumableUri: RESUMABLE }]),
    );

    await runUpload();

    expect(uploadToGCS).toHaveBeenCalledTimes(1);
    const [url] = uploadToGCS.mock.calls[0];
    expect(url).toBe(SIGNED);
    expect(url).not.toBe(RESUMABLE);
  });

  it('passes the checksum through, because the signature binds it', async () => {
    // The server signed `x-goog-meta-expected-sha256:<this>`. Dropping it here
    // means a 403 SignatureDoesNotMatch at GCS, not a silent degradation.
    createDraft.mockResolvedValue(
      draftReturning([{ fileId: 'f1', signedUrl: SIGNED, resumableUri: RESUMABLE }]),
    );

    await runUpload();

    const [, , contentType, sha] = uploadToGCS.mock.calls[0];
    expect(contentType).toBe('application/pdf');
    expect(sha).toBe('deadbeef');
  });
});

describe('when signing failed on the server', () => {
  it('falls back to the resumable URI rather than giving up', async () => {
    // Signing is best-effort server-side: a permission problem leaves signedUrl
    // blank and the draft still valid. Something is better than nothing.
    createDraft.mockResolvedValue(
      draftReturning([{ fileId: 'f1', signedUrl: '', resumableUri: RESUMABLE }]),
    );

    await runUpload();

    expect(uploadToGCS.mock.calls[0][0]).toBe(RESUMABLE);
  });

  it('fails loudly when neither URL came back', async () => {
    // Uploading to `undefined` would fetch a relative path against our own
    // origin and report a confusing error from the wrong system.
    createDraft.mockResolvedValue(draftReturning([{ fileId: 'f1' }]));

    const { result } = renderHook(() => useUpload());
    await expect(
      result.current.uploadSlot({
        file: new File(['x'], 'nid.pdf', { type: 'application/pdf' }),
        purpose: 'nid',
        position: 0,
        mediaType: 'document',
        draftId: null,
        onSlotUpdate: () => {},
        onDraftId: () => {},
      }),
    ).rejects.toThrow(/upload url/i);
    expect(uploadToGCS).not.toHaveBeenCalled();
  });
});
