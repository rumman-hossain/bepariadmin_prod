import { describe, it, expect } from 'vitest';
import { mapProductToWizardState } from '../useProductFormLifecycle';
import { buildProductPayload } from '../../utils/buildProductPayload';

/**
 * A FIFTEEN-MINUTE TOKEN WAS BEING WRITTEN TO THE DATABASE.
 *
 *     products.product_media.url = "/api/v1/file/lscRDFAi-VrKND4ovAfDow"
 *
 * Measured on the deployed console: that URL 404'd with a valid session, and
 * two cache-busted `no-store` reads of /admin/products returned the IDENTICAL
 * token — so it was not being minted per response, it was stored. Fifteen
 * minutes after the row was written, the product's images were blank for good.
 *
 * The round trip:
 *
 *   1. a read resolves gs://bucket/object into /api/v1/file/<token>
 *   2. the wizard hydrated `uploadedUrl` from that token
 *   3. buildProductPayload sends `uploadedUrl` back
 *   4. the server stored it
 *
 * Step 2 is this file. `objectRef` is the durable value the server now sends
 * alongside the token, and the payload must carry THAT.
 */

const TOKEN = '/api/v1/file/lscRDFAi-VrKND4ovAfDow';
const OBJECT = 'gs://beparibd-product-dev/product/w/d/f';

/** Only the fields the media fold reads; the real payload is far larger. */
const serverProduct = (over: Record<string, unknown> = {}) =>
  ({
    id: 'p-1',
    name: 'ggg',
    media: [
      { url: TOKEN, objectRef: OBJECT, mediaType: 'image', position: 0 },
      { url: `${TOKEN}-2`, objectRef: `${OBJECT}-2`, mediaType: 'image', position: 1 },
    ],
    ...over,
  }) as never;

/** Every url a save would write, flattened. */
const urlsInPayload = (state: ReturnType<typeof mapProductToWizardState>) => {
  const payload = buildProductPayload(state as never);
  return [
    ...(payload.media ?? []).map((m: { url?: string }) => m.url),
    payload.videoUrl,
    ...(payload.variations ?? []).flatMap((v: { media?: Array<{ url?: string }>; videoUrl?: string }) => [
      ...(v.media ?? []).map((m) => m.url),
      v.videoUrl,
    ]),
  ].filter(Boolean) as string[];
};

describe('hydrating an edit keeps the durable reference', () => {
  it('takes uploadedUrl from objectRef, not from the display token', () => {
    const state = mapProductToWizardState(serverProduct());
    const slots = Object.values(state.productMedia ?? {}).flat() as Array<{
      uploadedUrl?: string;
      localUri?: string;
    }>;
    const stored = slots.map((s) => s.uploadedUrl).filter(Boolean);

    expect(stored.length).toBeGreaterThan(0);
    stored.forEach((u) => expect(u).toMatch(/^gs:\/\//));
  });

  it('still shows the resolved URL, which is the only one a browser can load', () => {
    // gs:// is not fetchable. Hydrating the PREVIEW from it would trade a
    // broken-in-fifteen-minutes image for a broken-immediately one.
    const state = mapProductToWizardState(serverProduct());
    const slots = Object.values(state.productMedia ?? {}).flat() as Array<{ localUri?: string }>;
    const previews = slots.map((s) => s.localUri).filter(Boolean);

    expect(previews.some((u) => u?.startsWith('/api/v1/file/'))).toBe(true);
  });
});

describe('saving an untouched product writes no token', () => {
  it('sends gs:// references and never a /api/v1/file/ path', () => {
    const state = mapProductToWizardState(serverProduct());
    const urls = urlsInPayload(state);

    expect(urls.length).toBeGreaterThan(0);
    urls.forEach((u) => {
      expect(u).not.toContain('/api/v1/file/');
    });
  });

  it('carries the video reference too, not the video token', () => {
    const state = mapProductToWizardState(
      serverProduct({ videoUrl: `${TOKEN}-vid`, videoObjectRef: `${OBJECT}-vid.mp4` }),
    );
    expect(urlsInPayload(state)).not.toContain(`${TOKEN}-vid`);
  });
});

describe('a server too old to send objectRef', () => {
  it('falls back to the url rather than losing the image', () => {
    /*
     * The fallback is deliberate and is NOT a silent corruption path any more:
     * the write path rejects a proxy URL with a 400, so an old server produces
     * a visible failure instead of another row that dies in fifteen minutes.
     * Losing the reference entirely would delete the image on save, which is
     * worse than a refused request.
     */
    const state = mapProductToWizardState(
      serverProduct({ media: [{ url: TOKEN, mediaType: 'image', position: 0 }] }),
    );
    const slots = Object.values(state.productMedia ?? {}).flat() as Array<{ uploadedUrl?: string }>;
    expect(slots.some((s) => s.uploadedUrl === TOKEN)).toBe(true);
  });
});
