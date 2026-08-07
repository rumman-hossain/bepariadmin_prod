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
  mediaDirty: false,
};

/**
 * Drops entries whose key is no longer a selected size.
 *
 * THE BUG THIS EXISTS FOR — and it is live in the mobile app too.
 *
 * Stock, MOQ and the low-stock threshold are each held per size, in three
 * parallel maps keyed by the size STRING. Changing the size mode or the
 * footwear scale clears `selectedSizes` and nothing else, so the maps keep
 * their old keys.
 *
 * Enter stock against UK 6/7/8, switch the scale to US, re-pick 8/9/10, and the
 * maps now carry the orphaned UK keys alongside the new US ones — with `"8"`
 * meaning UK 8 in one and US 8 in the other. Both are submitted. Nothing on
 * screen says so.
 *
 * Pruning rather than re-keying is deliberate: UK 8 and US 10 are the same
 * shoe, so a mapping exists in principle, but it is lossy in both directions
 * and silently rewriting numbers an operator typed is worse than asking them
 * again. The caller tells them what was dropped.
 */
export function pruneToSizes(
  map: Record<string, string>,
  sizes: readonly string[],
): Record<string, string> {
  const keep = new Set(sizes);
  const out: Record<string, string> = {};
  for (const [size, value] of Object.entries(map)) {
    if (keep.has(size)) out[size] = value;
  }
  return out;
}

/** How many entries pruning would discard — so the UI can say so before it happens. */
export function countOrphanedSizes(
  state: Pick<WizardState, 'moqSet' | 'sizeStockSet' | 'sizeLowStockAlertSet'>,
  sizes: readonly string[],
): number {
  const keep = new Set(sizes);
  const orphans = new Set<string>();
  for (const map of [state.moqSet, state.sizeStockSet, state.sizeLowStockAlertSet]) {
    for (const size of Object.keys(map ?? {})) {
      if (!keep.has(size)) orphans.add(size);
    }
  }
  return orphans.size;
}

interface AddProductStore extends WizardState {
  setField: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;

  /**
   * Marks media changed for call sites that mutate it INDIRECTLY.
   *
   * Deleting a whole variation goes through `setField('variations', …)`, which
   * cannot tell that it just took four images with it. Those call sites say so
   * explicitly.
   */
  markMediaDirty: () => void;

  /**
   * Replaces the selected sizes AND prunes the three per-size maps to match.
   *
   * The only supported way to change the size vocabulary. Assigning
   * `selectedSizes` through `setField` leaves the maps behind — see
   * `pruneToSizes`.
   */
  setSelectedSizes: (sizes: string[]) => void;
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

  /*
   * The per-variation gallery and video, which the admin console simply did
   * not have. Every variant carries its own front / back / more[] / video, and
   * without these the gallery could be neither added to, edited nor emptied —
   * so a variant's media was whatever the first save happened to put there.
   */
  addVariationMoreSlots: (variationId: string, slots: MediaSlot[]) => void;
  setVariationMoreSlot: (variationId: string, index: number, slot: Partial<MediaSlot>) => void;
  removeVariationMoreSlot: (variationId: string, index: number) => void;
  setVariationVideoSlot: (
    variationId: string,
    slot: Partial<MediaSlot & { thumbnail: string }>,
  ) => void;

  reset: () => void;
  hydrate: (partial: Partial<WizardState>) => void;
}

/**
 * Whether a slot update came from the USER rather than the upload engine.
 *
 * The media setters are dual-use: a person picking or clearing an image, and
 * the background progress-sync advancing `uploadStatus` / `uploadedUrl`. Only
 * the first should mark the form dirty, or a product becomes "changed" merely
 * by watching its own uploads finish.
 *
 * Every user call site carries an explicit `localUri` — a real path on pick,
 * `''` on clear. Progress updates never do. Ported unchanged from the mobile
 * app, where the same discriminator is load-bearing.
 */
const isUserMediaChange = (slot: Partial<MediaSlot>) => 'localUri' in slot;

export const useAddProductStore = create<AddProductStore>((set) => ({
  ...INITIAL_STATE,
  productMedia: emptyProductMedia(),

  setField: (field, value) => set({ [field]: value } as Partial<WizardState>),

  markMediaDirty: () => set({ mediaDirty: true }),

  setSelectedSizes: (sizes) => {
    const keep = new Set(sizes);
    return set((s) => ({
      selectedSizes: sizes,
      // The three maps follow the vocabulary. Without this they keep keys for
      // sizes that are no longer selectable and submit them.
      moqSet: pruneToSizes(s.moqSet, sizes),
      sizeStockSet: pruneToSizes(s.sizeStockSet, sizes),
      sizeLowStockAlertSet: pruneToSizes(s.sizeLowStockAlertSet, sizes),
      // A size that is gone cannot be stocked out either.
      stockedOutSizes: s.stockedOutSizes.filter((size) => keep.has(size)),
      /*
       * AND every variation's per-size inventory, which is the FOURTH place a
       * size string is a key.
       *
       * Missing this leaves the same collision one level down: `syncSizeSelection`
       * filters variation inventory to the selected sizes, but it too bails when
       * the selection is empty — so a row for UK 8 survives the scale change and
       * is then kept as US 8, carrying the wrong stock into a variant.
       */
      variations: s.variations.map((v) =>
        v.inventory ? { ...v, inventory: v.inventory.filter((i) => keep.has(i.size)) } : v,
      ),
    }));
  },

  setProductMediaSlot: (key, slot) =>
    set((s) => ({
      productMedia: {
        ...s.productMedia,
        [key]: { ...s.productMedia[key], ...slot },
      },
      mediaDirty: s.mediaDirty || isUserMediaChange(slot),
    })),

  setProductVideoSlot: (slot) =>
    set((s) => ({
      productMedia: {
        ...s.productMedia,
        video: { ...s.productMedia.video, ...slot },
      },
      mediaDirty: s.mediaDirty || isUserMediaChange(slot),
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
        mediaDirty: true,
      };
    }),

  removeProductMoreSlot: (index) =>
    set((s) => {
      // Bounds-checked before filtering. A negative index used to pass straight
      // through and quietly remove nothing, which reads as a broken button.
      if (index < 0 || index >= s.productMedia.more.length) return s;
      return {
        productMedia: {
          ...s.productMedia,
          more: s.productMedia.more.filter((_, i) => i !== index),
        },
        mediaDirty: true,
      };
    }),

  setProductMoreSlot: (index, slot) =>
    set((s) => {
      const more = [...s.productMedia.more];
      if (index < 0 || index >= more.length) return s;
      more[index] = { ...more[index], ...slot };
      return {
        productMedia: { ...s.productMedia, more },
        mediaDirty: s.mediaDirty || isUserMediaChange(slot),
      };
    }),

  clearProductMediaSlot: (key) =>
    set((s) => ({
      productMedia: { ...s.productMedia, [key]: emptySlot() },
      // Always a user action — nothing in the upload engine clears a slot.
      mediaDirty: true,
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
      mediaDirty: s.mediaDirty || isUserMediaChange(slot),
    })),

  addVariationMoreSlots: (variationId, slots) =>
    set((s) => ({
      variations: s.variations.map((v) => {
        if (v.id !== variationId) return v;
        const media = (v.media as VariationMediaState) ?? emptyVariationMedia();
        const remaining = 5 - media.more.length;
        if (remaining <= 0) return v;
        return {
          ...v,
          media: { ...media, more: [...media.more, ...slots.slice(0, remaining)] },
        };
      }),
      mediaDirty: true,
    })),

  setVariationMoreSlot: (variationId, index, slot) =>
    set((s) => ({
      variations: s.variations.map((v) => {
        if (v.id !== variationId) return v;
        const media = (v.media as VariationMediaState) ?? emptyVariationMedia();
        if (index < 0 || index >= media.more.length) return v;
        const more = [...media.more];
        more[index] = { ...more[index], ...slot };
        return { ...v, media: { ...media, more } };
      }),
      mediaDirty: s.mediaDirty || isUserMediaChange(slot),
    })),

  removeVariationMoreSlot: (variationId, index) =>
    set((s) => ({
      variations: s.variations.map((v) => {
        if (v.id !== variationId) return v;
        const media = (v.media as VariationMediaState) ?? emptyVariationMedia();
        // Bounds-checked: a negative index would otherwise remove from the end.
        if (index < 0 || index >= media.more.length) return v;
        return { ...v, media: { ...media, more: media.more.filter((_, i) => i !== index) } };
      }),
      mediaDirty: true,
    })),

  setVariationVideoSlot: (variationId, slot) =>
    set((s) => ({
      variations: s.variations.map((v) => {
        if (v.id !== variationId) return v;
        const media = (v.media as VariationMediaState) ?? emptyVariationMedia();
        return { ...v, media: { ...media, video: { ...media.video, ...slot } } };
      }),
      mediaDirty: s.mediaDirty || isUserMediaChange(slot),
    })),

  // Both start clean: a freshly cleared or freshly loaded product has had no
  // media touched by anybody, whatever the previous one in this session did.
  reset: () => set({ ...INITIAL_STATE, productMedia: emptyProductMedia(), mediaDirty: false }),

  hydrate: (partial) => set((s) => ({ ...s, ...partial, mediaDirty: false })),
}));
