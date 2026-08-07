/**
 * Turning a stored media reference into something a browser can load.
 *
 * The API stores object references, not URLs. `products.product_media.url` and
 * `users.wholesalers.logo_url` hold `gs://bucket/path` — the canonical GCS
 * identity of the object, which is the right thing to persist because it
 * survives a CDN change and says nothing about how it is served.
 *
 * It is NOT a fetchable URL. `gs:` is not a scheme any browser implements, so
 * `<img src="gs://…">` fails before the network is involved, and the CSP names
 * the failure first: img-src allows `https://storage.googleapis.com`, and a
 * `gs:` URI matches no source in the list. The console's product list shipped
 * exactly that mistake — thumbnails silently blocked on every row with a photo.
 *
 * The conversion is a bucket-path rewrite because product media lives in the
 * PUBLIC bucket. Anything in the private bucket is reached through the document
 * proxy instead and never passes through here — see
 * `features/retailers/api/getRetailerDocumentUrl`, which asks the server for a
 * signed URL rather than constructing one.
 */

const GS_PREFIX = 'gs://';
const PUBLIC_HOST = 'https://storage.googleapis.com';

/**
 * A loadable URL, or `null` when there is nothing to show.
 *
 * `null` rather than an empty string so a caller has to decide what an absent
 * image looks like. An empty `src` re-requests the current page in some
 * browsers, which is how a missing thumbnail becomes a duplicate page load.
 */
export function mediaDisplayUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;

  const trimmed = ref.trim();
  if (!trimmed) return null;

  /*
   * `mock-gcs://` is what the local fake-GCS emulator hands back. It is not
   * reachable from a browser and never will be, so it is treated as absent
   * rather than rendered as a broken image on every developer's screen.
   */
  if (trimmed.startsWith('mock-gcs://')) return null;

  // Already renderable: a data URI from a local preview, a blob from the
  // upload flow, or an https URL the server already signed.
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith(GS_PREFIX)) {
    /*
     * Each path segment is encoded, but the separators are not — a product id
     * is a uuid and safe, yet filenames have carried spaces and parentheses,
     * and an unencoded space makes the request 400 rather than 404, which
     * looks like an outage instead of a bad name.
     */
    const objectPath = trimmed.slice(GS_PREFIX.length);
    const encoded = objectPath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${PUBLIC_HOST}/${encoded}`;
  }

  /*
   * Anything else is a relative path the API returned — `/uploads/…` — which
   * Firebase rewrites to Cloud Run. Left alone: it is same-origin and already
   * loadable.
   */
  return trimmed;
}
