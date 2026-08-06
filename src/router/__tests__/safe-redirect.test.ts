// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { safeRedirect } from '../index';

/**
 * Guards the post-login redirect against becoming an open redirect.
 *
 * The previous implementation screened the destination with three
 * `startsWith` checks. react-router's own advisory (GHSA-wrjc-x8rr-h8h6) is
 * about paths beginning `/\` — browsers normalise the backslash to a slash, so
 * `/\evil.com` passes every prefix check and then navigates off-origin.
 *
 * The hostile cases below are the point of this file; a test that only checked
 * `/products` → `/products` would have passed against the broken version.
 */

function loc(pathname: string, search = '', hash = ''): Location {
  return { pathname, search, hash } as Location;
}

describe('safeRedirect', () => {
  it('keeps a genuine same-origin destination, including query and hash', () => {
    expect(safeRedirect(loc('/products', '?page=2', '#top'))).toBe('/products?page=2#top');
    expect(safeRedirect(loc('/wholesalers/abc-123'))).toBe('/wholesalers/abc-123');
  });

  it('falls back to the dashboard when there is no destination', () => {
    expect(safeRedirect(undefined)).toBe('/dashboard');
    expect(safeRedirect(loc(''))).toBe('/dashboard');
  });

  it.each([
    ['/\\evil.com', 'backslash — normalised to // by browsers'],
    ['//evil.com', 'protocol-relative'],
    ['//evil.com/path', 'protocol-relative with a path'],
    ['https://evil.com', 'absolute URL'],
    ['http://evil.com/x', 'absolute URL with a path'],
    ['/\\/evil.com', 'mixed slashes'],
    ['\\\\evil.com', 'double backslash'],
  ])('rejects %s (%s)', (hostile) => {
    expect(safeRedirect(loc(hostile))).toBe('/dashboard');
  });

  it('does not bounce back into the auth flow it just completed', () => {
    expect(safeRedirect(loc('/login'))).toBe('/dashboard');
    expect(safeRedirect(loc('/forgot-password'))).toBe('/dashboard');
    expect(safeRedirect(loc('/reset-password', '?token=x'))).toBe('/dashboard');
  });

  it('does not reject a legitimate path that merely starts with the same letters', () => {
    // The old prefix check would have sent this to /dashboard too.
    expect(safeRedirect(loc('/logins-report'))).toBe('/logins-report');
  });
});
