import { z } from 'zod';
import { request } from '@/src/api/client';

/**
 * Payments API.
 *
 * Written from `beparibd-backend/internal/payment/model.go` and `handler.go`.
 *
 * **`POST /payments/settle` is deliberately not wrapped here.** It accepts the
 * settlement amount from the caller:
 *
 *     Amount float64 `json:"amount" validate:"required,gt=0"`
 *
 * The server checks only that the number is positive. There is no endpoint that
 * computes what a supplier is owed, and `PaymentRecord` carries no commission
 * or net figure — so any client calling this must invent the amount. That is
 * F-01 (two screens disagreeing about money because each derived it) promoted
 * into the API contract, and giving it a client function here is what would let
 * a screen do it.
 *
 * It also has no idempotency key, so a double-click pays twice, and it is gated
 * on `AdminOnly` rather than finance — the person who onboards a supplier can
 * also pay them.
 *
 * See F-18. When `/admin/settlements/pending` and a server-computed `amountDue`
 * exist, add them here.
 */

/** Exactly the fields `PaymentRecord` has. No commission, no net — none exist. */
export const paymentRecordSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  retailerId: z.string(),
  amount: z.number(),
  provider: z.string(),
  transactionId: z.string().optional(),
  status: z.string(),
  createdAt: z.string(),
});

export type PaymentRecord = z.infer<typeof paymentRecordSchema>;

export const paymentListSchema = z.object({
  data: z.array(paymentRecordSchema),
  meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
});

export interface PaymentPage {
  data: PaymentRecord[];
  total: number;
}

export async function listPayments(page: number, limit: number): Promise<PaymentPage> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await request<unknown>('GET', `/api/v1/payments/records?${query}`, { auth: true });
  if (!res.ok) throw new Error('Payments could not be loaded');
  const parsed = paymentListSchema.parse(res.data);
  return { data: parsed.data, total: parsed.meta.total };
}


/**
 * What a supplier is owed on one delivered, unsettled order.
 *
 * Every figure is computed by the server from the commission rate captured on
 * each order line at the time of sale — not from the supplier's current margin,
 * which would price a six-week-old order at today's rate.
 *
 * All amounts are integer minor units (paisa). `Money` takes taka, so divide at
 * the render site and nowhere else.
 */
export const pendingSettlementSchema = z.object({
  orderId: z.string(),
  wholesalerId: z.string(),
  retailerId: z.string(),
  grossMinor: z.number(),
  commissionMinor: z.number(),
  supplierNetMinor: z.number(),
  deliveredAt: z.string(),
  /**
   * True when a line on this order predates commission capture, so its supplier
   * net cannot be computed. Such an order is shown — an operator has to know it
   * exists — but must not be settled from a guessed figure.
   */
  termsMissing: z.boolean(),
});

export type PendingSettlement = z.infer<typeof pendingSettlementSchema>;

export async function listPendingSettlements(limit = 50): Promise<PendingSettlement[]> {
  const res = await request<unknown>(
    'GET',
    `/api/v1/payments/settlements/pending?limit=${limit}`,
    { auth: true },
  );
  if (!res.ok) throw new Error('Pending settlements could not be loaded');
  return z.object({ data: z.array(pendingSettlementSchema) }).parse(res.data).data;
}

/** Paisa to taka, at the render boundary. */
export const toTaka = (minor: number): number => minor / 100;

/**
 * Settle one delivered order.
 *
 * The request carries an order id and NOTHING about money. The server sums the
 * payout from the commission captured on that order's lines at the time of
 * sale. Until recently this endpoint took an `amount` and validated only that
 * it was positive — so the caller decided what a supplier was paid. Sending an
 * amount from here would be that defect again.
 *
 * A 422 is the normal, expected outcome for several honest refusals: the order
 * is not delivered, it is already settled, its commission was never captured,
 * or no payment has been received. The server's message names which, and it is
 * safe to show.
 */
export async function settleOrder(orderId: string): Promise<string> {
  const res = await request<unknown>('POST', '/api/v1/payments/settle', {
    auth: true,
    body: { orderId },
  });
  if (!res.ok) {
    const detail = (res.data as { error?: { message?: string } } | undefined)?.error?.message;
    throw new Error(detail ?? 'The settlement could not be completed');
  }
  return (res.data as { data: { settlementId: string } }).data.settlementId;
}
