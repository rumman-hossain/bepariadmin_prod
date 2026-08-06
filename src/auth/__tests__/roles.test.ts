import { describe, it, expect } from 'vitest';
import {
  asStaffRole,
  hasRole,
  ADMIN_WRITE,
  SUPER_ADMIN_ONLY,
  ANY_STAFF,
  FINANCE,
} from '../roles';

/**
 * The frontend captured `user.role` in four places and read it in none, so a
 * `viewer` was shown the same create / edit / delete / approve controls as a
 * `super_admin`. These lock the mapping to the backend's roles.go.
 *
 * The unknown-role case is the one that matters: failing open there would hand
 * every control to any principal whose role this build doesn't recognise.
 */

describe('asStaffRole', () => {
  it('accepts the five backend roles', () => {
    for (const role of ['super_admin', 'admin', 'finance', 'operations', 'viewer']) {
      expect(asStaffRole(role)).toBe(role);
    }
  });

  it('normalises casing and separators', () => {
    expect(asStaffRole('Super_Admin')).toBe('super_admin');
    expect(asStaffRole('SUPER ADMIN')).toBe('super_admin');
    expect(asStaffRole('super-admin')).toBe('super_admin');
    expect(asStaffRole('  admin  ')).toBe('admin');
  });

  it('rejects anything it does not recognise', () => {
    expect(asStaffRole('wholesaler')).toBeNull();
    expect(asStaffRole('retailer')).toBeNull();
    expect(asStaffRole('root')).toBeNull();
    expect(asStaffRole('')).toBeNull();
    expect(asStaffRole(undefined)).toBeNull();
    expect(asStaffRole(null)).toBeNull();
  });
});

describe('hasRole', () => {
  it('gates catalogue and user mutation to super_admin and admin', () => {
    expect(hasRole('super_admin', ADMIN_WRITE)).toBe(true);
    expect(hasRole('admin', ADMIN_WRITE)).toBe(true);
    expect(hasRole('finance', ADMIN_WRITE)).toBe(false);
    expect(hasRole('operations', ADMIN_WRITE)).toBe(false);
    // The backend comment is explicit that viewer must not touch products.
    expect(hasRole('viewer', ADMIN_WRITE)).toBe(false);
  });

  it('gates staff creation to super_admin alone', () => {
    expect(hasRole('super_admin', SUPER_ADMIN_ONLY)).toBe(true);
    expect(hasRole('admin', SUPER_ADMIN_ONLY)).toBe(false);
  });

  it('lets every staff role through the broad gate', () => {
    for (const role of ['super_admin', 'admin', 'finance', 'operations', 'viewer']) {
      expect(hasRole(role, ANY_STAFF)).toBe(true);
    }
  });

  it('includes finance in the money gate but not operations', () => {
    expect(hasRole('finance', FINANCE)).toBe(true);
    expect(hasRole('super_admin', FINANCE)).toBe(true);
    expect(hasRole('operations', FINANCE)).toBe(false);
    /*
     * `admin` must NOT be able to move money. This mirrors the backend's
     * FinanceOnly middleware exactly; if the two drift, the UI offers actions
     * the API refuses. Asserted here rather than assumed, because the two live
     * in different repositories and nothing else connects them.
     */
    expect(hasRole('admin', FINANCE)).toBe(false);
  });

  it('FAILS CLOSED on an unknown or missing role', () => {
    // If the backend grows a role this build has not heard of, the safe
    // outcome is to hide the control, not to expose everything.
    expect(hasRole('some_future_role', ANY_STAFF)).toBe(false);
    expect(hasRole('wholesaler', ANY_STAFF)).toBe(false);
    expect(hasRole(undefined, ANY_STAFF)).toBe(false);
    expect(hasRole('', ADMIN_WRITE)).toBe(false);
  });
});
