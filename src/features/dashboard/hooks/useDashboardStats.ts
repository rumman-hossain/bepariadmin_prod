/**
 * Dashboard stats hook.
 * Fires fetchStats() on mount and sets up auto-refresh interval.
 * Returns all state needed by DashboardPage.
 */
import { useEffect } from 'react';
import { useDashboardStore } from '../store';
import { DASHBOARD_REFRESH_INTERVAL } from '../constants';

export function useDashboardStats() {
  const stats = useDashboardStore((s) => s.stats);
  const isLoading = useDashboardStore((s) => s.isLoading);
  const isRefreshing = useDashboardStore((s) => s.isRefreshing);
  const error = useDashboardStore((s) => s.error);
  const fetchStats = useDashboardStore((s) => s.fetchStats);
  const refresh = useDashboardStore((s) => s.refresh);
  const clearError = useDashboardStore((s) => s.clearError);

  // Initial fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, DASHBOARD_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refresh]);

  return {
    stats,
    isLoading,
    isRefreshing,
    error,
    refresh,
    clearError,
  };
}