import { create } from 'zustand';
import type { Wholesaler } from '@/src/types/domain';
import type { WholesalerFilters } from './types';
import { DEFAULT_COMMISSION_RATE } from './constants';

/**
 * Wholesaler state management.
 * Central store for list, detail, filters, and actions.
 * Replaces 20+ useState hooks in the legacy Wholesalers.tsx god component.
 */

interface WholesalerStore {
  // Data
  wholesalers: Wholesaler[];
  selectedId: string | null;

  // Filters
  filters: WholesalerFilters;

  // UI state
  isCreating: boolean;
  isEditing: boolean;

  // Actions — data
  setWholesalers: (data: Wholesaler[]) => void;
  addWholesaler: (wholesaler: Wholesaler) => void;
  updateWholesaler: (wholesaler: Wholesaler) => void;
  removeWholesaler: (id: string) => void;

  // Actions — selection
  selectWholesaler: (id: string) => void;
  clearSelection: () => void;

  // Actions — filters
  setFilter: (key: keyof WholesalerFilters, value: string | boolean) => void;
  clearFilters: () => void;

  // Actions — UI
  setCreating: (value: boolean) => void;
  setEditing: (value: boolean) => void;

  // Derived
  selectedWholesaler: () => Wholesaler | null;
}

const initialFilters: WholesalerFilters = {
  search: '',
  category: 'All',
  location: 'All',
  recentlyAdded: false,
};

export const useWholesalerStore = create<WholesalerStore>((set, get) => ({
  wholesalers: [],
  selectedId: null,
  filters: { ...initialFilters },
  isCreating: false,
  isEditing: false,

  setWholesalers: (data) => set({ wholesalers: data }),

  addWholesaler: (wholesaler) =>
    set((state) => ({
      wholesalers: [
        {
          ...wholesaler,
          acceptanceRate: wholesaler.acceptanceRate ?? 100,
          dispatchSpeed: wholesaler.dispatchSpeed ?? '24h',
          commissionRate: wholesaler.commissionRate ?? DEFAULT_COMMISSION_RATE,
        },
        ...state.wholesalers,
      ],
    })),

  updateWholesaler: (wholesaler) =>
    set((state) => ({
      wholesalers: state.wholesalers.map((w) => (w.id === wholesaler.id ? wholesaler : w)),
    })),

  removeWholesaler: (id) =>
    set((state) => ({
      wholesalers: state.wholesalers.filter((w) => w.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  selectWholesaler: (id) => set({ selectedId: id, isCreating: false, isEditing: false }),

  clearSelection: () => set({ selectedId: null, isEditing: false }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value } as WholesalerFilters,
    })),

  clearFilters: () => set({ filters: { ...initialFilters } }),

  setCreating: (value) => set({ isCreating: value }),

  setEditing: (value) => set({ isEditing: value }),

  selectedWholesaler: () => {
    const { wholesalers, selectedId } = get();
    if (!selectedId) return null;
    return wholesalers.find((w) => w.id === selectedId) ?? null;
  },
}));