/**
 * Dashboard stats.
 *
 * Replaces a store whose two defects were invisible by construction:
 *
 *   - the de-dup guard read `isLoading && stats !== null`, false in BOTH states
 *     it was written for (initial `true && null`, loaded `false && data`), so
 *     it never once prevented a duplicate fetch;
 *   - every failure path in `refresh()` did `set({ isRefreshing: false })` and
 *     nothing else, so behind a 60-second poll the dashboard could show
 *     hours-old figures having silently failed every attempt since.
 *
 * Both are now properties of the query rather than things to remember:
 * de-duplication is automatic, and a failed background refetch surfaces as
 * `refreshError` while `data` stays on screen.
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/app/queryClient';
import { getDashboardStats } from '@/src/api/dashboard';
import { dashboardResponseSchema } from '../schemas/dashboardSchema';
import { DASHBOARD_REFRESH_INTERVAL } from '../constants';
import type { DashboardStats } from '../types';

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await getDashboardStats();

  if (!res.ok) {
    /*
     * A transport or routing failure is a real fault and keeps the error
     * banner. What must NOT reach this branch is an empty marketplace.
     *
     * The console used to call `/api/v1/admin/dashboard/stats`, which never
     * existed, so every load 404'd and the screen said so. Worse, the route it
     * "should" have used returns four scalars rather than the shape this screen
     * needs, and the pre-aggregated table behind it is filled by a cron job
     * nothing schedules — `SUM()` over no rows is NULL, which errored into a
     * 500. Three different ways for "no data" to look like "broken".
     *
     * `/analytics/dashboard/summary` answers 200 with zeros for an empty
     * database, so reaching this branch now means something is genuinely wrong.
     */
    const message =
      res.status === 404
        ? 'The dashboard endpoint is missing on the server. This is a deployment fault, not an empty database.'
        : `Failed to load dashboard (${res.status})`;
    throw Object.assign(new Error(message), { status: res.status });
  }

  /*
   * The envelope is part of the schema, not stripped beforehand.
   *
   * This used to parse `res.data` — the whole `{data:{…}}` body — against a
   * schema that requires `kpis` at the top level, so it failed on every 200 the
   * endpoint ever returned and the screen said "unexpected shape" about a
   * perfectly good response. It went unnoticed because the endpoint 404'd
   * until recently, so this line had never once run against a real payload.
   */
  const parsed = dashboardResponseSchema.safeParse(res.data);
  if (!parsed.success) {
    console.error('[Dashboard] Schema validation failed:', parsed.error.flatten());
    throw new Error('The server returned dashboard data in an unexpected shape.');
  }
  return parsed.data.data;
}

export function useDashboardStats() {
  const query = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: fetchDashboardStats,
    // Polls only while the tab is visible. The hand-rolled version ran the
    // interval unconditionally, so a dashboard left open in a background tab
    // overnight issued ~480 authenticated requests for nobody to read.
    refetchInterval: DASHBOARD_REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
  });

  const { data, isPending, isFetching, error, isRefetching, dataUpdatedAt, refetch } = query;

  return {
    stats: data ?? null,
    /** First load only — a refetch keeps the previous figures on screen. */
    isLoading: isPending,
    isRefreshing: isRefetching || (isFetching && !isPending),
    /** Blocking: there is nothing to show. */
    error: error && !data ? error.message : null,
    /** Non-blocking: the figures on screen are real, just possibly stale. */
    refreshError: error && data ? error.message : null,
    lastUpdatedAt: dataUpdatedAt || null,
    refresh: () => void refetch(),
    clearError: () => {},
  };
}
