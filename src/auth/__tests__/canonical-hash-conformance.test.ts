import { describe, it, expect } from 'vitest';
import vectors from 'nextgen-password/vectors.json';
import { hashPassword, hashPasswordV2 } from '../passwordHasher';

/**
 * GOLDEN-VECTOR CONFORMANCE LOCK.
 *
 * This test pins the admin app's hashers to the canonical `nextgen-password`
 * package. The vectors are imported straight from the package's shipped
 * `vectors.json`, so they are the SAME bytes every other Bepari app is verified
 * against.
 *
 * - v3 (CURRENT): identifier-independent. `hashPassword(password)` must equal the
 *   `pbkdf2v3:` expected hash.
 * - v2 (LEGACY): salt = normalized identifier. `hashPasswordV2(password, identifier)`
 *   must equal the `pbkdf2v2:` expected hash. Retained only so we can never drift
 *   from the value the server verifies for a not-yet-migrated user.
 *
 * If anyone ever changes a hasher (iterations, digest, key length, prefix, salt
 * normalization, password/identifier encoding, ...) in a way that diverges from
 * the canonical spec, at least one vector below will no longer match and the
 * build fails. This is a security guardrail — do not weaken it.
 */

interface V3Vector {
  note: string;
  password: string;
  expected: string;
}

interface V2Vector {
  note: string;
  password: string;
  identifier: string;
  expected: string;
}

const v3 = (vectors as { v3: V3Vector[] }).v3;
const v2 = (vectors as { v2: V2Vector[] }).v2;

describe('canonical nextgen-password golden-vector conformance', () => {
  it('ships v3 and v2 golden vectors', () => {
    expect(v3.length).toBeGreaterThan(0);
    expect(v2.length).toBeGreaterThan(0);
  });

  it.each(v3)(
    'v3 hashPassword matches canonical hash for: $note',
    async ({ password, expected }) => {
      const actual = await hashPassword(password);
      expect(actual).toBe(expected);
    },
  );

  it.each(v2)(
    'v2 hashPasswordV2 matches canonical hash for: $note',
    async ({ password, identifier, expected }) => {
      const actual = await hashPasswordV2(password, identifier);
      expect(actual).toBe(expected);
    },
  );
});
