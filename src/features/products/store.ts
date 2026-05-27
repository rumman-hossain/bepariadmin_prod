/**
 * Product list state management — Zustand store.
 * Centralized state for product list, fetch, pagination, and actions.
 * Follows the same pattern as dashboard store.
 * No mock data — starts empty, populated only from API.
 */
import { create } from 'zustand';
import {
  getProducts,
  getProductById,
  updateProductStatus,
  deleteProduct,
} from '@/src/api/products';
import { productListResponseSchema, productResponseSchema } from './schemas/productSchema';
import { INITIAL_FILTERS, INITIAL_PAGINATION } from './types';
import type { Product, ProductFilters, ProductPagination, ProductStatus } from './types';

interface ProductStore {
  /** Product list — empty array by default (no mock data) */
  products: Product[];
  /** Currently selected product detail */
  selectedProduct: Product | null;
  /** Selected product ID */
  selectedId: string | null;

  /** Filters applied to list */
  filters: ProductFilters;
  /** Pagination state */
  pagination: ProductPagination;

  /** Category id → name map for list normalization */
  categoryNameMap: Record<string, string>;

  /** Loading / error states */
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;

  // ── Actions — Data Fetching ─────────────────────────────────

  /** Fetch product list from API with current filters + page */
  fetchProducts: () => Promise<void>;
  /** Fetch single product detail by ID */
  fetchProductDetail: (id: string) => Promise<void>;

  // ── Actions — Mutations ─────────────────────────────────────

  /** Update product status (approve/reject/archive etc.) */
  setProductStatus: (id: string, status: ProductStatus, reason?: string) => Promise<void>;
  /** Delete product by ID */
  removeProduct: (id: string) => Promise<void>;

  // ── Actions — Local State ───────────────────────────────────

  /** Set a single filter value */
  setFilter: (key: keyof ProductFilters, value: string | boolean) => void;
  /** Reset all filters to defaults */
  clearFilters: () => void;
  /** Go to a specific page */
  setPage: (page: number) => void;
  /** Change page size */
  setLimit: (limit: number) => void;
  /** Set category id → name lookup for API normalization */
  setCategoryNameMap: (map: Record<string, string>) => void;
  /** Select a product by ID */
  selectProduct: (id: string) => void;
  /** Clear selected product */
  clearSelection: () => void;
  /** Clear error state */
  clearError: () => void;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  selectedProduct: null,
  selectedId: null,

  filters: { ...INITIAL_FILTERS },
  pagination: { ...INITIAL_PAGINATION },
  categoryNameMap: {},

  isLoading: true,
  isDetailLoading: false,
  error: null,

  // ── Fetch List ─────────────────────────────────────────────────

  fetchProducts: async () => {
    const { filters, pagination, categoryNameMap } = get();

    set({ isLoading: true, error: null });

    try {
      const res = await getProducts(
        {
          page: pagination.page,
          limit: pagination.limit,
          search: filters.search || undefined,
          category: filters.category !== 'All' ? filters.category : undefined,
          status: filters.status !== 'All' ? filters.status : undefined,
          visibility: filters.visibility !== 'All' ? filters.visibility : undefined,
        },
        { categoryNames: categoryNameMap },
      );

      if (!res.ok) {
        set({ isLoading: false, error: `Failed to load products (${res.status}) — check that the backend is running and the dev proxy is configured` });
        return;
      }

      const parsed = productListResponseSchema.safeParse(res.data);

      if (!parsed.success) {
        console.error('[Products] Schema validation failed:', parsed.error.flatten());
        set({ isLoading: false, error: 'Invalid product data received from server' });
        return;
      }

      set({
        products: parsed.data.products,
        pagination: {
          page: parsed.data.page,
          limit: parsed.data.limit,
          total: parsed.data.total,
        },
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      set({ isLoading: false, error: message });
    }
  },

  // ── Fetch Detail ──────────────────────────────────────────────

  fetchProductDetail: async (id) => {
    set({ isDetailLoading: true });

    try {
      const res = await getProductById(id);

      if (!res.ok) {
        set({ isDetailLoading: false, error: `Failed to load product (${res.status})` });
        return;
      }

      const parsed = productResponseSchema.safeParse(res.data);

      if (!parsed.success) {
        console.error('[Products] Detail schema validation failed:', parsed.error.flatten());
        set({ isDetailLoading: false, error: 'Invalid product detail received from server' });
        return;
      }

      set({
        selectedProduct: parsed.data,
        selectedId: parsed.data.id,
        isDetailLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      set({ isDetailLoading: false, error: message });
    }
  },

  // ── Mutations ─────────────────────────────────────────────────

  setProductStatus: async (id, status, reason) => {
    try {
      const res = await updateProductStatus(id, status, reason);

      if (!res.ok) {
        set({ error: `Failed to update status (${res.status})` });
        return;
      }

      const parsed = productResponseSchema.safeParse(res.data);
      if (!parsed.success) return;

      const updated = parsed.data;

      set((state) => ({
        products: state.products.map((p) => (p.id === updated.id ? updated : p)),
        selectedProduct: state.selectedProduct?.id === updated.id ? updated : state.selectedProduct,
        error: null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      set({ error: message });
    }
  },

  removeProduct: async (id) => {
    try {
      const res = await deleteProduct(id);

      if (!res.ok) {
        set({ error: `Failed to delete product (${res.status})` });
        return;
      }

      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        pagination: { ...state.pagination, total: state.pagination.total - 1 },
        selectedId: state.selectedId === id ? null : state.selectedId,
        selectedProduct: state.selectedId === id ? null : state.selectedProduct,
        error: null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      set({ error: message });
    }
  },

  // ── Local State ──────────────────────────────────────────────

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
      pagination: { ...state.pagination, page: 1 },
    }));
  },

  clearFilters: () =>
    set({
      filters: { ...INITIAL_FILTERS },
      pagination: { ...INITIAL_PAGINATION },
    }),

  setPage: (page) =>
    set((state) => ({
      pagination: { ...state.pagination, page },
    })),

  setLimit: (limit) =>
    set((state) => ({
      pagination: { ...state.pagination, limit, page: 1 },
    })),

  setCategoryNameMap: (map) => {
    set({ categoryNameMap: map });
    if (Object.keys(map).length > 0) {
      void get().fetchProducts();
    }
  },

  selectProduct: (id) => set({ selectedId: id }),

  clearSelection: () => set({ selectedId: null, selectedProduct: null }),

  clearError: () => set({ error: null }),
}));