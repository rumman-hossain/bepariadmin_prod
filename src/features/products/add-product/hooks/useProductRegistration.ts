import { useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createProduct,
  updateProduct,
  getReservedSku,
} from '@/src/api/products';
import { UploadAPIClient, randomUUID } from '@/src/services/upload/api';
import type { PublishDraftResponse, MediaAsset } from '@/src/services/upload/types';
import {
  useAddProductStore,
  emptyVariationMedia,
  type VariationMediaState,
} from '../store/useAddProductStore';
import type { ProductVariation } from '../../types/registration';
import { buildProductPayload, hasPendingUploads } from '../utils/buildProductPayload';
import { PRODUCT_ROUTES } from '../../routes';

export type RegistrationState = 'idle' | 'saving' | 'success';

export function useProductRegistration(editingProductId?: string | null) {
  const navigate = useNavigate();
  /*
   * The ROUTE's opinion of what we are doing, read independently of the
   * lifecycle hook's. The two disagreeing is the failed-hydrate bug: the URL
   * says edit, `editingProductId` says create, and the create wins. Compared
   * below rather than trusted.
   */
  const { productId: routeProductId } = useParams<{ productId?: string }>();
  const store = useAddProductStore();
  const { setField } = store;

  const [registrationState, setRegistrationState] = useState<RegistrationState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);

  const idempotencyKeyRef = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);
  const skuRequestCounter = useRef(0);

  const handleGenerateSku = useCallback(
    async (classificationId: string) => {
      const requestId = ++skuRequestCounter.current;
      setIsGeneratingSku(true);
      setError(null);
      try {
        const res = await getReservedSku({
          wholesalerCode: store.wholesalerCode || 'WHL-00000',
          categoryId: store.categoryId,
          subCategoryId: store.subCategoryId,
          productGroupId: store.productGroupId,
          classificationId,
        });
        if (requestId === skuRequestCounter.current && res.ok && res.data?.sku) {
          setField('classificationId', classificationId);
          setField('sku', res.data.sku);
          setField('classificationDetails', res.data.details || []);
        } else if (requestId === skuRequestCounter.current) {
          setError('Failed to generate SKU');
        }
      } catch {
        if (requestId === skuRequestCounter.current) setError('Error generating SKU');
      } finally {
        if (requestId === skuRequestCounter.current) setIsGeneratingSku(false);
      }
    },
    [store.categoryId, store.subCategoryId, store.productGroupId, store.wholesalerCode, setField],
  );

  const handleGenerateVariations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const current = useAddProductStore.getState();
      const colorsList = current.variationColors.map((s) => s.trim()).filter(Boolean);
      const designsList = current.variationDesigns.map((s) => s.trim()).filter(Boolean);
      if (colorsList.length === 0 && designsList.length === 0) {
        setError('Enter at least one color or design');
        return;
      }
      const productSku = current.sku || 'SKU-XXXX';
      const generated: ProductVariation[] = [];
      let seq = 0;
      const colorsToLoop = colorsList.length > 0 ? colorsList : [''];
      const designsToLoop = designsList.length > 0 ? designsList : [''];

      // Index the existing variations once instead of running `.find()` inside
      // the nested loop. That was O((C·D)²) — capped at 25 by UI validation, so
      // 625 comparisons in normal use, but the cap is NOT enforced in the store
      // or on hydrate, so editing a product created elsewhere with 20 colours ×
      // 20 designs meant 160,000 synchronous comparisons on a button click.
      const existingByVariant = new Map<string, ProductVariation>();
      for (const v of current.variations) {
        existingByVariant.set(`${v.color}\u0000${v.design}`, v);
      }
      for (const color of colorsToLoop) {
        for (const design of designsToLoop) {
          seq++;
          const seqStr = String(seq).padStart(2, '0');
          const variantSku = `${productSku}-V${seqStr}`;
          const displayLabel = color && design ? `${color} / ${design}` : color || design;
          const existing = existingByVariant.get(`${color}\u0000${design}`);
          generated.push({
            id: existing?.id || `temp-${seq}`,
            color,
            design,
            subName: `${current.name} - ${color} ${design}`.trim().replace(/\s+/g, ' '),
            subSku: variantSku,
            seq,
            displayLabel,
            stock: existing?.stock ?? 0,
            price: existing?.price,
            media: (existing?.media || emptyVariationMedia()) as VariationMediaState,
            sizeStock: existing?.sizeStock || {},
            sizeMoq: existing?.sizeMoq || {},
            sizeAlert: existing?.sizeAlert || {},
            inventory: existing?.inventory || [],
            moq: existing?.moq ?? 0,
            lowStockAlert: existing?.lowStockAlert ?? 0,
          });
        }
      }
      setField('variations', generated);
    } catch {
      setError('Failed to generate variations');
    } finally {
      setIsLoading(false);
    }
  }, [setField]);

  const handleSubmitProduct = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setRegistrationState('saving');
    setIsLoading(true);
    setError(null);

    try {
      const s = useAddProductStore.getState();

      if (hasPendingUploads(s.productMedia)) {
        setError('Please wait for all media uploads to complete before submitting.');
        setRegistrationState('idle');
        isSubmittingRef.current = false;
        setIsLoading(false);
        return;
      }

      /*
       * A draft EXISTS only because something was uploaded this session.
       *
       * This was `s.draftId !== editingProductId`, which worked by seeding
       * `draftId` with the product id on hydrate — and that seed was itself
       * sent to `POST /uploads/drafts?draftId=…`, where it 404'd, so no image
       * could be added to an existing product at all. With the seed gone the
       * question answers itself: null means nothing was uploaded, so there is
       * nothing to publish. Creating a product starts null too, so this reads
       * the same on both paths.
       */
      const hasNewMedia = s.draftId !== null;
      let publishRes: PublishDraftResponse = {
        success: true,
        state: 'PUBLISHED',
        message: '',
        mediaAssets: [],
      };

      if (hasNewMedia && s.draftId) {
        const uploadApi = new UploadAPIClient();
        const draftStatus = await uploadApi.getDraftStatus(s.draftId);
        if (!idempotencyKeyRef.current) idempotencyKeyRef.current = randomUUID();
        publishRes = await uploadApi.publishDraft(s.draftId, {
          idempotencyKey: idempotencyKeyRef.current,
          version: draftStatus.draft.version,
        });
        if (!publishRes.success) throw new Error(publishRes.message || 'Failed to publish media draft');
      }

      /*
       * THE DURABLE REFERENCE, NOT THE DISPLAY TOKEN.
       *
       * This read `.cdnUrl`, which is the same mistake this file already
       * documents for IMAGES in `useProductFormLifecycle.ts` — sending a proxy
       * token back on save "wrote /api/v1/file/lscRDFAi-VrKND4ovAfDow into
       * products.product_media and blanked a live product's images a quarter of
       * an hour later". Images learned; video did not.
       *
       * `videoUrl` is checked by the identical guard
       * (`media_reference_guard.go:135`), so registering a product WITH a video
       * from this console fails with the same 400. It has stayed hidden only
       * because a product without a video never reaches this line.
       *
       * Only `gcsUri` can qualify — `gcsRawPath` and `cdnUrl` are checked by
       * the same predicate and never pass it, so they are not consulted. When
       * nothing durable is available the video is omitted rather than sent as
       * something the server will reject, which is what turned a missing field
       * into a failed product registration.
       */
      const publishedVideoAsset = publishRes.mediaAssets?.find(
        (m: MediaAsset) => m.purpose?.startsWith('product') && m.mediaType === 'video',
      );
      const isDurable = (v?: string | null) =>
        !!v && (v.startsWith('gs://') || v.startsWith('https://storage.googleapis.com/'));
      const publishedVideoUrl = isDurable(publishedVideoAsset?.gcsUri)
        ? publishedVideoAsset?.gcsUri
        : undefined;

      // ~130 lines of wizard-state-to-payload transform used to live here.
      // See utils/buildProductPayload.ts — it is pure, and tested.
      const payload = buildProductPayload(s, { videoUrl: publishedVideoUrl });

      /*
       * TWO FLOORS BEFORE THE WRITE, both for damage that is not recoverable.
       *
       * An UPDATE with no name is the reset-on-edit bug arriving at the network:
       * the store was emptied, nothing re-hydrated, and this PATCH would set a
       * live product to `name:''`, `basePrice:0`, `media:[]`. Step 6 now
       * validates, so this should be unreachable — which is exactly why it is
       * cheap to keep. It costs one comparison and it is the last thing standing
       * between a bug upstream and a blanked product.
       *
       * A CREATE on an `/edit` URL is the failed-hydrate bug arriving at the
       * network: `editingProductId` is null only because the product could not
       * be loaded, and creating here makes a duplicate of the very product the
       * operator opened.
       */
      if (routeProductId && !editingProductId) {
        throw new Error(
          'This product has not finished loading. Reload the page before saving, ' +
            'or you will create a second copy of it.',
        );
      }

      if (editingProductId) {
        if (!s.name.trim()) {
          throw new Error(
            'This form is empty. Reload the product before updating it — saving now would erase it.',
          );
        }
        const res = await updateProduct(editingProductId, payload);
        if (!res.ok) throw new Error('Update failed — admin product API may not be connected yet.');
      } else {
        const res = await createProduct(payload);
        if (!res.ok) throw new Error('Registration failed — admin product API may not be connected yet.');
      }

      setRegistrationState('success');
      setTimeout(() => {
        setRegistrationState('idle');
        isSubmittingRef.current = false;
        idempotencyKeyRef.current = null;
        navigate(PRODUCT_ROUTES.LIST);
      }, 1100);
    } catch (err) {
      isSubmittingRef.current = false;
      setRegistrationState('idle');
      setError(err instanceof Error ? err.message : 'Failed to submit product.');
    } finally {
      setIsLoading(false);
    }
    /*
     * `routeProductId` IS a dependency, and leaving it out was a real hole
     * rather than a lint nit.
     *
     * The guard above compares the ROUTE's opinion against the lifecycle hook's
     * and refuses to save when they disagree — that mismatch is the failed
     * hydrate, and saving through it creates a SECOND copy of a product that
     * already exists. Omitted from this list, the memoised callback keeps
     * whatever `routeProductId` held when it was last rebuilt, so the guard can
     * compare a stale URL against a current `editingProductId` and wave through
     * exactly the case it exists to stop.
     *
     * It only rebuilds the callback when the route changes, which is what a
     * submit handler should do anyway.
     */
  }, [editingProductId, routeProductId, navigate]);

  return {
    registrationState,
    sku: store.sku,
    isLoading,
    error,
    isGeneratingSku,
    handleGenerateSku,
    handleGenerateVariations,
    handleSubmitProduct,
    setError,
  };
}
