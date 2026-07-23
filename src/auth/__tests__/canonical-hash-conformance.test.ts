import { describe, it, expect } from 'vitest';
import vectors from '@bepari/password/vectors.json';
import { hashPassword } from '../passwordHasher';

/**
 * GOLDEN-VECTOR CONFORMANCE LOCK.
 *
 * This test pins the admin app's `hashPassword` to the canonical
 * `@bepari/password` package (tagged v1.0.0). The vectors are imported
 * straight from the package's shipped `vectors.json`, so they are the SAME
 * bytes every other Bepari app is verified against.
 *
 * If anyone ever changes the admin hasher (iterations, digest, key length,
 * prefix, salt normalization, password/identifier encoding, ...) in a way that
 * diverges from the canonical spec, at least one vector below will no longer
 * match and the build fails. This is a security guardrail — do not weaken it.
 */

interface GoldenVector {
  note: string;
  password: string;
  identifier: string;
  expected: string;
}

const goldenVectors = vectors as GoldenVector[];

describe('canonical @bepari/password golden-vector conformance', () => {
  it('ships at least one golden vector', () => {
    expect(goldenVectors.length).toBeGreaterThan(0);
  });

  it.each(goldenVectors)(
    'matches canonical hash for: $note',
    async ({ password, identifier, expected }) => {
      const actual = await hashPassword(password, identifier);
      expect(actual).toBe(expected);
    },
  );
});
