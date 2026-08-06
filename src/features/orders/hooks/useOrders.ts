import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listOrders, getOrder, getOrderStats, updateOrderStatus } from '../api/ordersApi';
import type { ListOrdersParams } from '../api/ordersApi';

/**
 * Server state for orders.
 *
 * Keys include the params, so paging and filtering are cache entries rather
 * than refetches over one shared slot — going back a page is instant, and a
 * status change invalidates every list at once regardless of which page the
 * operator is on.
 */
const orderKeys = {
  all: ['orders'] as const,
  list: (params: ListOrdersParams) => [...orderKeys.all, 'list', params] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
};

function unwrap<T>(res: { ok: boolean; status?: number; data: T }): T {
  if (!res.ok) throw Object.assign(new Error('Request failed'), { status: res.status });
  return res.data;
}

export function useOrdersQuery(params: ListOrdersParams) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => listOrders(params).then(unwrap),
    // Keeps the previous page on screen while the next loads, so the table does
    // not collapse to a skeleton on every page change.
    placeholderData: (previous) => previous,
  });
}

export function useOrderQuery(id: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    // Unwrap the `{data}` envelope here, so screens read an Order and
    // never `.data.data`.
    queryFn: () => getOrder(id!).then(unwrap).then((r) => r.data),
    enabled: Boolean(id),
  });
}

export function useOrderStatsQuery() {
  return useQuery({
    queryKey: orderKeys.stats(),
    queryFn: () => getOrderStats().then(unwrap).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatus(id, status).then(unwrap).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      // Both the list and the stats derive from status, so both go stale.
      void qc.invalidateQueries({ queryKey: orderKeys.all });
      void qc.invalidateQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}
