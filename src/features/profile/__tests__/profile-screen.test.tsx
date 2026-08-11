// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from '../pages/ProfilePage';
import type { AuthUser } from '@/src/types/auth';
import type { ProfileEdit } from '../api/profileApi';

/**
 * A staff member's own details.
 *
 * Two properties carry this screen, and neither is about layout.
 *
 * **What may not be edited.** Role and status are decisions made about somebody
 * rather than by them; the primary email is the identifier they sign in with. A
 * field for any of the three would either be silently ignored by the server or,
 * in the role's case, be the shortest privilege escalation in the system.
 *
 * **What the secondary email is.** It is a contact address, saved unverified,
 * and it can neither sign anybody in nor receive a password reset. The screen
 * has to SAY so: a field that looks like a recovery address and is not one gets
 * relied upon in exactly the moment it fails.
 */

// Typed with its parameter, so `mock.calls[0][0]` has a type. A bare
// `vi.fn(async () => …)` declares no arguments, and the assertions on what was
// SENT — the whole point of these tests — then fail to compile.
const updateProfile = vi.fn(async (_edit: ProfileEdit) => ({
  id: 'u-1', name: 'Rumman Hossain', email: 'rumman@bepari-bd.com',
  role: 'super_admin', status: 'active', phone: '+8801711000000', secondaryEmail: '',
}));
vi.mock('../api/profileApi', () => ({ updateProfile: (e: ProfileEdit) => updateProfile(e) }));

const refreshUser = vi.fn(async () => {});
let currentUser: AuthUser | null = null;
vi.mock('@/src/hooks/useAuth', () => ({
  useAuth: () => ({ user: currentUser, refreshUser }),
}));

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/src/components/feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/components/feedback')>()),
  useToast: () => toast,
}));

function signedInAs(over: Partial<AuthUser> = {}) {
  currentUser = {
    id: 'u-1',
    name: 'Rumman Hossain',
    email: 'rumman@bepari-bd.com',
    role: 'super_admin',
    phone: '01711000000',
    emailVerified: true,
    ...over,
  };
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );

beforeEach(() => {
  signedInAs();
  updateProfile.mockClear();
  refreshUser.mockClear();
  toast.success.mockClear();
});
afterEach(cleanup);

describe('what a person may change about themselves', () => {
  it('offers name, mobile and a secondary email', () => {
    renderPage();
    expect(screen.getByLabelText(/full name/i)).toBeTruthy();
    expect(screen.getByLabelText(/^mobile/i)).toBeTruthy();
    expect(screen.getByLabelText(/secondary email/i)).toBeTruthy();
  });

  /*
   * The privilege-escalation guard. A role field here — even one the server
   * ignores — is a control that says "you may change this", and the next person
   * to touch the endpoint may believe the screen.
   */
  it('offers no way to change your own role or status', () => {
    renderPage();
    expect(screen.queryByLabelText(/role/i)).toBeNull();
    expect(screen.queryByLabelText(/status/i)).toBeNull();
    // Stated, though — you should be able to SEE what you are. Exact match:
    // the caption below it also says "super admin", in the sentence explaining
    // who CAN change your role.
    expect(screen.getByText('Super admin')).toBeTruthy();
  });

  it('shows the sign-in email without letting it be edited', () => {
    renderPage();
    expect(screen.getByText('rumman@bepari-bd.com')).toBeTruthy();
    // Not an input of any kind, disabled or otherwise.
    expect(screen.queryByLabelText(/sign-in email/i)).toBeNull();
    expect(screen.getByText(/this is how you sign in/i)).toBeTruthy();
  });

  /*
   * THE CAPTION IS THE FEATURE.
   *
   * Without it the field is indistinguishable from a recovery address. The
   * server will not send a reset there — migration 000106 and a source guard
   * see to that — so the only thing standing between an operator and a false
   * belief is this sentence.
   */
  it('says plainly that the secondary email is not a way back in', () => {
    renderPage();
    const caption = screen.getByText(/contact address only/i);
    expect(caption.textContent).toMatch(/cannot sign you in/i);
    expect(caption.textContent).toMatch(/cannot receive a password reset/i);
  });

  it('lets you change your password without leaving the page', () => {
    renderPage();
    expect(screen.getByLabelText(/current password/i)).toBeTruthy();
  });
});

describe('saving', () => {
  it('stays disabled until something actually changes', () => {
    renderPage();
    const save = screen.getByRole('button', { name: /save changes/i }) as HTMLButtonElement;
    // An unchanged save still writes a row and bumps updated_at, so the audit
    // trail would claim an edit that never happened.
    expect(save.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Rumman H' } });
    expect((screen.getByRole('button', { name: /save changes/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('sends the trimmed fields and no id at all', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: '  Rumman H  ' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    const sent = updateProfile.mock.calls[0][0];
    expect(sent.name).toBe('Rumman H');
    // The subject is the token. An id in the body would be ignored by the
    // server, and a field that looks meaningful and is not invites somebody to
    // later make it meaningful.
    expect(Object.keys(sent)).not.toContain('id');
  });

  /*
   * The header renders the name from the same auth user. Without the refresh it
   * keeps the old one, and a save that leaves the previous name in the corner
   * of every screen reads as a save that did not work.
   */
  it('re-reads the session so the header stops showing the old name', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(refreshUser).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows the server's own refusal rather than a generic one", async () => {
    updateProfile.mockRejectedValueOnce(
      new Error('Another staff account already uses this mobile number'),
    );
    renderPage();
    fireEvent.change(screen.getByLabelText(/^mobile/i), { target: { value: '01799999999' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // Each refusal names something actionable; "could not save" sends the
    // operator looking blindly.
    expect(await screen.findByText(/already uses this mobile number/i)).toBeTruthy();
  });
});
