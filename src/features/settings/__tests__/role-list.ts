/**
 * Every role `users.staff.role` accepts, transcribed from the database.
 *
 * A hand-written list rather than an import of `STAFF_ROLES`, and that is the
 * whole point: importing the same constant the code uses would make the
 * "offers every role the database allows" assertion tautological — adding a
 * role to the app's list and forgetting the create form would keep passing.
 *
 * The source of truth is the CHECK constraint, last set by migration 000106:
 *
 *   CHECK (role IN ('super_admin', 'admin', 'finance', 'operations', 'viewer',
 *                   'logistics', 'supplier_assistant'))
 *
 * If a migration adds a role, add it here in the same commit. The test will
 * then fail until the create form offers it, which is the intended sequence —
 * `logistics` sat in the database for months with no way to create an account
 * for it.
 */
export const STAFF_ROLES_FOR_TEST = [
  'super_admin',
  'admin',
  'finance',
  'operations',
  'viewer',
  'logistics',
  'supplier_assistant',
  'product_registrar',
] as const;
