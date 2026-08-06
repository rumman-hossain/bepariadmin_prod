import type { WholesalerFormData } from '../schemas/wholesalerSchema';

// Re-export domain type for convenience
export type { Wholesaler } from '@/src/types/domain';

// Form data type derived from Zod schema
export type { WholesalerFormData };

// API DTOs (matching backend UpdateWholesalerRequest)
export interface CreateWholesalerDTO {
  name: string;
  shopName: string;
  phone: string;
  email: string;
  category: string;
  bkashNumber: string;
  password: string;
}

export interface UpdateWholesalerDTO {
  name?: string;
  shopName?: string;
  category?: string;
  bkashNumber?: string;
}

// Status actions
export type WholesalerStatusAction = 'activate' | 'suspend' | 'approve' | 'reject';

/**
 * Every way the supplier directory can be narrowed.
 *
 * This replaces a four-field shape — search, category, location and a
 * "recentlyAdded" boolean that never said what window it meant — which lived in
 * a Zustand store and was applied to a fully-fetched array in the browser.
 *
 * These travel to the SERVER as query parameters, and to the URL, so a narrowed
 * view is a link somebody can send and a reload does not lose it.
 *
 * Every field is optional and an absent field means "no filter". An empty string
 * would narrow to the empty string once it reached SQL.
 */
export interface SupplierQuery {
  search?: string;
  /** APPROVED | PENDING_REVIEW | SUSPENDED | REJECTED | REMOVED */
  status?: string;
  district?: string;
  category?: string;
  /** standard | negotiated */
  commission?: string;
  /** 7, 30 or 90. Zero means no window. */
  joinedWithinDays?: number;
  /** complete | incomplete */
  paperwork?: string;
  /** listing | none */
  products?: string;
  /** SELF | ADMIN */
  registeredBy?: string;
  page?: number;
  limit?: number;
}