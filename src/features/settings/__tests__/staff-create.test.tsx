// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StaffCreatePage } from '../pages/StaffCreatePage';
import { CREATABLE_ROLES, type NewStaff } from '../api/staffCreateApi';
import { labelForRole } from '../api/settingsApi';
import { STAFF_ROLES_FOR_TEST } from './role-list';

/**
 * Creating a colleague.
 *
 * `POST /auth/admin/create-staff` had no caller on any screen, so every account
 * on this console was made with curl or by hand in SQL.
 *
 * The assertions worth having are about AUTHORITY and about the PASSWORD, not
 * about the layout:
 *
 *  - `super_admin` must not be offered. The server refuses it too, and the tier
 *    that creates staff and sets the platform margin should not be mintable
 *    from a form.
 *  - Every role the database allows below that one must be offered, or a
 *    department stays unstaffable — which is exactly the state `logistics` and
 *    `supplier_assistant` were in before this screen existed.
 *  - The plaintext password must never leave the browser.
 */

// Typed with its parameter, so `mock.calls[0][0]` has a type. A bare
// `vi.fn(async () => …)` declares no arguments, and the assertion that the
// PLAINTEXT never leaves — the most important one here — then fails to compile.
const createStaff = vi.fn(async (_staff: NewStaff) => ({
  id: 's-1', name: 'Nadia Rahman', email: 'nadia@bepari-bd.com', role: 'operations',
}));
vi.mock('../api/staffCreateApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/staffCreateApi')>()),
  createStaff: (s: NewStaff) => createStaff(s),
}));

const hashPassword = vi.fn(async (p: string) => `pbkdf2(${p})`);
vi.mock('@/src/auth/passwordHasher', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/auth/passwordHasher')>()),
  hashPassword: (p: string) => hashPassword(p),
}));

let role = 'super_admin';
vi.mock('@/src/hooks/useAuth', () => ({ useAuth: () => ({ user: { role } }) }));

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/src/components/feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/components/feedback')>()),
  useToast: () => toast,
}));

/*
 * A QueryClient is needed now that this screen also EDITS.
 *
 * The page looks the account up in the staff list to learn its role, because who
 * may open it depends on that: creating is super-admin only, editing follows the
 * server's rule that an admin may edit anyone but a super admin. On the create
 * route there is no id to find, so the query resolves to nothing and the page
 * behaves exactly as it always did — but the provider still has to be there.
 */
const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StaffCreatePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

/**
 * Fills everything except the role, which each test chooses.
 *
 * The fixture is `Jamuna7Bridge!` rather than the obvious `Str0ngPassword`, and
 * that is worth recording: the first version failed four tests while the code
 * was entirely correct, because the shared policy rejects anything containing
 * the word "password" — "one of the first things an attacker tries". A test
 * credential the product would refuse is not a test of the product.
 */
function fillDetails(password = 'Jamuna7Bridge!') {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Nadia Rahman' } });
  fireEvent.change(screen.getByLabelText(/sign-in email/i), {
    target: { value: 'nadia@bepari-bd.com' },
  });
  fireEvent.change(screen.getByLabelText(/^mobile/i), { target: { value: '01711000000' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: password } });
}

beforeEach(() => {
  role = 'super_admin';
  createStaff.mockClear();
  hashPassword.mockClear();
  navigate.mockClear();
  toast.success.mockClear();
});
afterEach(cleanup);

describe('who may create an account', () => {
  it('refuses anyone who is not a super admin, and says which role is needed', () => {
    role = 'admin';
    renderPage();
    expect(screen.getByText(/only a super admin can create staff accounts/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /create account/i })).toBeNull();
  });

  it('lets a super admin through', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /create account/i })).toBeTruthy();
  });
});

describe('the roles on offer', () => {
  /*
   * The escalation guard. The server's validator excludes super_admin too, so
   * this is defence in depth rather than the boundary — but a form that offers
   * it and then 403s is its own defect.
   */
  it('does not offer super admin', () => {
    renderPage();
    expect(CREATABLE_ROLES.some((r) => r.value === 'super_admin')).toBe(false);
    expect(screen.queryByRole('button', { name: /^Super admin/ })).toBeNull();
  });

  /*
   * The other direction, and the reason this screen was written. `logistics`
   * and `supplier_assistant` are valid in users.staff's CHECK constraint and
   * were absent from the create endpoint's validator — so those two departments
   * could not be staffed at all except by hand in SQL.
   */
  it('offers ONLY admin — no other role is creatable here', () => {
    /*
     * This asserted the opposite: that every role the database allows below
     * super_admin was offered, because `logistics` had once sat in the schema
     * with no way to staff it.
     *
     * The rule changed by instruction. The platform runs on one super admin and
     * one admin, both singletons enforced by a unique index (migration 000117),
     * and the other roles — finance, operations, viewer, logistics,
     * supplier_assistant, product_registrar — are no longer created from this
     * console. They still EXIST and still route other services; they are simply
     * not this screen's business.
     */
    expect(CREATABLE_ROLES.map((r) => r.value)).toEqual(['admin']);
  });

  it('states what the account will be able to reach', () => {
    /*
     * There is no longer a choice to inform — the form always creates an admin —
     * but the operator still needs to know what they are handing over before
     * they hand it over.
     */
    renderPage();
    expect(screen.getByText(/suppliers, retailers and the catalogue/i)).toBeTruthy();
    expect(screen.getByText(/there can be only one/i)).toBeTruthy();
  });
});

describe('creating the account', () => {
  it('stays disabled until every field is given', () => {
    /*
     * The role is no longer one of the things to supply — it is fixed to admin —
     * so the gate is the detail fields alone.
     */
    renderPage();
    const btn = () => screen.getByRole('button', { name: /create account/i }) as HTMLButtonElement;
    expect(btn().disabled).toBe(true);

    fillDetails();
    expect(btn().disabled).toBe(false);
  });

  it('refuses to submit when the two passwords differ', () => {
    renderPage();
    fillDetails();
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Different1' } });

    expect(screen.getByText(/do not match/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: /create account/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  /*
   * THE PLAINTEXT MUST NOT LEAVE THE BROWSER.
   *
   * Same PBKDF2 the sign-in form uses, so a password this screen accepts is one
   * the login screen will accept back. A screen that posted the raw string
   * would still "work" — the server hashes whatever it is given — and the
   * failure would be invisible until somebody read a request log.
   */
  it('sends a hash and never the password itself', async () => {
    renderPage();
    fillDetails('Jamuna7Bridge!');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(createStaff).toHaveBeenCalledTimes(1));
    const sent = createStaff.mock.calls[0][0];
    expect(sent.passwordHash).toBe('pbkdf2(Jamuna7Bridge!)');
    expect(JSON.stringify(sent)).not.toContain('Jamuna7Bridge!"');
    expect(Object.keys(sent)).not.toContain('password');
    // And the mobile goes with it — the field the server demanded and dropped
    // until migration 000106.
    expect(sent.mobile).toBe('01711000000');
    expect(sent.role).toBe('admin');
  });

  it('returns to the access list and names the person', async () => {
    renderPage();
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/settings?tab=access'));
    expect(toast.success.mock.calls[0][1]).toContain('nadia@bepari-bd.com');
  });

  it("shows the server's own refusal", async () => {
    createStaff.mockRejectedValueOnce(
      new Error('A staff account with this email already exists'),
    );
    renderPage();
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/already exists/i)).toBeTruthy();
    expect(navigate).not.toHaveBeenCalledWith('/settings?tab=access');
  });
});

/*
THE LIST MUST BE ABLE TO SHOW EVERY ROLE A PERSON CAN HOLD.

`STAFF_ROLES` feeds the role <select> on each row of the access table. A role
missing from it has no matching option, so the control falls back to the first —
which is `super_admin`. A logistics account was therefore displayed as a SUPER
ADMIN on the one screen an operator uses to audit who has access, and neither
department could be assigned after the fact.

Separate from CREATABLE_ROLES on purpose: this list is wider, because an account
that already holds super_admin must display truthfully even though no form may
mint one.
*/
describe('the access list names every role without offering any', () => {
  /*
   * There is no role <select> on the access table any more, so the old failure
   * this guarded — a role with no matching option displaying as the FIRST one,
   * once reporting a logistics account as SUPER ADMIN — is unreachable by
   * construction rather than by coverage.
   *
   * What remains worth asserting is the other half: every role the database
   * allows must still have a NAME, because an account holding one is displayed
   * whether or not this console manages it.
   */
  it('has a label for every role the database allows', () => {
    for (const role of STAFF_ROLES_FOR_TEST) {
      const label = labelForRole(role);
      expect(label, `${role} has no label and would render as its raw value`).not.toBe(role);
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('super admin is nameable but never offered', () => {
    // Displayed correctly wherever an account holds it...
    expect(labelForRole('super_admin')).toBe('Super admin');
    // ...and absent from the one list that creates accounts, because the server
    // refuses to mint the tier from a form.
    expect(CREATABLE_ROLES.some((r) => r.value === 'super_admin')).toBe(false);
  });
});
