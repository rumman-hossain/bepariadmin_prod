import { z } from 'zod';
import { request } from '@/src/api/client';

/**
 * Analytics API.
 *
 * Only two of the five analytics routes are real. Written from
 * `beparibd-backend/internal/analytics/{handler,service}.go`.
 *
 *   GET /analytics/dashboard      real — gmv, orderCount, activeRetailers
 *   GET /analytics/sales?period=  real — day / orders / revenue, defaults 30d
 *   GET /analytics/retailers?limit=  real — revenue and orders per retailer, 30d
 *   GET /analytics/products?limit=   real — units and revenue per product, 30d
 *   GET /analytics/fraud?limit=      real — open flags, highest risk first
 *
 * All three returned a hardcoded `{"data": []}` with no query behind them until
 * F-17 was fixed; they now query. `limit` is bounded server-side (default 10,
 * max 100), so the client does not need to defend against an unbounded list.
 *
 * One caveat survives the fix: an empty `fraud` list is a real answer about the
 * table, but NOT evidence that detection is running — nothing scores orders, so
 * empty still means "not scored", not "clean". The screen keeps saying so.
 */

export const analyticsSummarySchema = z.object({
  data: z.object({
    gmv: z.number(),
    orderCount: z.number(),
    activeRetailers: z.number(),
    lastUpdated: z.string(),
  }),
});

export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>['data'];

/** `Day` is a date string; `Revenue` is a float from the Go service. */
export const salesPointSchema = z.object({
  day: z.string(),
  orders: z.number(),
  revenue: z.number(),
});

export const salesSchema = z.object({ data: z.array(salesPointSchema) });

export type SalesPoint = z.infer<typeof salesPointSchema>;

/** The server defaults to `30d` when the parameter is absent. */
export const SALES_PERIODS = ['7d', '30d', '90d'] as const;
export type SalesPeriod = (typeof SALES_PERIODS)[number];

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await request<unknown>('GET', '/api/v1/analytics/dashboard', { auth: true });
  if (!res.ok) throw new Error('Summary figures could not be loaded');
  return analyticsSummarySchema.parse(res.data).data;
}

export async function getSales(period: SalesPeriod): Promise<SalesPoint[]> {
  const res = await request<unknown>(`GET`, `/api/v1/analytics/sales?period=${period}`, {
    auth: true,
  });
  if (!res.ok) throw new Error('Sales could not be loaded');
  return salesSchema.parse(res.data).data;
}

export const topRetailerSchema = z.object({
  retailerId: z.string(),
  shopName: z.string(),
  district: z.string().optional(),
  orderCount: z.number(),
  revenue: z.number(),
});
export const topProductSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  unitsSold: z.number(),
  revenue: z.number(),
});
export const fraudFlagSchema = z.object({
  id: z.string(),
  retailerId: z.string(),
  orderId: z.string().optional(),
  rule: z.string(),
  riskScore: z.number(),
  status: z.string(),
  createdAt: z.string(),
});

export type TopRetailer = z.infer<typeof topRetailerSchema>;
export type TopProduct = z.infer<typeof topProductSchema>;
export type FraudFlag = z.infer<typeof fraudFlagSchema>;

async function getList<T>(path: string, schema: z.ZodType<T>, label: string): Promise<T[]> {
  const res = await request<unknown>('GET', path, { auth: true });
  if (!res.ok) throw new Error(`${label} could not be loaded`);
  return z.object({ data: z.array(schema) }).parse(res.data).data;
}

export const getTopRetailers = (limit = 10) =>
  getList(`/api/v1/analytics/retailers?limit=${limit}`, topRetailerSchema, 'Top retailers');
export const getTopProducts = (limit = 10) =>
  getList(`/api/v1/analytics/products?limit=${limit}`, topProductSchema, 'Top products');
export const getFraudFlags = (limit = 10) =>
  getList(`/api/v1/analytics/fraud?limit=${limit}`, fraudFlagSchema, 'Fraud flags');
