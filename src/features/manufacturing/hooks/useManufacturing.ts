import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  type PurchaseOrderInput,
  type Status,
} from '../api/manufacturingApi';

const key = ['manufacturing'] as const;

export const usePurchaseOrders = (status: string, page: number) =>
  useQuery({ queryKey: [...key, 'pos', status, page], queryFn: () => getPurchaseOrders(status, page) });

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PurchaseOrderInput) => createPurchaseOrder(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; status?: Status; notes?: string }) =>
      updatePurchaseOrder(args.id, { status: args.status, notes: args.notes }),
    // Advancing an order moves it between the status filters the tabs use, so
    // the whole tree is invalidated rather than one list.
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
