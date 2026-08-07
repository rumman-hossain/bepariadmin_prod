import { describe, it, expect } from 'vitest';
import { mediaDisplayUrl } from '../mediaUrl';

/**
 * The bug this exists for, exactly as it reached the browser:
 *
 *   Loading the image 'gs://beparibd-media-bepari-bd-dev/products/…/…' violates
 *   the following Content Security Policy directive:
 *   "img-src 'self' data: blob: https://storage.googleapis.com"
 *
 * The API stores object references, not URLs. `gs:` is not a scheme any browser
 * implements, so it fails before the network is reached — and the CSP names it
 * first, because a `gs:` URI matches no source in the list. Every product row
 * with a photo was blocked.
 */

describe('gs:// references become loadable bucket URLs', () => {
  it('rewrites to the public bucket host the CSP allows', () => {
    expect(mediaDisplayUrl('gs://beparibd-media-bepari-bd-dev/products/abc/def')).toBe(
      'https://storage.googleapis.com/beparibd-media-bepari-bd-dev/products/abc/def',
    );
  });

  it('keeps path separators as separators while encoding the segments', () => {
    // Filenames have carried spaces. An unencoded space makes the request 400,
    // which reads as an outage rather than a bad name; an encoded slash would
    // break the object path entirely.
    expect(mediaDisplayUrl('gs://bucket/products/id/my photo (1).jpg')).toBe(
      'https://storage.googleapis.com/bucket/products/id/my%20photo%20(1).jpg',
    );
  });
});

describe('things that are already loadable pass through untouched', () => {
  it.each([
    ['https://storage.googleapis.com/bucket/a.jpg'],
    ['http://localhost:8080/uploads/a.jpg'],
    ['blob:https://dev.bepari-bd.com/9f3a-1234'],
    ['data:image/png;base64,iVBORw0KGgo='],
  ])('%s', (url) => {
    expect(mediaDisplayUrl(url)).toBe(url);
  });

  /*
   * A data URI is what a local preview produces, and it renders fine — the
   * helper this replaced returned null for it, which would have blanked the
   * preview of an image the user had just picked.
   */
  it('does not discard a data URI, which the old supplier-page helper did', () => {
    expect(mediaDisplayUrl('data:image/png;base64,AAA')).not.toBeNull();
  });

  it('leaves a same-origin relative path alone', () => {
    // Firebase rewrites /uploads/** to Cloud Run, so this is already loadable.
    expect(mediaDisplayUrl('/uploads/products/a.jpg')).toBe('/uploads/products/a.jpg');
  });
});

describe('absent or unloadable references report nothing to show', () => {
  it.each([[undefined], [null], [''], ['   ']])('%s → null', (value) => {
    expect(mediaDisplayUrl(value as string | null | undefined)).toBeNull();
  });

  it('treats the local emulator scheme as absent', () => {
    // `mock-gcs://` is the fake-GCS emulator. It is not reachable from a
    // browser and never will be, so it must not render as a broken image on
    // every developer's screen.
    expect(mediaDisplayUrl('mock-gcs://bucket/a.jpg')).toBeNull();
  });

  /*
   * `null`, not `''`. An empty `src` makes some browsers re-request the current
   * page, which turns a missing thumbnail into a duplicate page load — and
   * forces every caller to decide what "no image" looks like.
   */
  it('returns null rather than an empty string', () => {
    expect(mediaDisplayUrl('')).toBeNull();
    expect(mediaDisplayUrl('')).not.toBe('');
  });
});
