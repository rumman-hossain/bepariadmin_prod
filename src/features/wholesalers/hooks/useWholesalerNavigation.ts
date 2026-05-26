import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WHOLESALER_ROUTES } from '../routes';
import { useWholesalerStore } from '../store';
import { wholesalerDebugLog } from '../utils/debugLog';

export function useWholesalerNavigation() {
  const navigate = useNavigate();
  const clearSelection = useWholesalerStore((s) => s.clearSelection);
  const selectWholesaler = useWholesalerStore((s) => s.selectWholesaler);

  const goToList = useCallback(() => {
    wholesalerDebugLog('useWholesalerNavigation.ts:goToList', 'navigate list', 'C', {
      path: WHOLESALER_ROUTES.LIST,
    });
    clearSelection();
    navigate(WHOLESALER_ROUTES.LIST);
  }, [navigate, clearSelection]);

  const goToCreate = useCallback(() => {
    navigate(WHOLESALER_ROUTES.CREATE);
  }, [navigate]);

  const goToDetail = useCallback(
    (id: string) => {
      wholesalerDebugLog('useWholesalerNavigation.ts:goToDetail', 'navigate detail', 'C', {
        id,
        path: WHOLESALER_ROUTES.DETAIL(id),
      });
      selectWholesaler(id);
      navigate(WHOLESALER_ROUTES.DETAIL(id));
    },
    [navigate, selectWholesaler],
  );

  const goToEdit = useCallback(
    (id: string) => {
      navigate(WHOLESALER_ROUTES.EDIT(id));
    },
    [navigate],
  );

  const goBackToList = goToList;

  const goBackToDetail = useCallback(
    (id: string) => {
      wholesalerDebugLog('useWholesalerNavigation.ts:goBackToDetail', 'navigate detail from edit', 'C', {
        id,
        path: WHOLESALER_ROUTES.DETAIL(id),
      });
      selectWholesaler(id);
      navigate(WHOLESALER_ROUTES.DETAIL(id));
    },
    [navigate, selectWholesaler],
  );

  return {
    goToList,
    goToCreate,
    goToDetail,
    goToEdit,
    goBackToList,
    goBackToDetail,
    navigate,
  };
}
