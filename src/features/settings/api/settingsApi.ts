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

export async function getPlatformMargin(): Promise<number> {
  const res = await request<unknown>('GET', `${API_V1}/catalog/platform-margin`, { auth: true });
  if (!res.ok) throw new Error('The platform margin could not be loaded');
  const parsed = z.object({ marginPercent: z.number() }).safeParse(res.data);
  if (!parsed.success) throw new Error('The platform margin came back in an unexpected shape');
  return parsed.data.marginPercent;
}

export async function setPlatformMargin(marginPercent: number): Promise<void> {
  const res = await request<unknown>('PUT', `${API_V1}/catalog/platform-margin`, {
    auth: true,
    body: { marginPercent },
  });
  if (!res.ok) {
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The platform margin could not be saved');
  }
}

/**
 * Every role an existing account may HOLD, in the order of the database CHECK.
 *
 * Wider than the list the create form offers, and deliberately so: this one
 * includes `super_admin`, because an account that already has it must display
 * as it truly is. Creating one from a form is a different question — see
 * CREATABLE_ROLES in staffCreateApi.ts.
 *
 * `logistics` and `supplier_assistant` were both MISSING here, which is worse
 * than it sounds. This list feeds the role `<select>` on each row, so a person
 * holding either one had no matching option and the control fell back to
 * showing the first — reporting a logistics account as a SUPER ADMIN on the
 * screen an operator uses to audit who has access. It also meant nobody could
 * be moved into either department after the fact.
 */
export const STAFF_ROLES = [
  { value: 'super_admin', label: 'Super admin', hint: 'Everything, including staff accounts and the platform margin' },
  { value: 'admin', label: 'Admin', hint: 'Suppliers, retailers and the catalogue — but not the books' },
  { value: 'finance', label: 'Finance', hint: 'The cash book, settlements and point adjustments' },
  { value: 'operations', label: 'Operations', hint: 'Orders and day-to-day running' },
  { value: 'supplier_assistant', label: 'Supplier assistant', hint: 'Reads suppliers and the catalogue queue' },
  { value: 'product_registrar', label: 'Product registrar', hint: 'The product registration app only' },
  { value: 'logistics', label: 'Logistics', hint: 'The shipping desk only' },
  { value: 'viewer', label: 'Viewer', hint: 'Read-only' },
] as const;
