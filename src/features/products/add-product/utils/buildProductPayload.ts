import type {
  CreateProductInput,
  MediaSlot,
  ProductMediaItem,
  ProductMediaState,
  ProductVariation,
  VariationMediaState,
  WizardState,
} from '../../types/registration';
import { emptyVariationMedia } from '../store/useAddProductStore';

/**
 * The wizard → API transform, as pure functions.
 *
 * This was ~130 lines inlined in `handleSubmitProduct`, wedged between two
 * network calls and a navigation timer — so the only way to exercise the
 * business maths (margin, stock rollup, MOQ minimum, low-stock maximum, media
 * ordering) was to drive the whole six-step wizard against a live API.
 *
 * Nothing here touches the store, the network or React. Everything takes state
 * in and returns a payload out, which is what makes it testable.
 */

/** Numeric coercion that treats empty/absent as the caller's fallback, not NaN. */
export function parseIntOr(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseFloatOr(value: unknown, fallback: number): number {
  const parsed = parseFloat(String(value ?? ''));
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** True while any product media slot is still uploading. */
export function hasPendingUploads(media: ProductMediaState): boolean {
  const uploading = (slot?: MediaSlot) => slot?.uploadStatus === 'uploading';
  return (
    uploading(media.front) ||
    uploading(media.back) ||
    uploading(media.poster) ||
    uploading(media.video) ||
    media.more.some(uploading)
  );
}

/**
 * Product-level images in display order.
 *
 * A product with variants carries only the poster at the top level — each
 * variant supplies its own imagery — so shipping the front/back shots too would
 * duplicate them under every variant in the storefront.
 */
export function collectProductMedia(
  media: ProductMediaState,
  hasVariant: boolean,
): ProductMediaItem[] {
  if (hasVariant) {
    return media.poster.uploadedUrl
      ? [{ url: media.poster.uploadedUrl, mediaType: 'image', position: 0 }]
      : [];
  }

  const ordered: Array<MediaSlot | undefined> = [
    media.poster,
    media.front,
    media.back,
    ...media.more,
  ];

  return ordered.flatMap((slot, index) =>
    slot?.uploadedUrl
      ? [{ url: slot.uploadedUrl, mediaType: 'image' as const, position: index }]
      : [],
  );
}

function collectVariationMedia(media: VariationMediaState) {
  const ordered = [media.front, media.back, ...(media.more ?? [])];
  return ordered.flatMap((slot, index) =>
    slot?.uploadedUrl
      ? [{ url: slot.uploadedUrl, mediaType: 'image', position: index }]
      : [],
  );
}

/**
 * Per-size stock for one variation.
 *
 * Three sources, in precedence order: the size-specific override the user typed,
 * then whatever the product already had on the server for that size, then the
 * default. Sizes the user has deselected are dropped entirely — the result is
 * keyed off `selectedSizes`, not off the existing inventory.
 */
export function resolveVariationInventory(
  variation: ProductVariation,
  selectedSizes: string[],
) {
  // A Map, not a `.find()` per size: this is O(V·(S+I)) instead of O(V·S·I).
  const existingBySize = new Map((variation.inventory ?? []).map((item) => [item.size, item]));

  return selectedSizes.map((size) => {
    const existing = existingBySize.get(size);
    return {
      size,
      stock:
        variation.sizeStock?.[size] !== undefined
          ? parseIntOr(variation.sizeStock[size], 0)
          : parseIntOr(existing?.stock, 0),
      moq:
        variation.sizeMoq?.[size] !== undefined
          ? parseIntOr(variation.sizeMoq[size], 1)
          : parseIntOr(existing?.moq, 1),
      lowStockAlert:
        variation.sizeAlert?.[size] !== undefined
          ? parseIntOr(variation.sizeAlert[size], 5)
          : parseIntOr(existing?.lowStockAlert, 5),
    };
  });
}

/**
 * Variation-level totals derived from its per-size rows.
 *
 * Stock sums, MOQ takes the minimum and the low-stock alert takes the maximum —
 * so the variation is orderable at the smallest quantity any of its sizes
 * allows, and warns as soon as the first size runs low.
 */
function rollUpVariation(
  inventory: ReturnType<typeof resolveVariationInventory>,
  variation: ProductVariation,
) {
  if (inventory.length === 0) {
    return {
      stock: parseIntOr(variation.stock, 0),
      moq: parseIntOr(variation.moq, 1),
      lowStockAlert: parseIntOr(variation.lowStockAlert, 5),
    };
  }
  return {
    // `|| Number(v.stock)` in the original meant a genuinely zero-stock
    // variation fell back to the stale top-level figure. Sum of zeroes is zero.
    stock: inventory.reduce((sum, item) => sum + item.stock, 0),
    moq: Math.min(...inventory.map((item) => item.moq)),
    lowStockAlert: Math.max(...inventory.map((item) => item.lowStockAlert)),
  };
}

/** Per-size stock for a product with no variants. */
export function resolveProductInventory(state: WizardState) {
  if (state.hasVariant) return [];
  return state.selectedSizes.map((size) => ({
    size,
    stock:
      state.sizeStockSet[size] !== undefined
        ? parseIntOr(state.sizeStockSet[size], 0)
        : parseIntOr(state.stock, 0),
    moq:
      state.moqSet[size] !== undefined
        ? parseIntOr(state.moqSet[size], 1)
        : parseIntOr(state.moq, 1),
    lowStockAlert:
      state.sizeLowStockAlertSet[size] !== undefined
        ? parseIntOr(state.sizeLowStockAlertSet[size], 5)
        : parseIntOr(state.lowStockAlert, 5),
  }));
}

/** Selling price from base price and margin percentage. */
export function applyMargin(basePrice: number, marginPercent: number): number {
  return basePrice * (1 + marginPercent / 100);
}

/**
 * Build the create/update payload from wizard state.
 *
 * `videoUrl` is passed in rather than read from state because it may come from
 * the media-draft publish response, which only the caller has.
 */
export function buildProductPayload(
  state: WizardState,
  options: { videoUrl?: string } = {},
): CreateProductInput {
  const basePrice = parseFloatOr(state.basePrice, 0);

  return {
    wholesalerId: state.wholesalerId,
    name: state.name,
    brandName: state.brandName,
    unitType: state.unitType,
    sku: state.sku || 'SKU-XXXX',
    categoryId: state.categoryId,
    subCategoryId: state.subCategoryId || '',
    productGroupId: state.productGroupId || '',
    classificationId: state.classificationId || '',
    productDetailId: state.productDetailId || '',
    description: state.description,
    material: state.material,
    weight: parseFloatOr(state.weight, 0),
    volume: parseFloatOr(state.volume, 0),
    availableSizes: state.selectedSizes,
    basePrice,
    /*
     * NO margin, sellingPrice OR platformPrice.
     *
     * They used to be sent, and sending them was the bug. `margin` defaulted to
     * 0 whenever the operator did not type one — which was always, because the
     * form only ever DISPLAYED a fallback — so `sellingPrice` came out as
     * `base × (1 + 0/100)`, exactly the base price. Measured on dev: 24 of 24
     * live products stored margin 0 with selling equal to base, which is what
     * the console then reported as a platform margin of ৳0.00.
     *
     * The margin belongs to the SUPPLIER: an admin sets it on the supplier
     * record and it governs everything that supplier sells. The server derives
     * the selling price from it at read time, so there is nothing here for a
     * client to compute, and a client that computed it could only get it wrong
     * or lie about it.
     */
    moq: parseIntOr(state.moq, 1),
    moqSet: state.moqSet,
    dispatchTime: state.dispatchTime,
    // The store models "not yet chosen" as null; by submit time the wizard has
    // always resolved it, so send an explicit boolean rather than omitting it.
    hasVariant: state.hasVariant ?? false,
    variationColors: state.hasVariant ? state.variationColors : [],
    variationDesigns: state.hasVariant ? state.variationDesigns : [],
    productTags: state.tags || [],
    sizeType: state.sizeType || 'UNIQUE',
    videoUrl: options.videoUrl || state.productMedia.video.uploadedUrl || '',
    media: collectProductMedia(state.productMedia, state.hasVariant ?? false),
    inventory: resolveProductInventory(state),
    variations: state.variations.map((variation) => {
      const media = (variation.media as VariationMediaState) ?? emptyVariationMedia();
      const inventory = resolveVariationInventory(variation, state.selectedSizes);
      const totals = rollUpVariation(inventory, variation);

      return {
        subName: variation.subName,
        subSku: variation.subSku,
        color: variation.color,
        design: variation.design,
        // Falsy-fallback kept deliberately: a variation priced at 0 is a
        // half-filled form, not a giveaway, so it inherits the base price.
        // Contrast with stock above, where 0 is a real and meaningful value.
        price: parseFloatOr(variation.price, 0) || basePrice,
        seq: variation.seq,
        displayLabel: variation.displayLabel,
        ...totals,
        inventory,
        videoUrl: media.video?.uploadedUrl || variation.videoUrl || '',
        media: collectVariationMedia(media),
      };
    }),
  };
}
