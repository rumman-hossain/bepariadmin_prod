import { useCallback } from 'react';
import { useAddProductStore } from '../store/useAddProductStore';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function useFormValidation() {
  const store = useAddProductStore();

  const validateStep = useCallback(
    (step: number): ValidationResult => {
      const errors: Record<string, string> = {};

      if (step === 1) {
        if (!store.wholesalerId?.trim()) errors.wholesalerId = 'Wholesaler is required';
        if (!store.name?.trim()) errors.name = 'Product name is required';
        if (!store.brandName?.trim()) errors.brandName = 'Brand is required';
        if (!store.unitType?.trim()) errors.unitType = 'Unit type is required';
        if (!store.categoryId) errors.category = 'Category is required';
        if (!store.productGroupId) errors.productGroup = 'Product group is required';
        if (!store.classificationId) errors.classification = 'Classification is required';
        if (!store.sku?.trim()) errors.sku = 'SKU is required';
      }

      if (step === 3) {
        if (!store.basePrice || Number(store.basePrice) <= 0) errors.basePrice = 'Base price is required';
        if (!store.dispatchTime) errors.dispatchTime = 'Dispatch time is required';
        if (store.hasVariant === null) errors.hasVariant = 'Variant choice required';
      }

      if (step === 4) {
        const pm = store.productMedia;
        if (store.hasVariant) {
          if (!pm.poster.uploadedUrl && pm.poster.uploadStatus !== 'done') {
            errors.poster = 'Poster image is required for variant products';
          }
        } else {
          if (!pm.front.uploadedUrl && pm.front.uploadStatus !== 'done') {
            errors.front = 'Front image is required';
          }
        }
      }

      return { isValid: Object.keys(errors).length === 0, errors };
    },
    [store],
  );

  return { validateStep };
}
