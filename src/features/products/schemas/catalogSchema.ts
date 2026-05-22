import { z } from 'zod';

/**
 * Catalog tree Zod schemas.
 * Categories → SubCategories → Product Groups → Classifications
 * Matches backend catalog domain model.
 */

export const catalogNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
});

export const categorySchema = catalogNodeSchema;
export const subCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  categoryId: z.string(),
});
export const productGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  subCategoryId: z.string(),
});
export const classificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  productGroupId: z.string(),
});

export const skuResponseSchema = z.object({
  sku: z.string(),
});

export const platformMarginResponseSchema = z.object({
  margin: z.number().min(0).max(100),
});

export const sizeConfigSchema = z.object({
  sizes: z.array(z.string()),
});

// Inferred types
export type CatalogNode = z.infer<typeof catalogNodeSchema>;
export type Category = z.infer<typeof categorySchema>;
export type SubCategory = z.infer<typeof subCategorySchema>;
export type ProductGroup = z.infer<typeof productGroupSchema>;
export type Classification = z.infer<typeof classificationSchema>;