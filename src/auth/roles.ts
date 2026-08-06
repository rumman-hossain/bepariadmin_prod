/**
 * Staff roles, mirroring the backend's `pkg/middleware/roles.go`.
 *
 * The frontend previously captured `user.role` in four places and read it in
 * none — a `viewer` saw exactly the same affordances as a `super_admin`,
 * including create, edit, delete and approve controls that the server would
 * then reject.
 *
 * IMPORTANT: none of this is a security boundary. Anything here runs on the
 * user's machine and can be edited by them. The backend's three gates
 * (`AdminOnly`, `StrictAdminOnly`, `SuperAdminOnly`) are the enforcement point.
 * What this buys is (a) not showing people buttons that will fail, and
 * (b) defence in depth, so a backend gap is not immediately reachable through
 * ordinary UI. `AUDIT_REPORT.md` C2 documents exactly such a gap on the catalog
 * routes, which is why the second part matters.
 */
const STAFF_ROLES = [
  'super_admin',
  'admin',
  'finance',
  'operations',
  'viewer',
  'logistics',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * Every console role, including the department ones.
 *
 * NOT the same as `ADMIN_STAFF`. Mirrors the backend's `IsStaffRole`, which
 * answers "is this back-office staff" for session scope — a different question
 * from "may this reach the admin screens".
 */
export const ANY_STAFF: readonly StaffRole[] = STAFF_ROLES;

/**
 * The roles that may see the admin console.
 *
 * `logistics` is deliberately absent, and that absence is the whole department
 * login. Mirrors the backend's `IsAdminRole`, which gates every AdminOnly route
 * — see pkg/middleware/roles.go for why the two questions had to be split.
 *
 * This is the DEFAULT for a nav entry. A screen added later without thinking
 * about roles is invisible to logistics rather than exposed to it.
 */
export const ADMIN_STAFF: readonly StaffRole[] = [
  'super_admin',
  'admin',
  'finance',
  'operations',
  'viewer',
];

/**
 * The shipping department.
 *
 * Admin roles are included: the department sees only logistics, but admin sees
 * everything, including this. A warehouse question at 9pm should not need the
 * one person with the right job title. Mirrors `middleware.LogisticsOnly`.
 */
export const LOGISTICS: readonly StaffRole[] = [...ADMIN_STAFF, 'logistics'];

/**
 * Where a role lands after signing in.
 *
 * `/dashboard` was hardcoded in two places. A logistics user would have landed
 * on a screen their own role cannot see — a login that appears to fail.
 */
export function homeFor(role: string | undefined | null): string {
  return asStaffRole(role) === 'logistics' ? '/logistics' : '/dashboard';
}

/** Can mutate users, wholesalers and the product catalogue. `StrictAdminOnly`. */
export const ADMIN_WRITE: readonly StaffRole[] = ['super_admin', 'admin'];

/** Can create staff accounts. `SuperAdminOnly`. */
export const SUPER_ADMIN_ONLY: readonly StaffRole[] = ['super_admin'];

/**
 * Who may move money: settle a supplier, record an expense, adjust reward
 * points, pay a referral.
 *
 * `admin` is deliberately absent, and that is the whole point. The person who
 * onboards a supplier is not the person who pays them — the cheapest fraud
 * control a marketplace has, since an admin who could do both needs no
 * accomplice.
 *
 * This list previously included `admin`, which did not match the server. The
 * backend's `FinanceOnly` middleware admits `super_admin` and `finance` only,
 * so an admin would have been shown a Settle button and then refused with a
 * 403 — the UI promising something the API forbids. The two must agree, and
 * the API is the one that decides.
 */
export const FINANCE: readonly StaffRole[] = ['super_admin', 'finance'];

/** Normalises whatever the backend sent into a known role, or null. */
export function asStaffRole(role: string | undefined | null): StaffRole | null {
  if (!role) return null;
  const normalised = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (STAFF_ROLES as readonly string[]).includes(normalised)
    ? (normalised as StaffRole)
    : null;
}

/**
 * Whether `role` is in `allowed`.
 *
 * An unrecognised role returns false rather than true. If the backend grows a
 * role this build has never heard of, the safe outcome is to hide the control
 * and let the server be the authority — not to expose everything.
 */
export function hasRole(role: string | undefined | null, allowed: readonly StaffRole[]): boolean {
  const staffRole = asStaffRole(role);
  return staffRole !== null && allowed.includes(staffRole);
}
