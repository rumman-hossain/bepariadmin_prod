/**
 * Dashboard API layer.
 * All dashboard data fetching centralized here.
 */
import { request } from './client';
import type { ApiResponse } from '@/src/types/api';
import type { DashboardStats } from '@/src/features/dashboard/types';

/**
 * The dashboard aggregate.
 *
 * Exported as a constant so a test can assert it, because getting it wrong is
 * exactly what happened: this called `/api/v1/admin/dashboard/stats`, a route
 * that was never registered, so every dashboard load 404'd and the screen
 * reported "endpoint not found" to the operator.
 *
 * Correcting the path alone would not have been enough — the nearest existing
 * route, `/api/v1/analytics/dashboard`, returns four scalars while this screen
 * needs kpis, two charts, alerts and recent orders. The aggregate had to be
 * built; see internal/analytics/summary.go.
 */
export const DASHBOARD_SUMMARY_URL = '/api/v1/analytics/dashboard/summary';

/**
 * Fetch aggregated dashboard statistics.
 *
 * Requires authentication. An empty marketplace answers 200 with zeros — the
 * caller must not treat "nothing to show" as a failure.
 */
export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return request<DashboardStats>('GET', DASHBOARD_SUMMARY_URL, { auth: true });
}
