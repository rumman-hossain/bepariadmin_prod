import { z } from 'zod';
import { request } from '@/src/api/client';
import { API_V1 } from '@/src/utils/constants';

/*
 * Platform administration: who has access, and the commercial levers not owned
 * by another domain.
 *
 * Every path is built from API_V1. They were bare — `'/settings/staff'` — and
 * Firebase Hosting rewrites only `/api/**` to Cloud Run, serving index.html for
 * anything else. So these requests returned 200 carrying the SPA's own HTML and
 * this module parsed a web page as JSON. Nothing 404'd and nothing reached the
 * backend logs. Guard G17 rejects an unprefixed path now.
 *
 * Note the two different response envelopes below. `/settings/*` uses the
 * standard `{ data }` wrapper; `/catalog/platform-margin` does not — it returns
 * `{ marginPercent }` bare, because it predates the convention. Parsed as it
 * actually is rather than as it ought to be; a schema written from the
 * convention would fail against the real server.
 */

export const staffSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  /*
   * DECLARED, because Zod strips what it does not name.
   *
   * The edit screen seeds its fields from this list. Without `phone` here the
   * box redrew empty after every save, so a saved number looked lost — the same
   * silent-stripping failure that once cost this codebase `objectRef`.
   */
  phone: z.string().optional().default(''),
  role: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StaffAccount = z.infer<typeof staffSchema>;

export async function getStaff(): Promise<StaffAccount[]> {
  const res = await request<unknown>('GET', `${API_V1}/settings/staff`, { auth: true });
  if (!res.ok) throw new Error('Staff accounts could not be loaded');
  const parsed = z.object({ data: z.array(staffSchema) }).safeParse(res.data);
  if (!parsed.success) throw new Error('Staff accounts came back in an unexpected shape');
  return parsed.data.data;
}

/** Surfaces the server's refusal verbatim — each one names something actionable. */
async function patch(path: string, body: Record<string, unknown>, fallback: string): Promise<void> {
  const res = await request<unknown>('PATCH', path, { auth: true, body });
  if (!res.ok) {
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? fallback);
  }
}

export const setStaffRole = (id: string, role: string) =>
  patch(`${API_V1}/settings/staff/${id}/role`, { role }, 'The role could not be changed');

export const setStaffStatus = (id: string, status: 'active' | 'inactive') =>
  patch(`${API_V1}/settings/staff/${id}/status`, { status }, 'The account could not be updated');



/**
 * ROLES ARE SHOWN HERE, NEVER CHOSEN.
 *
 * This console once offered all eight roles the database allows. It now offers
 * none, and that is the correct number rather than an omission:
 *
 *   - there is exactly ONE live super admin and ONE live admin, enforced by a
 *     unique index (migration 000117);
 *   - creating a super admin is refused by the server and always has been —
 *     "the most privileged tier should not be mintable from a form";
 *   - granting a second admin is refused by that index.
 *
 * So every option a picker could offer is one the server would reject. A control
 * whose every choice fails is worse than no control: the operator selects, waits,
 * and is told no.
 *
 * To hand a role to somebody else: delete the account holding it — which revokes
 * their access immediately — and create the replacement.
 *
 * DISPLAYING a role is a different question and still matters. An account is
 * named honestly whatever it holds, including roles this screen does not manage,
 * because a `<select>` whose options exclude the current value silently shows the
 * FIRST one instead — which once reported a logistics account as SUPER ADMIN on
 * the screen used to audit access.
 */
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  finance: 'Finance',
  operations: 'Operations',
  supplier_assistant: 'Supplier assistant',
  product_registrar: 'Product registrar',
  logistics: 'Logistics',
  viewer: 'Viewer',
};

/** A human name for any role. Falls back to the raw value rather than guessing. */
export function labelForRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/**
 * Change a staff member's own details.
 *
 * The LOGIN account in `users.staff` — not the HR record at `/hr/staff`, which
 * is a different thing (department, salary, join date) and is left alone.
 *
 * Authority is the server's: a super admin may edit anyone, an admin anyone
 * except a super admin. The UI withholds the control where it knows the answer,
 * but the refusal that counts is the one below.
 */
export async function updateStaff(
  id: string,
  fields: { name: string; email: string; phone?: string },
): Promise<void> {
  const res = await request<unknown>('PATCH', `${API_V1}/settings/staff/${encodeURIComponent(id)}`, {
    auth: true,
    body: { name: fields.name, email: fields.email, phone: fields.phone ?? '' },
  });
  if (!res.ok) throw new Error(staffErrorMessage(res, 'Could not save those details.'));
}

/**
 * Set somebody else's password.
 *
 * A RESET, not a change — there is no current password here, because the person
 * doing it is not the person who knows it. What is sent is the `pbkdf2v3:`
 * envelope derived by nextgen-password, exactly as every other credential path
 * in this system: the plaintext never leaves the browser.
 *
 * The server ends every session that account holds, since the usual reason for
 * an administrative reset is that the old credential is not trusted.
 */
export async function setStaffPassword(id: string, passwordHash: string): Promise<void> {
  const res = await request<unknown>('PUT', `${API_V1}/settings/staff/${encodeURIComponent(id)}/password`, {
    auth: true,
    body: { password_hash: passwordHash },
  });
  if (!res.ok) throw new Error(staffErrorMessage(res, 'Could not set that password.'));
}

/**
 * Remove a staff account.
 *
 * SOFT on the server — the row stays so its history remains attributable — and
 * the account disappears from this list. What is not soft is the access: the
 * server revokes every session in the same operation, so the person is signed
 * out on every device immediately rather than whenever their token expires.
 */
export async function deleteStaff(id: string): Promise<void> {
  const res = await request<unknown>('DELETE', `${API_V1}/settings/staff/${encodeURIComponent(id)}`, {
    auth: true,
  });
  if (!res.ok) throw new Error(staffErrorMessage(res, 'Could not remove that account.'));
}

/*
 * The server's own words, where it has any.
 *
 * These refusals are the interesting ones — "there is already an admin", "only a
 * super admin can change a super admin's account", "that is the last super
 * admin" — and each tells the operator what to do next. Replacing them with a
 * generic failure sends somebody looking for a problem that does not exist.
 */
function staffErrorMessage(res: { data?: unknown }, fallback: string): string {
  const d = res.data as { error?: { message?: string }; message?: string } | undefined;
  return d?.error?.message || d?.message || fallback;
}
