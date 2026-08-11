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
  'supplier_assistant',
  'product_registrar',
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
 * The supplier desk.
 *
 * `supplier_assistant` works a supplier's account and their catalogue, so it
 * sees the Suppliers and Products sections and nothing else — two destinations
 * in a rail of nineteen. Admin roles are included for the same reason they are
 * in LOGISTICS: the department sees only its desk, admin sees everything.
 *
 * Mirrors `middleware.SupplierDeskOnly`. The server is read-only for this role
 * today — it may open a supplier and the catalogue queue, not approve, suspend
 * or edit — so any control this list reveals must be a read. A nav entry whose
 * screen then 403s is worse than no entry at all.
 */
export const SUPPLIER_DESK: readonly StaffRole[] = [...ADMIN_STAFF, 'supplier_assistant'];

/**
 * Where a role lands after signing in.
 *
 * `/dashboard` was hardcoded in two places. A logistics user would have landed
 * on a screen their own role cannot see — a login that appears to fail.
 */
export function homeFor(role: string | undefined | null): string {
  switch (asStaffRole(role)) {
    case 'logistics':
      return '/logistics';
    // The assistant cannot see /dashboard either. Same failure as logistics
    // had: landing on a screen your own role hides reads as a login that did
    // not work.
    case 'supplier_assistant':
      return '/wholesalers';
    default:
      return '/dashboard';
  }
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

/**
 * What each role is called on screen.
 *
 * ONE map, because the copy in Header.tsx had already drifted: it listed five
 * roles and `logistics` had been a real console role since migration 000089, so
 * that department's own header badge read "Unknown role". A second copy of a
 * role list is how the two disagree, and it always disagrees quietly.
 *
 * Typed by StaffRole rather than by string, so adding a role to STAFF_ROLES
 * without naming it here is a compile error instead of another silent
 * "Unknown role".
 */
export const ROLE_LABEL: Record<StaffRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  finance: 'Finance',
  operations: 'Operations',
  viewer: 'Viewer',
  logistics: 'Logistics',
  supplier_assistant: 'Supplier assistant',
  product_registrar: 'Product registrar',
};

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
