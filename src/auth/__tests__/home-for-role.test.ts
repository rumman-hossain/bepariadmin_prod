import { describe, it, expect } from 'vitest';
import { homeFor, ADMIN_STAFF, ANY_STAFF } from '../roles';
import { findRoute } from '@/src/app/routes';

/**
 * Where each role lands after signing in.
 *
 * `/dashboard` was hardcoded in four places. A logistics account cannot see the
 * dashboard — its role is not on that route's list — so landing there shows a
 * refusal notice immediately after a correct sign-in. That reads as a broken
 * login, and it is the kind of thing that gets reported as "the app doesn't
 * work for the warehouse team" rather than as a routing bug.
 *
 * A planted mutant that made homeFor always return '/dashboard' passed the
 * entire suite before this file existed.
 */

describe('homeFor', () => {
  it('sends logistics to the one screen it can see', () => {
    expect(homeFor('logistics')).toBe('/logistics');
  });

  it('sends every admin role to the dashboard', () => {
    for (const role of ADMIN_STAFF) {
      expect(homeFor(role), `${role} should land on the dashboard`).toBe('/dashboard');
    }
  });

  it('normalises what the server sent before deciding', () => {
    // asStaffRole trims, lowercases and converts spaces/hyphens. A role that
    // arrived as "Logistics" must not be sent to a screen it cannot see.
    expect(homeFor('Logistics')).toBe('/logistics');
    expect(homeFor(' logistics ')).toBe('/logistics');
  });

  it('falls back to the dashboard for anything unrecognised', () => {
    // Fail towards the screen most roles can see. An unknown role is refused by
    // the route guard anyway, and a refusal notice is more useful than a
    // redirect loop.
    for (const role of [undefined, null, '', 'retailer', 'root']) {
      expect(homeFor(role)).toBe('/dashboard');
    }
  });

  it('lands every staff role somewhere its own role permits', () => {
    /*
     * The property, rather than the cases. If a role is added later and nobody
     * updates homeFor, it lands on the dashboard — and this fails unless that
     * role is genuinely allowed there.
     *
     * THE ALLOWED LIST IS READ FROM THE REGISTRY, not from a ternary here.
     *
     * It used to be `home === '/logistics' ? LOGISTICS : ADMIN_STAFF`, which
     * quietly assumed there would only ever be two destinations. Adding
     * `supplier_assistant` — which lands on /wholesalers — failed this test
     * against entirely correct code, because the test could not know about a
     * third. Hardcoding a third branch would only move the same failure to the
     * fourth role. The registry is where the answer actually lives.
     */
    for (const role of ANY_STAFF) {
      const home = homeFor(role);
      const entry = findRoute(home.replace(/^\//, ''));
      expect(entry, `homeFor(${role}) returned ${home}, which is not a nav destination`).toBeTruthy();
      expect(
        (entry!.roles as readonly string[]).includes(role),
        `${role} lands on ${home}, which its own role cannot see`,
      ).toBe(true);
    }
  });
});
