import { useProductFormStore } from '../formStore';
import type { Product } from '../types';

export function useProductForm(): ReturnType<typeof useProductFormStore.getState> & {
  openCreate: (defaults?: Partial<import('../types').ProductFormData>) => void;
  openEdit: (product: Product) => void;
  close: () => void;
  submit: () => Promise<Product | null>;
} {
  return useProductFormStore();
}