import { useCallback } from 'react';
import { useAddProductStore, type VariationMediaState } from '../store/useAddProductStore';
import { resolveHasVariant } from '../utils/resolveHasVariant';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function useFormValidation() {
  const wholesalerId = useAddProductStore((s) => s.wholesalerId);
  const name = useAddProductStore((s) => s.name);
  const brandName = useAddProductStore((s) => s.brandName);
  const unitType = useAddProductStore((s) => s.unitType);
  const categoryId = useAddProductStore((s) => s.categoryId);
  const productGroupId = useAddProductStore((s) => s.productGroupId);
  const classificationId = useAddProductStore((s) => s.classificationId);
  const sku = useAddProductStore((s) => s.sku);
  const selectedSizes = useAddProductStore((s) => s.selectedSizes);
  const dispatchTime = useAddProductStore((s) => s.dispatchTime);
  const basePrice = useAddProductStore((s) => s.basePrice);
  const hasVariantRaw = useAddProductStore((s) => s.hasVariant);
  const stock = useAddProductStore((s) => s.stock);
  const moq = useAddProductStore((s) => s.moq);
  const lowStockAlert = useAddProductStore((s) => s.lowStockAlert);
  const moqSet = useAddProductStore((s) => s.moqSet);
  const sizeStockSet = useAddProductStore((s) => s.sizeStockSet);
  const sizeLowStockAlertSet = useAddProductStore((s) => s.sizeLowStockAlertSet);
  const stockedOutSizes = useAddProductStore((s) => s.stockedOutSizes);
  const generalStockedOut = useAddProductStore((s) => s.generalStockedOut);
  const variations = useAddProductStore((s) => s.variations);
  const variationColors = useAddProductStore((s) => s.variationColors);
  const variationDesigns = useAddProductStore((s) => s.variationDesigns);
  const productMedia = useAddProductStore((s) => s.productMedia);
  const warrantyEnabled = useAddProductStore((s) => s.warrantyEnabled);
  const warrantyDuration = useAddProductStore((s) => s.warrantyDuration);
  const warrantyDescription = useAddProductStore((s) => s.warrantyDescription);
  const returnPolicyEnabled = useAddProductStore((s) => s.returnPolicyEnabled);
  const returnWindow = useAddProductStore((s) => s.returnWindow);
  const returnCondition = useAddProductStore((s) => s.returnCondition);
  const exchangeEnabled = useAddProductStore((s) => s.exchangeEnabled);
  const exchangeWindow = useAddProductStore((s) => s.exchangeWindow);
  const exchangeDescription = useAddProductStore((s) => s.exchangeDescription);

  const hasVariant = resolveHasVariant(hasVariantRaw, variations);

  const validateStep1 = useCallback((): ValidationResult => {
    const errors: Record<string, string> = {};
    if (!wholesalerId?.trim()) errors.wholesalerId = 'Wholesaler is required';
    if (!name?.trim()) errors.name = 'Product name is required';
    if (!brandName?.trim()) errors.brandName = 'Brand is required';
    if (!unitType?.trim()) errors.unitType = 'Unit type is required';
    if (!categoryId) errors.category = 'Category is required';
    if (!productGroupId) errors.productGroup = 'Product group is required';
    if (!classificationId) errors.classification = 'Classification is required';
    if (!sku?.trim() || sku === 'SKU-XXXX') errors.sku = 'SKU must be generated';
    return { isValid: Object.keys(errors).length === 0, errors };
  }, [wholesalerId, name, brandName, unitType, categoryId, productGroupId, classificationId, sku]);

  const validateStep2 = useCallback((): ValidationResult => {
    const errors: Record<string, string> = {};
    if (!selectedSizes?.length) errors.sizes = 'Select at least one size';
    if (!dispatchTime?.trim()) errors.dispatchTime = 'Dispatch time is required';
    return { isValid: Object.keys(errors).length === 0, errors };
  }, [selectedSizes, dispatchTime]);

  const validateStep3 = useCallback((): ValidationResult => {
    const errors: Record<string, string> = {};
    const basePriceNum = parseFloat(basePrice) || 0;

    if (hasVariantRaw === null && variations.length === 0) {
      errors.hasVariant = 'Variant choice required';
    }
    if (basePriceNum <= 0) errors.basePrice = 'Base price must be greater than 0';

    if (!hasVariant) {
      if (selectedSizes.length > 0) {
        const activeSizes = selectedSizes.filter((s) => !stockedOutSizes.includes(s));
        const missingStock = activeSizes.filter((s) => !sizeStockSet[s] || Number(sizeStockSet[s]) <= 0);
        const missingMoq = activeSizes.filter((s) => !moqSet[s] || Number(moqSet[s]) <= 0);
        const missingAlert = activeSizes.filter(
          (s) => !sizeLowStockAlertSet[s] || Number(sizeLowStockAlertSet[s]) <= 0,
        );
        if (missingStock.length > 0) errors.sizeStockSet = 'Stock required for all active sizes';
        if (missingMoq.length > 0) errors.moqSet = 'MOQ required for all active sizes';
        if (missingAlert.length > 0) errors.sizeLowStockAlertSet = 'Alert required for all active sizes';

        const invalidMoqs = activeSizes.filter((s) => {
          const sStock = Number(sizeStockSet[s]) || 0;
          const sMoq = Number(moqSet[s]) || 0;
          return sStock > 0 && sMoq > 0 && sMoq >= sStock;
        });
        const invalidAlerts = activeSizes.filter((s) => {
          const sStock = Number(sizeStockSet[s]) || 0;
          const sAlert = Number(sizeLowStockAlertSet[s]) || 0;
          return sStock > 0 && sAlert > 0 && sAlert >= sStock;
        });
        if (invalidMoqs.length > 0) errors.moqSetLimit = 'MOQ must be less than stock';
        if (invalidAlerts.length > 0) errors.alertSetLimit = 'Alert must be less than stock';
      } else if (!generalStockedOut) {
        const stockNum = Number(stock) || 0;
        const moqNum = Number(moq) || 0;
        const alertNum = Number(lowStockAlert) || 0;
        if (stockNum <= 0) errors.stock = 'Stock must be greater than 0';
        if (moqNum <= 0) errors.moq = 'MOQ must be greater than 0';
        if (alertNum <= 0) errors.lowStockAlert = 'Alert must be greater than 0';
        if (stockNum > 0 && moqNum > 0 && moqNum >= stockNum) errors.moqLimit = 'MOQ must be less than stock';
        if (stockNum > 0 && alertNum > 0 && alertNum >= stockNum) errors.alertLimit = 'Alert must be less than stock';
      }
    } else {
      if (variations.length === 0) {
        errors.variations = 'Please generate variations first';
      } else {
        const incomplete = variations.filter((v) => {
          const priceVal = v.price !== undefined ? v.price : basePriceNum;
          const hasPrice = priceVal >= basePriceNum && priceVal > 0;
          if (!hasPrice) return true;

          if (selectedSizes.length > 0) {
            return !selectedSizes.every((size) => {
              if (v.stockedOutSizes?.includes(size)) return true;
              const stockRaw = v.sizeStock?.[size];
              const moqRaw = v.sizeMoq?.[size];
              const alertRaw = v.sizeAlert?.[size];
              const sStock = Number(v.sizeStock?.[size]) || 0;
              const sMoq = Number(v.sizeMoq?.[size]) || 0;
              const sAlert = Number(v.sizeAlert?.[size]) || 0;
              return (
                stockRaw !== undefined &&
                stockRaw !== '' &&
                moqRaw !== undefined &&
                moqRaw !== '' &&
                alertRaw !== undefined &&
                alertRaw !== '' &&
                sStock > 0 &&
                sMoq >= 1 &&
                sAlert > 0 &&
                sMoq <= sStock &&
                sAlert < sStock
              );
            });
          }

          const vStock = v.stock || 0;
          const vMoq = v.moq || 0;
          const vAlert = v.lowStockAlert || 0;
          return !(vStock > 0 && vMoq >= 1 && vAlert > 0 && vMoq <= vStock && vAlert < vStock);
        });
        if (incomplete.length > 0) {
          errors.variations = `${incomplete.length} variation(s) have invalid stock/moq/alert logic`;
        }
      }
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  }, [
    basePrice,
    hasVariant,
    hasVariantRaw,
    selectedSizes,
    stock,
    moq,
    lowStockAlert,
    moqSet,
    sizeStockSet,
    sizeLowStockAlertSet,
    stockedOutSizes,
    generalStockedOut,
    variations,
  ]);

  const validateStep4 = useCallback((): ValidationResult => {
    const errors: Record<string, string> = {};

    if (hasVariant) {
      const colorsCount = variationColors.length;
      const designsCount = variationDesigns.length;
      const variantCount = colorsCount * designsCount;
      if (variantCount > 25) {
        errors.variantCount = `Cannot exceed 25 variants (${colorsCount} colors × ${designsCount} designs = ${variantCount}). Reduce colors or designs.`;
      }
      if (variations.length === 0 && (colorsCount > 0 || designsCount > 0)) {
        errors.variations = 'Click "Generate Variations" to create variant combinations';
      }
    }

    const slotActive = (s: { localUri?: string; uploadedUrl?: string; uploadStatus?: string }) =>
      Boolean(s.localUri || s.uploadedUrl);

    if (!hasVariant) {
      const activeSlots = [
        productMedia.poster,
        productMedia.front,
        productMedia.back,
        productMedia.left,
        productMedia.right,
        ...productMedia.more,
        productMedia.video,
      ].filter(slotActive);

      if (activeSlots.length === 0) {
        errors.productMedia = 'Upload at least one product image';
      } else {
        const notDoneSlots = activeSlots.filter((s) => s.uploadStatus !== 'done');
        if (notDoneSlots.length > 0) {
          const uploadingCount = notDoneSlots.filter((s) => s.uploadStatus === 'uploading').length;
          const idleCount = notDoneSlots.filter((s) => s.uploadStatus === 'idle').length;
          const errorCount = notDoneSlots.filter((s) => s.uploadStatus === 'error').length;
          if (errorCount > 0) errors.mediaUpload = `${errorCount} upload(s) failed. Please retry.`;
          else if (uploadingCount > 0 || idleCount > 0) {
            errors.mediaUpload = `${uploadingCount + idleCount} image(s) in queue. Please wait.`;
          }
        }
      }
    }

    if (hasVariant && variations.length > 0) {
      let missingMediaCount = 0;
      let pendingCount = 0;
      let errorCount = 0;

      variations.forEach((v) => {
        const vMedia = v.media as unknown as VariationMediaState | undefined;
        if (!vMedia) {
          missingMediaCount++;
          return;
        }
        const slots = [vMedia.front, vMedia.back, ...vMedia.more, vMedia.video].filter(slotActive);
        if (!vMedia.front?.localUri && !vMedia.front?.uploadedUrl) missingMediaCount++;
        if (!vMedia.back?.localUri && !vMedia.back?.uploadedUrl) missingMediaCount++;
        const notDone = slots.filter((s) => s.uploadStatus !== 'done');
        pendingCount += notDone.filter((s) => s.uploadStatus === 'uploading' || s.uploadStatus === 'idle').length;
        errorCount += notDone.filter((s) => s.uploadStatus === 'error').length;
      });

      if (missingMediaCount > 0) errors.variations = `${missingMediaCount} variation(s) missing mandatory images`;
      if (pendingCount > 0) errors.mediaUpload = `${pendingCount} variation images in queue`;
      if (errorCount > 0) errors.mediaUpload = `${errorCount} variation uploads failed. Please retry.`;
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  }, [hasVariant, variationColors, variationDesigns, variations, productMedia]);

  const validateStep5 = useCallback((): ValidationResult => {
    const errors: Record<string, string> = {};
    if (warrantyEnabled) {
      if (!warrantyDuration?.trim()) errors.warrantyDuration = 'Warranty duration is required';
      if (!warrantyDescription?.trim()) errors.warrantyDescription = 'Warranty description is required';
    }
    if (returnPolicyEnabled) {
      if (!returnWindow?.trim()) errors.returnWindow = 'Return window is required';
      if (!returnCondition?.trim()) errors.returnCondition = 'Return conditions are required';
    }
    if (exchangeEnabled) {
      if (!exchangeWindow?.trim()) errors.exchangeWindow = 'Exchange window is required';
      if (!exchangeDescription?.trim()) errors.exchangeDescription = 'Exchange description is required';
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  }, [
    warrantyEnabled,
    warrantyDuration,
    warrantyDescription,
    returnPolicyEnabled,
    returnWindow,
    returnCondition,
    exchangeEnabled,
    exchangeWindow,
    exchangeDescription,
  ]);

  const validateStep = useCallback(
    (step: number): ValidationResult => {
      switch (step) {
        case 1:
          return validateStep1();
        case 2:
          return validateStep2();
        case 3:
          return validateStep3();
        case 4:
          return validateStep4();
        case 5:
          return validateStep5();
        case 6:
          return { isValid: true, errors: {} };
        default:
          return { isValid: false, errors: { unknown: 'Invalid step' } };
      }
    },
    [validateStep1, validateStep2, validateStep3, validateStep4, validateStep5],
  );

  return { validateStep, hasVariant };
}
