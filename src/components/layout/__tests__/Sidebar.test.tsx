// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { ROUTE_GROUPS, ROUTES } from '@/src/app/routes';
import { hasRole, type StaffRole } from '@/src/auth/roles';

/*
 * The rail filters by role, so these tests have to say who is looking.
 *
 * Default is `super_admin` — the only role that sees every destination — so
 * that "renders every route" keeps meaning what it says. The role-specific
 * cases below name their role explicitly.
 */
let currentRole: StaffRole | null = 'super_admin';

vi.mock('@/src/hooks/useAuth', () => ({
  useAuth: () => ({ user: currentRole ? { role: currentRole } : null }),
}));

afterEach(() => {
  cleanup();
  currentRole = 'super_admin';
});

function renderSidebar(path = '/dashboard', isOpen = true) {
  const onToggle = vi.fn();
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar isOpen={isOpen} onToggle={onToggle} />
    </MemoryRouter>,
  );
  return { onToggle };
}

describe('the rail shows only what the viewer can reach', () => {
  /*
   * Hiding, not disabling. A greyed-out Accounting row tells a viewer the books
   * exist and that they are being kept out of them — information the nav has no
   * business volunteering.
   *
   * None of this is the security boundary. The server's middleware is, and it
   * runs where the user cannot edit it. What this buys is that nobody is shown a
   * destination that answers 403 on arrival.
   */

  it('every route declares who it is for — the model is fail-closed', () => {
    /*
     * THE INVARIANT THAT MAKES A DEPARTMENT LOGIN POSSIBLE.
     *
     * `roles` used to be optional, and optional meant "everyone". That is
     * fail-OPEN: the moment a role exists that must see exactly one screen,
     * every screen added afterwards is visible to it unless somebody remembers
     * to restrict it — and nobody remembers forever.
     *
     * Required means a new entry cannot be added without an answer. This test
     * is what stops the field quietly becoming optional again.
     */
    for (const route of ROUTES) {
      expect(route.roles, `${route.label} does not declare roles`).toBeDefined();
      expect(route.roles.length, `${route.label} declares an empty role list`).toBeGreaterThan(0);
    }
  });

  it('shows a route to a role on its list', () => {
    for (const route of ROUTES) {
      currentRole = route.roles[0]!;
      cleanup();
      renderSidebar();
      const nav = screen.getByLabelText('Main navigation');
      expect(
        within(nav).getByRole('link', { name: new RegExp(`^${route.label}`, 'i') }),
      ).toBeTruthy();
    }
  });

  it('hides a route from a role that is not on its list', () => {
    // Only the genuinely restricted ones can be tested this way: most routes
    // are ADMIN_STAFF, which every admin role is on. Accounting is FINANCE.
    const restricted = ROUTES.filter((r) => !hasRole('viewer', r.roles));
    expect(restricted.length, 'expected at least one route a viewer cannot see').toBeGreaterThan(0);

    currentRole = 'viewer';
    renderSidebar();
    const nav = screen.getByLabelText('Main navigation');
    for (const route of restricted) {
      expect(
        within(nav).queryByRole('link', { name: new RegExp(`^${route.label}`, 'i') }),
        `${route.label} should be hidden from a viewer`,
      ).toBeNull();
    }
  });

  it('hides Accounting from admin, matching the server', () => {
    // Named explicitly because this one is easy to get wrong in the obvious
    // direction: `admin` is the most powerful non-super role and reads like it
    // should see the books. The server's FinanceOnly says otherwise — the
    // person who onboards a supplier is not the person who pays them.
    currentRole = 'admin';
    renderSidebar();
    const nav = screen.getByLabelText('Main navigation');
    expect(within(nav).queryByRole('link', { name: /^Accounting/i })).toBeNull();
  });

  it('shows a logistics account exactly one destination', () => {
    /*
     * THE REQUIREMENT, asserted directly.
     *
     * A shipping-department login sees the logistics screen and nothing else —
     * not a filtered console. Counting the links rather than checking for the
     * absence of a few named ones is deliberate: a new screen that forgot to
     * restrict itself would slip past a list, and cannot slip past a count.
     */
    currentRole = 'logistics';
    renderSidebar();
    const nav = screen.getByLabelText('Main navigation');
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toMatch(/Logistics/i);
  });
});

describe('Sidebar navigation', () => {
  it('renders every route in the registry', () => {
    renderSidebar();
    const nav = screen.getByLabelText('Main navigation');
    for (const route of ROUTES) {
      /*
       * Anchored at the start, not a bare substring. Four labels now contain
       * the word "Settings" — Reward Settings, Coupon Settings, Referral
       * Settings, and Settings itself — so `/Settings/i` matches four links
       * and throws. `^Settings` matches only the last.
       *
       * Not a full-string match either: when expanded, an unbuilt route's link
       * carries a status badge, so its accessible name is the label plus that
       * badge's text.
       */
      expect(
        within(nav).getByRole('link', { name: new RegExp(`^${route.label}`, 'i') }),
      ).toBeTruthy();
    }
  });

  it('renders a heading for each group when expanded, if there is more than one', () => {
    /*
     * The registry is currently one flat list of sixteen, so there is no
     * heading to render — a lone "Navigation" label above the only group
     * labels nothing. If grouping returns, every group must be headed.
     */
    renderSidebar();
    if (ROUTE_GROUPS.length <= 1) {
      expect(ROUTE_GROUPS[0]?.label).toBeUndefined();
      return;
    }
    for (const group of ROUTE_GROUPS) {
      expect(group.label, 'a group among several must be labelled').toBeDefined();
      expect(screen.getByText(group.label!)).toBeTruthy();
    }
  });

  it('hides group headings when collapsed — they would label nothing', () => {
    renderSidebar('/dashboard', false);
    for (const group of ROUTE_GROUPS) {
      if (group.label) expect(screen.queryByText(group.label)).toBeNull();
    }
  });

  it('marks the current route as the active page', () => {
    renderSidebar('/products');
    const active = screen.getByRole('link', { name: /products/i });
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('marks exactly one route active at a time', () => {
    renderSidebar('/products');
    const current = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
  });

  it('gives collapsed items an accessible name, since the label is hidden', () => {
    // Collapsed, the only thing rendered is an icon. Without this the rail is
    // an unlabelled list of links to a screen reader.
    renderSidebar('/dashboard', false);
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeTruthy();
  });
});

describe('Sidebar honesty about unbuilt sections', () => {
  it('names an unbuilt section as such when collapsed', () => {
    /*
     * Derived from the registry, not hardcoded to a route name. This assertion
     * named Retailers until Retailers shipped, at which point it failed for the
     * best possible reason — and a test that breaks every time a screen is
     * built trains people to edit tests rather than read them.
     */
    const planned = ROUTES.find((r) => r.status === 'planned');
    renderSidebar('/dashboard', false);

    if (!planned) {
      // EVERY destination is built. Asserted positively rather than skipped:
      // if a route is ever marked `planned` again, or a stale "not built yet"
      // string survives in the rail after a screen shipped, this catches it.
      const nav = screen.getByLabelText('Main navigation');
      expect(within(nav).queryByText(/not built yet/i)).toBeNull();
      for (const r of ROUTES) {
        expect(r.status, `${r.label} is not live`).toBe('live');
      }
      return;
    }
    expect(
      screen.getByRole('link', { name: `${planned.label} — not built yet` }),
    ).toBeTruthy();
  });

  it('distinguishes "not running" from "not built"', () => {
    /*
     * The distinction the `inert` status exists for: a section whose endpoints
     * and tables are real but whose logic nothing invokes. A built screen there
     * would show every figure at zero and read as "nobody has done anything",
     * when the truth is that nothing is running. That is a negative result
     * versus no result at all.
     *
     * Derived, not hardcoded. This test named Reward Settings until Reward
     * Settings shipped, at which point it failed for the best possible reason —
     * the same trap the planned-route test above was already rewritten to
     * avoid.
     */
    const inert = ROUTES.find((r) => r.status === 'inert');
    renderSidebar('/dashboard', false);

    if (!inert) {
      // Nothing is inert today. Assert that positively rather than skipping:
      // if a route is ever mislabelled `inert` when it is really unbuilt, or a
      // stale "not running" string survives in the rail, this catches it.
      const nav = screen.getByLabelText('Main navigation');
      expect(within(nav).queryByText(/not running/i)).toBeNull();
      for (const r of ROUTES) {
        expect(r.status === 'live' || r.status === 'planned').toBe(true);
      }
      return;
    }
    expect(screen.getByRole('link', { name: `${inert.label} — not running` })).toBeTruthy();
  });

  it('adds no qualifier to a live section', () => {
    renderSidebar('/dashboard', false);
    const link = screen.getByRole('link', { name: 'Suppliers' });
    expect(link.getAttribute('aria-label')).toBe('Suppliers');
  });

  it('explains why on hover when expanded', () => {
    // A `note` says what is missing, not merely that something is. Derived from
    // whichever route currently carries one, so building a screen retires its
    // note without breaking this.
    const noted = ROUTES.find((r) => r.note);
    expect(noted, 'expected at least one route to explain itself').toBeDefined();
    renderSidebar();
    const link = screen.getByRole('link', { name: new RegExp(`^${noted!.label}`, 'i') });
    expect(link.getAttribute('title')).toBe(noted!.note);
  });

  it('leaves every unbuilt section reachable rather than disabling it', () => {
    // Hiding them would be worse: an operator looking for Orders needs to learn
    // that it does not exist, not that it is missing from the menu.
    renderSidebar();
    const link = screen.getByRole('link', { name: 'Orders' });
    expect(link.getAttribute('href')).toBe('/orders');
    expect(link.getAttribute('aria-disabled')).toBeNull();
  });
});

describe('Sidebar registry integrity', () => {
  it('has no duplicate route ids', () => {
    const ids = ROUTES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every non-live route a note explaining what is missing', () => {
    // A status with no explanation is just a greyed-out item, which is the
    // thing this replaced.
    const missing = ROUTES.filter((r) => r.status !== 'live' && !r.note);
    expect(missing.map((r) => r.id)).toEqual([]);
  });

  it('places every route in exactly one group', () => {
    const counts = new Map<string, number>();
    for (const group of ROUTE_GROUPS) {
      for (const route of group.routes) {
        counts.set(route.id, (counts.get(route.id) ?? 0) + 1);
      }
    }
    expect([...counts.values()].every((n) => n === 1)).toBe(true);
  });
});
