/**
 * Order shapes, mirroring `internal/order/model.go`.
 *
 * The admin endpoints for these have existed all along — `GET /orders`,
 * `GET /orders/stats`, `PATCH /orders/{id}/status`, all behind `AdminOnly` —
 * and no screen ever called them. The route was a placeholder in the console
 * while the API sat there working.
 */

export interface OrderItem {
  productId: string;
  variationId?: string;
  productName: string;
  variationName?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  retailerId: string;
  wholesalerId?: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string;
  shippingAddress?: unknown;
  trackingId?: string;
  shippingMedium?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface OrderListResponse {
  data: Order[];
  meta: { total: number; page: number; limit: number };
}

/**
 * `GET /orders/stats`, mirroring `internal/order/model.go:51`.
 *
 * Field names are the Go json tags verbatim. An earlier version of this type
 * invented `total`/`pending`/`revenue`, and because every field was optional
 * TypeScript accepted it — so all four tiles read `undefined` and rendered as
 * empty. Nothing caught it: the tests used fixtures built from the same wrong
 * names, so they agreed with the bug.
 *
 * These are NOT required, deliberately: the server omits nothing today, but a
 * stat tile showing "—" is honest where a `0` would assert a measurement nobody
 * took.
 */
export interface OrderStats {
  totalOrders?: number;
  totalRevenue?: number;
  pendingOrders?: number;
  /** The window these figures cover — `7d`, `30d` or `90d`. */
  period?: string;
}

/** How a period code reads in a label. */
export const ORDER_STATS_PERIODS: Record<string, string> = {
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  '90d': 'last 90 days',
};

/**
 * The statuses the backend's transition map allows.
 *
 * Kept as a const tuple rather than a loose string so the status filter and the
 * transition control cannot offer a value the server will reject.
 */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
