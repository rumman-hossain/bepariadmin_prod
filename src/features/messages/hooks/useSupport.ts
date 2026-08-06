import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getThreads,
  getCounts,
  claimThread,
  releaseThread,
  closeThread,
  reopenThread,
} from '../api/messagesApi';

const key = ['support'] as const;

export const useThreads = (
  audience: 'retailer' | 'wholesaler',
  status: string,
  assignedTo: string,
  page: number,
) =>
  useQuery({
    queryKey: [...key, 'threads', audience, status, assignedTo, page],
    queryFn: () => getThreads(audience, status, assignedTo, page),
    /*
     * A support queue is shared and changes under you: a colleague claims a
     * thread while you are looking at it. Refetching on an interval keeps the
     * list roughly honest without a realtime channel — and when a claim is
     * refused because someone got there first, the refetch is what makes the
     * screen agree with the refusal.
     */
    refetchInterval: 30_000,
  });

/**
 * Counts for both queues.
 *
 * Separate queues must not mean an unseen queue: an operator working retailers
 * needs to know suppliers are waiting. Polled on the same cadence as the list.
 */
export const useQueueCounts = () =>
  useQuery({ queryKey: [...key, 'counts'], queryFn: getCounts, refetchInterval: 30_000 });

function useThreadAction(fn: (id: string) => Promise<void>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Every action moves a thread between the buckets the tabs filter on, so
    // the whole tree is invalidated rather than one list.
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export const useClaim = () => useThreadAction(claimThread);
export const useRelease = () => useThreadAction(releaseThread);
export const useClose = () => useThreadAction(closeThread);
export const useReopen = () => useThreadAction(reopenThread);
