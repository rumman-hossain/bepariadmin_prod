/**
 * The status values the supplier queue filters by, as the server spells them.
 *
 * Split out of SupplierQueue.tsx so that file exports only its component. A
 * module exporting both a component and a constant loses Fast Refresh entirely
 * (`react-refresh/only-export-components`), and this constant is imported by
 * ListPage as well — so the component file was being pulled in by a module that
 * only wanted five strings.
 *
 * `as const` is load-bearing: SupplierStatusKey is derived from it, so adding a
 * filter here is all it takes for the key type to follow.
 */
export const SUPPLIER_STATUS_FILTERS = {
  review: 'PENDING_REVIEW',
  active: 'APPROVED',
  suspended: 'SUSPENDED',
  rejected: 'REJECTED',
  removed: 'REMOVED',
} as const;

export type SupplierStatusKey = keyof typeof SUPPLIER_STATUS_FILTERS;
