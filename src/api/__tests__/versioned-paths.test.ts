import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every path handed to `request()` must be versioned.
 *
 * Firebase Hosting rewrites `/api/**` to Cloud Run and serves `index.html` for
 * everything else. So a path missing the prefix does not 404 — it returns
 * **200 carrying the SPA's own HTML**, which the caller then parses as JSON.
 * Nothing appears in the backend logs, because nothing ever reached the backend.
 *
 * Seven modules had this. Logistics, Messages, Manufacturing, Reward Settings,
 * Sales Brain and Settings had never once talked to the server; each failure
 * surfaced only as "could not be loaded", indistinguishable from a real outage.
 *
 * `const BASE = '/…'` is caught by guard G17. This catches the other shape —
 * a literal written at the call site — where the pattern needs enough regex to
 * be worth writing in a language with real string literals.
 */

const API_DIRS = ['src/api', ...featureApiDirs()];

function featureApiDirs(): string[] {
  const root = 'src/features';
  return readdirSync(root)
    .map((feature) => join(root, feature, 'api'))
    .filter((dir) => {
      try {
        return statSync(dir).isDirectory();
      } catch {
        return false;
      }
    });
}

function tsFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .map((f) => join(dir, f));
}

/**
 * A path literal passed as the SECOND argument of `request(...)`.
 *
 * Only that position is absolute. The `get()` / `patch()` helpers these modules
 * define take a path relative to their own BASE, so their arguments must not be
 * flagged — that distinction is why a blanket "any string starting with /" rule
 * produced thirteen false positives and was abandoned.
 */
const REQUEST_PATH = /request(?:<[^>]*>)?\(\s*['"`][A-Z]+['"`]\s*,\s*(['"`])(\/[^'"`]*)/g;

describe('API paths are versioned', () => {
  it('finds the API modules it claims to check', () => {
    // Guards that scan zero files pass forever. This is what stops a directory
    // rename from turning the test below into a no-op.
    expect(API_DIRS.length).toBeGreaterThan(5);
    const total = API_DIRS.flatMap(tsFiles).length;
    expect(total).toBeGreaterThan(8);
  });

  it('never calls request() with an unversioned path', () => {
    const offenders: string[] = [];

    for (const dir of API_DIRS) {
      for (const file of tsFiles(dir)) {
        const src = readFileSync(file, 'utf8');
        for (const match of src.matchAll(REQUEST_PATH)) {
          const path = match[2]!;
          if (!path.startsWith('/api/')) {
            const line = src.slice(0, match.index).split('\n').length;
            offenders.push(`${file}:${line} → ${path}`);
          }
        }
      }
    }

    expect(
      offenders,
      'Build the path from API_V1. Unprefixed, Firebase serves index.html and ' +
        'the caller parses a web page as JSON — a 200 that never reached the server.',
    ).toEqual([]);
  });

  it('detects an unversioned path when there is one', () => {
    // The regex is the whole test, so it is exercised against a known-bad
    // sample. Without this, a pattern that matches nothing would look green.
    const sample = `
      const a = await request<unknown>('GET', '/settings/staff', { auth: true });
      const b = await request<unknown>('GET', \`\${API_V1}/settings/staff\`);
      const c = await request<Thing>('POST', '/api/v1/orders', { body });
      const d = get('/summary', schema);
    `;
    const found = [...sample.matchAll(REQUEST_PATH)].map((m) => m[2]);

    // The bare one is caught; the API_V1 one starts with `${` so is not a
    // literal path at all; the versioned one is matched but acceptable; the
    // BASE-relative helper call is not a `request()` and is left alone.
    expect(found).toEqual(['/settings/staff', '/api/v1/orders']);
    expect(found.filter((p) => !p!.startsWith('/api/'))).toEqual(['/settings/staff']);
  });
});
