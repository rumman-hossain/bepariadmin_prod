import { useCallback } from 'react';
import { useWholesalerStore } from '../store';
import type { Wholesaler } from '@/src/types/domain';

interface UseWholesalerDetailReturn {
  selectedWholesaler: Wholesaler | null;
  select: (id: string) => void;
  goBack: () => void;
  updateStatus: (id: string, status: 'Active' | 'Suspended') => void;
  updateCommission: (id: string, rate: number) => void;
}

export function useWholesalerDetail(): UseWholesalerDetailReturn {
  const selectWholesaler = useWholesalerStore((s) => s.selectWholesaler);
  const clearSelection = useWholesalerStore((s) => s.clearSelection);
  const updateWholesaler = useWholesalerStore((s) => s.updateWholesaler);

  const selectedWholesaler = useWholesalerStore((s) => {
    if (!s.selectedId) return null;
    return s.wholesalers.find((w) => w.id === s.selectedId) ?? null;
  });

  const select = useCallback(
    (id: string) => selectWholesaler(id),
    [selectWholesaler],
  );

  const goBack = useCallback(() => clearSelection(), [clearSelection]);

  const updateStatus = useCallback(
    (id: string, status: 'Active' | 'Suspended') => {
      updateWholesaler({ ...useWholesalerStore.getState().wholesalers.find((w) => w.id === id)!, status });
    },
    [updateWholesaler],
  );

  const updateCommission = useCallback(
    (id: string, rate: number) => {
      const current = useWholesalerStore.getState().wholesalers.find((w) => w.id === id);
      if (current) {
        updateWholesaler({ ...current, commissionRate: rate });
      }
    },
    [updateWholesaler],
  );

  return { selectedWholesaler, select, goBack, updateStatus, updateCommission };
}