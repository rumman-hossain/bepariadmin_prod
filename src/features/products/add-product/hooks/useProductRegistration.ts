import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { PRODUCT_ROUTES } from '../../routes';

export type RegistrationState = 'idle' | 'saving' | 'success';

const parseIntOr = (value: unknown, fallback: number) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export function useProductRegistration(editingProductId?: string | null) {
  const navigate = useNavigate();
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
      for (const color of colorsToLoop) {
        for (const design of designsToLoop) {
          seq++;
          const seqStr = String(seq).padStart(2, '0');
          const variantSku = `${productSku}-V${seqStr}`;
          const displayLabel = color && design ? `${color} / ${design}` : color || design;
          const existing = current.variations.find((v) => v.color === color && v.design === design);
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
      const isUploading = (slot: { uploadStatus?: string }) => slot?.uploadStatus === 'uploading';
      const hasPending =
        isUploading(s.productMedia.front) ||
        isUploading(s.productMedia.back) ||
        isUploading(s.productMedia.poster) ||
        isUploading(s.productMedia.video) ||
        s.productMedia.more.some(isUploading);

      if (hasPending) {
        setError('Please wait for all media uploads to complete before submitting.');
        setRegistrationState('idle');
        isSubmittingRef.current = false;
        setIsLoading(false);
        return;
      }

      const hasNewMedia = s.draftId !== editingProductId;
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

      const listingSku = s.sku || 'SKU-XXXX';
      let mediaList: Array<{ url: string; mediaType: string; position: number }> = [];

      if (s.hasVariant) {
        if (s.productMedia.poster.uploadedUrl) {
          mediaList = [{ url: s.productMedia.poster.uploadedUrl, mediaType: 'image', position: 0 }];
        }
      } else {
        const pm = s.productMedia;
        if (pm.poster.uploadedUrl) mediaList.push({ url: pm.poster.uploadedUrl, mediaType: 'image', position: 0 });
        if (pm.front.uploadedUrl) mediaList.push({ url: pm.front.uploadedUrl, mediaType: 'image', position: 1 });
        if (pm.back.uploadedUrl) mediaList.push({ url: pm.back.uploadedUrl, mediaType: 'image', position: 2 });
        if (pm.left.uploadedUrl) mediaList.push({ url: pm.left.uploadedUrl, mediaType: 'image', position: 3 });
        if (pm.right.uploadedUrl) mediaList.push({ url: pm.right.uploadedUrl, mediaType: 'image', position: 4 });
        pm.more.forEach((slot, idx) => {
          if (slot.uploadedUrl) mediaList.push({ url: slot.uploadedUrl, mediaType: 'image', position: 5 + idx });
        });
      }

      const productVideoUrl =
        publishRes.mediaAssets?.find((m: MediaAsset) => m.purpose?.startsWith('product') && m.mediaType === 'video')
          ?.cdnUrl ||
        s.productMedia.video.uploadedUrl ||
        '';

      const payload: Record<string, unknown> = {
        wholesalerId: s.wholesalerId,
        name: s.name,
        brandName: s.brandName,
        unitType: s.unitType,
        sku: listingSku,
        categoryId: s.categoryId,
        subCategoryId: s.subCategoryId || '',
        productGroupId: s.productGroupId || '',
        classificationId: s.classificationId || '',
        productDetailId: s.productDetailId || '',
        description: s.description,
        material: s.material,
        weight: parseFloat(s.weight) || 0,
        volume: parseFloat(s.volume) || 0,
        availableSizes: s.selectedSizes,
        basePrice: parseFloat(s.basePrice) || 0,
        margin: parseFloat(s.margin) || 0,
        sellingPrice: (parseFloat(s.basePrice) || 0) * (1 + (parseFloat(s.margin) || 0) / 100),
        platformPrice: (parseFloat(s.basePrice) || 0) * (1 + (parseFloat(s.margin) || 0) / 100),
        moq: parseIntOr(s.moq, 1),
        moqSet: s.moqSet,
        dispatchTime: s.dispatchTime,
        hasVariant: s.hasVariant,
        variationColors: s.hasVariant ? s.variationColors : [],
        variationDesigns: s.hasVariant ? s.variationDesigns : [],
        productTags: s.tags || [],
        sizeType: s.sizeType || 'UNIQUE',
        videoUrl: productVideoUrl,
        media: mediaList,
        inventory: !s.hasVariant
          ? s.selectedSizes.map((size) => ({
              size,
              stock:
                s.sizeStockSet[size] !== undefined
                  ? parseIntOr(s.sizeStockSet[size], 0)
                  : parseIntOr(s.stock, 0),
              moq: s.moqSet[size] !== undefined ? parseIntOr(s.moqSet[size], 1) : parseIntOr(s.moq, 1),
              lowStockAlert:
                s.sizeLowStockAlertSet[size] !== undefined
                  ? parseIntOr(s.sizeLowStockAlertSet[size], 5)
                  : parseIntOr(s.lowStockAlert, 5),
            }))
          : [],
        variations: s.variations.map((v) => {
          const vm = (v.media as VariationMediaState) ?? emptyVariationMedia();
          const storeVMedia: Array<{ url: string; mediaType: string; position: number }> = [];
          if (vm.front?.uploadedUrl) storeVMedia.push({ url: vm.front.uploadedUrl, mediaType: 'image', position: 0 });
          if (vm.back?.uploadedUrl) storeVMedia.push({ url: vm.back.uploadedUrl, mediaType: 'image', position: 1 });
          vm.more?.forEach((slot, idx) => {
            if (slot.uploadedUrl) storeVMedia.push({ url: slot.uploadedUrl, mediaType: 'image', position: idx + 2 });
          });
          const finalInventory = s.selectedSizes.map((size) => {
            const existing = v.inventory?.find((i) => i.size === size);
            return {
              size,
              stock:
                v.sizeStock?.[size] !== undefined
                  ? parseIntOr(v.sizeStock[size], 0)
                  : parseIntOr(existing?.stock, 0),
              moq:
                v.sizeMoq?.[size] !== undefined
                  ? parseIntOr(v.sizeMoq[size], 1)
                  : parseIntOr(existing?.moq, 1),
              lowStockAlert:
                v.sizeAlert?.[size] !== undefined
                  ? parseIntOr(v.sizeAlert[size], 5)
                  : parseIntOr(existing?.lowStockAlert, 5),
            };
          });
          const totalVStock = finalInventory.reduce((sum, item) => sum + item.stock, 0) || Number(v.stock) || 0;
          const minVMoq =
            finalInventory.length > 0 ? Math.min(...finalInventory.map((i) => i.moq)) : Number(v.moq) || 1;
          const maxVAlert =
            finalInventory.length > 0
              ? Math.max(...finalInventory.map((i) => i.lowStockAlert))
              : Number(v.lowStockAlert) || 5;
          return {
            subName: v.subName,
            subSku: v.subSku,
            color: v.color,
            design: v.design,
            price: Number(v.price) || Number(s.basePrice) || 0,
            seq: v.seq,
            displayLabel: v.displayLabel,
            stock: totalVStock,
            moq: minVMoq,
            lowStockAlert: maxVAlert,
            inventory: finalInventory,
            videoUrl: vm.video?.uploadedUrl || v.videoUrl || '',
            media: storeVMedia,
          };
        }),
      };

      if (editingProductId) {
        const res = await updateProduct(editingProductId, payload);
        if (!res.ok) throw new Error('Update failed — admin product API may not be connected yet.');
      } else {
        const res = await createProduct(payload as Parameters<typeof createProduct>[0]);
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
  }, [editingProductId, navigate]);

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
