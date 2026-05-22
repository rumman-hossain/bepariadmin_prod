import { useEffect } from 'react';
import { useCatalogStore } from '../catalogStore';

export function useCatalogTree() {
  const store = useCatalogStore();

  useEffect(() => {
    store.fetchCategories();
  }, []);

  return store;
}