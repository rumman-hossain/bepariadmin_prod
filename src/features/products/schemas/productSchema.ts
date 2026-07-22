import { z } from 'zod';

/**
 * Product Zod schemas.
 * — productSchema: form validation (create/edit)
 * — productResponseSchema: runtime validation for backend API responses
 * — productListResponseSchema: paginated list from backend
 */

// ─── Shared sub-schemas ────────────────────────────────────────

export const productVariationSchema = z.object({
  id: z.string().optional(),
  color: z.string().optional().or(z.literal('')),
  design: z.string().optional().or(z.literal('')),
  subName: z.string().min(1, 'Variation name is required'),
  subSku: z.string().optional().or(z.literal('')),
  photoUrl: z.string().optional().or(z.literal('')),
  videoUrl: z.string().optional().or(z.literal('')),
  price: z.number().min(0).optional(),
  stock: z.number().min(0).optional(),
});

export const bundleDetailsSchema = z.object({
  isBundle: z.boolean().default(false),
  description: z.string().optional().or(z.literal('')),
});

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Product name is required (min 2 chars)'),
  sku: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().optional().or(z.literal('')),
  productGroup: z.string().optional().or(z.literal('')),
  basePrice: z.number().min(0, 'Base price must be 0 or more'),
  margin: z.number().min(0).max(100, 'Margin must be between 0-100%').default(0),
  sellingPrice: z.number().min(0).optional(),
  stock: z.number().min(0, 'Stock cannot be negative').default(0),
  availableStock: z.number().min(0).optional(),
  reservedStock: z.number().min(0).optional(),
  moq: z.number().min(1, 'MOQ must be at least 1').default(1),
  dispatchTime: z.string().min(1, 'Dispatch time is required'),
  trendTags: z.array(z.string()).optional().default([]),
  visibility: z.enum(['Public', 'Private']).default('Public'),
  wholesalerId: z.string().min(1, 'Wholesaler is required'),
  status: z
    .enum([
      'Draft',
      'Pending Approval',
      'Approved',
      'Rejected',
      'Out of Stock',
      'Archived',
      'Suspended',
    ])
    .default('Draft'),
  imageUrl: z.string().optional().or(z.literal('')),
  imageUrls: z.array(z.string()).optional().default([]),
  rejectionReason: z.string().optional().or(z.literal('')),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  variations: z.array(productVariationSchema).optional().default([]),

  // Basic Details
  description: z.string().optional().or(z.literal('')),
  brandName: z.string().optional().or(z.literal('')),
  unitType: z.string().optional().or(z.literal('')),
  material: z.string().optional().or(z.literal('')),
  color: z.string().optional().or(z.literal('')),
  weight: z.string().optional().or(z.literal('')),
  volume: z.string().optional().or(z.literal('')),
  availableSizes: z.array(z.string()).optional().default([]),
  moqSet: z.record(z.string(), z.number()).optional(),

  // Media & Variations
  videoUrl: z.string().optional().or(z.literal('')),
  bundleDetails: bundleDetailsSchema.optional(),

  // Frontend helpers
  estimatedProfit: z.number().optional(),
  isTrending: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  featuredUntil: z.string().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  isSponsored: z.boolean().optional(),
  sponsoredUntil: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

// ─── Backend API Response Schemas ──────────────────────────────

/** Validates a single product from backend API responses (normalized admin shape) */
export const productResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  category: z.string(),
  subCategory: z.string().optional().nullable(),
  productGroup: z.string().optional().nullable(),
  classification: z.string().optional().nullable(),
  productDetail: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  subCategoryId: z.string().optional().nullable(),
  productGroupId: z.string().optional().nullable(),
  classificationId: z.string().optional().nullable(),
  productDetailId: z.string().optional().nullable(),
  basePrice: z.number(),
  margin: z.number().optional().default(0),
  sellingPrice: z.number().optional().default(0),
  stock: z.number(),
  availableStock: z.number().optional().nullable(),
  reservedStock: z.number().optional().nullable(),
  moq: z.number().optional().default(1),
  dispatchTime: z.string().optional().default(''),
  trendTags: z.array(z.string()).optional().nullable(),
  visibility: z.string(),
  wholesalerId: z.string(),
  status: z.string(),
  imageUrl: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  variations: z.array(productVariationSchema).optional().nullable(),

  description: z.string().optional().nullable(),
  brandName: z.string().optional().nullable(),
  unitType: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  volume: z.string().optional().nullable(),
  availableSizes: z.array(z.string()).optional().nullable(),
  moqSet: z.record(z.string(), z.number()).optional().nullable(),

  videoUrl: z.string().optional().nullable(),
  bundleDetails: bundleDetailsSchema.optional().nullable(),

  estimatedProfit: z.number().optional().nullable(),
  isTrending: z.boolean().optional().nullable(),
  isNew: z.boolean().optional().nullable(),
  isFeatured: z.boolean().optional().nullable(),
  featuredUntil: z.string().optional().nullable(),
  discountPercentage: z.number().optional().nullable(),
  isSponsored: z.boolean().optional().nullable(),
  sponsoredUntil: z.string().optional().nullable(),
});

/** Validates a paginated product list from backend */
export const productListResponseSchema = z.object({
  products: z.array(productResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

/** Validates status update payload */
export const productStatusUpdateSchema = z.object({
  status: z.enum([
    'Draft',
    'Pending Approval',
    'Approved',
    'Rejected',
    'Out of Stock',
    'Archived',
    'Suspended',
  ]),
  rejectionReason: z.string().optional(),
});

export type ProductResponse = z.infer<typeof productResponseSchema>;
export type ProductListResponse = z.infer<typeof productListResponseSchema>;
export type ProductStatusUpdate = z.infer<typeof productStatusUpdateSchema>;
