// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUpload } from '../useUpload';
import type { MediaSlot } from '@/src/features/products/types/registration';

/**
 * THE TILE MUST STILL SHOW THE PICTURE AFTER THE UPLOAD SUCCEEDS.
 *
 * `uploadSlot` used to finish by setting `localUri: fileDetail.signedUrl` and
 * revoking the blob. That signed URL is the **PUT** URL the upload was just made
 * against, and a V4 signature is bound to a method and to a header set — this
 * one covers `x-goog-if-generation-match` and `x-goog-meta-expected-sha256`,
 * neither of which an `<img>` GET sends. Google answers:
 *
 *   GET …?X-Goog-SignedHeaders=content-type;host;
 *          x-goog-if-generation-match;x-goog-meta-expected-sha256
 *   → 400 Bad Request
 *
 * 400, not 403: malformed rather than unauthorised, so no expiry window and no
 * session ever makes it load. Every media tile in the Add Product wizard turned
 * into a broken image at the instant its upload COMPLETED.
 *
 * It survived review because it inverts the usual failure: the blob renders
 * perfectly for the whole upload and only breaks on success, and the round of
 * live testing that followed checked what landed in `product_media.url` — which
 * was correct — rather than looking at the tile.
 *
 * So this asserts the two URLs by their ROLE. `localUri` is what the operator
 * looks at and must stay local; `uploadedUrl` is what gets stored and must be
 * the durable object URL.
 */

const SIGNED_PUT =
  'https://storage.googleapis.com/beparibd-media-bepari-bd-dev/products/ea9f/9e93' +
  '?X-Goog-Algorithm=GOOG4-RSA-SHA256' +
  '&X-Goog-Signature=6f9b5f18' +
  '&X-Goog-SignedHeaders=content-type%3Bhost%3Bx-goog-if-generation-match%3Bx-goog-meta-expected-sha256';

const createDraft = vi.fn();
const uploadToGCS = vi.fn();
const completeFile = vi.fn();

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  UploadAPIClient: class {
    createDraft = createDraft;
    uploadToGCS = uploadToGCS;
    completeFile = completeFile;
  },
}));

beforeEach(() => {
  createDraft.mockResolvedValue({
    draft: { id: 'draft-1' },
    files: [
      {
        fileId: 'file-1',
        signedUrl: SIGNED_PUT,
        gcsBucket: 'beparibd-media-bepari-bd-dev',
        gcsObjectName: 'products/ea9f/9e93',
      },
    ],
  });
  uploadToGCS.mockResolvedValue(undefined);
  completeFile.mockResolvedValue(undefined);

  // jsdom implements neither, and the hook's whole preview mechanism is these
  // two. Recording them is also how the leak assertion below is made.
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:preview-1'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Runs one upload and returns the slot as the caller would have accumulated it. */
async function upload() {
  const { result } = renderHook(() => useUpload());
  let slot: Partial<MediaSlot> = {};

  await act(async () => {
    await result.current.uploadSlot({
      file: new File(['x'], 'shirt.png', { type: 'image/png' }),
      purpose: 'product:poster',
      position: 0,
      mediaType: 'image',
      draftId: null,
      onDraftId: () => {},
      onSlotUpdate: (partial) => {
        slot = { ...slot, ...partial };
      },
    });
  });

  return { slot, hook: result };
}

describe('after a successful upload', () => {
  it('leaves the preview pointing at the blob, not at the PUT url', async () => {
    const { slot } = await upload();

    expect(slot.localUri).toBe('blob:preview-1');
    expect(slot.uploadStatus).toBe('done');
  });

  it('never puts a signed url where an <img> will fetch it', async () => {
    const { slot } = await upload();

    // The specific failure, named: a GET against a PUT signature is a 400.
    expect(slot.localUri).not.toContain('X-Goog-Signature');
    expect(slot.localUri).not.toContain('X-Goog-SignedHeaders');
  });

  it('stores the durable object url, which outlives the signature', async () => {
    const { slot } = await upload();

    expect(slot.uploadedUrl).toBe(
      'https://storage.googleapis.com/beparibd-media-bepari-bd-dev/products/ea9f/9e93',
    );
    expect(slot.uploadedUrl).not.toContain('X-Goog-Signature');
    expect(slot.objectName).toBe('products/ea9f/9e93');
  });

  it('does not revoke the blob it is still displaying', async () => {
    await upload();

    // The old code released it here, one line after replacing `localUri` — so
    // even the broken URL had nothing to fall back to.
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:preview-1');
  });
});

describe('clearing a slot', () => {
  it('releases the blob, so swapping an image does not leak it', async () => {
    const { hook } = await upload();

    act(() => hook.current.releasePreviewUrl('blob:preview-1'));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
  });
});
