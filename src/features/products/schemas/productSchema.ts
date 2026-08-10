import { z } from 'zod';

/**
 * Product Zod schemas.
 * — productSchema: form validation (create/edit)
 * — productResponseSchema: runtime validation for backend API responses
 * — productListResponseSchema: paginated list from backend
 */

// ─── Shared sub-schemas ────────────────────────────────────────

/** One size's figures on a variation, as `GET /products/:id` returns them. */
export const variationInventorySchema = z.object({
  id: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  variationId: z.string().optional().nullable(),
  size: z.string(),
  stock: z.number().optional().nullable(),
  moq: z.number().optional().nullable(),
  lowStockAlert: z.number().optional().nullable(),
});

/** One image or video belonging to a variation. */
export const variationMediaSchema = z.object({
  id: z.string().optional().nullable(),
  url: z.string(),
  /*
   * The STORED reference behind `url`.
   *
   * `url` is a fifteen-minute proxy token. Sending it back on a save is what
   * put `/api/v1/file/<token>` into products.product_media and blanked a live
   * product's images a quarter of an hour later. This is the durable `gs://`
   * the server resolved from, and the only value a write may carry.
   */
  objectRef: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
  position: z.number().optional().nullable(),
  variationId: z.string().optional().nullable(),
});

/**
 * A product variation, as the SERVER sends it.
 *
 * THIS SCHEMA WAS THROWING AWAY MOST OF THE PAYLOAD.
 *
 * Zod strips unknown keys, so every field the server sent and this object did
 * not declare was discarded before any component could render it — variant
 * prices, variant images and per-size inventory among them. The screens were
 * blamed for not showing data that never reached them.
 *
 * Measured on dev: 26 of 26 variations carry their own price, and 60 rows in
 * `products.product_media` are scoped to a variation. All of it was arriving
 * and being dropped here.
 *
 * The names below are the SERVER's (`internal/product/repository.go:85-115`),
 * not ones invented to look tidy. `sellingPrice` is the big one: the server has
 * always called a variation's price that, while this declared `price`, so the
 * field was silently absent on every variation.
 */
export const productVariationSchema = z.object({
  id: z.string().optional(),
  color: z.string().optional().nullable().or(z.literal('')),
  design: z.string().optional().nullable().or(z.literal('')),
  // Relaxed from `.min(1)`. This schema validates RESPONSES, and a variation
  // saved without a sub-name would have failed the whole product parse —
  // blanking a detail page over a cosmetic field.
  subName: z.string().optional().nullable().or(z.literal('')),
  subSku: z.string().optional().nullable().or(z.literal('')),
  displayLabel: z.string().optional().nullable(),
  seq: z.number().optional().nullable(),

  photoUrl: z.string().optional().nullable().or(z.literal('')),
  videoUrl: z.string().optional().nullable().or(z.literal('')),

  /*
   * TWO PRICES, AND THEY ARE NOT INTERCHANGEABLE.
   *
   * `basePrice` is what the SUPPLIER costed this colour at — the value stored
   * in product_variations.price, and the one the wizard edits and writes back.
   * `sellingPrice` is that plus the supplier's platform margin, derived by the
   * server, and is read-only here.
   *
   * `basePrice` was missing entirely, so Zod stripped the field the server
   * sends and the transform below filled `price` from `sellingPrice`. Every
   * wizard site treats `price` as a base — `calcRetail(v.price)`, the "Base:"
   * line on step 6, `price: parseFloatOr(variation.price, 0)` in the payload —
   * so editing a variant product loaded the MARGINED figure as the base, showed
   * it as the base, and saved it as the base. The margin compounded on every
   * edit: 100 became 109.50, then 119.90, then 131.29.
   */
  basePrice: z.number().optional().nullable(),
  sellingPrice: z.number().optional().nullable(),
  /** Alias for `basePrice`, kept so existing wizard callers keep working. */
  price: z.number().optional().nullable(),

  stock: z.number().optional().nullable(),
  moq: z.number().optional().nullable(),
  lowStockAlert: z.number().optional().nullable(),

  inventory: z.array(variationInventorySchema).optional().nullable(),
  media: z.array(variationMediaSchema).optional().nullable(),
})
  .transform((v) => ({
    ...v,
    // `price` and `basePrice` are one fact under two names — whichever the
    // server used, both end up holding the COST. `sellingPrice` is never
    // folded in: that is what made an edit reload the margined figure as the
    // base. `?? undefined` rather than `||` so a deliberate 0 survives — a free
    // gift variant is priced at zero, not unpriced.
    price: v.price ?? v.basePrice ?? undefined,
    basePrice: v.basePrice ?? v.price ?? undefined,
    sellingPrice: v.sellingPrice ?? undefined,
  }));

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
  wholesalerId: z.string().min(1, 'Supplier is required'),
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
  /*
   * WHOSE product this is, in the words an operator uses.
   *
   * The detail response carried only `wholesalerId` — a UUID — so the one
   * screen where every rule is about the supplier could not name them. The
   * margin comes from their row, a rejection notifies them, a take-down affects
   * them, and the self-approval guard compares against who submitted. An
   * approver had to go back to the list to find out whose product they were
   * judging. Same field names the admin list row uses, so the two agree.
   */
  supplierName: z.string().optional().default(''),
  supplierCode: z.string().optional().default(''),
  status: z.string(),
  imageUrl: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).optional().nullable(),
  /**
   * The media rows with their POSITIONS, not just their URLs.
   *
   * `imageUrls` is this list flattened, which is all the catalogue grid and the
   * detail page ever needed — so the normaliser read `raw.media`, derived
   * `imageUrls` from it and dropped the rest. The Add/Edit wizard needs the
   * positions: 0 is the poster, 1 the front, 2 the back, the rest the gallery,
   * and they can be sparse. A product with a poster and one detail shot is
   * positions 0 and 3, which a flat array cannot express — rebuilt from
   * `imageUrls` the detail shot would slide into the front slot.
   *
   * Absent it, every edit opened with six empty media tiles and step 4 refused
   * to advance, on a product that already had photographs.
   */
  media: z
    .array(
      z.object({
        url: z.string(),
        mediaType: z.string().optional().nullable(),
        position: z.number().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  /*
   * THE FIELDS THE ADD/EDIT WIZARD HYDRATES FROM, declared so the compiler can
   * see them.
   *
   * `normalizeBackendProduct` builds its result from an explicit field list, so
   * anything absent from that list does not exist downstream however faithfully
   * the API sent it. These six were absent, and the wizard read them anyway —
   * through `(p as Product & { sizeType?: string })` casts, which assert a field
   * the type does not have and make `undefined` type-check clean.
   *
   * The result, on every edit: colour and design chips empty on a product with
   * two of each, the Size Type toggle reset to UNIQUE, tags gone, the
   * product-level low-stock alert gone, and `hasVariant` guessed from
   * `variations.length` instead of read.
   *
   * Declared here rather than cast at the call site so that dropping one from
   * the normaliser again is a compile error, not a blank field.
   */
  hasVariant: z.boolean().optional().nullable(),
  sizeType: z.string().optional().nullable(),
  variationColors: z.array(z.string()).optional().nullable(),
  variationDesigns: z.array(z.string()).optional().nullable(),
  productTags: z.array(z.string()).optional().nullable(),
  lowStockAlert: z.number().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  variations: z.array(productVariationSchema).optional().nullable(),

  /*
   * The per-size rows for a product with NO variants.
   *
   * `GET /products/:id` has always returned these — the rows of
   * products.product_inventory whose variation_id IS NULL — and Zod strips what
   * it does not declare, so they were discarded before any screen could read
   * them. That is why the detail page could only ever show one stock total: a
   * product can total 200 units and hold zero in M and L, the sizes people
   * actually buy, and nothing on the page could say so. The LIST has a
   * `lowStock` filter for exactly this question; the detail page could not
   * answer it.
   */
  inventory: z.array(variationInventorySchema).optional().nullable(),

  /*
   * The sixth state, which is not in the status column.
   *
   * `deriveProductState(status, visibility, deleted)` has taken a third
   * argument since the state model was written and the detail page has never
   * been able to pass one, because the payload carried no such field. A
   * taken-down product therefore rendered as APPROVED or PUBLIC, with an action
   * rail offering verbs the server would refuse.
   */
  deleted: z.boolean().optional().default(false),

  /*
   * The supplier's margin as the admin set it, not a percentage re-derived here.
   *
   * The detail page computed ((sellingPrice - basePrice) / basePrice) * 100 in
   * the component — money derived in the browser, which scripts/guard.sh G12
   * exists to forbid, and which rounds differently from the server the moment a
   * base price is not a round number. The admin list has had the server's
   * figure all along.
   */
  marginPercent: z.number().optional().default(0),

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
  /** Stored reference behind `videoUrl` — see variationMediaSchema.objectRef. */
  videoObjectRef: z.string().optional().nullable(),
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
