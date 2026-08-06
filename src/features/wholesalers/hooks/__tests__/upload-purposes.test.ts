import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Upload purposes must be ones the server accepts.
 *
 * The server's `IsValidPurpose` (internal/upload/purpose.go) accepts:
 *
 *   logo | product | product:* | variation:* | nid | trade | vat | tin | shop_photo
 *
 * and nothing else. The console was sending `wholesaler:logo` and
 * `wholesaler:document:tin`, both of which it rejects — measured directly
 * against the Go function. So every supplier upload failed on the purpose alone,
 * independently of the 401 that stopped admins reaching the endpoint at all.
 * Two separate reasons the supplier Documents section never worked, and fixing
 * one would have left the other.
 *
 * A grep rather than a render test, because the failure is a STRING LITERAL
 * that no amount of component testing would inspect. The bug shipped precisely
 * because nothing ever compared these constants to the server's list.
 */

const SERVER_PURPOSES = new Set([
  'logo',
  'product',
  'nid',
  'trade',
  'vat',
  'tin',
  'shop_photo',
]);

/** Prefixed forms the server accepts via prefix match. */
const PREFIXED_OK = ['product:', 'variation:'];

function purposeLiteralsIn(relPath: string): string[] {
  const src = readFileSync(resolve(__dirname, '../../../../..', relPath), 'utf8');
  // `purpose: 'x'` and `purpose: \`x\`` — the two shapes used.
  return [...src.matchAll(/purpose:\s*['"`]([^'"`$]+)['"`]/g)].map((m) => m[1]!);
}

function isAcceptable(p: string): boolean {
  return SERVER_PURPOSES.has(p) || PREFIXED_OK.some((pre) => p.startsWith(pre));
}

describe('upload purposes match what the server accepts', () => {
  it.each([
    'src/features/wholesalers/hooks/useWholesalerAssets.ts',
    'src/features/retailers/hooks/useRetailerAssets.ts',
  ])('%s sends only valid purposes', (file) => {
    const literals = purposeLiteralsIn(file);
    // A file with no literals would pass vacuously — that is how a guard stops
    // guarding without anyone noticing.
    expect(literals.length).toBeGreaterThan(0);
    for (const p of literals) {
      expect(isAcceptable(p), `"${p}" is not a purpose the server accepts`).toBe(true);
    }
  });

  it('rejects the shapes that were actually being sent', () => {
    // The check must fire against the real historical values, or it proves
    // nothing.
    expect(isAcceptable('wholesaler:logo')).toBe(false);
    expect(isAcceptable('wholesaler:document:tin')).toBe(false);
    expect(isAcceptable('tradeLicense')).toBe(false);
  });
});
