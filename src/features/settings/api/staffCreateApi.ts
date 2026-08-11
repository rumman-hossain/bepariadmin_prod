import { z } from 'zod';
import { request } from '@/src/api/client';
import { API_V1 } from '@/src/utils/constants';
import type { StaffRole } from '@/src/auth/roles';

/*
 * Creating a staff account.
 *
 * Separate from settingsApi because the endpoint lives somewhere else and is
 * gated differently: the list and the role/status changes are under
 * `/settings/staff`, while creation is `POST /auth/admin/create-staff` behind
 * SuperAdminOnly. Putting them in one module would suggest one surface.
 */

export const createdStaffSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
});
export type CreatedStaff = z.infer<typeof createdStaffSchema>;

export interface NewStaff {
  name: string;
  email: string;
  /** Sent as `mobile`. Stored now — it was accepted and discarded until 000106. */
  mobile: string;
  role: StaffRole;
  /** The client-side PBKDF2 hash, never the plaintext. */
  passwordHash: string;
}

/**
 * The roles this form may create, with what each one actually does.
 *
 * `super_admin` is absent and the server refuses it too: the tier that creates
 * staff and sets the platform margin should not be mintable from a form.
 *
 * Ordered widest-first, so the list reads as a descent in authority rather than
 * as the arbitrary order of a database CHECK.
 */
export const CREATABLE_ROLES: ReadonlyArray<{
  value: StaffRole;
  label: string;
  hint: string;
}> = [
  { value: 'admin', label: 'Admin', hint: 'Suppliers, retailers and the catalogue — but not the books' },
  { value: 'finance', label: 'Finance', hint: 'The cash book, settlements and point adjustments' },
  { value: 'operations', label: 'Operations', hint: 'Orders and the day-to-day running' },
  { value: 'supplier_assistant', label: 'Supplier assistant', hint: 'Reads suppliers and the catalogue queue. Cannot approve, suspend or edit' },
  { value: 'logistics', label: 'Logistics', hint: 'The shipping desk only — couriers, rates and shipments' },
  { value: 'viewer', label: 'Viewer', hint: 'Read-only across the back office' },
];

export async function createStaff(staff: NewStaff): Promise<CreatedStaff> {
  const res = await request<unknown>('POST', `${API_V1}/auth/admin/create-staff`, {
    auth: true,
    body: {
      name: staff.name,
      email: staff.email,
      mobile: staff.mobile,
      role: staff.role,
      password_hash: staff.passwordHash,
    },
  });
  if (!res.ok) {
    /*
     * The server's own sentence. Every refusal here names something the
     * operator can act on — an email already taken, a mobile already in use, a
     * number that is not a valid Bangladeshi mobile — and collapsing them into
     * "could not create" sends somebody hunting for a problem they cannot see.
     */
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The account could not be created');
  }
  const parsed = z.object({ data: createdStaffSchema }).safeParse(res.data);
  if (!parsed.success) throw new Error('The account was created but the reply was unreadable');
  return parsed.data.data;
}
