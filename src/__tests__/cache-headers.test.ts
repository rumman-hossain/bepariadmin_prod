import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A deploy must reach the browser.
 *
 * # What went wrong
 *
 * `firebase.json` put `Cache-Control: no-cache` on `/index.html`, which reads as
 * correct and is not. Firebase matches header rules against the **requested
 * path**, not the file a rewrite resolves to — so that rule fires only when
 * somebody literally requests `/index.html`. Every real navigation
 * (`/retailers`, `/dashboard`, `/`) matched only `**`, which set no
 * Cache-Control at all, and took Firebase's `max-age=3600` default.
 *
 * Measured live: `/retailers` returned `cache-control: max-age=3600` while
 * `/index.html` returned `no-cache`.
 *
 * The effect is worse than a stale page. A fix ships, the person who asked for
 * it reloads, gets the PREVIOUS bundle for up to an hour, and reports the bug as
 * still present — which is exactly what happened with the retailer delete. The
 * cost is not the caching; it is the hour of believing the wrong thing.
 *
 * # Why the ordering is asserted
 *
 * All matching rules apply and later ones win, so `/assets/**` must come AFTER
 * the catch-all. Reversed, every fingerprinted asset would revalidate on every
 * request — a performance regression with no error to notice it by.
 */

interface Header {
  key: string;
  value: string;
}
interface Rule {
  source: string;
  headers?: Header[];
}

function rules(): Rule[] {
  const raw = readFileSync(resolve(__dirname, '../..', 'firebase.json'), 'utf8');
  const config = JSON.parse(raw) as { hosting?: { headers?: Rule[] } };
  const found = config.hosting?.headers;
  if (!found?.length) throw new Error('no hosting.headers in firebase.json');
  return found;
}

function cacheControlFor(source: string): string | undefined {
  return rules()
    .find((r) => r.source === source)
    ?.headers?.find((h) => h.key.toLowerCase() === 'cache-control')?.value;
}

describe('the entry document', () => {
  it('revalidates on EVERY path, not only /index.html', () => {
    // The whole defect in one assertion. `**` is what a navigation to
    // /retailers actually matches.
    expect(cacheControlFor('**')).toBe('no-cache');
  });

  it('does not let any rule cache HTML for a period', () => {
    // A `max-age` on the catch-all would reintroduce the same bug wearing a
    // different number.
    const catchAll = cacheControlFor('**') ?? '';
    expect(catchAll).not.toMatch(/max-age=[1-9]/);
  });
});

describe('fingerprinted assets', () => {
  it('are cached for a year and marked immutable', () => {
    const assets = cacheControlFor('/assets/**') ?? '';
    expect(assets).toContain('max-age=31536000');
    expect(assets).toContain('immutable');
  });

  it('are declared AFTER the catch-all, or they would revalidate every request', () => {
    const sources = rules().map((r) => r.source);
    const catchAll = sources.indexOf('**');
    const assets = sources.indexOf('/assets/**');

    expect(catchAll).toBeGreaterThanOrEqual(0);
    expect(assets).toBeGreaterThan(catchAll);
  });
});

/**
 * The document proxy serves KYC files through /api/v1/doc/<token>, and sets its
 * own Cache-Control and CSP for them. Firebase REPLACES those.
 *
 * Header rules match the requested path, and a Cloud Run rewrite is still a
 * request for that path — so `**` matched /api/v1/doc/... and overwrote the two
 * headers the backend had chosen. Measured on a live PNG through the proxy:
 * `cache-control: no-cache` came back instead of `private, no-store`, and the
 * console's whole policy came back instead of `default-src 'none'; sandbox`.
 *
 * Nothing reported it. The file still rendered; only the protection was gone.
 *
 * Kept in sync by hand with writeDocumentHeaders in
 * beparibd-backend/internal/admin/document_proxy.go, which
 * TestTheResponseCannotBeSniffedOrExecuted pins on that side.
 */
describe('the document proxy keeps its own headers', () => {
  const PROXY = '/api/v1/doc/**';

  function headerFor(source: string, key: string): string | undefined {
    return rules()
      .find((r) => r.source === source)
      ?.headers?.find((h) => h.key.toLowerCase() === key)?.value;
  }

  it('is never stored, not even in the operator’s own disk cache', () => {
    // `no-cache` permits storing and only forces revalidation, so a national ID
    // would survive on disk after sign-out. `no-store` is the one that does not.
    expect(headerFor(PROXY, 'cache-control')).toBe('private, no-store');
  });

  it('sandboxes the bytes rather than granting them the console’s policy', () => {
    // The upload gate allows no SVG and no HTML, which is what keeps this from
    // being exploitable today. The sandbox is there so that allow-list is not
    // the only thing standing between an uploaded file and the origin.
    expect(headerFor(PROXY, 'content-security-policy')).toBe("default-src 'none'; sandbox");
  });

  it('is declared AFTER the catch-all, or the catch-all wins and nothing changes', () => {
    const sources = rules().map((r) => r.source);
    expect(sources.indexOf(PROXY)).toBeGreaterThan(sources.indexOf('**'));
  });

  it('does not loosen the rest of the API to fix one route', () => {
    // Scoped deliberately. The JSON endpoints are correct under the catch-all,
    // and a blanket /api/** rule would be a larger change than the defect.
    expect(rules().map((r) => r.source)).not.toContain('/api/**');
  });
});

describe('the check itself', () => {
  // A guard that cannot fail reads as coverage.
  it('reports undefined for a source with no Cache-Control', () => {
    // This is precisely the state `**` was in — present, but silent on caching,
    // so the platform default applied and nothing said so.
    expect(cacheControlFor('/a-source-that-does-not-exist')).toBeUndefined();
  });
});
