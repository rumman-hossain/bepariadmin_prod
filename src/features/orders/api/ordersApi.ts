import { request } from '@/src/api/client';
import type { Order, OrderListResponse, OrderStats } from '../types';

/**
 * Admin order endpoints.
 *
 * All three have existed since before this console did; nothing called them.
 */

export interface ListOrdersParams {
  page?: number;
  limit?: number;
  /** Omit or pass 'All' for no filter — the backend treats empty as unfiltered. */
  status?: string;
}

export function listOrders(params: ListOrdersParams = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  // 'All' is the UI's sentinel for "no filter"; the API wants the param absent.
  if (params.status && params.status !== 'All') query.set('status', params.status);

  const qs = query.toString();
  return request<OrderListResponse>('GET', `/api/v1/orders${qs ? `?${qs}` : ''}`, { auth: true });
}

export function getOrder(id: string) {
  return request<{ data: Order }>('GET', `/api/v1/orders/${id}`, { auth: true });
}

export function getOrderStats() {
  return request<{ data: OrderStats }>('GET', '/api/v1/orders/stats', { auth: true });
}

/**
 * Move an order to a new status.
 *
 * PATCH, which `api/client` will replay on a 5xx or a timeout — and that is
 * correct here specifically because setting a status is idempotent in effect:
 * applying "shipped" twice leaves the order shipped. It is listed as
 * non-replayable in the client all the same, because the client cannot know
 * that about an arbitrary PATCH; this one simply costs nothing if it fails.
 */
export function updateOrderStatus(id: string, status: string) {
  return request<{ data: Order }>('PATCH', `/api/v1/orders/${id}/status`, {
    auth: true,
    body: { status },
  });
}
