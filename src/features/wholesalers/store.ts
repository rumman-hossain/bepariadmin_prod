import { create } from 'zustand';
import type { Wholesaler } from '@/src/types/domain';
import type { WholesalerFilters } from './types';
import { DEFAULT_COMMISSION_RATE } from './constants';
import {
  listWholesalers,
  getWholesaler,
  createWholesaler,
  updateWholesaler,
  updateWholesalerMargin,
  approveWholesaler,
  rejectWholesaler,
  suspendWholesaler,
  unsuspendWholesaler,
  requestResubmitWholesaler,
} from './api/wholesalerApi';
import { toWholesalerApiError, statusToMessage } from './api/errors';
import type { WholesalerFormData } from './schemas/wholesalerSchema';

interface WholesalerStore {
  wholesalers: Wholesaler[];
  selectedWholesaler: Wholesaler | null;
  selectedId: string | null;
  filters: WholesalerFilters;

  isLoading: boolean;
  isDetailLoading: boolean;
  isMutating: boolean;
  error: string | null;
  errorCode: string | null;

  fetchWholesalers: (options?: { bustCache?: boolean }) => Promise<void>;
  fetchWholesalerById: (id: string) => Promise<void>;

  upsertWholesaler: (wholesaler: Wholesaler) => void;
  addWholesaler: (wholesaler: Wholesaler) => void;
  updateWholesalerLocal: (wholesaler: Wholesaler) => void;
  removeWholesaler: (id: string) => void;

  createWholesalerFromForm: (dto: WholesalerFormData) => Promise<Wholesaler>;
  updateWholesalerFromForm: (id: string, dto: WholesalerFormData) => Promise<Wholesaler>;
  updateCommission: (id: string, rate: number) => Promise<void>;

  approveWholesalerAction: (id: string, reviewedBy: string) => Promise<void>;
  rejectWholesalerAction: (id: string, reviewedBy: string, reason: string) => Promise<void>;
  suspendWholesalerAction: (id: string, reviewedBy: string, reason: string) => Promise<void>;
  unsuspendWholesalerAction: (id: string, reviewedBy: string) => Promise<void>;
  requestResubmitAction: (id: string, reviewedBy: string, reason: string) => Promise<void>;

  selectWholesaler: (id: string) => void;
  clearSelection: () => void;
  setFilter: (key: keyof WholesalerFilters, value: string | boolean) => void;
  clearFilters: () => void;
  clearError: () => void;
}

const initialFilters: WholesalerFilters = {
  search: '',
  category: 'All',
  location: 'All',
  recentlyAdded: false,
};

const detailFetchInflight = new Map<string, Promise<void>>();

function applyWholesalerDefaults(wholesaler: Wholesaler): Wholesaler {
  return {
    ...wholesaler,
    commissionRate: wholesaler.commissionRate ?? DEFAULT_COMMISSION_RATE,
  };
}

export const useWholesalerStore = create<WholesalerStore>((set, get) => ({
  wholesalers: [],
  selectedWholesaler: null,
  selectedId: null,
  filters: { ...initialFilters },

  isLoading: true,
  isDetailLoading: false,
  isMutating: false,
  error: null,
  errorCode: null,

  fetchWholesalers: async (options) => {
    set({ isLoading: true, error: null, errorCode: null });

    try {
      const data = await listWholesalers(get().filters, { bustCache: options?.bustCache });
      set({ wholesalers: data, isLoading: false, error: null, errorCode: null });
    } catch (err) {
      const apiErr = toWholesalerApiError(err);
      set({
        isLoading: false,
        error: apiErr.message || statusToMessage(apiErr.status),
        errorCode: apiErr.code ?? null,
      });
    }
  },

  fetchWholesalerById: async (id) => {
    const existing = detailFetchInflight.get(id);
    if (existing) return existing;

    const promise = (async () => {
      set({ isDetailLoading: true, error: null, errorCode: null, selectedId: id });

      try {
        const wholesaler = await getWholesaler(id);
        if (get().selectedId !== id) return;
        set({
          selectedWholesaler: applyWholesalerDefaults(wholesaler),
          selectedId: id,
          isDetailLoading: false,
          error: null,
          errorCode: null,
        });
        get().upsertWholesaler(wholesaler);
      } catch (err) {
        if (get().selectedId !== id) return;
        const apiErr = toWholesalerApiError(err);
        set({
          isDetailLoading: false,
          selectedWholesaler: null,
          error: apiErr.message,
          errorCode: apiErr.code ?? null,
        });
      }
    })();

    detailFetchInflight.set(id, promise);
    try {
      await promise;
    } finally {
      detailFetchInflight.delete(id);
    }
  },

  upsertWholesaler: (wholesaler) =>
    set((state) => {
      const normalized = applyWholesalerDefaults(wholesaler);
      const exists = state.wholesalers.some((w) => w.id === normalized.id);
      return {
        wholesalers: exists
          ? state.wholesalers.map((w) => (w.id === normalized.id ? normalized : w))
          : [normalized, ...state.wholesalers],
        selectedWholesaler:
          state.selectedId === normalized.id ? normalized : state.selectedWholesaler,
      };
    }),

  addWholesaler: (wholesaler) => get().upsertWholesaler(wholesaler),

  updateWholesalerLocal: (wholesaler) => get().upsertWholesaler(wholesaler),

  removeWholesaler: (id) =>
    set((state) => ({
      wholesalers: state.wholesalers.filter((w) => w.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedWholesaler: state.selectedId === id ? null : state.selectedWholesaler,
    })),

  createWholesalerFromForm: async (dto) => {
    set({ isMutating: true, error: null, errorCode: null });
    try {
      const created = await createWholesaler(dto);
      get().upsertWholesaler(created);
      await get().fetchWholesalers({ bustCache: true });
      set({ isMutating: false });
      return created;
    } catch (err) {
      const apiErr = toWholesalerApiError(err);
      set({ isMutating: false, error: apiErr.message, errorCode: apiErr.code ?? null });
      throw apiErr;
    }
  },

  updateWholesalerFromForm: async (id, dto) => {
    set({ isMutating: true, error: null, errorCode: null });
    try {
      const updated = await updateWholesaler(id, dto);
      get().upsertWholesaler(updated);
      set({ isMutating: false });
      return updated;
    } catch (err) {
      const apiErr = toWholesalerApiError(err);
      set({ isMutating: false, error: apiErr.message, errorCode: apiErr.code ?? null });
      throw apiErr;
    }
  },

  updateCommission: async (id, rate) => {
    set({ isMutating: true, error: null, errorCode: null });
    try {
      const updated = await updateWholesalerMargin(id, rate);
      get().upsertWholesaler(updated);
      set({ isMutating: false });
    } catch (err) {
      const apiErr = toWholesalerApiError(err);
      set({ isMutating: false, error: apiErr.message, errorCode: apiErr.code ?? null });
      throw apiErr;
    }
  },

  approveWholesalerAction: async (id, reviewedBy) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await approveWholesaler(id, reviewedBy);
      get().upsertWholesaler(updated);
      set({ isMutating: false });
    } catch (err) {
      const apiErr = toWholesalerApiError(err);
      set({ isMutating: false, error: apiErr.message, errorCode: apiErr.code ?? null });
      throw apiErr;
    }
  },

  rejectWholesalerAction: async (id, reviewedBy, reason) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await rejectWholesaler(id, reviewedBy, reason);
      get().upsertWholesaler(updated);
      set({ isMutating: false });
    } catch (err) {
      const apiErr = toWholesalerApiError(err);
      set({ isMutating: false, error: apiErr.message, errorCode: apiErr.code ?? null });
      throw apiErr;
    }
  },

  suspendWholesalerAction: async (id, reviewedBy, reason) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await suspendWholesaler(id, reviewedBy, reason);
      get().upsertWholesaler(updated);
      set({ isMutating: false });
    } catch (err) {
      const apiErr = toWholesalerApiError(err);
      set({ isMutating: false, error: apiErr.message, errorCode: apiErr.code ?? null });
      throw apiErr;
    }
  },

  unsuspendWholesalerAction: async (id, reviewedBy) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await unsuspendWholesaler(id, reviewedBy);
      get().upsertWholesaler(updated);
      set({ isMutating: false });
    } catch (err) {
      const apiErr = toWholesalerApiError(err);
      set({ isMutating: false, error: apiErr.message, errorCode: apiErr.code ?? null });
      throw apiErr;
    }
  },

  requestResubmitAction: async (id, reviewedBy, reason) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await requestResubmitWholesaler(id, reviewedBy, reason);
      get().upsertWholesaler(updated);
      set({ isMutating: false });
    } catch (err) {
      const apiErr = toWholesalerApiError(err);
      set({ isMutating: false, error: apiErr.message, errorCode: apiErr.code ?? null });
      throw apiErr;
    }
  },

  selectWholesaler: (id) => {
    const found = get().wholesalers.find((w) => w.id === id) ?? null;
    set({
      selectedId: id,
      selectedWholesaler: found ? applyWholesalerDefaults(found) : null,
    });
  },

  clearSelection: () => set({ selectedId: null, selectedWholesaler: null }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value } as WholesalerFilters,
    })),

  clearFilters: () => set({ filters: { ...initialFilters } }),

  clearError: () => set({ error: null, errorCode: null }),
}));
