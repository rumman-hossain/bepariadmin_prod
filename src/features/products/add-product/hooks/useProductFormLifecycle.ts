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

export interface LifecycleState {
  editingProductId: string | null;
  isHydrating: boolean;
  isEditMode: boolean;
  productStatus: string | null;
}

function mapProductToWizardState(p: Product): Partial<WizardState> {
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
  const media = (p as Product & { media?: Array<{ url: string; position: number }> }).media;
  if (media) {
    media.forEach((m) => {
      const slot = { localUri: m.url, uploadedUrl: m.url, uploadStatus: 'done' as const };
      if (m.position === 0) productMedia.poster = slot;
      else if (m.position === 1) productMedia.front = slot;
      else if (m.position === 2) productMedia.back = slot;
      else if (m.position === 3) productMedia.left = slot;
      else if (m.position === 4) productMedia.right = slot;
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

  const variations = ((p as Product & { variations?: unknown[] }).variations || []) as WizardState['variations'];
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
      // #region agent log
      fetch('http://127.0.0.1:7294/ingest/ae423c12-13a4-45ec-a07b-20329cf2b723',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'098add'},body:JSON.stringify({sessionId:'098add',location:'useProductFormLifecycle.ts:refetch',message:'edit hydrate attempt',data:{routeProductId,ok:res.ok,hasData:Boolean(res.data?.data),name:res.data?.data?.name,categoryId:(res.data?.data as {categoryId?:string})?.categoryId,status:res.data?.data?.status},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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

  useEffect(() => {
    if (routeProductId) {
      void refetch();
    } else {
      reset();
      setState({ editingProductId: null, isHydrating: false, isEditMode: false, productStatus: null });
    }
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
