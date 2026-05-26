import { useEffect, useCallback } from 'react';
import { useWholesalerStore } from '../store';
import { useWholesalerNavigation } from './useWholesalerNavigation';
import type { Wholesaler } from '@/src/types/domain';

export function useWholesalerDetail(wholesalerId: string | null) {
  const { goBackToList, goToEdit, navigate } = useWholesalerNavigation();
  const selectedWholesaler = useWholesalerStore((s) => s.selectedWholesaler);
  const isDetailLoading = useWholesalerStore((s) => s.isDetailLoading);
  const isMutating = useWholesalerStore((s) => s.isMutating);
  const error = useWholesalerStore((s) => s.error);
  const fetchWholesalerById = useWholesalerStore((s) => s.fetchWholesalerById);
  const clearSelection = useWholesalerStore((s) => s.clearSelection);
  const clearError = useWholesalerStore((s) => s.clearError);

  const refetch = useCallback(async () => {
    if (wholesalerId) {
      await fetchWholesalerById(wholesalerId);
    }
  }, [wholesalerId, fetchWholesalerById]);

  useEffect(() => {
    if (wholesalerId) {
      fetchWholesalerById(wholesalerId);
    } else {
      clearSelection();
    }
  }, [wholesalerId, fetchWholesalerById, clearSelection]);

  const goBack = goBackToList;

  const wholesaler: Wholesaler | null =
    wholesalerId && selectedWholesaler?.id === wholesalerId ? selectedWholesaler : null;

  return {
    wholesaler,
    isLoading: isDetailLoading,
    isMutating,
    error,
    refetch,
    goBack,
    goToEdit,
    clearError,
    navigate,
  };
}
