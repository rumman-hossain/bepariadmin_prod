import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSummary,
  getQueue,
  getShipments,
  getCouriers,
  getRates,
  dispatchOrder,
  type DispatchInput,
} from '../api/logisticsApi';

const key = ['logistics'] as const;

export const useLogisticsSummary = () =>
  useQuery({ queryKey: [...key, 'summary'], queryFn: getSummary });

export const useQueue = (page: number) =>
  useQuery({ queryKey: [...key, 'queue', page], queryFn: () => getQueue(page) });

export const useShipments = (status: string, page: number) =>
  useQuery({ queryKey: [...key, 'shipments', status, page], queryFn: () => getShipments(status, page) });

export const useCouriers = () => useQuery({ queryKey: [...key, 'couriers'], queryFn: getCouriers });

export const useRates = () => useQuery({ queryKey: [...key, 'rates'], queryFn: getRates });

/*
 * Dispatching moves a parcel out of the queue, into the in-transit list, and
 * changes three summary figures. Invalidating the whole tree is the correct
 * blast radius — refetching only the queue would leave the counts stale and the
 * shipment invisible until a reload.
 */
export function useDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, ...input }: DispatchInput & { orderId: string }) =>
      dispatchOrder(orderId, input),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
