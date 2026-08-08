import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  useAddProductStore,
  emptyProductMedia,
  emptyVariationMedia,
  type WizardState,
} from '../store/useAddProductStore';
import { getProductById, getReservedSku } from '@/src/api/products';
import type { Product } from '@/src/features/products/types';
import type { MediaSlot, ProductInventoryItem } from '../../types/registration';

export interface LifecycleState {
  editingProductId: string | null;
  isHydrating: boolean;
  isEditMode: boolean;
  productStatus: string | null;
}

/**
 * A media row as the SERVER sends it — looser than `ProductMediaItem`.
 *
 * `mediaType` and `position` are both nullable over the wire, and pretending
 * otherwise is how a null position ends up indexing an array. Written out here
 * rather than cast away at each call site.
 */
type ServerMediaRow = { url: string; mediaType?: string | null; position?: number | null };

/**
 * The server's media rows, folded into the wizard's slots.
 *
 * ONE function, called for the product and for every variation, because the
 * position rules are the same fact and having them written twice is how they
 * drift. The named slots are given in position order; everything past them is
 * the gallery. A variation has no poster, so its position 0 is the front —
 * that is the only difference between the two callers, and it is the argument.
 *
 * Images only. A clip is a `product_media` row like any other and it carries a
 * position, so an unfiltered pass can drop an mp4 into the poster slot and show
 * a broken thumbnail where the catalogue image belongs. Video arrives
 * separately, through `videoUrl`. `normalizeBackendProduct` filters the same
 * way, for the same reason, when it derives `imageUrls`; an absent `mediaType`
 * is an image, which is what the column defaults to.
 */
function foldMediaRows<T extends { more: MediaSlot[] }>(
  target: T,
  rows: ServerMediaRow[] | null | undefined,
  named: Array<keyof T & string>,
): T {
  if (!rows) return target;

  rows
    .filter((m) => (m.mediaType ?? 'image') === 'image')
    .forEach((m) => {
      const slot: MediaSlot = {
        localUri: m.url,
        uploadedUrl: m.url,
        uploadStatus: 'done',
      };
      const key = named[m.position ?? -1];
      /*
       * Anything past the named slots joins the gallery rather than being
       * dropped. Product positions 3 and 4 were `left` and `right`, which no
       * longer exist as slots; every product created before that change still
       * has them, and silently losing two images on open would be a worse bug
       * than the slots ever were.
       */
      if (key) (target as Record<string, unknown>)[key] = slot;
      else target.more.push(slot);
    });

  return target;
}

/**
 * Exported for its own tests.
 *
 * Everything about loading a product for edit happens here, and it was covered
 * only through the hook — which needs a router, a query client and a network
 * stub, so in practice it was covered not at all. The per-size hydrate bug
 * below shipped because every wizard test builds state directly instead of
 * arriving at it the way an operator does.
 */
export function mapProductToWizardState(p: Product): Partial<WizardState> {
  const selectedSizes = p.availableSizes || [];
  const sizeStockSet: Record<string, string> = {};
  const moqSet: Record<string, string> = {};
  const sizeLowStockAlertSet: Record<string, string> = {};
  const stockedOutSizes: string[] = [];

  const inv = p.inventory;
  if (inv?.length) {
    inv.forEach((item) => {
      sizeStockSet[item.size] = String(item.stock);
      moqSet[item.size] = String(item.moq);
      sizeLowStockAlertSet[item.size] = String(item.lowStockAlert);
      if (item.stock === 0 && item.moq === 0 && item.lowStockAlert === 0) stockedOutSizes.push(item.size);
    });
  }

  /*
   * `p.media`, not a cast onto `p`.
   *
   * This read used to be `(p as Product & { media?: ... }).media` — a local
   * widening that made the compiler accept a field `Product` did not have and
   * `normalizeBackendProduct` did not emit. It was always `undefined`, so every
   * edit opened with six empty slots, and the cast is what stopped anyone
   * finding out: with `media` on the type, this line would not have compiled.
   */
  const productMedia = foldMediaRows(emptyProductMedia(), p.media, [
    'poster',
    'front',
    'back',
  ]);
  if (p.videoUrl) {
    productMedia.video = {
      localUri: p.videoUrl,
      uploadedUrl: p.videoUrl,
      uploadStatus: 'done',
      thumbnail: '',
    };
  }

  /*
   * HYDRATE THE PER-SIZE MAPS, not just `inventory[]`.
   *
   * The server sends each variation's per-size figures as `inventory[]`. The
   * wizard EDITS them through `sizeStock`/`sizeMoq`/`sizeAlert`, and those are
   * what `isVariationStocked` reads — so loading a product for edit without
   * filling them left every cell "unfilled" to the validator.
   *
   * The screen made that unreadable rather than merely wrong: `StockMatrix`
   * falls back to `inventory[]` for DISPLAY, so the grid showed the stored
   * figures — 50 in every cell — while marking each one red with "Stock
   * required" and the chip read "4 cells to fill". Editing any existing sized
   * variant product meant retyping numbers that were already on screen.
   *
   * Found by opening a real product on dev; no unit test would have caught it,
   * because they all build wizard state directly rather than hydrating it.
   */
  const rawVariations = (p.variations || []) as unknown as WizardState['variations'];
  const variations = rawVariations.map((v) => {
    /*
     * THE SERVER'S ARRAY BECOMES THE WIZARD'S OBJECT, HERE AND NOWHERE ELSE.
     *
     * `ProductVariation.media` used to be `VariationMediaState |
     * ProductMediaItem[]`, because the server sends rows and the wizard holds
     * slots and nobody converted between them. Step 4 then did
     *
     *     const media = (v.media as VariationMediaState) ?? emptyVariationMedia();
     *     media.more.map(…)
     *
     * and `??` does not fire for a non-empty array, so `.more` was `undefined`
     * and the whole screen threw `Cannot read properties of undefined (reading
     * 'map')`. Every variant product with variation images was uneditable — you
     * could not reach Step 4 at all.
     *
     * I wrote that guard, and left a test comment saying the union "carries
     * real ambiguity — Round 2 splits the two". This is that split. The union
     * is gone from the type, so the array shape no longer exists inside the
     * wizard and the crash is not expressible rather than merely handled.
     *
     * A variation has no poster: its position 0 is the front.
     */
    const media = foldMediaRows(
      emptyVariationMedia(),
      v.media as ServerMediaRow[] | undefined,
      ['front', 'back'],
    );
    const withMedia = {
      ...v,
      media,
      ...(v.videoUrl
        ? {
            media: {
              ...media,
              video: {
                localUri: v.videoUrl,
                uploadedUrl: v.videoUrl,
                uploadStatus: 'done' as const,
                thumbnail: '',
              },
            },
          }
        : {}),
    };

    const rows = v.inventory ?? [];
    if (rows.length === 0) return withMedia;
    const from = (pick: (r: ProductInventoryItem) => number | undefined) =>
      Object.fromEntries(
        rows.map((r) => [r.size, String(pick(r) ?? '')]).filter(([, value]) => value !== ''),
      );
    return {
      ...withMedia,
      // The operator's own edits win if hydrate ever runs over a dirty form.
      sizeStock: { ...from((r) => r.stock), ...(v.sizeStock ?? {}) },
      sizeMoq: { ...from((r) => r.moq), ...(v.sizeMoq ?? {}) },
      sizeAlert: { ...from((r) => r.lowStockAlert), ...(v.sizeAlert ?? {}) },
    };
  });
  const rawHasVariant = p.hasVariant;
  const hasVariant =
    rawHasVariant === true || rawHasVariant === false
      ? rawHasVariant
      : variations.length > 0
        ? true
        : false;

  return {
    name: p.name,
    brandName: p.brandName || '',
    unitType: p.unitType || '',
    categoryId: p.categoryId || '',
    subCategoryId: p.subCategoryId || '',
    productGroupId: p.productGroupId || '',
    classificationId: p.classificationId || '',
    productDetailId: p.productDetailId || '',
    description: p.description || '',
    material: p.material || '',
    weight: String(p.weight || ''),
    volume: String(p.volume || ''),
    selectedSizes,
    tags: p.productTags || [],
    basePrice: String(p.basePrice || ''),
    margin: String(p.margin || ''),
    stock: String(p.stock || ''),
    moq: String(p.moq || ''),
    dispatchTime: p.dispatchTime || '',
    sku: p.sku || '',
    hasVariant,
    sizeType: p.sizeType || 'UNIQUE',
    sizeStockSet,
    moqSet,
    sizeLowStockAlertSet,
    stockedOutSizes,
    lowStockAlert: String(p.lowStockAlert ?? ''),
    variationColors: p.variationColors || [],
    variationDesigns: p.variationDesigns || [],
    variations,
    productMedia,
    /*
     * NULL, NOT THE PRODUCT ID.
     *
     * This was `p.id`, used as a sentinel: submit computed
     * `hasNewMedia = draftId !== editingProductId`, so seeding it with the
     * product id made "unchanged" fall out of an inequality. But `draftId` is
     * an UPLOAD DRAFT id — `uploadSlot` passes it to `createDraft` as the draft
     * to append this file to:
     *
     *   POST /api/v1/uploads/drafts?draftId=5e993cca-…   → 404
     *
     * …because no upload draft has a product's id. So every image added or
     * replaced during an edit failed, and the only way to change a product's
     * photographs was not to have any yet. Found on dev by adding a detail shot
     * to an existing product.
     *
     * An edit genuinely has no upload draft until the operator uploads
     * something, which is what `null` says. Submit now reads that directly —
     * see `hasNewMedia` in useProductRegistration.
     */
    draftId: null,
    wholesalerId: p.wholesalerId,
  };
}

export function useProductFormLifecycle() {
  const { productId: routeProductId } = useParams<{ productId?: string }>();
  const { reset, hydrate } = useAddProductStore();
  const store = useAddProductStore();

  const [state, setState] = useState<LifecycleState>({
    editingProductId: null,
    isHydrating: false,
    isEditMode: false,
    productStatus: null,
  });

  const refetch = useCallback(async () => {
    if (!routeProductId) return;
    reset();
    setState((prev) => ({ ...prev, isHydrating: true }));
    try {
      const res = await getProductById(routeProductId);
      if (res.ok && res.data?.data) {
        const mapped = mapProductToWizardState(res.data.data);
        hydrate(mapped);
        if (res.data.data.classificationId && store.wholesalerCode) {
          try {
            const skuRes = await getReservedSku({
              wholesalerCode: store.wholesalerCode,
              categoryId: mapped.categoryId || '',
              subCategoryId: mapped.subCategoryId || '',
              productGroupId: mapped.productGroupId || '',
              classificationId: mapped.classificationId || '',
            });
            if (skuRes.ok && skuRes.data.details) {
              useAddProductStore.getState().setField('classificationDetails', skuRes.data.details);
            }
          } catch {
            /* optional */
          }
        }
        setState({
          editingProductId: routeProductId,
          isHydrating: false,
          isEditMode: true,
          productStatus: res.data.data.status ?? null,
        });
      } else {
        setState((prev) => ({ ...prev, isHydrating: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isHydrating: false }));
    }
  }, [routeProductId, reset, hydrate, store.wholesalerCode]);

  /*
   * The one remaining `set-state-in-effect` in the app, and it is deliberate.
   *
   * Route changes have to tear down the wizard draft, which lives in a Zustand
   * store outside React — an external system, which is what effects are for.
   * The `setState` here is the local mirror of that teardown; it cannot be
   * derived from a render, because there is nothing to derive it from until the
   * store has been reset.
   *
   * `refetch` and `reset` are intentionally out of the dependency array: both
   * are recreated whenever the store changes, and re-running a full hydrate on
   * every keystroke in the wizard is exactly the loop this guard prevents. The
   * route id is the only thing that should re-trigger it.
   */
  useEffect(() => {
    if (routeProductId) {
      void refetch();
    } else {
      reset();
      setState({ editingProductId: null, isHydrating: false, isEditMode: false, productStatus: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [routeProductId]);

  return {
    editingProductId: state.editingProductId,
    isHydrating: state.isHydrating,
    isEditMode: state.isEditMode,
    productStatus: state.productStatus,
    refetch,
    routeProductId: routeProductId ?? null,
  };
}
