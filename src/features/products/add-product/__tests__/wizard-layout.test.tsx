import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * THE WIZARD HAS EXACTLY ONE SCROLLER.
 *
 * The wholesale app's flow carries this warning on its single scroll view:
 *
 *   Steps must not nest their own vertical ScrollView inside this: a nested
 *   scroller collapses to content height and steals the scroll-to-focused-input
 *   target.
 *
 * The console had the same fault in a worse form. `AppLayout`'s <main> is the
 * console's scroller, and the wizard put a second `overflow-y-auto` inside it.
 * A nested scroller inside an auto-height region has no bounded height to
 * scroll within, so all three reported symptoms followed from it:
 *
 *   - the footer floated instead of pinning to the bottom;
 *   - the sticky header stuck to <main>, which has py-5 above it, so content
 *     scrolled up into the strip and painted over the header;
 *   - negative margins (-m-6 / md:-m-8) missed the padding they cancelled by
 *     8px, leaving a visible gap.
 *
 * The fix is structural — the route is `fullBleed`, <main> stops scrolling, and
 * the wizard owns one scroll region — so the regression is also structural: a
 * second `overflow-y-auto` anywhere in the flow brings it all back. Reading the
 * source is the only way to catch that without a real browser, and it is worth
 * catching in the default suite where it will be seen.
 */

const FLOW = 'src/features/products/add-product/components/AddProductFlow.tsx';
const PAGE = 'src/features/products/add-product/pages/AddProductPage.tsx';
const LAYOUT = 'src/components/layout/AppLayout.tsx';
const ROUTER = 'src/router/index.tsx';

const read = (p: string) => readFileSync(p, 'utf8');

/** Strips comments so prose describing the rule cannot satisfy or trip it. */
function code(src: string): string {
  return src
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
}

describe('the wizard owns exactly one scroll region', () => {
  it('declares overflow-y-auto once and only once', () => {
    const matches = code(read(FLOW)).match(/overflow-y-auto/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('does not scroll sideways for the step bar', () => {
    // `overflow-x-auto` on the step rail is what made it feel cramped: six
    // chips dragged horizontally rather than wrapping onto a second line.
    expect(code(read(FLOW))).not.toContain('overflow-x-auto');
  });

  it('sizes itself against a bounded height, not a growing one', () => {
    const flow = code(read(FLOW));
    // `h-full min-h-0` divides a real height between four regions.
    expect(flow).toContain('h-full min-h-0');
    // `min-h-full` would let the column grow past the region and take the
    // scroll back out to the shell, which is the bug.
    expect(flow).not.toContain('min-h-full');
  });

  it('the page no longer cancels the shell padding by hand', () => {
    const page = code(read(PAGE));
    // -m-6 / md:-m-8 against px-4 py-5 / md:px-6 md:py-6 — off by 8px on every
    // edge, which is the gap. fullBleed removes the padding at source instead.
    expect(page).not.toMatch(/-m-6|-m-8/);
    expect(page).not.toContain('sticky');
  });
});

describe('the route declares that it owns its own scrolling', () => {
  it('both add and edit are fullBleed', () => {
    const router = code(read(ROUTER));
    // Two routes render the wizard, and both must opt out — otherwise editing
    // is broken while adding works, which is the state this replaced.
    expect(router.match(/fullBleed:\s*true/g) ?? []).toHaveLength(2);
  });

  it('the shell honours the flag by not scrolling', () => {
    const layout = code(read(LAYOUT));
    expect(layout).toContain('overflow-hidden');
    // And still scrolls for every other route.
    expect(layout).toContain('overflow-y-auto');
  });
});

describe('add and edit are the same wizard', () => {
  it('the sectioned edit page is gone', () => {
    // It existed briefly and was the wrong shape: two forms for one job.
    expect(() => read('src/features/products/add-product/components/EditProductSections.tsx'))
      .toThrow();
  });

  it('the page renders the flow without branching on mode', () => {
    const page = code(read(PAGE));
    expect(page).toContain('<AddProductFlow');
    expect(page).not.toContain('EditProductSections');
  });

  it('approve is not on the edit screen', () => {
    // Approving is a judgement about a product, not a change to one. It lives
    // on the detail page beside the checklist and the reason dialogs.
    const page = code(read(PAGE));
    expect(page).not.toContain('useApproveProduct');
    expect(page).not.toMatch(/Approve/);
  });

  it('the final button says what the wholesale app says', () => {
    const flow = code(read(FLOW));
    expect(flow).toContain('Update Listing');
    expect(flow).toContain('Submit Listing');
  });
});
