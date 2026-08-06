import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePassword as packagePolicy } from 'nextgen-password';
import { validatePassword as appPolicy, isValidPassword } from '@/src/utils/validation';
import { wholesalerSchema } from '@/src/features/wholesalers/schemas/wholesalerSchema';
import { REQUIRED_DOCUMENT_NAMES } from '@/src/features/wholesalers/constants/documents';

/**
 * Locks every password rule in the admin app to the ONE canonical policy in
 * `nextgen-password`.
 *
 * Before this, the app carried three different definitions:
 *   - src/utils/validation.ts       — required + >= 8 chars
 *   - wholesalerSchema.ts           — >= 8 chars only
 *   - nextgen-password (canonical)  — required + >= 8 + uppercase + digit
 *
 * Because the admin app writes passwords on behalf of wholesalers, the weakest
 * of those won: an admin could onboard an account with "password", which the
 * mobile app then refuses at its own registration screen. The user is locked
 * out of the app they were onboarded for, and nothing reports an error.
 *
 * These cases are the drift itself — each one passed the old admin rules and
 * failed the canonical ones.
 */
const REJECTED_BY_CANON_ACCEPTED_BY_OLD_ADMIN = [
  'password',      // no uppercase, no digit
  'lowercase123',  // no uppercase
  'PASSWORD',      // no digit
  'UPPERlower',    // no digit
];

/*
 * These were `['Kf7mQp2x', 'Bepari2026!', 'Aa1aaaaa']` — the most common
 * password in the world, the product name plus a year, and seven identical
 * characters. Every one satisfied the structural rules, and writing them here
 * as the canonical examples of "valid" is a large part of why the weakness went
 * unnoticed. The policy now carries a strength floor and rejects all three.
 */
const VALID = ['Kf7mQp2x', 'Rahman2026', 'BrandNew99'];

/** Structurally compliant, and still guessable. The floor is what stops them. */
const COMPLIANT_BUT_GUESSABLE = ['Password1', 'Bepari2026!', 'Aa1aaaaa'];

describe('admin password policy conformance', () => {
  it('matches the canonical package exactly, verdict for verdict', () => {
    const cases = [
      ...REJECTED_BY_CANON_ACCEPTED_BY_OLD_ADMIN,
      ...VALID,
      '',
      'Aa1',        // too short
      'Aa1aaaa',    // 7 chars, one short
    ];
    for (const value of cases) {
      expect(appPolicy(value).valid, `disagreement on "${value}"`).toBe(packagePolicy(value).valid);
      expect(isValidPassword(value), `isValidPassword disagreement on "${value}"`).toBe(
        packagePolicy(value).valid,
      );
    }
  });

  it('rejects what the old admin rules used to let through', () => {
    for (const weak of REJECTED_BY_CANON_ACCEPTED_BY_OLD_ADMIN) {
      expect(weak.length, `"${weak}" should be >= 8 so only the new rules can reject it`)
        .toBeGreaterThanOrEqual(8);
      expect(appPolicy(weak).valid, `"${weak}" should now be rejected`).toBe(false);
      expect(appPolicy(weak).message, `"${weak}" should explain why`).not.toBe('');
    }
  });

  it('accepts compliant passwords', () => {
    for (const value of VALID) {
      expect(appPolicy(value).valid, `"${value}" should be accepted`).toBe(true);
      expect(appPolicy(value).message).toBe('');
    }
  });

  it('normalises the optional message to a string for existing call sites', () => {
    // The package returns `message?: string`; the app's ~4 call sites render
    // `message` directly, so undefined would print as "undefined".
    expect(appPolicy('Kf7mQp2x').message).toBe('');
    expect(typeof appPolicy('short').message).toBe('string');
  });
});

describe('wholesaler onboarding schema', () => {
  // Zod skips `superRefine` when the base object itself fails, so the fixture
  // has to satisfy every other required field for the password rule to run.
  const base = {
    companyName: 'Test Traders',
    ownerName: 'Owner',
    email: 'owner@example.com',
    mobile: '01712345678',
    categories: ['grocery'],
    addresses: [
      { addressType: 'primary', district: 'Dhaka', postalCode: '1200', addressLine: '1 Road' },
    ],
    /*
     * The four certificates, because onboarding now requires them.
     *
     * Added when that rule landed, and the test below is what caught it: it
     * asserts the fixture is valid apart from the password precisely so that a
     * NEW requirement cannot make every case above pass for the wrong reason.
     * Without the documents each `rejects the guessable password` case would
     * have kept passing while testing nothing about passwords at all.
     */
    uploadDraftId: 'draft-1',
    documents: REQUIRED_DOCUMENT_NAMES.map((name) => ({
      name,
      status: 'pending',
      fileUrl: `uploads/draft-1/${name}`,
    })),
  };

  it.each(COMPLIANT_BUT_GUESSABLE)('rejects the guessable password %p', (pw) => {
    // Onboarding writes a password on someone ELSE'S behalf, so it is the one
    // place a weak choice is imposed rather than chosen.
    expect(wholesalerSchema.safeParse({ ...base, password: pw }).success).toBe(false);
  });

  it('the fixture is otherwise valid, so a failure can only be the password', () => {
    const result = wholesalerSchema.safeParse({ ...base, password: 'Kf7mQp2x' });
    if (!result.success) {
      throw new Error(
        `fixture is incomplete: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      );
    }
    expect(result.success).toBe(true);
  });

  it('rejects an onboarding password the mobile app would refuse', () => {
    const result = wholesalerSchema.safeParse({ ...base, password: 'password' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'password');
      expect(issue, 'expected a password issue').toBeDefined();
      // The message comes from the package, so onboarding and the mobile app
      // tell the wholesaler the same thing.
      expect(issue!.message).toBe(packagePolicy('password').message);
    }
  });

  it('accepts a compliant onboarding password', () => {
    const result = wholesalerSchema.safeParse({ ...base, password: 'Kf7mQp2x' });
    const passwordIssue = result.success
      ? undefined
      : result.error.issues.find((i) => i.path[0] === 'password');
    expect(passwordIssue).toBeUndefined();
  });

  it('does not demand a password when editing an existing wholesaler', () => {
    const result = wholesalerSchema.safeParse({ ...base, id: 'w-1' });
    const passwordIssue = result.success
      ? undefined
      : result.error.issues.find((i) => i.path[0] === 'password');
    expect(passwordIssue).toBeUndefined();
  });
});

// ─── The write paths, not just the validators ────────────────

describe('every screen that SETS a password uses the canonical policy', () => {
  /*
   * The validators above were already conformant. The gap this closes is that
   * nothing checked the components — and one of them had its own rule.
   *
   * `ResetWholesalerPasswordCard` is where an admin sets a SUPPLIER's password.
   * It validated `newPassword.length < 8` and nothing else, so a supplier could
   * be issued "lowercase123" — a credential their own app would refuse to let
   * them choose. It is the same drift this file was written to stop, one layer
   * out from where the file was looking.
   */
  it('rejects, in the supplier reset card, everything the package rejects', () => {
    const src = fs.readFileSync(
      new URL(
        '../../features/wholesalers/components/ResetWholesalerPasswordCard.tsx',
        import.meta.url,
      ),
      'utf8',
    );

    // A source assertion, deliberately: the component's validate() is not
    // exported and rendering it needs a supplier fixture and a toast provider.
    // What matters is which policy it calls, and that is visible here.
    expect(src, 'the supplier reset card must call the shared validatePassword').toContain(
      'validatePassword(newPassword)',
    );
    expect(
      stripComments(src),
      'a bare length check means a local policy has come back',
    ).not.toMatch(/newPassword\.length\s*<\s*\d/);
  });

  it('has no other length-only password check anywhere in the app', () => {
    /*
     * The general form of the same bug. `>= 8` written by hand is always a
     * weaker duplicate of the canonical policy, because the canonical one also
     * requires an uppercase letter and a digit.
     */
    // Comments are stripped first. A docstring explaining which check was
    // REMOVED must not read as the check still being there — the first version
    // of this test failed on its own explanatory comment.
    const matches = globSyncSources().filter((f) =>
      /(password|newPassword|confirmPassword)\w*\.length\s*<\s*\d/.test(stripComments(f.text)),
    );
    expect(
      matches.map((m) => m.path),
      'these files check password length directly instead of using validatePassword',
    ).toEqual([]);
  });
});

/** Removes line and block comments so prose cannot trip a source assertion. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Every app source file, for the sweep above. */
function globSyncSources(): Array<{ path: string; text: string }> {
  const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const out: Array<{ path: string; text: string }> = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push({ path: path.relative(root, full), text: fs.readFileSync(full, 'utf8') });
      }
    }
  };
  walk(root);
  return out;
}


describe('the strength floor reaches the admin app', () => {
  /*
   * The floor lives in the package; this asserts it is actually in force here.
   * All three satisfied every rule the admin had before it existed — and all
   * three were previously listed in this file as examples of a VALID password.
   */
  it.each(COMPLIANT_BUT_GUESSABLE)('rejects %p, which satisfies every structural rule', (pw) => {
    expect(appPolicy(pw).valid).toBe(false);
    expect(packagePolicy(pw).valid).toBe(false);
  });
});
