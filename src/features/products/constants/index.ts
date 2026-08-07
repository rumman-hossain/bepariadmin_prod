/** Statuses supported by backend list filters (DB values mapped to display labels) */
export const PRODUCT_STATUSES = [
  'Pending Approval',
  'Approved',
  'Rejected',
] as const;

export const BACKEND_STATUS_TO_DISPLAY: Record<string, string> = {
  pending_review: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Draft',
};

export const DISPLAY_STATUS_TO_BACKEND: Record<string, string> = {
  'Pending Approval': 'pending_review',
  Approved: 'approved',
  Rejected: 'rejected',
  Draft: 'draft',
};

export const BACKEND_VISIBILITY_TO_DISPLAY: Record<string, string> = {
  public: 'Public',
  private: 'Private',
};

export const DISPLAY_VISIBILITY_TO_BACKEND: Record<string, string> = {
  Public: 'public',
  Private: 'private',
};

export const STOCK_LOW_THRESHOLD = 10;

/**
 * The platform's floor margin, in percent.
 *
 * Shared rather than declared per screen: the list badge and the detail
 * checklist both judge against it, and two copies of a threshold drift the
 * moment one is changed. It mirrors the COALESCE default in the backend's
 * pricing queries — if that moves, this moves with it.
 */
export const MARGIN_FLOOR_PERCENT = 9.5;
