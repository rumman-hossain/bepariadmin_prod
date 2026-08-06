import { create } from 'zustand';

/**
 * CLIENT state for the supplier feature.
 *
 * This file used to be 303 lines and held the supplier list, the selected
 * supplier, three loading booleans, an error string and nineteen actions — a
 * hand-rolled server cache. All of that became `queries.ts` and the query cache.
 *
 * What survived that first cut was the FILTER SELECTIONS, on the reasoning that
 * they were genuinely client state. They were not. They existed because the
 * server could not filter, so the screen fetched every supplier and narrowed the
 * array in the browser — and a filter held in a store is a filter that cannot be
 * linked to, cannot survive a reload, and disappears the moment somebody opens a
 * supplier and comes back.
 *
 * The filters now live in the URL and are applied by the database. What is left
 * here is the one thing that was ever really client state: which row the
 * operator navigated from.
 */

interface WholesalerUiStore {
  /** The row the operator navigated from, for back-navigation highlighting. */
  selectedId: string | null;

  selectWholesaler: (id: string) => void;
  clearSelection: () => void;
}

export const useWholesalerStore = create<WholesalerUiStore>((set) => ({
  selectedId: null,

  selectWholesaler: (id) => set({ selectedId: id }),

  clearSelection: () => set({ selectedId: null }),
}));
