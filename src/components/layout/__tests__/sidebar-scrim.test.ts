import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE INVISIBLE SCRIM THAT BLURRED THE WHOLE PHONE SCREEN.
 *
 * Reported on a Pixel 7: the dashboard rendered as an unreadable smear with no
 * visible cause and no sidebar on screen.
 *
 * `backdrop-blur-sm` sat on the scrim's BASE classes, with `opacity-0` relied on
 * to hide it when the sidebar was closed. Opacity hides an element's own paint —
 * its background tint — but Chrome on Android goes on applying
 * `backdrop-filter` regardless. So a scrim nobody could see blurred everything
 * behind it, on every mobile page load.
 *
 * `pointer-events-none` made it harder to find rather than easier: taps still
 * worked, so it read as a rendering fault rather than as something covering the
 * screen.
 */
const src = readFileSync(
  join(__dirname, '..', 'Sidebar.tsx'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('the mobile scrim', () => {
  it('carries no blur in its base classes', () => {
    // The base string is applied whether the sidebar is open or shut, so a blur
    // there is a blur that is always on.
    const base = src.match(/'fixed inset-0 z-\(--z-sticky\)[^']*'/)?.[0] ?? '';
    expect(base).not.toContain('backdrop-blur');
  });

  it('attaches the blur only on the open branch', () => {
    expect(src).toMatch(/isOpen\s*\?\s*'opacity-100 backdrop-blur-sm'/);
    expect(src).toMatch(/:\s*'pointer-events-none opacity-0'/);
  });

  it('still dims and still blocks taps when open', () => {
    // The scrim has a job — it must remain a scrim, not just stop blurring.
    expect(src).toContain('bg-sheet-inverse/30');
    expect(src).toContain('pointer-events-none');
  });
});

describe('the scrim sits below the navigation it dims', () => {
  it('uses a z-index under --z-nav', () => {
    /*
     * The actual cause of the reported full-screen blur. At --z-overlay (40) the
     * scrim covered the sidebar (--z-nav, 30): the menu itself was blurred, and
     * since the scrim closes on click, every tap on a nav item hit the scrim and
     * shut the drawer instead of navigating.
     */
    expect(src).toContain('z-(--z-sticky)');
    expect(src).not.toMatch(/'fixed inset-0 z-\(--z-overlay\)/);
  });
});
