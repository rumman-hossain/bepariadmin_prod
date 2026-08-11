// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { router } from '../index';
import { ROUTES } from '@/src/app/routes';

/**
 * EVERY ADDRESS THE ROUTER SERVES MUST EXIST IN THE REGISTRY.
 *
 * `RouteGuard` takes the first path segment and looks it up in
 * `src/app/routes.ts`. If it finds nothing it renders "There is nothing here —
 * that address does not match any section of the console", and it does so
 * BEFORE the element ever mounts.
 *
 * So the registry is not merely the navigation. It is the list of addresses
 * that exist at all, and a screen wired perfectly into the router but missing
 * from it is simply unreachable.
 *
 * This test exists because that is exactly what happened. /profile was written,
 * routed, unit-tested, type-checked, linted and DEPLOYED — and then answered
 * "There is nothing here" in the browser, because a page reached from the
 * header rather than the rail had no reason to be in a file called routes.ts.
 * Nothing in 1540 passing tests noticed, and a mutant that renamed the entry
 * survived the whole suite.
 *
 * The registry gained a `hidden` flag for this: registered, so it resolves;
 * absent from the rail, because it is not navigation.
 */

/** Every full path the protected layout serves, in declaration order. */
function protectedPaths(): string[] {
  const out: string[] = [];

  const shell = router.routes.find((r) => r.path === '/' && (r.children?.length ?? 0) > 0);
  if (!shell?.children) return [];

  const walk = (routes: NonNullable<typeof shell.children>, prefix: string) => {
    for (const route of routes) {
      const path = route.path ?? '';
      if (!path || path === '*') {
        if (route.children) walk(route.children, prefix);
        continue;
      }
      const full = `${prefix}${path}`.replace(/^\/+/, '');
      out.push(full);
      if (route.children) walk(route.children, `${full}/`);
    }
  };
  walk(shell.children, '');
  return out;
}

/** The first path segment of every route the protected layout serves. */
function protectedSegments(): string[] {
  const out = new Set<string>();

  // The authenticated layout is the route mounted at '/' that has children.
  const shell = router.routes.find((r) => r.path === '/' && (r.children?.length ?? 0) > 0);
  if (!shell?.children) return [];

  const walk = (routes: typeof shell.children, prefix: string) => {
    for (const route of routes) {
      const path = route.path ?? '';
      // Index routes resolve via RoleHome and have no segment of their own;
      // the '*' catch-all is the fallback RouteGuard exists to avoid reaching.
      if (!path || path === '*') {
        if (route.children) walk(route.children, prefix);
        continue;
      }
      const full = `${prefix}${path}`.replace(/^\/+/, '');
      const segment = full.split('/').filter(Boolean)[0];
      if (segment && !segment.startsWith(':')) out.add(segment);
      if (route.children) walk(route.children, `${full}/`);
    }
  };
  walk(shell.children, '');
  return [...out];
}

describe('the registry covers every routed address', () => {
  it('finds a registry entry for the first segment of every route', () => {
    const registered = new Set(ROUTES.map((r) => r.id));
    const missing = protectedSegments().filter((s) => !registered.has(s));

    expect(
      missing,
      `These paths are routed but absent from src/app/routes.ts, so RouteGuard ` +
        `will answer "There is nothing here" for each of them however correctly ` +
        `the screen behind it is wired. Add an entry — with hidden: true if it ` +
        `is reached from somewhere other than the rail.`,
    ).toEqual([]);
  });

  it('walks a meaningful number of routes, so an empty pass means nothing', () => {
    // Without this the test above passes trivially if `protectedSegments`
    // stops finding the shell — which a router restructure could easily do.
    expect(protectedSegments().length).toBeGreaterThan(10);
  });

  it('includes the two screens this was written for', () => {
    const segments = protectedSegments();
    expect(segments).toContain('profile');
    // /settings/staff/new resolves through the `settings` entry, since
    // RouteGuard only ever reads the FIRST segment.
    expect(segments).toContain('settings');
  });

  /*
   * A PATH DECLARED TWICE IS A SCREEN THAT MIGHT NOT BE THE ONE YOU WROTE.
   *
   * The router ends with a catch-all that turns every registry entry WITHOUT a
   * built screen into a NotBuiltPage. It filters `hidden` entries out — and it
   * has to, because /profile is registered AND has a real element. Drop that
   * filter and 'profile' is declared twice: once as the page, once as a
   * placeholder saying the section does not exist yet.
   *
   * Which one renders is a matter of declaration order, which is to say it is
   * luck. A mutant that removed the filter survived every other test in the
   * suite.
   */
  it('declares no path twice', () => {
    const seen = new Map<string, number>();
    for (const path of protectedPaths()) seen.set(path, (seen.get(path) ?? 0) + 1);
    const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([p]) => p);

    expect(
      duplicated,
      'Declared more than once, so which element renders depends on order rather ' +
        'than intent. The usual cause is a registered screen also being picked up ' +
        'by the not-built catch-all at the end of the router.',
    ).toEqual([]);
  });
});
