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

export const SMS_BALANCE_URL = '/api/v1/analytics/sms-balance';

/**
 * What is left with the SMS gateway (BulkSMS BD, operated by Zaman IT).
 *
 * On its own request, not folded into the dashboard summary, because this one
 * leaves the building — the server asks the provider. Sharing the summary's
 * request would put an external call on the critical path of every KPI, chart
 * and order on the screen.
 *
 * Three states, not two. `configured: false` means no gateway is wired at all,
 * which is a different fact from a balance of zero and needs the opposite
 * response — one is a deployment question, the other is a top-up.
 */
export interface SmsBalance {
  configured: boolean;
  available?: boolean;
  balance?: number;
}

/*
 * UNWRAPS THE ENVELOPE, and getting that wrong is why the card read
 * "Not configured" while the response plainly said `configured: true`.
 *
 * `request` returns `{ ok, data }` where `data` is the RAW BODY — and every
 * `/api/v1` endpoint wraps its payload again, as `{ data: … }`. So the value
 * lives at `res.data.data`. Typing the call as `request<SmsBalance>` claimed one
 * level of nesting that does not exist: `configured` came back undefined, which
 * is falsy, and the card faithfully reported no gateway.
 *
 * Unwrapped HERE rather than in the component, so there is one place that knows
 * the shape. Every other call in this codebase does the same — see `getStaff`.
 */
export async function getSmsBalance(): Promise<SmsBalance> {
  const res = await request<unknown>('GET', SMS_BALANCE_URL, { auth: true });
  if (!res.ok) throw new Error('The SMS balance could not be read');
  const body = res.data as { data?: SmsBalance } | undefined;
  if (!body?.data || typeof body.data.configured !== 'boolean') {
    throw new Error('The SMS balance came back in an unexpected shape');
  }
  return body.data;
}
