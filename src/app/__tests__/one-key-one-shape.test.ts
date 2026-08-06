import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A CACHE KEY MUST MEAN EXACTLY ONE SHAPE.
 *
 * MEASURED ON DEV: Suppliers → Products blanked the entire console with React
 * error #31.
 *
 * `queryKeys.catalog.categories()` was used by three hooks that declared their
 * OWN `queryFn` — two returning `CategoryOption[]`, one returning
 * `Record<string, string>`. React Query stores one entry per key, so whichever
 * mounted first won and the others read the other's shape without ever
 * noticing: a populated entry inside `staleTime` never re-runs its `queryFn`.
 *
 * The Products screen then did `Object.entries(categoryNames)`. Over a Record
 * that yields `[[id, name]]`; over an ARRAY it yields
 * `[["0", {id,name,slug,sortOrder,createdAt}]]` — so a category OBJECT became
 * an `<option>` label, and React refuses to render an object as a child.
 *
 * This guard is about the CLASS, not that one key: two `queryFn`s on one key is
 * always a latent shape collision, and it is invisible until two screens happen
 * to be visited in the wrong order.
 */

const SRC = resolve(__dirname, '..', '..');

function sources(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['__tests__', 'node_modules', 'design-system'].includes(entry.name)) walk(full);
      } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        out.push({ path: full.replace(SRC, 'src'), text: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(SRC);
  return out;
}

/** Comments stripped — these files explain the bug, and quote the key. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * The key expression after `queryKey:`, read with brackets balanced.
 *
 * Stopping at the first comma — which is the obvious way to write this — splits
 * `['payments', 'list', page]` into `['payments'` and reports every payments
 * query as the same key. Two false alarms is all it takes for somebody to
 * delete a guard.
 */
function keyExpression(block: string): string | null {
  const at = block.search(/\bqueryKey\s*:/);
  if (at < 0) return null;
  const start = block.indexOf(':', at) + 1;

  let depth = 0;
  for (let i = start; i < block.length; i++) {
    const ch = block[i];
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if ((ch === ',' || ch === '\n') && depth <= 0) return block.slice(start, i).trim();
  }
  return block.slice(start).trim() || null;
}

/**
 * Every `useQuery({ queryKey: X, queryFn: ... })` in the app, as (key, file).
 *
 * Only declarations that bring their OWN `queryFn` count. A `useQuery` that
 * merely reads a key someone else owns is fine — that is the whole point of a
 * shared cache.
 *
 * Keys built from the shared `queryKeys` factory are GLOBAL identities: the
 * same text in two files is the same cache entry. Anything else is built from a
 * file-local const (`[...key, 'couriers']`), which cannot collide across files
 * however similar the text looks, so it is scoped to its file.
 */
function queryFnDeclarations(): { key: string; file: string }[] {
  const found: { key: string; file: string }[] = [];
  const call = /useQuery\(\{([\s\S]{0,900}?)\n\s*\}\)/g;

  for (const { path, text } of sources()) {
    const body = code(text);
    for (const m of body.matchAll(call)) {
      const block = m[1];
      if (!/\bqueryFn\s*:/.test(block)) continue;
      const expr = keyExpression(block);
      if (!expr) continue;
      const key = expr.includes('queryKeys.') ? expr : `${path}::${expr}`;
      found.push({ key, file: path });
    }
  }
  return found;
}

describe('no cache key carries two shapes', () => {
  it('each queryKey has at most one queryFn declaring it', () => {
    const byKey = new Map<string, string[]>();
    for (const { key, file } of queryFnDeclarations()) {
      byKey.set(key, [...(byKey.get(key) ?? []), file]);
    }

    const collisions = [...byKey.entries()]
      .filter(([, files]) => new Set(files).size > 1)
      .map(([key, files]) => `${key} ← ${[...new Set(files)].join(', ')}`);

    expect(
      collisions,
      'two queryFns on one cache key: whichever mounts first wins and the other ' +
        'silently reads the wrong shape',
    ).toEqual([]);
  });

  it('the categories key in particular has exactly one owner', () => {
    /*
     * Named explicitly because this is the one that shipped. The generic check
     * above would also catch it, but a failure naming `catalog.categories`
     * points straight at the history rather than at an abstraction.
     */
    const owners = queryFnDeclarations().filter((d) => d.key.includes('catalog.categories'));
    expect(owners.map((o) => o.file)).toEqual(['src/hooks/useCategoryOptions.ts']);
  });

  it('every other consumer projects with select instead', () => {
    // `select` runs over the shared cached value, so it cannot disagree with it.
    for (const file of [
      'src/features/products/queries.ts',
      'src/features/products/add-product/hooks/useCatalogCascade.ts',
    ]) {
      const text = code(readFileSync(resolve(SRC, '..', file), 'utf8'));
      expect(text, `${file} should use the shared hook`).toContain('useCategoryQuery');
      expect(text, `${file} should not re-fetch categories`).not.toContain('getCategories(');
    }
  });
});

describe('the check can fail', () => {
  // A guard that cannot fail reads as coverage.
  it('finds a queryFn declaration when there is one', () => {
    expect(queryFnDeclarations().length).toBeGreaterThan(3);
  });

  it('ignores comments rather than matching them', () => {
    const commented = '/* useQuery({ queryKey: fake(), queryFn: x }) */\nconst a = 1;';
    expect(code(commented)).not.toContain('queryFn');
  });
});
