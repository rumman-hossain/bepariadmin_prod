import { describe, it, expect } from 'vitest';
import { rejectionReason } from '../useUpload';

/**
 * What the upload gate accepts, per kind.
 *
 * This gate rejected every PDF before it reached the network:
 *
 *   "application/pdf isn't supported here. Use JPEG, PNG, WEBP, AVIF"
 *
 * because a KYC document was checked against the IMAGE list — there was no
 * document kind. So no scanned national ID or trade licence could ever be
 * uploaded, by anyone, in any app.
 *
 * The transport layer already folded `document` into `image` before sending, so
 * documents were anticipated there and never plumbed through validation. Two
 * layers agreeing about a concept the one between them did not know.
 */

function file(type: string, size = 1024): File {
  return new File([new Uint8Array(size)], 'f', { type });
}

describe('document uploads', () => {
  it('accepts a PDF — the case that was broken', () => {
    expect(rejectionReason(file('application/pdf'), 'document')).toBeNull();
  });

  it('accepts a photographed document', () => {
    // A shop owner photographing their NID with a phone is the common case in
    // the field; refusing it would push them to find a scanner.
    for (const t of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(rejectionReason(file(t), 'document')).toBeNull();
    }
  });

  it('still refuses a video as a document', () => {
    expect(rejectionReason(file('video/mp4'), 'document')).not.toBeNull();
  });
});

describe('image uploads stay narrow', () => {
  it('refuses a PDF as an image', () => {
    // The shop photo is image-only, and this is the client half of that rule —
    // the server refuses it too, by purpose.
    const reason = rejectionReason(file('application/pdf'), 'image');
    expect(reason).not.toBeNull();
    expect(reason).toContain('application/pdf');
  });

  it('accepts the image types', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/avif']) {
      expect(rejectionReason(file(t), 'image')).toBeNull();
    }
  });
});

describe('the checks that apply to every kind', () => {
  it('refuses an empty file', () => {
    expect(rejectionReason(file('image/jpeg', 0), 'image')).toBe('That file is empty.');
  });

  it('lets a missing MIME hint through to the server', () => {
    // Some drag sources report no type. Blocking a probably-valid upload on a
    // missing hint costs more than letting the server decide.
    expect(rejectionReason(file(''), 'document')).toBeNull();
  });
});
