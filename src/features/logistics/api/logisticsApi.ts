import { z } from 'zod';
import { request } from '@/src/api/client';
import { API_V1 } from '@/src/utils/constants';

/*
 * The shipping department.
 *
 * Costs are PAISA, like the cash book — `logistics.shipments.cost_minor` is what
 * a courier charges the platform, and it is the first real source for the
 * courier line in Accounting, which was previously an order count multiplied by
 * a flat ৳120 (F-02).
 *
 * There is no customer-facing shipping tariff here. `orders.orders` has no
 * shipping charge column, so nothing bills a retailer for delivery — recording
 * a number nobody is charged would be the ৳120 mistake in reverse.
 */

/*
 * Built from API_V1, not written out.
 *
 * This was `'/logistics'` — no version prefix. Firebase Hosting rewrites only
 * `/api/**` to Cloud Run and serves index.html for everything else, so every
 * request here returned 200 carrying the SPA's own HTML and this module parsed
 * a web page as JSON. Nothing 404'd and nothing reached the backend logs; the
 * screen simply never worked. Guard G17 now rejects an unprefixed base.
 */
const BASE = `${API_V1}/logistics`;

export const summarySchema = z.object({
  awaitingDispatch: z.number().int(),
  inTransit: z.number().int(),
  deliveredToday: z.number().int(),
  dispatchedToday: z.number().int(),
  costTodayMinor: z.number().int(),
  activeCouriers: z.number().int(),
});
export type LogisticsSummary = z.infer<typeof summarySchema>;

export const queuedOrderSchema = z.object({
  orderId: z.string(),
  retailerName: z.string(),
  address: z.string(),
  paymentKind: z.string(),
  itemCount: z.number().int(),
  createdAt: z.string(),
});
export type QueuedOrder = z.infer<typeof queuedOrderSchema>;

export const shipmentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  retailerName: z.string(),
  courierId: z.string(),
  courierName: z.string(),
  trackingId: z.string().nullish(),
  weightGrams: z.number().int(),
  costMinor: z.number().int(),
  dispatchedAt: z.string(),
  deliveredAt: z.string().nullish(),
});
export type Shipment = z.infer<typeof shipmentSchema>;

export const courierSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactName: z.string().nullish(),
  contactPhone: z.string().nullish(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type Courier = z.infer<typeof courierSchema>;

export const rateCardSchema = z.object({
  id: z.string(),
  courierId: z.string(),
  courierName: z.string(),
  effectiveFrom: z.string(),
  supersededAt: z.string().nullish(),
  bands: z.array(z.object({ maxWeightGrams: z.number().int(), costMinor: z.number().int() })),
});
export type RateCard = z.infer<typeof rateCardSchema>;

const meta = z.object({ total: z.number(), page: z.number(), limit: z.number() });

/** Paisa to taka. The only conversion in this feature. */
export const toTaka = (minor: number): number => minor / 100;

/** Grams to a readable weight. Not money, so no G12 concern. */
export const formatWeight = (grams: number): string =>
  grams >= 1000 ? `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 2)} kg` : `${grams} g`;

async function get<T>(path: string, schema: z.ZodType<T>, what: string): Promise<T> {
  const res = await request<unknown>('GET', `${BASE}${path}`, { auth: true });
  if (!res.ok) throw new Error(`${what} could not be loaded`);
  const parsed = schema.safeParse(res.data);
  if (!parsed.success) throw new Error(`${what} came back in an unexpected shape`);
  return parsed.data;
}

export const getSummary = () =>
  get('/summary', z.object({ data: summarySchema }), 'The logistics summary').then((r) => r.data);

export const getQueue = (page: number) =>
  get(`/queue?page=${page}&limit=25`, z.object({ data: z.array(queuedOrderSchema), meta }), 'The dispatch queue');

export const getShipments = (status: string, page: number) =>
  get(
    `/shipments?status=${encodeURIComponent(status)}&page=${page}&limit=25`,
    z.object({ data: z.array(shipmentSchema), meta }),
    'Shipments',
  );

export const getCouriers = () =>
  get('/couriers', z.object({ data: z.array(courierSchema) }), 'Couriers').then((r) => r.data);

export const getRates = () =>
  get('/rates', z.object({ data: z.array(rateCardSchema) }), 'Rate cards').then((r) => r.data);

export interface DispatchInput extends Record<string, unknown> {
  courierId: string;
  trackingId?: string;
  weightGrams: number;
}

export async function dispatchOrder(orderId: string, input: DispatchInput): Promise<void> {
  const res = await request<unknown>('POST', `${BASE}/orders/${orderId}/dispatch`, {
    auth: true,
    body: input,
  });
  if (!res.ok) {
    // "no band covers this weight", "this courier has no rate card", "already
    // dispatched" are all things the operator can act on. Surfaced verbatim.
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The parcel could not be dispatched');
  }
}
