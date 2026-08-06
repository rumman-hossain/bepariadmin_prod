/**
 * Zod schema for Dashboard API response validation.
 * Ensures data integrity at runtime — catches shape mismatches between frontend and backend.
 */
import { z } from 'zod';

export const kpiSchema = z.object({
  /**
   * The stable identifier, matched against KPI_ICONS. `label` is free text the
   * server may reword at will — anything that keys off it breaks the first time
   * someone improves the copy, which is precisely what happened: the icon map
   * looked for 'Total GMV' and 'Active Retailers' while the API sent
   * 'GMV (30 days)' and 'Active retailers'.
   */
  key: z.string(),
  label: z.string(),
  value: z.string(),
  /**
   * Absent when there is no prior period to compare against.
   *
   * `.nullish()` rather than a default of 0: zero is a real reading — flat —
   * and substituting it for "unknown" renders a marketplace's first month as
   * "+0% vs last month" beside a growth arrow.
   */
  trend: z.number().nullish(),
  isCurrency: z.boolean().optional(),
});

export const chartDataPointSchema = z.object({
  name: z.string(),
  value: z.number(),
});

export const dashboardAlertSchema = z.object({
  id: z.string(),
  type: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string(),
  message: z.string(),
  createdAt: z.string().optional(),
});

export const recentOrderSchema = z.object({
  id: z.string(),
  orderNo: z.string().optional(),
  customerName: z.string().optional(),
  amount: z.number(),
  status: z.string(),
  date: z.string(),
});

export const dashboardStatsSchema = z.object({
  kpis: z.array(kpiSchema),
  salesChart: z.array(chartDataPointSchema),
  statusChart: z.array(chartDataPointSchema),
  alerts: z.array(dashboardAlertSchema),
  recentOrders: z.array(recentOrderSchema),
});

/**
 * The response as it comes off the wire.
 *
 * `WriteJSON(w, 200, map[string]any{"data": summary})` — the handler wraps its
 * body, as every analytics handler does. Validating `dashboardStatsSchema`
 * directly against the response failed on every single 200, and the screen
 * reported a working endpoint as "data in an unexpected shape".
 *
 * Putting the envelope in the schema rather than stripping it at the call site
 * is how the rest of the app does it (see salesBrainApi), and it means the
 * check is against the shape actually received.
 */
export const dashboardResponseSchema = z.object({ data: dashboardStatsSchema });

export type Kpi = z.infer<typeof kpiSchema>;
export type ChartDataPoint = z.infer<typeof chartDataPointSchema>;
export type DashboardAlert = z.infer<typeof dashboardAlertSchema>;
export type RecentOrder = z.infer<typeof recentOrderSchema>;
export type DashboardStatsRaw = z.infer<typeof dashboardStatsSchema>;