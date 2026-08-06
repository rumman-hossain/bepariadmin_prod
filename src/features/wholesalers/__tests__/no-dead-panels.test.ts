import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * THE SCREEN DOES NOT APOLOGISE, BECAUSE IT DOES NOT DRAW WHAT IT CANNOT FILL.
 *
 * MEASURED ON DEV, on the seeded supplier. The detail screen laid out
 * `lg:grid-cols-3` and gave the right `col-span-2` to three panels — Assigned
 * orders, Payout history, Decision history — whose four sources all lived in
 * `api/stubs.ts`:
 *
 *     export async function listWholesalerOrders(_id) { return []; }
 *     export async function getWholesalerStats(_id)   { return null; }
 *
 * Not endpoints returning empty. Functions returning nothing, unconditionally.
 * So two thirds of the screen could never contain anything, and said so five
 * times: one "Performance metrics are not connected" banner, plus the sentence
 * "This will populate once the endpoint is connected. It does not mean there is
 * no activity." under each of the four empty tables.
 *
 * Meanwhile the four certificates an operator approves a supplier ON were a row
 * inside Business Profile, in the remaining third, between Company Logo and
 * Addresses.
 *
 * These guards are about the RULE, not the wording: a screen must not render a
 * surface it has no data for, and must not explain the gap instead of closing
 * it. The wording changes; the temptation does not.
 *
 * # The products panel that briefly replaced them is also gone
 *
 * It listed what a supplier sells, which was real data on a real endpoint — and
 * you asked for it removed as unnecessary, to be re-added only if a need for it
 * appears. The rule below still holds either way: whatever this screen shows
 * next must be something it can actually fill.
 */

const FEATURE = resolve(__dirname, '..');

/** Every .ts/.tsx under the supplier feature, tests excluded. */
function featureSources(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') walk(full);
      } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        out.push({ path: full, text: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(FEATURE);
  return out;
}

/**
 * Source with block and line comments stripped.
 *
 * Every guard here reads CODE, never prose. The files deliberately explain the
 * deleted apology in their comments — including quoting it — and a guard that
 * fires on its own explanation is one somebody deletes rather than keeps. That
 * mistake has already been made twice in this repo.
 */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('no panel apologises for a missing endpoint', () => {
  const APOLOGIES = [
    'This will populate once the endpoint is connected',
    'no endpoint yet',
    'are not connected',
    'It does not mean there is no activity',
  ];

  it('none of that copy reaches the screen', () => {
    for (const file of featureSources()) {
      const body = code(file.text);
      for (const phrase of APOLOGIES) {
        expect(body, `${file.path} still says "${phrase}"`).not.toContain(phrase);
      }
    }
  });
});

describe('no data source returns a hardcoded nothing', () => {
  it('the stub chain is gone and has not grown back', () => {
    /*
     * `api/stubs.ts` and the hook and two components built on it were deleted.
     * The way this returns is somebody adding `return []` "just for now" to
     * unblock a panel — which is how the last four got there.
     */
    const offenders = featureSources().filter((f) => {
      const body = code(f.text);
      return /async function \w+\([^)]*\)[^{]*\{\s*return (\[\]|null);\s*\}/.test(body);
    });
    expect(
      offenders.map((f) => f.path),
      'a supplier data source returns a literal empty value',
    ).toEqual([]);
  });

  it('nothing imports the deleted modules', () => {
    for (const file of featureSources()) {
      const body = code(file.text);
      expect(body, `${file.path} imports api/stubs`).not.toMatch(/from '.*api\/stubs'/);
      expect(body, `${file.path} imports useWholesalerActivity`).not.toContain(
        'useWholesalerActivity',
      );
      expect(body, `${file.path} imports WholesalerActivityPanels`).not.toContain(
        'WholesalerActivityPanels',
      );
      expect(body, `${file.path} imports WholesalerDetailStats`).not.toContain(
        'WholesalerDetailStats',
      );
    }
  });
});

describe('the checks can fail', () => {
  // A guard that cannot fail reads as coverage.
  it('finds the apology when it is genuinely present', () => {
    const planted = 'message="This will populate once the endpoint is connected"';
    expect(code(planted)).toContain('This will populate once the endpoint is connected');
  });

  it('strips comments rather than matching them', () => {
    const commented = '/* This will populate once the endpoint is connected */\nconst a = 1;';
    expect(code(commented)).not.toContain('This will populate');
    expect(code(commented)).toContain('const a = 1;');
  });

  it('reads a feature that genuinely has files in it', () => {
    expect(featureSources().length).toBeGreaterThan(10);
  });
});
