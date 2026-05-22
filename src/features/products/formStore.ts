/**
 * Product form state management — Zustand store.
 * Manages the create/edit product form state independently from the list store.
 * No mock data. Integrates with catalog store for SKU/margins/sizes.
 */
import { create } from 'zustand';
import { createProduct, updateProduct } from '@/src/api/products';
import { productSchema, productResponseSchema } from './schemas/productSchema';
import type { ProductFormData, CreateProductDTO, UpdateProductDTO } from './types';
import type { Product } from './types';

interface FormStore {
  /** Form values (unvalidated) */
  values: Partial<ProductFormData>;
  /** Whether we're creating or editing */
  mode: 'create' | 'edit';
  /** ID of product being edited */
  editId: string | null;
  /** Whether form submission is in progress */
  isSubmitting: boolean;
  /** Whether the form is visible */
  isOpen: boolean;
  /** Form-level error message */
  error: string | null;

  // ── Actions ──────────────────────────────────────────────────

  /** Open form in create mode */
  openCreate: (defaults?: Partial<ProductFormData>) => void;
  /** Open form in edit mode with existing product data */
  openEdit: (product: Product) => void;
  /** Close form and reset */
  close: () => void;
  /** Update a single field */
  setField: <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => void;
  /** Bulk update fields */
  setFields: (fields: Partial<ProductFormData>) => void;
  /** Reset form to initial state */
  reset: () => void;
  /** Submit form — creates or updates product via API */
  submit: () => Promise<Product | null>;
  /** Clear error */
  clearError: () => void;
}

function toCreateDTO(values: ProductFormData): CreateProductDTO {
  return {
    name: values.name,
    category: values.category,
    subCategory: values.subCategory || undefined,
    productGroup: values.productGroup || undefined,
    basePrice: values.basePrice,
    margin: values.margin,
    stock: values.stock,
    moq: values.moq,
    dispatchTime: values.dispatchTime,
    description: values.description || undefined,
    brandName: values.brandName || undefined,
    unitType: values.unitType || undefined,
    material: values.material || undefined,
    color: values.color || undefined,
    weight: values.weight || undefined,
    volume: values.volume || undefined,
    availableSizes: values.availableSizes?.length ? values.availableSizes : undefined,
    wholesalerId: values.wholesalerId,
    imageUrl: values.imageUrl || undefined,
    visibility: values.visibility,
  };
}

function toUpdateDTO(values: Partial<ProductFormData>): UpdateProductDTO {
  const dto: UpdateProductDTO = {};
  if (values.name !== undefined) dto.name = values.name;
  if (values.category !== undefined) dto.category = values.category;
  if (values.subCategory !== undefined) dto.subCategory = values.subCategory || undefined;
  if (values.productGroup !== undefined) dto.productGroup = values.productGroup || undefined;
  if (values.basePrice !== undefined) dto.basePrice = values.basePrice;
  if (values.margin !== undefined) dto.margin = values.margin;
  if (values.stock !== undefined) dto.stock = values.stock;
  if (values.moq !== undefined) dto.moq = values.moq;
  if (values.dispatchTime !== undefined) dto.dispatchTime = values.dispatchTime;
  if (values.description !== undefined) dto.description = values.description || undefined;
  if (values.brandName !== undefined) dto.brandName = values.brandName || undefined;
  if (values.unitType !== undefined) dto.unitType = values.unitType || undefined;
  if (values.material !== undefined) dto.material = values.material || undefined;
  if (values.color !== undefined) dto.color = values.color || undefined;
  if (values.weight !== undefined) dto.weight = values.weight || undefined;
  if (values.volume !== undefined) dto.volume = values.volume || undefined;
  if (values.availableSizes !== undefined) dto.availableSizes = values.availableSizes.length ? values.availableSizes : undefined;
  if (values.visibility !== undefined) dto.visibility = values.visibility;
  if (values.imageUrl !== undefined) dto.imageUrl = values.imageUrl || undefined;
  return dto;
}

export const useProductFormStore = create<FormStore>((set, get) => ({
  values: {},
  mode: 'create',
  editId: null,
  isSubmitting: false,
  isOpen: false,
  error: null,

  openCreate: (defaults) =>
    set({
      values: {
        visibility: 'Public',
        margin: 15,
        stock: 0,
        moq: 1,
        ...defaults,
      },
      mode: 'create',
      editId: null,
      isOpen: true,
      error: null,
    }),

  openEdit: (product) => {
    // Normalize nullable fields from API response to match form schema
    const normalized: Partial<ProductFormData> = {
      name: product.name,
      sku: product.sku,
      category: product.category,
      subCategory: product.subCategory ?? undefined,
      productGroup: product.productGroup ?? undefined,
      basePrice: product.basePrice,
      margin: product.margin,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      availableStock: product.availableStock ?? undefined,
      reservedStock: product.reservedStock ?? undefined,
      moq: product.moq,
      dispatchTime: product.dispatchTime,
      trendTags: product.trendTags ?? undefined,
      visibility: product.visibility,
      wholesalerId: product.wholesalerId,
      status: product.status,
      imageUrl: product.imageUrl ?? undefined,
      rejectionReason: product.rejectionReason ?? undefined,
      description: product.description ?? undefined,
      brandName: product.brandName ?? undefined,
      unitType: product.unitType ?? undefined,
      material: product.material ?? undefined,
      color: product.color ?? undefined,
      weight: product.weight ?? undefined,
      volume: product.volume ?? undefined,
      availableSizes: product.availableSizes ?? undefined,
      moqSet: product.moqSet ?? undefined,
      videoUrl: product.videoUrl ?? undefined,
      discountPercentage: product.discountPercentage ?? undefined,
      featuredUntil: product.featuredUntil ?? undefined,
      sponsoredUntil: product.sponsoredUntil ?? undefined,
    };

    set({
      values: normalized,
      mode: 'edit',
      editId: product.id,
      isOpen: true,
      error: null,
    });
  },

  close: () =>
    set({
      values: {},
      mode: 'create',
      editId: null,
      isSubmitting: false,
      isOpen: false,
      error: null,
    }),

  setField: (key, value) =>
    set((state) => ({
      values: { ...state.values, [key]: value },
    })),

  setFields: (fields) =>
    set((state) => ({
      values: { ...state.values, ...fields },
    })),

  reset: () =>
    set({
      values: {},
      mode: 'create',
      editId: null,
      isOpen: false,
      isSubmitting: false,
      error: null,
    }),

  submit: async () => {
    const { values, mode, editId } = get();

    // Validate with Zod
    const parsed = productSchema.safeParse(values);

    if (!parsed.success) {
      const errors = parsed.error.flatten();
      set({
        error: errors.fieldErrors
          ? Object.entries(errors.fieldErrors)
              .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
              .join('; ')
          : 'Validation failed',
      });
      return null;
    }

    set({ isSubmitting: true, error: null });

    try {
      let res;

      if (mode === 'create') {
        res = await createProduct(toCreateDTO(parsed.data));
      } else {
        if (!editId) throw new Error('No product ID for edit');
        res = await updateProduct(editId, toUpdateDTO(parsed.data));
      }

      if (!res.ok) {
        set({ isSubmitting: false, error: `Submission failed (${res.status})` });
        return null;
      }

      const responseParsed = productResponseSchema.safeParse(res.data);

      if (!responseParsed.success) {
        set({ isSubmitting: false, error: 'Invalid response from server' });
        return null;
      }

      set({ isSubmitting: false, isOpen: false, values: {}, editId: null });
      return responseParsed.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      set({ isSubmitting: false, error: message });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));