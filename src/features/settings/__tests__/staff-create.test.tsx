// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StaffCreatePage } from '../pages/StaffCreatePage';
import { CREATABLE_ROLES, type NewStaff } from '../api/staffCreateApi';
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

const renderPage = () =>
  render(
    <MemoryRouter>
      <StaffCreatePage />
    </MemoryRouter>,
  );

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
  it('offers every other role the database allows', () => {
    renderPage();
    for (const role of STAFF_ROLES_FOR_TEST) {
      if (role === 'super_admin') continue;
      expect(
        CREATABLE_ROLES.some((r) => r.value === role),
        `${role} cannot be created, so that department is unstaffable from the console`,
      ).toBe(true);
    }
  });

  it('says what each role can reach, not just its name', () => {
    renderPage();
    // Choosing wrongly here is either a colleague who cannot work or one who
    // can see the cash book, so the name alone is not enough to choose by.
    for (const r of CREATABLE_ROLES) {
      expect(screen.getByText(r.hint)).toBeTruthy();
    }
  });
});

describe('creating the account', () => {
  it('stays disabled until every field and a role are given', () => {
    renderPage();
    const btn = () => screen.getByRole('button', { name: /create account/i }) as HTMLButtonElement;
    expect(btn().disabled).toBe(true);

    fillDetails();
    // Everything but the role.
    expect(btn().disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /^Operations/ }));
    expect(btn().disabled).toBe(false);
  });

  it('refuses to submit when the two passwords differ', () => {
    renderPage();
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: /^Operations/ }));
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
    fireEvent.click(screen.getByRole('button', { name: /^Operations/ }));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(createStaff).toHaveBeenCalledTimes(1));
    const sent = createStaff.mock.calls[0][0];
    expect(sent.passwordHash).toBe('pbkdf2(Jamuna7Bridge!)');
    expect(JSON.stringify(sent)).not.toContain('Jamuna7Bridge!"');
    expect(Object.keys(sent)).not.toContain('password');
    // And the mobile goes with it — the field the server demanded and dropped
    // until migration 000106.
    expect(sent.mobile).toBe('01711000000');
    expect(sent.role).toBe('operations');
  });

  it('returns to the access list and names the person', async () => {
    renderPage();
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: /^Operations/ }));
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
    fireEvent.click(screen.getByRole('button', { name: /^Operations/ }));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/already exists/i)).toBeTruthy();
    expect(navigate).not.toHaveBeenCalledWith('/settings?tab=access');
  });
});
