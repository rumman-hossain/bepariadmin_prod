import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * THE PARTY IS CALLED A SUPPLIER.
 *
 * Not "wholesaler". The business uses one word for the people who sell into the
 * marketplace, and the console had been using both — the list header said
 * "Wholesalers" directly above a subtitle that said "5 suppliers", and the Add
 * Product wizard asked for a "Wholesaler" while Payments and Manufacturing both
 * headed the same column "Supplier".
 *
 * # Why a scan and not a review
 *
 * Wording drifts one screen at a time, and every individual instance looks
 * harmless. Nothing about writing `label="Wholesaler"` on a new form fails, so
 * the only thing that catches it is something that reads every string.
 *
 * # What this deliberately does NOT touch
 *
 * The word is still everywhere underneath, and has to be. `user_type:
 * 'wholesaler'` is what the server sends back at login; `draftPurpose:
 * 'wholesaler'` is what the upload service accepts; `wholesaler_id` is a query
 * parameter; `/api/v1/admin/wholesalers` is the endpoint and `/wholesalers/:id`
 * is the route. Renaming any of those breaks sign-in, uploads or filtering for
 * a change nobody can see — so the allowlist below is the point of this test as
 * much as the scan is.
 *
 * Type names, hooks, folders and variables are ignored wholesale: they are not
 * words on a screen, and this is a guard about words on screens.
 */

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const SRC = join(ROOT, 'src');

/** Text that legitimately contains the word. Each one is a wire value or a path. */
const ALLOWED = [
  // The role the server issues at login and every consumer switches on.
  /^wholesaler$/,
  // Upload purposes, checked by the server's IsValidPurpose — it refuses
  // anything else, including "supplier".
  /^wholesaler:/,
  // A query parameter the catalogue endpoint reads.
  /^wholesaler_id$/,
  // Endpoint paths and the console's own route.
  /^\/api\//,
  /^\/wholesalers/,
  // Cache keys and the route id they are derived from.
  /^wholesalers$/,
  // Field names, on the wire and in form state.
  /^wholesaler(Id|Code|Name)$/,
  // An invariant thrown at a developer who renders a section outside its
  // provider. It names two React components, so it keeps their spelling.
  /rendered inside <WholesalerFormProvider>/,
  // Module specifiers. The folder is still `features/wholesalers` — renaming
  // it was explicitly out of scope — and no label ever begins "./" or "@/src/".
  /^\.{1,2}\//,
  /^@\/src\//,
  // An Error subclass's own `name`, which appears in stack traces and in
  // `instanceof` narrowing. It is the class, not a sentence.
  /^WholesalerApiError$/,
];

/**
 * Every string literal in a file, with comments and `${…}` removed.
 *
 * Written as a scanner rather than a regex, and that is not fussiness — the
 * first version was a regex and it reported 40 false positives on the first
 * run. Two reasons, both instructive:
 *
 *   - half the doc comments in this repo explain some function's
 *     wholesaler-shaped history and quote identifiers in backticks. A regex
 *     looking for quoted text finds `useWholesalerForm` inside a comment and
 *     cannot tell it from a label;
 *   - `` `${wholesalers.length} suppliers` `` is a correct string. What reaches
 *     the screen is "suppliers"; `wholesalers` is a variable name that happens
 *     to sit inside the same backticks.
 *
 * So: comments never contribute, and a template contributes only its literal
 * parts. What is left is the text a browser would paint.
 */
function stringLiterals(source: string): string[] {
  const out: string[] = [];
  let i = 0;

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (c === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      let text = '';
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') {
          i += 2;
          continue;
        }
        // A template's interpolations are code, not words. Skip to the matching
        // brace so a variable name cannot be mistaken for a label.
        if (quote === '`' && source[i] === '$' && source[i + 1] === '{') {
          let depth = 1;
          i += 2;
          while (i < source.length && depth > 0) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}') depth--;
            i++;
          }
          continue;
        }
        text += source[i];
        i++;
      }
      i++;
      out.push(text);
      continue;
    }

    i++;
  }

  return out;
}

/** Everything under src, minus what is not shipped to a browser. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Tests describe the old wording when they explain a fix; the preview
      // pages are design documentation, not the app.
      if (entry.name === '__tests__' || entry.name === 'preview') continue;
      sourceFiles(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

function offendingLiterals(source: string): string[] {
  return stringLiterals(source).filter(
    (text) => /wholesal/i.test(text) && !ALLOWED.some((rule) => rule.test(text)),
  );
}

describe('no screen says "wholesaler"', () => {
  it('across every shipped source file', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC)) {
      for (const text of offendingLiterals(readFileSync(file, 'utf8'))) {
        offenders.push(`${relative(ROOT, file)}: ${JSON.stringify(text)}`);
      }
    }

    expect(
      offenders,
      'these strings still say "wholesaler". The word an operator reads is ' +
        '"supplier" — if one of these is a wire value rather than a label, add ' +
        'it to ALLOWED with a note saying what would break if it changed:\n  ' +
        offenders.join('\n  '),
    ).toEqual([]);
  });

  it('and the scan can actually fail', () => {
    // A guard that only ever reports nothing is indistinguishable from a guard
    // that reads nothing.
    expect(offendingLiterals(`const a = "Wholesalers";`)).toEqual(['Wholesalers']);
    expect(offendingLiterals(`label('All Wholesalers')`)).toEqual(['All Wholesalers']);
  });

  it('leaves the wire alone', () => {
    // The half that matters more. Each of these breaks something real if it is
    // "fixed" — sign-in, uploads, filtering, routing.
    for (const wire of [
      `user_type: 'wholesaler',`,
      `draftPurpose: 'wholesaler',`,
      `params.set('wholesaler_id', id)`,
      `fetch('/api/v1/admin/wholesalers/1')`,
      `rowHref={() => '/wholesalers/1'}`,
      `all: ['wholesalers'] as const`,
    ]) {
      expect(offendingLiterals(wire), `flagged a wire value: ${wire}`).toEqual([]);
    }
  });

  it('ignores comments, which is where the repo talks about wholesalers', () => {
    /*
     * The first version of this was a regex and it reported 40 false positives,
     * nearly all of them identifiers quoted in doc comments. A guard that cries
     * wolf gets an allowlist entry per complaint until it guards nothing.
     */
    expect(offendingLiterals('// see `useWholesalerForm` for why\n')).toEqual([]);
    expect(offendingLiterals('/** `listWholesalers` was called from five places */')).toEqual([]);
  });

  it('reads a template’s words, not the names of its variables', () => {
    // `${wholesalers.length} suppliers` is correct: the screen says "suppliers".
    expect(offendingLiterals('const s = `${wholesalers.length} suppliers`;')).toEqual([]);
    // And the literal half is still read.
    expect(offendingLiterals('const s = `${n} Wholesalers`;')).toEqual([' Wholesalers']);
  });

  it('reads a meaningful number of files, not an empty directory', () => {
    // The other way a scan passes for the wrong reason.
    expect(sourceFiles(SRC).length).toBeGreaterThan(200);
  });
});
