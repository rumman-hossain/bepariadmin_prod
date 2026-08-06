import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RETAILER_ROUTES } from '../routes';

/**
 * Moving between the retailer screens.
 *
 * Thinner than the wholesaler equivalent because there is no selection store to
 * keep in step — the detail screen reads its id from the URL, which is the only
 * copy. A second copy in a store is a second thing that can be stale.
 */
export function useRetailerNavigation() {
  const navigate = useNavigate();

  const goToList = useCallback(() => navigate(RETAILER_ROUTES.LIST), [navigate]);
  const goToCreate = useCallback(() => navigate(RETAILER_ROUTES.CREATE), [navigate]);
  const goToDetail = useCallback(
    (id: string) => navigate(RETAILER_ROUTES.DETAIL(id)),
    [navigate],
  );
  const goToEdit = useCallback((id: string) => navigate(RETAILER_ROUTES.EDIT(id)), [navigate]);

  return { goToList, goToCreate, goToDetail, goToEdit, navigate };
}
