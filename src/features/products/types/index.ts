import type { ProductFormData, ProductResponse } from '../schemas/productSchema';

// ─── Domain-Recognizable Product (backed by API) ──────────────
/** Shape used throughout the frontend, validated by productResponseSchema */
export type Product = ProductResponse;

// Re-export form data type derived from Zod schema
export type { ProductFormData, ProductResponse };

// Alias for the status string union matching ProductResponse
export type ProductStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'Out of Stock'
  | 'Archived'
  | 'Suspended';

export interface ProductVariation {
  id?: string;
  color?: string;
  design?: string;
  subName: string;
  subSku?: string;
  photoUrl?: string;
  videoUrl?: string;
  price?: number;
  stock?: number;
}

// ─── API DTOs (matching backend CreateProductRequest) ──────────

export interface CreateProductDTO {
  name: string;
  category: string;
  subCategory?: string;
  productGroup?: string;
  basePrice: number;
  margin: number;
  stock: number;
  moq: number;
  dispatchTime: string;
  description?: string;
  brandName?: string;
  unitType?: string;
  material?: string;
  color?: string;
  weight?: string;
  volume?: string;
  availableSizes?: string[];
  wholesalerId: string;
  imageUrl?: string;
  visibility: 'Public' | 'Private';
}

export interface UpdateProductDTO {
  name?: string;
  category?: string;
  subCategory?: string;
  productGroup?: string;
  basePrice?: number;
  margin?: number;
  stock?: number;
  moq?: number;
  dispatchTime?: string;
  description?: string;
  brandName?: string;
  unitType?: string;
  material?: string;
  color?: string;
  weight?: string;
  volume?: string;
  availableSizes?: string[];
  visibility?: 'Public' | 'Private';
  imageUrl?: string;
}

// ─── Status Actions ────────────────────────────────────────────

export type ProductStatusAction =
  | 'approve'
  | 'reject'
  | 'archive'
  | 'restore'
  | 'suspend';

// ─── Filter State ──────────────────────────────────────────────

/**
 * The operator's filter selections.
 *
 * `status` and `visibility` are GONE, replaced by one `state`.
 *
 * They were modelled as independent because the catalogue route accepts them
 * that way, but the back office does not think in those terms: APPROVED and
 * PUBLIC are the same `status` column and differ only in visibility, so an
 * operator wanting "cleared but not yet live" had to know that and compose it
 * by hand. Worse, neither could be counted — a tab strip needs one axis.
 *
 * `state` is `'' | ProductState`, where empty means every state. It is not
 * `'All'`: the server refuses an unrecognised state with a 400, so the sentinel
 * has to be something the query builder can omit rather than send.
 */
export interface ProductFilters {
  search: string;
  category: string;
  state: string;
  wholesalerId: string;
  lowStock: boolean;
  /** Undefined = either; false = only products with no image (the publish blocker). */
  hasImage?: boolean;
}

export const INITIAL_FILTERS: ProductFilters = {
  search: '',
  category: 'All',
  /*
   * Opens on the review queue, because that is the job.
   *
   * This used to say `'Pending Approval'` against a route that only ever
   * returned approved products, so the default view was reliably empty and the
   * screen carried a banner explaining why.
   */
  state: 'PENDING',
  wholesalerId: 'All',
  lowStock: false,
  hasImage: undefined,
};

// ─── Pagination ────────────────────────────────────────────────

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
}

export const INITIAL_PAGINATION: ProductPagination = {
  page: 1,
  limit: 20,
  total: 0,
};