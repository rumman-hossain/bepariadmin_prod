/**
 * Dashboard state management — Zustand store.
 * Centralized state for stats, loading, error, and actions.
 * No prop drilling. DashboardPage reads directly from this store.
 */
import { create } from 'zustand';
import { getDashboardStats } from '@/src/api/dashboard';
import { dashboardStatsSchema } from './schemas/dashboardSchema';
import type { DashboardStats } from './types';

interface DashboardStore {
  /** Aggregated dashboard data */
  stats: DashboardStats | null;
  /** Whether initial fetch is in progress */
  isLoading: boolean;
  /** Whether a refresh (re-fetch) is in progress */
  isRefreshing: boolean;
  /** Error message if fetch failed */
  error: string | null;

  /** Fetch stats from API — called on mount */
  fetchStats: () => Promise<void>;
  /** Refresh stats — called on manual refresh or interval */
  refresh: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  stats: null,
  isLoading: true,
  isRefreshing: false,
  error: null,

  fetchStats: async () => {
    // Prevent duplicate fetches
    if (get().isLoading && get().stats !== null) return;

    set({ isLoading: true, error: null });

    try {
      const res = await getDashboardStats();

      if (!res.ok) {
        set({
          isLoading: false,
          error: `Failed to load dashboard (${res.status})`,
        });
        return;
      }

      // Validate response shape at runtime
      const parsed = dashboardStatsSchema.safeParse(res.data);

      if (!parsed.success) {
        console.error('[Dashboard] Schema validation failed:', parsed.error.flatten());
        set({
          isLoading: false,
          error: 'Invalid dashboard data received from server',
        });
        return;
      }

      set({
        stats: parsed.data,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      set({
        isLoading: false,
        error: message,
      });
    }
  },

  refresh: async () => {
    // Don't double-refresh
    if (get().isRefreshing) return;

    set({ isRefreshing: true });

    try {
      const res = await getDashboardStats();

      if (!res.ok) {
        set({ isRefreshing: false });
        return;
      }

      const parsed = dashboardStatsSchema.safeParse(res.data);

      if (parsed.success) {
        set({ stats: parsed.data, isRefreshing: false, error: null });
      } else {
        set({ isRefreshing: false });
      }
    } catch {
      set({ isRefreshing: false });
    }
  },

  clearError: () => set({ error: null }),
}));