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

export interface ProductFilters {
  search: string;
  category: string;
  status: string;
  wholesalerId: string;
  visibility: string;
  lowStock: boolean;
}

export const INITIAL_FILTERS: ProductFilters = {
  search: '',
  category: 'All',
  status: 'All',
  wholesalerId: 'All',
  visibility: 'All',
  lowStock: false,
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

// ─── AI Suggestion ─────────────────────────────────────────────

export interface AIProductSuggestion {
  name: string;
  description: string;
  category: string;
  tags: string[];
  predictedMargin: number;
  confidence: number;
}