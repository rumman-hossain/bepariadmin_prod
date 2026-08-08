import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  useAddProductStore,
  emptyProductMedia,
  type WizardState,
} from '../store/useAddProductStore';
import { getProductById, getReservedSku } from '@/src/api/products';
import type { Product } from '@/src/features/products/types';
import type { ProductInventoryItem } from '../../types/registration';

export interface LifecycleState {
  editingProductId: string | null;
  isHydrating: boolean;
  isEditMode: boolean;
  productStatus: string | null;
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

  const inv = (p as Product & { inventory?: Array<{ size: string; stock: number; moq: number; lowStockAlert: number }> }).inventory;
  if (inv?.length) {
    inv.forEach((item) => {
      sizeStockSet[item.size] = String(item.stock);
      moqSet[item.size] = String(item.moq);
      sizeLowStockAlertSet[item.size] = String(item.lowStockAlert);
      if (item.stock === 0 && item.moq === 0 && item.lowStockAlert === 0) stockedOutSizes.push(item.size);
    });
  }

  const productMedia = emptyProductMedia();
  /*
   * `p.media`, not a cast onto `p`.
   *
   * This read used to be `(p as Product & { media?: ... }).media` — a local
   * widening that made the compiler accept a field `Product` did not have and
   * `normalizeBackendProduct` did not emit. It was always `undefined`, so every
   * edit opened with six empty slots, and the cast is what stopped anyone
   * finding out: with `media` on the type, this line would not have compiled.
   */
  const media = p.media;
  if (media) {
    /*
     * Images only. A clip is a `product_media` row like any other, and it
     * carries a position — so an unfiltered pass can drop an mp4 into the
     * poster slot and show a broken thumbnail where the catalogue image
     * belongs. Video reaches the wizard through `videoUrl`, below.
     * `normalizeBackendProduct` filters the same way, for the same reason, when
     * it derives `imageUrls`; absent mediaType is an image, which is what the
     * column defaults to.
     */
    media
      .filter((m) => (m.mediaType ?? 'image') === 'image')
      .forEach((m) => {
        const slot = { localUri: m.url, uploadedUrl: m.url, uploadStatus: 'done' as const };
      /*
       * Positions 3 and 4 were `left` and `right`, which no longer exist as
       * slots. They fold into the gallery rather than being dropped: every
       * product created before this change has them, and silently losing two
       * images on open would be a far worse bug than the slots were.
       */
        if (m.position === 0) productMedia.poster = slot;
        else if (m.position === 1) productMedia.front = slot;
        else if (m.position === 2) productMedia.back = slot;
        else productMedia.more.push(slot);
      });
  }
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
  const rawVariations = ((p as Product & { variations?: unknown[] }).variations ||
    []) as WizardState['variations'];
  const variations = rawVariations.map((v) => {
    const rows = v.inventory ?? [];
    if (rows.length === 0) return v;
    const from = (pick: (r: ProductInventoryItem) => number | undefined) =>
      Object.fromEntries(
        rows.map((r) => [r.size, String(pick(r) ?? '')]).filter(([, value]) => value !== ''),
      );
    return {
      ...v,
      // The operator's own edits win if hydrate ever runs over a dirty form.
      sizeStock: { ...from((r) => r.stock), ...(v.sizeStock ?? {}) },
      sizeMoq: { ...from((r) => r.moq), ...(v.sizeMoq ?? {}) },
      sizeAlert: { ...from((r) => r.lowStockAlert), ...(v.sizeAlert ?? {}) },
    };
  });
  const rawHasVariant = (p as Product & { hasVariant?: boolean }).hasVariant;
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
    material: (p as Product & { material?: string }).material || '',
    weight: String((p as Product & { weight?: number }).weight || ''),
    volume: String((p as Product & { volume?: number }).volume || ''),
    selectedSizes,
    tags: (p as Product & { productTags?: string[] }).productTags || [],
    basePrice: String(p.basePrice || ''),
    margin: String(p.margin || ''),
    stock: String(p.stock || ''),
    moq: String(p.moq || ''),
    dispatchTime: p.dispatchTime || '',
    sku: p.sku || '',
    hasVariant,
    sizeType: (p as Product & { sizeType?: string }).sizeType || 'UNIQUE',
    sizeStockSet,
    moqSet,
    sizeLowStockAlertSet,
    stockedOutSizes,
    lowStockAlert: String((p as Product & { lowStockAlert?: number }).lowStockAlert ?? ''),
    variationColors: (p as Product & { variationColors?: string[] }).variationColors || [],
    variationDesigns: (p as Product & { variationDesigns?: string[] }).variationDesigns || [],
    variations,
    productMedia,
    draftId: p.id,
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
