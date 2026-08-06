import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The Content-Security-Policy cannot be weakened without this failing.
 *
 * # Why this exists
 *
 * Cloudflare injects TWO scripts into every HTML response, and the CSP refuses
 * both. Measured, rather than assumed: `bepari-bd-dev.web.app` (Firebase
 * direct) serves 1 script tag — ours; `dev.bepari-bd.com` (through Cloudflare)
 * serves 3.
 *
 * **JavaScript Detections** adds an INLINE script. The console error names the
 * three ways to allow it and all three fail here: `'unsafe-inline'` permits any
 * inline script at all; a hash embeds a per-request ray ID and changes on every
 * load; a nonce cannot be minted by static hosting and Cloudflare's tag would
 * not carry ours. It is turned off in the Cloudflare dashboard, not worked
 * around — see firebase.json.
 *
 * **Web Analytics** adds an external `beacon.min.js`. That one IS allowable with
 * a single host and no `'unsafe-inline'`, and it is allowed, deliberately.
 *
 * `'unsafe-inline'` would remove the main XSS protection on a console that
 * handles staff credentials and KYC documents, in order to quiet a cosmetic
 * warning. It is a plausible, well-intentioned change that would be very hard to
 * spot in review. Hence a test.
 *
 * # Why the allowed hosts are pinned as EXACT SETS
 *
 * `toContain("'self'")` would have accepted the Cloudflare host silently, and it
 * will accept the next one too. A widening that no test notices is how a policy
 * ends up meaning nothing a year later. Asserting the whole set makes every
 * future host a deliberate edit here, next to the reasoning.
 *
 * # Why a test and not a line in guard.sh
 *
 * G17's first version was a shell grep whose regex was mangled by three layers
 * of quoting; it matched nothing and passed against a file deliberately broken
 * to fail it. `firebase.json` is JSON — parsing it is exact, whereas a text
 * pattern breaks the first time somebody reformats the file. The same reasoning
 * moved G17's second half into TypeScript.
 */

const REPO_ROOT = resolve(__dirname, '../..');

interface Header {
  key: string;
  value: string;
}

/** Pulls the CSP out of firebase.json exactly as deployed. */
function deployedCSP(): string {
  const raw = readFileSync(resolve(REPO_ROOT, 'firebase.json'), 'utf8');
  const config = JSON.parse(raw) as {
    hosting?: { headers?: { headers?: Header[] }[] };
  };

  const headers = (config.hosting?.headers ?? []).flatMap((h) => h.headers ?? []);
  const csp = headers.find((h) => h.key.toLowerCase() === 'content-security-policy');

  // A missing header is a failure, not a skip. "No CSP" is the weakest possible
  // policy, and a test that quietly passes when the thing it guards has been
  // deleted is worse than no test.
  if (!csp) throw new Error('no Content-Security-Policy header in firebase.json');
  return csp.value;
}

/** `script-src 'self' https://x` -> ["'self'", 'https://x'] */
function directive(csp: string, name: string): string[] {
  const found = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d === name || d.startsWith(`${name} `));
  if (!found) return [];
  return found.split(/\s+/).slice(1);
}

describe('the deployed Content-Security-Policy', () => {
  const csp = deployedCSP();

  it('does not let inline scripts run', () => {
    // The one that matters most, and the one the Cloudflare console error
    // actively suggests adding.
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-inline'");
  });

  it('does not let strings be evaluated as code', () => {
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-eval'");
  });

  it('loads scripts from this origin and ONE named host, and nothing else', () => {
    /*
     * An exact set, not a containment check.
     *
     * The Cloudflare Web Analytics beacon is a deliberate exception: an external
     * script, admitted by host, with no 'unsafe-inline'. Everything about that
     * sentence is a decision, and the next person to add a host should have to
     * change this line and say why.
     */
    expect(directive(csp, 'script-src')).toEqual([
      "'self'",
      'https://static.cloudflareinsights.com',
    ]);
  });

  it('lets the beacon REPORT, which is a different host and a different directive', () => {
    /*
     * beacon.min.js posts to https://cloudflareinsights.com/cdn-cgi/rum via
     * navigator.sendBeacon — read out of the script, not guessed — and
     * sendBeacon is governed by connect-src, not script-src.
     *
     * Allowing only the script host swaps a script-src violation for a
     * connect-src one. Both halves or neither.
     */
    expect(directive(csp, 'connect-src')).toEqual([
      "'self'",
      'https://storage.googleapis.com',
      'https://cloudflareinsights.com',
    ]);
  });

  it('never admits a wildcard host', () => {
    // A wildcard would defeat the directive as thoroughly as 'unsafe-inline',
    // just less obviously. Kept as its own assertion so it still applies if the
    // exact-set lists above are ever relaxed.
    for (const name of ['script-src', 'connect-src', 'default-src']) {
      const sources = directive(csp, name);
      expect(sources).not.toContain('*');
      expect(sources.some((s) => s.includes('*'))).toBe(false);
    }
  });

  it.each([
    // Plugins and embeds — a live Flash/PDF vector.
    ['object-src', "'none'"],
    // Stops an injected <base> silently repointing every relative URL.
    ['base-uri', "'self'"],
    // Clickjacking. 'none' is stricter than SAMEORIGIN and correct for a console
    // that is never framed.
    ['frame-ancestors', "'none'"],
    // Stops a form being posted to an attacker's host.
    ['form-action', "'self'"],
  ])('keeps %s locked to %s', (name, expected) => {
    expect(directive(csp, name)).toEqual([expected]);
  });

  it('still allows inline STYLES, deliberately', () => {
    // Needed for the scrollbar block in index.html and Google Fonts' injected
    // stylesheet, and documented in firebase.json. It does not affect script
    // execution. Asserted rather than merely tolerated, so nobody "tightens"
    // it and breaks the fonts believing they are hardening the policy.
    expect(directive(csp, 'style-src')).toContain("'unsafe-inline'");
  });
});

describe('the check itself', () => {
  // The G17 lesson: a guard that cannot fail is worse than no guard, because it
  // reads as coverage. These prove the assertions above are actually looking at
  // something.
  const WEAKENED =
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src *; base-uri *";

  it('sees unsafe-inline when it is present', () => {
    expect(directive(WEAKENED, 'script-src')).toContain("'unsafe-inline'");
  });

  it('sees unsafe-eval when it is present', () => {
    expect(directive(WEAKENED, 'script-src')).toContain("'unsafe-eval'");
  });

  it('sees an extra host slipped into script-src', () => {
    // The exact-set assertion is the new one, so prove it can fail: a host
    // added without a reason must not pass silently.
    expect(directive("script-src 'self' https://evil.example", 'script-src')).not.toEqual([
      "'self'",
      'https://static.cloudflareinsights.com',
    ]);
  });

  it('sees a loosened object-src', () => {
    expect(directive(WEAKENED, 'object-src')).not.toEqual(["'none'"]);
  });

  it('returns nothing for a directive that is absent', () => {
    // Absent must not read as "present and safe" — this is what would happen if
    // frame-ancestors were deleted outright.
    expect(directive(WEAKENED, 'frame-ancestors')).toEqual([]);
  });

  it('does not confuse one directive for another with the same prefix', () => {
    // 'script-src' must not match 'script-src-elem'. A naive startsWith without
    // the trailing space would.
    const csp = "script-src-elem 'unsafe-inline'; script-src 'self'";
    expect(directive(csp, 'script-src')).toEqual(["'self'"]);
  });
});
