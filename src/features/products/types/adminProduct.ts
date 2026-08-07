/**
 * The BACK-OFFICE product shape — `GET /api/v1/admin/products`.
 *
 * Deliberately its own type rather than the catalogue `Product`.
 *
 * `GET /api/v1/products` is shared with retailers and defaults to
 * approved+public, which is why "All Statuses" on the old screen silently meant
 * "approved only" and every product waiting for review was invisible. The
 * back-office route exists to answer a different question, and it answers it
 * with a different, narrower row: no variations array, no catalogue label
 * resolution, but a computed `state`, the supplier's name and code, an image
 * count, and a variant count.
 *
 * Nothing here is normalised or re-mapped on arrival. The server sends camelCase
 * and computes `state` once, so no client has to know that APPROVED and PUBLIC
 * share a status column.
 */

/**
 * The six states an operator sees, in queue order.
 *
 * These are NOT the `status` column. The server folds `status`, `visibility`
 * and `deleted_at` into one value (`internal/admin/product_repository.go`):
 *
 *   DRAFT     status=draft
 *   PENDING   status=pending_review          ← waiting on us
 *   APPROVED  status=approved  + private     ← cleared, not yet live
 *   PUBLIC    status=approved  + public      ← live to retailers
 *   REJECTED  status=rejected
 *   REMOVED   deleted_at IS NOT NULL
 *
 * The console previously modelled status and visibility as two independent
 * filters, so "Approved + Private" had to be composed by hand and could not be
 * counted. One control replaces both.
 */
export const PRODUCT_STATES = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'PUBLIC',
  'REJECTED',
  'REMOVED',
] as const;

export type ProductState = (typeof PRODUCT_STATES)[number];

/** Human labels. Kept beside the union so a new state cannot ship unlabelled. */
export const PRODUCT_STATE_LABEL: Record<ProductState, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  PUBLIC: 'Public',
  REJECTED: 'Rejected',
  REMOVED: 'Removed',
};

/**
 * What each state means, in the words an operator would use.
 *
 * Shown under the tabs and on the detail rail. "Approved" and "Public" are the
 * pair people confuse, and the difference — visible to retailers or not — is the
 * whole reason they are separate states.
 */
export const PRODUCT_STATE_MEANING: Record<ProductState, string> = {
  DRAFT: 'The supplier is still writing this.',
  PENDING: 'Waiting for your review.',
  APPROVED: 'Cleared, but not yet visible to retailers.',
  PUBLIC: 'Live to retailers and orderable.',
  REJECTED: 'Turned down. The supplier can correct it and resubmit.',
  REMOVED: 'Deleted. Kept so existing orders stay resolvable.',
};

/**
 * `state` is a plain string on the wire because the server returns "" for a
 * status it does not recognise rather than guessing — an unrecognised product
 * renders as unknown instead of as something the operator can act on.
 */
export function isProductState(value: string): value is ProductState {
  return (PRODUCT_STATES as readonly string[]).includes(value);
}

export interface AdminProductRow {
  id: string;
  name: string;
  sku: string;
  /** Raw column values. Prefer `state`; these are here for debugging. */
  status: string;
  visibility: string;
  /** The folded six-value state. Empty when the server did not recognise the status. */
  state: string;

  categoryId: string;
  supplierId: string;
  supplierName: string;
  /** `WHL-00042` — also the first two segments of every SKU this supplier owns. */
  supplierCode: string;

  /**
   * `hasVariant` is the product's own flag; `variantCount` is what is on the
   * table. They can disagree, because nothing walks the flag back when the last
   * variation is deleted — so anything rendered uses the COUNT.
   */
  hasVariant: boolean;
  variantCount: number;

  basePrice: number;
  sellingPrice: number;
  stock: number;
  /** Zero is the publish gate: a product cannot go PUBLIC without an image. */
  imageCount: number;
  thumbnailUrl: string;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** A supplier asking for this to be removed. Sorts to the top of the queue. */
  deletionRequestedAt: string | null;
}

/** Counts per state, computed with the state filter REMOVED so the strip stays navigable. */
export interface ProductStateCounts {
  draft: number;
  pending: number;
  approved: number;
  public: number;
  rejected: number;
  removed: number;
}

export const EMPTY_STATE_COUNTS: ProductStateCounts = {
  draft: 0,
  pending: 0,
  approved: 0,
  public: 0,
  rejected: 0,
  removed: 0,
};

/** Maps a tab to its count. `null` is the "All" tab, which uses `total`. */
export const COUNT_KEY_BY_STATE: Record<ProductState, keyof ProductStateCounts> = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  PUBLIC: 'public',
  REJECTED: 'rejected',
  REMOVED: 'removed',
};

/**
 * The six-value state, derived from a DETAIL product.
 *
 * The list gets `state` computed by the server. The detail page does not: it
 * reads `GET /api/v1/products/:id`, whose response `mapProduct` has already
 * normalised into the DISPLAY vocabulary — `'Pending Approval'`, `'Public'` —
 * so neither the raw column values nor the server's fold are available.
 *
 * This is therefore a mirror of `productState()` in
 * `internal/admin/product_repository.go`, and the duplication is real. It is
 * accepted here rather than solved by a second request per product, but it is
 * the thing to check first if the two ever disagree about what APPROVED means.
 *
 * Comparison is case- and space-insensitive because the display vocabulary and
 * the column vocabulary have both reached this function historically —
 * `'Pending Approval'` from the mapper, `pending_review` from anything that
 * bypasses it.
 */
export function deriveProductState(
  status: string | undefined,
  visibility: string | undefined,
  deleted = false,
): ProductState | '' {
  if (deleted) return 'REMOVED';

  const s = (status ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  const isPublic = (visibility ?? '').toLowerCase() === 'public';

  switch (s) {
    case 'draft':
      return 'DRAFT';
    case 'pending_approval':
    case 'pending_review':
    case 'pending':
      return 'PENDING';
    case 'rejected':
      return 'REJECTED';
    case 'approved':
      // The one place the two states share a status and part on visibility.
      return isPublic ? 'PUBLIC' : 'APPROVED';
    default:
      /*
       * Not guessed. The server returns "" for a status it does not recognise
       * rather than folding it into Draft, and this does the same — an
       * unrecognised product renders as unknown, which is honest, instead of
       * as something the operator can act on.
       */
      return '';
  }
}

/**
 * Which verbs are legal from a state.
 *
 * A mirror of the transition table in `internal/product/lifecycle.go`, kept so
 * the rail can offer only what the server will accept. The server remains the
 * authority — every one of these is re-checked there, and a guard failure comes
 * back as a refusal — but a button that is certain to fail is not a button, it
 * is a trap.
 *
 * `submit` is deliberately absent: DRAFT and REJECTED move to PENDING by the
 * SUPPLIER's hand, and an admin doing it on their behalf would put a product in
 * the review queue that nobody asked to have reviewed.
 */
export type ProductVerb = 'approve' | 'reject' | 'publish' | 'takeDown';

export const LEGAL_VERBS: Record<ProductState, readonly ProductVerb[]> = {
  DRAFT: ['takeDown'],
  PENDING: ['approve', 'reject', 'takeDown'],
  APPROVED: ['publish', 'takeDown'],
  PUBLIC: ['takeDown'],
  REJECTED: ['takeDown'],
  // A removed product is already gone; there is nothing left to do to it here.
  REMOVED: [],
};

export interface AdminProductListParams {
  page: number;
  limit: number;
  search?: string;
  /** One of PRODUCT_STATES. The server refuses anything else with a 400. */
  state?: ProductState;
  supplierId?: string;
  categoryId?: string;
  /** Server-side. The old screen filtered these in the browser over one page. */
  hasImage?: boolean;
  lowStock?: boolean;
}

export interface AdminProductListResult {
  products: AdminProductRow[];
  total: number;
  page: number;
  limit: number;
  counts: ProductStateCounts;
}
