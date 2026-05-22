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

// Filter state
export interface WholesalerFilters {
  search: string;
  category: string;
  location: string;
  recentlyAdded: boolean;
}