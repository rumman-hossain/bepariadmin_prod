/**
 * Catalog tree state management — Zustand store.
 * Manages the category → subCategory → productGroup → classification hierarchy.
 * Loads data lazily from API; no mock data.
 */
import { create } from 'zustand';
import {
  getCategories,
  getSubCategories,
  getProductGroups,
  getClassifications,
  getSku,
  getPlatformMargin,
  getSizeConfig,
} from '@/src/api/products';

interface CatalogNode {
  id: string;
  name: string;
  code?: string;
}

interface CatalogStore {
  // Tree nodes
  categories: CatalogNode[];
  subCategories: CatalogNode[];
  productGroups: CatalogNode[];
  classifications: CatalogNode[];

  // Selected IDs for tree navigation
  selectedCategoryId: string | null;
  selectedSubCategoryId: string | null;
  selectedProductGroupId: string | null;
  selectedClassificationId: string | null;

  // Derived values from API
  sku: string | null;
  platformMargin: number | null;
  availableSizes: string[];

  // Loading flags
  isCategoriesLoading: boolean;
  isSubCategoriesLoading: boolean;
  isProductGroupsLoading: boolean;
  isClassificationsLoading: boolean;
  isSkuLoading: boolean;

  // Error
  error: string | null;

  // ── Actions ──────────────────────────────────────────────────

  /** Fetch all root categories */
  fetchCategories: () => Promise<void>;
  /** Fetch sub-categories for selected category */
  fetchSubCategories: (categoryId: string) => Promise<void>;
  /** Fetch product groups for selected sub-category */
  fetchProductGroups: (subCategoryId: string) => Promise<void>;
  /** Fetch classifications for selected product group */
  fetchClassifications: (productGroupId: string) => Promise<void>;

  /** Select a category and load children */
  selectCategory: (id: string) => void;
  /** Select a sub-category and load children */
  selectSubCategory: (id: string) => void;
  /** Select a product group and load children + SKU */
  selectProductGroup: (id: string) => void;
  /** Select a classification */
  selectClassification: (id: string) => void;

  /** Reserve SKU from backend */
  fetchSku: (wholesalerCode: string) => Promise<void>;
  /** Fetch platform margin */
  fetchPlatformMargin: () => Promise<void>;
  /** Fetch available sizes for selected product group */
  fetchSizeConfig: (productGroupId: string) => Promise<void>;

  /** Reset entire catalog state */
  reset: () => void;
  /** Clear error */
  clearError: () => void;
}

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  categories: [],
  subCategories: [],
  productGroups: [],
  classifications: [],

  selectedCategoryId: null,
  selectedSubCategoryId: null,
  selectedProductGroupId: null,
  selectedClassificationId: null,

  sku: null,
  platformMargin: null,
  availableSizes: [],

  isCategoriesLoading: false,
  isSubCategoriesLoading: false,
  isProductGroupsLoading: false,
  isClassificationsLoading: false,
  isSkuLoading: false,

  error: null,

  // ── Fetch Categories ──────────────────────────────────────

  fetchCategories: async () => {
    set({ isCategoriesLoading: true, error: null });
    try {
      const res = await getCategories();
      if (!res.ok) {
        set({ isCategoriesLoading: false, error: `Failed to load categories (${res.status})` });
        return;
      }
      set({ categories: res.data, isCategoriesLoading: false });
    } catch (err) {
      set({ isCategoriesLoading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  // ── Fetch Sub-Categories ──────────────────────────────────

  fetchSubCategories: async (categoryId) => {
    set({ isSubCategoriesLoading: true, error: null, subCategories: [] });
    try {
      const res = await getSubCategories(categoryId);
      if (!res.ok) {
        set({ isSubCategoriesLoading: false, error: `Failed to load sub-categories (${res.status})` });
        return;
      }
      set({ subCategories: res.data, isSubCategoriesLoading: false });
    } catch (err) {
      set({ isSubCategoriesLoading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  // ── Fetch Product Groups ──────────────────────────────────

  fetchProductGroups: async (subCategoryId) => {
    set({ isProductGroupsLoading: true, error: null, productGroups: [], classifications: [] });
    try {
      const res = await getProductGroups(subCategoryId);
      if (!res.ok) {
        set({ isProductGroupsLoading: false, error: `Failed to load product groups (${res.status})` });
        return;
      }
      set({ productGroups: res.data, isProductGroupsLoading: false });
    } catch (err) {
      set({ isProductGroupsLoading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  // ── Fetch Classifications ─────────────────────────────────

  fetchClassifications: async (productGroupId) => {
    set({ isClassificationsLoading: true, error: null, classifications: [] });
    try {
      const res = await getClassifications(productGroupId);
      if (!res.ok) {
        set({ isClassificationsLoading: false, error: `Failed to load classifications (${res.status})` });
        return;
      }
      set({ classifications: res.data, isClassificationsLoading: false });
    } catch (err) {
      set({ isClassificationsLoading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  // ── Selections (cascade children) ─────────────────────────

  selectCategory: (id) => {
    set({
      selectedCategoryId: id,
      selectedSubCategoryId: null,
      selectedProductGroupId: null,
      selectedClassificationId: null,
      subCategories: [],
      productGroups: [],
      classifications: [],
    });
    get().fetchSubCategories(id);
  },

  selectSubCategory: (id) => {
    set({
      selectedSubCategoryId: id,
      selectedProductGroupId: null,
      selectedClassificationId: null,
      productGroups: [],
      classifications: [],
    });
    get().fetchProductGroups(id);
  },

  selectProductGroup: (id) => {
    set({
      selectedProductGroupId: id,
      selectedClassificationId: null,
      classifications: [],
    });
    get().fetchClassifications(id);
    get().fetchSizeConfig(id);
  },

  selectClassification: (id) => {
    set({ selectedClassificationId: id });
  },

  // ── SKU ───────────────────────────────────────────────────

  fetchSku: async (wholesalerCode) => {
    const { selectedCategoryId, selectedSubCategoryId, selectedProductGroupId, selectedClassificationId } = get();

    if (!selectedCategoryId || !selectedSubCategoryId || !selectedProductGroupId || !selectedClassificationId) {
      set({ error: 'Please select all catalog levels before reserving SKU' });
      return;
    }

    set({ isSkuLoading: true, error: null });

    try {
      const res = await getSku({
        wholesalerCode,
        categoryId: selectedCategoryId,
        subCategoryId: selectedSubCategoryId,
        productGroupId: selectedProductGroupId,
        classificationId: selectedClassificationId,
      });

      if (!res.ok) {
        set({ isSkuLoading: false, error: `Failed to reserve SKU (${res.status})` });
        return;
      }

      set({ sku: res.data.sku, isSkuLoading: false });
    } catch (err) {
      set({ isSkuLoading: false, error: err instanceof Error ? err.message : 'Network error' });
    }
  },

  // ── Platform Margin ───────────────────────────────────────

  fetchPlatformMargin: async () => {
    try {
      const res = await getPlatformMargin();
      if (res.ok) {
        set({ platformMargin: res.data.margin });
      }
    } catch {
      // Silently fail — margin is optional
    }
  },

  // ── Size Config ───────────────────────────────────────────

  fetchSizeConfig: async (productGroupId) => {
    try {
      const res = await getSizeConfig(productGroupId);
      if (res.ok) {
        set({ availableSizes: res.data.sizes });
      }
    } catch {
      // Silently fail
    }
  },

  // ── Utilities ─────────────────────────────────────────────

  reset: () =>
    set({
      categories: [],
      subCategories: [],
      productGroups: [],
      classifications: [],

      selectedCategoryId: null,
      selectedSubCategoryId: null,
      selectedProductGroupId: null,
      selectedClassificationId: null,

      sku: null,
      platformMargin: null,
      availableSizes: [],

      isCategoriesLoading: false,
      isSubCategoriesLoading: false,
      isProductGroupsLoading: false,
      isClassificationsLoading: false,
      isSkuLoading: false,

      error: null,
    }),

  clearError: () => set({ error: null }),
}));