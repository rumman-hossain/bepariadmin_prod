import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { mapUser } from '../mapUser';

/**
 * THERE IS ONE `mapUser`, AND THIS IS IT.
 *
 * There were two: `AuthContext.tsx` used one when you sign in or refresh
 * explicitly, `sessionRestore.ts` used its own on the bootstrap that runs on
 * every page load. They were identical, so nothing looked wrong.
 *
 * Adding `secondaryEmail` to the first and not the second shipped a profile
 * field that saved correctly, came back correctly in the PATCH response,
 * displayed correctly — and then read blank after a reload. To an operator that
 * is a save that silently failed. The write was perfectly fine the whole time.
 *
 * A source scan, because the property is "how many definitions exist", which no
 * amount of exercising one of them can answer. Same idiom as the guards in
 * internal/auth and internal/beautify, for the same reason.
 */

// Composed at runtime so this file's own bytes never contain the needle —
// otherwise the guard matches itself, which three separate guards in this
// codebase have each had to learn.
const needle = 'function ' + 'mapUser';
const theOnlyDefinition = 'mapUser.ts';

function tsFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsFilesUnder(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe('one mapping from /auth/me to the session user', () => {
  it('is defined in exactly one file', () => {
    const offenders = tsFilesUnder('src')
      .filter((f) => readFileSync(f, 'utf8').includes(needle))
      .filter((f) => !f.endsWith(theOnlyDefinition));

    expect(
      offenders,
      `A second definition of mapUser. The two WILL drift — that is not a ` +
        `prediction, it already happened: secondaryEmail was added to one and ` +
        `not the other, and the profile field read blank after every reload ` +
        `while saving perfectly. Import from src/auth/mapUser.ts instead.`,
    ).toEqual([]);
  });

  it('carries the fields the profile screen depends on', () => {
    /*
     * The other half. The guard above only counts definitions; if the one that
     * survives quietly stops mapping a field, the same blank-after-reload bug
     * returns with no second copy to blame.
     */
    const mapped = mapUser({
      id: 'u-1',
      name: 'Rumman Hossain',
      email: 'rumman@bepari-bd.com',
      role: 'super_admin',
      phone: '+8801711000000',
      secondaryEmail: 'backup@example.com',
      emailVerified: true,
    });

    expect(mapped.phone).toBe('+8801711000000');
    expect(mapped.secondaryEmail).toBe('backup@example.com');
    expect(mapped.name).toBe('Rumman Hossain');
    expect(mapped.role).toBe('super_admin');
  });

  it('turns an absent optional into undefined rather than an empty string', () => {
    // The profile screen compares against `user.secondaryEmail ?? ''` to decide
    // whether anything changed; '' and undefined must not both appear for the
    // same state or the Save button flickers on with no edit made.
    const mapped = mapUser({ id: 'u-1', emailVerified: true });
    expect(mapped.secondaryEmail).toBeUndefined();
    expect(mapped.phone).toBeUndefined();
  });
});
