/**
 * Zod schema for Dashboard API response validation.
 * Ensures data integrity at runtime — catches shape mismatches between frontend and backend.
 */
import { z } from 'zod';

export const kpiSchema = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.number(),
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

export type Kpi = z.infer<typeof kpiSchema>;
export type ChartDataPoint = z.infer<typeof chartDataPointSchema>;
export type DashboardAlert = z.infer<typeof dashboardAlertSchema>;
export type RecentOrder = z.infer<typeof recentOrderSchema>;
export type DashboardStatsRaw = z.infer<typeof dashboardStatsSchema>;