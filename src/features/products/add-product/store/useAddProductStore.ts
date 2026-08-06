/**
 * Add Product wizard store — ported from wholesaleapp-client (plain Zustand, no immer).
 */
import { create } from 'zustand';
import type {
  WizardState,
  MediaSlot,
  ProductMediaState,
  VariationMediaState,
  ProductVariation,
} from '../../types/registration';

export type { MediaSlot, ProductMediaState, VariationMediaState, WizardState, ProductVariation };

export const emptySlot = (): MediaSlot => ({
  localUri: '',
  uploadedUrl: '',
  uploadStatus: 'idle',
});

export const emptyProductMedia = (): ProductMediaState => ({
  poster: emptySlot(),
  front: emptySlot(),
  back: emptySlot(),
  left: emptySlot(),
  right: emptySlot(),
  more: [],
  video: { ...emptySlot(), thumbnail: '' },
});

export const emptyVariationMedia = (): VariationMediaState => ({
  front: emptySlot(),
  back: emptySlot(),
  more: [],
  video: { ...emptySlot(), thumbnail: '' },
});

/**
 * Exported so tests build fixtures from the real default rather than a
 * hand-written copy — a hand-written one silently drifts when a field is added,
 * and a fixture that no longer matches the type is a test that proves nothing.
 */
export const INITIAL_STATE: WizardState = {
  name: '',
  brandName: '',
  unitType: '',
  category: '',
  categoryId: '',
  subCategory: '',
  subCategoryId: '',
  productGroup: '',
  productGroupId: '',
  productTemplateId: '',
  productClassification: '',
  classificationId: '',
  productDetailId: '',
  description: '',
  material: '',
  weight: '',
  volume: '',
  colors: '',
  selectedSizes: [],
  tags: [],
  basePrice: '',
  margin: '',
  stock: '',
  lowStockAlert: '',
  moq: '',
  dispatchTime: '',
  hasVariant: null,
  moqSet: {},
  sizeStockSet: {},
  sizeLowStockAlertSet: {},
  variationColors: [],
  variationDesigns: [],
  variations: [],
  productMedia: emptyProductMedia(),
  warrantyEnabled: false,
  warrantyDuration: '',
  warrantyDescription: '',
  returnPolicyEnabled: false,
  returnWindow: '',
  returnCondition: '',
  exchangeEnabled: false,
  exchangeWindow: '',
  exchangeDescription: '',
  productId: null,
  draftId: null,
  sku: '',
  classificationDetails: [],
  sizeMode: 'AUTO',
  sizeType: '',
  fwScale: 'UK',
  errors: [],
  stockedOutSizes: [],
  generalStockedOut: false,
  wholesalerId: '',
  wholesalerCode: '',
};

interface AddProductStore extends WizardState {
  setField: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;
  setProductMediaSlot: (key: keyof Omit<ProductMediaState, 'more' | 'video'>, slot: Partial<MediaSlot>) => void;
  setProductVideoSlot: (slot: Partial<MediaSlot & { thumbnail: string }>) => void;
  addProductMoreSlots: (slots: MediaSlot[]) => void;
  removeProductMoreSlot: (index: number) => void;
  setProductMoreSlot: (index: number, slot: Partial<MediaSlot>) => void;
  clearProductMediaSlot: (key: keyof Omit<ProductMediaState, 'more' | 'video'>) => void;
  updateVariation: (variationId: string, updater: (v: ProductVariation) => ProductVariation) => void;
  setVariationMediaSlot: (
    variationId: string,
    key: keyof Omit<VariationMediaState, 'more' | 'video'>,
    slot: Partial<MediaSlot>,
  ) => void;
  reset: () => void;
  hydrate: (partial: Partial<WizardState>) => void;
}

export const useAddProductStore = create<AddProductStore>((set) => ({
  ...INITIAL_STATE,
  productMedia: emptyProductMedia(),

  setField: (field, value) => set({ [field]: value } as Partial<WizardState>),

  setProductMediaSlot: (key, slot) =>
    set((s) => ({
      productMedia: {
        ...s.productMedia,
        [key]: { ...s.productMedia[key], ...slot },
      },
    })),

  setProductVideoSlot: (slot) =>
    set((s) => ({
      productMedia: {
        ...s.productMedia,
        video: { ...s.productMedia.video, ...slot },
      },
    })),

  addProductMoreSlots: (slots) =>
    set((s) => {
      const remaining = 5 - s.productMedia.more.length;
      if (remaining <= 0) return s;
      return {
        productMedia: {
          ...s.productMedia,
          more: [...s.productMedia.more, ...slots.slice(0, remaining)],
        },
      };
    }),

  removeProductMoreSlot: (index) =>
    set((s) => ({
      productMedia: {
        ...s.productMedia,
        more: s.productMedia.more.filter((_, i) => i !== index),
      },
    })),

  setProductMoreSlot: (index, slot) =>
    set((s) => {
      const more = [...s.productMedia.more];
      if (index < 0 || index >= more.length) return s;
      more[index] = { ...more[index], ...slot };
      return { productMedia: { ...s.productMedia, more } };
    }),

  clearProductMediaSlot: (key) =>
    set((s) => ({
      productMedia: { ...s.productMedia, [key]: emptySlot() },
    })),

  updateVariation: (variationId, updater) =>
    set((s) => ({
      variations: s.variations.map((v) => (v.id === variationId ? updater(v) : v)),
    })),

  setVariationMediaSlot: (variationId, key, slot) =>
    set((s) => ({
      variations: s.variations.map((v) => {
        if (v.id !== variationId) return v;
        const media = (v.media as VariationMediaState) ?? emptyVariationMedia();
        return {
          ...v,
          media: { ...media, [key]: { ...media[key], ...slot } } as VariationMediaState,
        };
      }),
    })),

  reset: () => set({ ...INITIAL_STATE, productMedia: emptyProductMedia() }),

  hydrate: (partial) => set((s) => ({ ...s, ...partial })),
}));
