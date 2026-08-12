import { describe, it, expect } from 'vitest';
import { sidebarStartsOpen } from '../sidebarStartsOpen';

/**
 * ON A PHONE, EVERY PAGE LOADED WITH THE MENU OVER IT.
 *
 * `sidebarOpen` started `true` regardless of viewport. Above 1024 that is a
 * docked column and correct; below it the same state renders a drawer ACROSS
 * the content, with an aria-hidden backdrop over everything and
 * `document.body.style.overflow = 'hidden'`.
 *
 * Measured on the deployed console at a 500px viewport, on /products/new: the
 * Product Name input rendered, and `document.elementFromPoint` at its centre
 * returned the backdrop rather than the input, with the body scroll-locked.
 * Nothing on the page could be touched until the menu was dismissed — on every
 * page load, not just the first.
 */
describe('the sidebar default follows the viewport', () => {
  it('starts closed on a phone, so the page underneath is reachable', () => {
    expect(sidebarStartsOpen(390)).toBe(false);
  });

  it('starts open on a desktop, where open means docked beside the page', () => {
    expect(sidebarStartsOpen(1440)).toBe(true);
  });

  it('treats exactly 1024 as desktop, matching Sidebar’s own closeOnMobile', () => {
    // closeOnMobile toggles when `window.innerWidth < 1024`, so 1024 is the
    // docked side of the line. Two components disagreeing by one pixel is how a
    // drawer ends up open on the single width nobody thinks to check.
    expect(sidebarStartsOpen(1024)).toBe(true);
  });

  it('leaves 1023 on the drawer side', () => {
    expect(sidebarStartsOpen(1023)).toBe(false);
  });
});
