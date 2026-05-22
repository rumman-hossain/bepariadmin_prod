import { useEffect, useCallback } from 'react';
import { useProductStore } from '../store';
import type { Product } from '../types';

export function useProductDetail(productId: string | null): {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const selectedProduct = useProductStore((s) => s.selectedProduct);
  const isDetailLoading = useProductStore((s) => s.isDetailLoading);
  const error = useProductStore((s) => s.error);
  const fetchProductDetail = useProductStore((s) => s.fetchProductDetail);
  const clearSelection = useProductStore((s) => s.clearSelection);

  const refetch = useCallback(async () => {
    if (productId) {
      await fetchProductDetail(productId);
    }
  }, [productId, fetchProductDetail]);

  useEffect(() => {
    if (productId) {
      fetchProductDetail(productId);
    } else {
      clearSelection();
    }
  }, [productId]);

  return { product: selectedProduct, isLoading: isDetailLoading, error, refetch };
}