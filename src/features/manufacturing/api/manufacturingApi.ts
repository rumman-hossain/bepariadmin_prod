import { z } from 'zod';
import { request } from '@/src/api/client';
import { API_V1 } from '@/src/utils/constants';

/*
 * Purchase orders placed with suppliers for production.
 *
 * Costs here are `numeric(12,2)` in Postgres, not minor units — and unlike the
 * settlement path, that is acceptable rather than a defect waiting to happen.
 * `total_cost` is a GENERATED column computed by Postgres as quantity ×
 * unit_cost in numeric, so the arithmetic never touches a float. float64 appears
 * only in transport, and nothing in this feature computes with it.
 *
 * If purchase orders ever post to the cash book, that changes — money entering
 * the ledger has to be paisa — and it becomes a migration.
 */

/*
 * Built from API_V1, not written out.
 *
 * This was `'/manufacturing'` — no version prefix. Firebase Hosting rewrites only
 * `/api/**` to Cloud Run and serves index.html for everything else, so every
 * request here returned 200 carrying the SPA's own HTML and this module parsed
 * a web page as JSON. Nothing 404'd and nothing reached the backend logs; the
 * screen simply never worked. Guard G17 now rejects an unprefixed base.
 */
const BASE = `${API_V1}/manufacturing`;

export const STATUSES = ['pending', 'in_production', 'ready', 'dispatched'] as const;
export type Status = (typeof STATUSES)[number];

/** The pipeline runs forwards only; the server refuses anything else. */
export const NEXT_STATUS: Record<Status, Status | null> = {
  pending: 'in_production',
  in_production: 'ready',
  ready: 'dispatched',
  dispatched: null,
};

export const purchaseOrderSchema = z.object({
  id: z.string(),
  wholesalerId: z.string(),
  wholesalerName: z.string(),
  productId: z.string().nullish(),
  productName: z.string().nullish(),
  quantity: z.number().int(),
  unitCost: z.number(),
  totalCost: z.number(),
  status: z.string(),
  expectedDate: z.string().nullish(),
  notes: z.string().optional().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

const meta = z.object({ total: z.number(), page: z.number(), limit: z.number() });

export async function getPurchaseOrders(status: string, page: number) {
  const qs = new URLSearchParams({ status, page: String(page), limit: '25' });
  const res = await request<unknown>('GET', `${BASE}/purchase-orders?${qs}`, { auth: true });
  if (!res.ok) throw new Error('Purchase orders could not be loaded');
  const parsed = z.object({ data: z.array(purchaseOrderSchema), meta }).safeParse(res.data);
  if (!parsed.success) throw new Error('Purchase orders came back in an unexpected shape');
  return parsed.data;
}

export interface PurchaseOrderInput extends Record<string, unknown> {
  wholesalerId: string;
  quantity: number;
  unitCost: number;
  expectedDate?: string;
  notes?: string;
}

export async function createPurchaseOrder(input: PurchaseOrderInput): Promise<string> {
  const res = await request<unknown>('POST', `${BASE}/purchase-orders`, { auth: true, body: input });
  if (!res.ok) {
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The purchase order could not be placed');
  }
  return (res.data as { data: { id: string } }).data.id;
}

/**
 * `notes` is optional and its ABSENCE is meaningful: omitting it leaves the
 * existing note alone, while sending an empty string clears it. The server
 * distinguishes the two — an earlier version could not, and erased notes on
 * every status change.
 */
export async function updatePurchaseOrder(
  id: string,
  body: { status?: Status; notes?: string },
): Promise<void> {
  const res = await request<unknown>('PATCH', `${BASE}/purchase-orders/${id}`, { auth: true, body });
  if (!res.ok) {
    // A refused transition names both ends — "a dispatched order is finished"
    // is more useful than "conflict".
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The order could not be updated');
  }
}
