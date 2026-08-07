import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * A SERVER FILTER WITH NO CONTROL IS INVISIBLE, AND NOTHING ELSE CATCHES IT.
 *
 * `hasImage` and `lowStock` were wired the entire way — held in the store,
 * defaulted in INITIAL_FILTERS, forwarded by useProductList, serialised by
 * buildListQuery, filtered on by the backend, and covered by their own API
 * test — and no control on any screen could set either. In their place sat a
 * "Variants" filter with a single option and an empty onChange: a control that
 * looked available and did nothing.
 *
 * TypeScript cannot see this. The types are satisfied whether or not a screen
 * renders the control, lint has nothing to say about an unused store field, and
 * the API test passes because it calls the function directly. The only thing
 * that distinguishes "wired and reachable" from "wired and dead" is whether a
 * screen references it.
 *
 * So this reads the source. It is a coarse instrument and deliberately so —
 * it asserts reachability, not behaviour, which is exactly the property that
 * went missing. The rendering tests cover what the controls do.
 */

const here = dirname(fileURLToPath(import.meta.url));
const listPage = readFileSync(resolve(here, '../pages/ProductListPage.tsx'), 'utf8');

describe('every server-side list filter is reachable from the screen', () => {
  it.each(['hasImage', 'lowStock', 'category', 'wholesalerId'])(
    'the list page can set %s',
    (key) => {
      expect(listPage).toContain(`setFilter('${key}'`);
    },
  );

  it('offers no filter that cannot change anything', () => {
    // `onChange: () => {}` is the shape the dead Variants control took. A
    // control the operator can open, choose from, and get nothing back is
    // worse than an absent one — it invites them to believe the list narrowed.
    expect(listPage).not.toMatch(/onChange:\s*\(\)\s*=>\s*\{\s*\}/);
  });

  it('counts the new filters as active, so Clear all appears', () => {
    // Clear all is how an operator escapes a filter they no longer want. A
    // filter missing from this test hides the only control that resets it.
    expect(listPage).toContain('filters.hasImage !== undefined');
    expect(listPage).toContain('filters.lowStock');
  });
});
